import { angleDelta, clamp, distance, lerp, modulo, projectToPolyline } from './geometry';
import { sampleRoute, COMPILER_VERSION } from './route';
import { barrierContact, blockedRouteSection, sweepVehicle } from './barriers';
import { DEFAULT_LAPS, validateLapCount } from './race-options';
import { RULES } from './rules';
import { createContactLog, stepRacers } from './stepping';
import type { CompiledRoute, Point, RaceEvent, RaceState, TrackDefinition } from './types';
import { branchProjection, flightGravity, FLIGHT_RULES, groundHeight, jumpCoordinates, rampAt, supported, takeoffCrossing, vehicleSupported } from './support';
import { locateRoad, roadPoint } from './elevation';
import { permittedHopBarriers } from './hop-shortcuts';

export { RULES };

/** Surface comes from the physical car footprint, never from its planned line. */
export function sampleSurface(position: Point, track: TrackDefinition) {
  const road = track.sections ? locateRoad(position,track) : projectToPolyline(position, track.centerline, track.distances);
  const branch = track.sections ? undefined : branchProjection(position, track); if (branch && branch.distance < road.distance) road.distance = branch.distance;
  const edge = (track.roadWidth - track.carWidth) / 2;
  const sandAmount = clamp((road.distance - edge) / RULES.surfaceTransition, 0, 1);
  return { sandAmount, grip: lerp(track.surface==='packed-dirt'?RULES.dirtGrip:RULES.asphaltGrip, RULES.sandGrip, sandAmount), response: lerp(RULES.asphaltResponse, RULES.sandResponse, sandAmount) };
}

export class RaceSimulation {
  readonly state: RaceState;
  readonly events: RaceEvent[] = [];
  private queuedThrust = false;
  private queuedHop = false;
  private lastSafeDistance = 0;
  private stuckTicks = 0;
  private lastCollisionTick = -1000;
  private collisionNearbyUntil = -1;
  private progressAnchor = 0;
  private invalidFlight = false;
  gridPending = false;
  markContact(now: number) { this.collisionNearbyUntil = now + 3; }
  constructor(readonly route: CompiledRoute, readonly track: TrackDefinition, readonly lapCount: number = DEFAULT_LAPS) {
    validateLapCount(lapCount);
    if (route.trackId !== track.id || route.trackVersion !== track.version || route.version !== COMPILER_VERSION) throw new Error('This route belongs to an older circuit or ruleset. Draw a new line.');
    const start = sampleRoute(route, 0);
    this.state = { tick: 0, time: 0, distance: 0, speed: 0, lap: 1, lapTimes: [], lapStartedAt: 0, thrustUntil: -1, thrustReadyAt: 0,
      hopReadyAt: 0, hopCount: 0, flightOrigin: null, flightStartedAt: -1,
      position: { x: start.x, z: start.z }, elevation: 0, verticalVelocity: 0, movement: 'grounded', activeJump: null, velocity: { x: 0, z: 0 }, heading: start.heading, steeringRate: 0, acceleration: 0, desiredSpeed: start.desiredSpeed,
      slipAngle: 0, lineError: 0, drifting: false, driftCount: 0, sandAmount: 0, surface: 'asphalt', checkpoint: 1,
      thrustCount: 0, finished: false, finishTime: null, collisionCount: 0, recoveryCount: 0, recoveringUntil: -1, recoveryWaiting: false };
  }
  pressThrust() { if (!this.state.finished) this.queuedThrust = true; }
  pressHop() { if (!this.state.finished) this.queuedHop = true; }
  allowedHopBarriers(to = this.state.position) {
    const allowed=permittedHopBarriers(this.state,this.route,this.track,to);
    if(this.track.sections){const jump=this.track.jumps?.find(j=>j.kind==='crest'&&j.id===this.state.activeJump&&this.route.jumps?.includes(j.id));if(jump){const c=jumpCoordinates(to,jump);if(c.along>=-this.track.carLength&&c.along<=jump.corridorLength&&Math.abs(c.across)<=(jump.width-this.track.carWidth)/2)allowed.push(...this.track.barriers.filter(b=>b.kind==='cliff-face').map(b=>b.id));}}
    return allowed;
  }
  clearCommands() { this.queuedThrust = false; this.queuedHop = false; }
  drainEvents() { return this.events.splice(0); }
  private recover(now: number) {
    const s = this.state;
      const back = Math.min(s.distance, this.lastSafeDistance), safe = sampleRoute(this.route, back);
      s.position = this.track.sections ? roadPoint({x:safe.x,z:safe.z},this.track,safe.courseProgress) : { x: safe.x, z: safe.z }; s.heading = safe.heading; s.distance = back;
      s.velocity = { x: 0, z: 0 }; s.speed = 0; s.acceleration = 0; s.steeringRate = 0;
      s.elevation = groundHeight(s.position, this.track); if(this.track.sections)s.supportSectionId=s.position.sectionId; s.verticalVelocity = 0; s.movement = 'grounded'; s.activeJump = null; s.flightOrigin = null; s.flightStartedAt = -1; this.invalidFlight = false; this.clearCommands();
      s.thrustUntil = now; s.recoveringUntil = now + 1; s.recoveryCount++; s.drifting = false;
      s.recoveryWaiting = false;
      s.checkpoint = Math.min(s.checkpoint, Math.floor(back / (this.route.length / 8)) + 1);
      this.stuckTicks = 0; this.progressAnchor = back;
      this.events.push({ type: 'recovery', time: now });
    this.gridPending = false;
  }
  /** Search only the next portion of the route, so a nearby hairpin cannot teleport progress. */
  private projectNear(position: Point) {
    const s = this.state, route = this.route, count = route.points.length - 1;
    const spacing = route.length / count, center = Math.floor(s.distance / spacing);
    let best = { gap: Infinity, progress: s.distance };
    for (let offset = -Math.ceil(8 / spacing); offset <= Math.ceil(Math.max(18, s.speed) / spacing); offset++) {
      const index = center + offset, a = route.points[modulo(index, count)], b = route.points[modulo(index + 1, count)];
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp(((position.x - a.x) * dx + (position.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      const gap = Math.hypot(position.x - lerp(a.x, b.x, t), position.z - lerp(a.z, b.z, t));
      if (gap < best.gap) best = { gap, progress: (index + t) * spacing };
    }
    return best;
  }
  /** One car through the same fixed-step implementation as LocalRace (src/core/stepping.ts). */
  step() {
    if (this.state.finished) return;
    stepRacers([this], this.track, this.state.tick * RULES.dt, createContactLog());
  }
  finishTick() { this.state.tick++; if (!this.state.finished) this.state.time = this.state.tick * RULES.dt; }
  /** Predict forces and barrier-constrained movement; shared car contacts run before commitMotion. */
  integrate(dt: number, now: number): Point | null {
    const s = this.state;
    if (s.finished) return null;
    if (now < s.recoveringUntil || s.recoveryWaiting) { this.clearCommands(); return null; }
    if (this.queuedThrust && now + 1e-8 >= s.thrustReadyAt) {
      s.thrustUntil = now + RULES.thrustDuration;
      s.thrustReadyAt = now + RULES.thrustRecharge;
      s.thrustCount++;
      this.events.push({ type: 'thrust', time: now });
    }
    this.queuedThrust = false;
    if(this.track.sections){s.position=roadPoint(s.position,this.track,sampleRoute(this.route,s.distance).courseProgress);s.supportSectionId=s.position.sectionId;}
    const hopRamp = this.queuedHop ? rampAt(s.position, this.track) : undefined;
    const groundedSupport = this.queuedHop && (vehicleSupported(s.position, s.heading, this.track) || !!hopRamp && supported(s.position, this.track)
      && Math.abs(jumpCoordinates(s.position, hopRamp).across) <= (hopRamp.width - this.track.carWidth) / 2);
    if (this.queuedHop && now + 1e-8 >= s.hopReadyAt && s.movement === 'grounded' && groundedSupport) {
      s.hopReadyAt = now + RULES.hopRecharge; s.hopCount++;
      s.movement = 'airborne'; s.flightOrigin = 'hop'; s.flightStartedAt = now;
      const ramp = hopRamp;
      s.activeJump = ramp && this.route.jumps?.includes(ramp.id) ? ramp.id : null;
      this.invalidFlight = false; s.elevation = groundHeight(s.position, this.track); s.verticalVelocity = RULES.hopLaunchSpeed;
      s.acceleration = 0; s.drifting = false; this.assistFlight(RULES.flightLaunchCorrection);
      this.events.push({ type: 'hop', time: now, point: { ...s.position } });
    }
    this.queuedHop = false;
    if (s.movement === 'airborne') return this.integrateFlight(dt, now);
    const surface = sampleSurface(s.position, this.track);
    s.sandAmount = surface.sandAmount; s.surface = surface.sandAmount > 0.25 ? 'sand' : this.track.surface==='packed-dirt'?'packed-dirt':'asphalt';
    const guide = sampleRoute(this.route, s.distance);
    s.desiredSpeed += (guide.desiredSpeed - s.desiredSpeed) * (1 - Math.exp(-3 * dt));
    const error = s.desiredSpeed - s.speed;
    const requestedAcceleration = clamp(Math.abs(error) < RULES.paceDeadband ? 0 : error * RULES.paceResponse, -RULES.braking, RULES.acceleration);
    s.acceleration += clamp(requestedAcceleration - s.acceleration, -RULES.accelerationJerk * dt, RULES.accelerationJerk * dt);

    const gateDistance = s.checkpoint * this.route.length / 8;
    const blockedAtGate = s.distance >= gateDistance - 0.02 && distance(s.position, sampleRoute(this.route, gateDistance)) > this.track.roadWidth * 0.8;
    // Aim forward of the stripe from the grid; chasing the exact first point
    // makes an offset car turn sideways or circle as it reaches the gate.
    let target = sampleRoute(this.route, blockedAtGate && !this.gridPending ? gateDistance : s.distance + RULES.lookAhead + s.speed * RULES.lookAheadSeconds);
    if (now < this.collisionNearbyUntil && blockedRouteSection([s.position, target], this.track)) {
      // Seek the nearest reachable route point, never a target across an island.
      for (let ahead = 0; ahead <= 10; ahead += 2) {
        const candidate = sampleRoute(this.route, s.distance + ahead);
        if (!blockedRouteSection([s.position, candidate], this.track)) { target = candidate; break; }
      }
    }
    const wantedHeading = Math.atan2(target.x - s.position.x, target.z - s.position.z);
    const wantedRate = clamp(angleDelta(s.heading, wantedHeading) * RULES.steeringResponse, -RULES.steeringRate, RULES.steeringRate);
    s.steeringRate += (wantedRate - s.steeringRate) * (1 - Math.exp(-RULES.steeringSmoothing * dt));
    const oldHeading = s.heading;
    s.heading += s.steeringRate * dt;

    let travelHeading = s.speed > 0.05 ? Math.atan2(s.velocity.x, s.velocity.z) : s.heading;
    const slip = angleDelta(travelHeading, s.heading);
    // Tire force bends momentum toward the steered heading. At high speed it cannot turn fast enough.
    const turnRate = clamp(slip * surface.response, -surface.grip / Math.max(2, s.speed), surface.grip / Math.max(2, s.speed));
    travelHeading += turnRate * dt;
    let speed = Math.max(0, s.speed + s.acceleration * dt) * Math.exp(-RULES.sandDrag * surface.sandAmount * dt);
    let vx = Math.sin(travelHeading) * speed, vz = Math.cos(travelHeading) * speed;
    if (now < s.thrustUntil) { vx += Math.sin(s.heading) * RULES.thrustAcceleration * dt; vz += Math.cos(s.heading) * RULES.thrustAcceleration * dt; }
    speed = Math.hypot(vx, vz);
    if (speed > RULES.maxSpeed) { vx *= RULES.maxSpeed / speed; vz *= RULES.maxSpeed / speed; speed = RULES.maxSpeed; }
    const oldPosition = s.position;
    const proposed = roadPoint({ x: oldPosition.x + (s.velocity.x + vx) / 2 * dt, z: oldPosition.z + (s.velocity.z + vz) / 2 * dt },this.track,s.position.courseProgress);
    const nextHeight = this.track.supports || this.track.sections ? groundHeight(proposed, this.track) : 0;
    const collision = sweepVehicle(oldPosition, proposed, oldHeading, s.heading, { x: vx, z: vz }, this.track, s.elevation, nextHeight);
    s.position = roadPoint(collision.position,this.track,proposed.courseProgress); s.velocity = collision.velocity; s.speed = speed = Math.hypot(s.velocity.x, s.velocity.z);
    vx = s.velocity.x; vz = s.velocity.z;
    if (collision.collided) {
      this.collisionNearbyUntil = now + 3;
      if (collision.impact > 1.5 && s.tick - this.lastCollisionTick > 24) {
        s.collisionCount++; this.lastCollisionTick = s.tick;
        this.events.push({ type: 'collision', time: now, point: collision.point, intensity: collision.impact });
      }
    }
    if (this.track.supports || this.track.sections) {
      const takeoff = takeoffCrossing(oldPosition, s.position, this.track);
      if (takeoff) {
        s.activeJump = takeoff.jump.id; this.invalidFlight = !this.route.jumps?.includes(takeoff.jump.id);
        s.flightOrigin = takeoff.jump.kind==='crest'?'crest':'ramp'; s.flightStartedAt = now + dt * takeoff.t;
        this.assistFlight(RULES.flightLaunchCorrection);
        s.movement = 'airborne'; s.verticalVelocity = (takeoff.jump.launchBoost ?? FLIGHT_RULES.rampLaunchBoost) + Math.max(0, s.velocity.x * takeoff.jump.forward.x + s.velocity.z * takeoff.jump.forward.z) * (takeoff.jump.launchSlope ?? takeoff.jump.lipHeight / takeoff.jump.rampLength);
        const remaining = dt * (1 - takeoff.t);
        s.elevation = (takeoff.jump.takeoffElevation ?? takeoff.jump.lipHeight) + s.verticalVelocity * remaining - FLIGHT_RULES.gravity * remaining * remaining / 2;
        s.verticalVelocity -= FLIGHT_RULES.gravity * remaining;
        s.acceleration = 0; s.drifting = false;
        this.events.push({ type: 'takeoff', time: now + dt * takeoff.t, point: { ...s.position } });
      } else if (!supported(s.position, this.track)) {
        s.movement = 'airborne'; s.flightOrigin = 'fall'; s.flightStartedAt = now; s.activeJump = null; this.invalidFlight = true; s.verticalVelocity = 0; s.acceleration = 0;
      } else s.elevation = nextHeight;
    }
    return oldPosition;
  }
  /** Arcade flight guidance rotates momentum, never adding speed or rescuing reverse travel. */
  private flightHeading() {
    const s = this.state;
    const jump = this.track.jumps?.find(j => j.id === s.activeJump);
    const progress = this.projectNear(s.position).progress;
    const target = sampleRoute(this.route, progress + Math.max(8, s.speed * 0.45));
    return jump ? Math.atan2(jump.forward.x, jump.forward.z) : Math.atan2(target.x - s.position.x, target.z - s.position.z);
  }
  private assistFlight(maxTurn: number) {
    const s = this.state;
    if (s.flightOrigin === 'fall' || this.invalidFlight || s.speed < 0.05) return;
    const desired = this.flightHeading();
    const travel = Math.atan2(s.velocity.x, s.velocity.z), delta = angleDelta(travel, desired);
    if (Math.cos(delta) <= 0) return;
    const heading = travel + clamp(delta, -maxTurn, maxTurn), speed = Math.hypot(s.velocity.x, s.velocity.z);
    s.velocity = { x: Math.sin(heading) * speed, z: Math.cos(heading) * speed };
  }
  private integrateFlight(dt: number, now: number): Point | null {
    const s = this.state, old = { ...s.position }, oldHeight = s.elevation;
    this.assistFlight(RULES.flightTurnRate * dt);
    const oldHeading = s.heading, travelHeading = s.speed > 0.05 ? Math.atan2(s.velocity.x, s.velocity.z) : s.flightOrigin === 'hop' ? this.flightHeading() : s.heading;
    s.heading += clamp(angleDelta(s.heading, travelHeading), -RULES.steeringRate * dt, RULES.steeringRate * dt);
    let vx = s.velocity.x, vz = s.velocity.z;
    if (now < s.thrustUntil) { vx += Math.sin(travelHeading) * RULES.thrustAcceleration * dt; vz += Math.cos(travelHeading) * RULES.thrustAcceleration * dt; }
    const speed = Math.hypot(vx, vz); if (speed > RULES.maxSpeed) { vx *= RULES.maxSpeed / speed; vz *= RULES.maxSpeed / speed; }
    const proposed = roadPoint({ x: old.x + (s.velocity.x + vx) * dt / 2, z: old.z + (s.velocity.z + vz) * dt / 2 },this.track,old.courseProgress);
    // A manual hop may enter the existing authored ramp in flight, but never create a new water shortcut.
    if (!s.activeJump && s.flightOrigin === 'hop') {
      const entry = this.track.jumps?.find(j => this.route.jumps?.includes(j.id)
        && (j.kind!=='crest'||Math.abs((old.courseProgress??0)-j.entryProgress)<90)
        // Claim the natural-crest corridor before the airborne car's nose leaves
        // support. Waiting for its centre to cross the lip falsely invalidates
        // a manual hop made just before the crest. Ordinary ramps keep their gate.
        && jumpCoordinates(old, j).along <= 0 && jumpCoordinates(proposed, j).along > (j.kind==='crest' ? -this.track.carLength : 0)
        && Math.abs(jumpCoordinates(proposed, j).across) <= (j.width - this.track.carWidth) / 2);
      if (entry) s.activeJump = entry.id;
    }
    const jump = this.track.jumps?.find(j => j.id === s.activeJump), corridor = jump ? jumpCoordinates(proposed, jump) : null;
    const approved = !!jump && !!corridor && !!this.route.jumps?.includes(jump.id)
      && corridor.along >= (s.flightOrigin === 'hop' ? -this.track.carLength : jump.rampLength - 0.1)
      && corridor.along <= jump.corridorLength && Math.abs(corridor.across) <= (jump.width - this.track.carWidth) / 2;
    if (s.flightOrigin === 'fall' || jump && !approved || !vehicleSupported(proposed, s.heading, this.track) && !approved) this.invalidFlight = true;
    const gravity = flightGravity(s.flightOrigin);
    let height = oldHeight + s.verticalVelocity * dt - gravity * dt * dt / 2;
    const landingHeight = jump?.kind==='crest' ? jump.landingElevation! : groundHeight(proposed, this.track);
    // Check the support at the actual crossing, not merely at the end of the step.
    const oldGround = jump?.kind==='crest' ? jump.landingElevation! : groundHeight(old, this.track);
    const crossing = oldHeight >= oldGround && height <= landingHeight && (s.verticalVelocity - gravity * dt < 0 || landingHeight > oldGround);
    const fraction = crossing ? clamp((oldHeight - oldGround) / Math.max(1e-9, oldHeight - oldGround - height + landingHeight), 0, 1) : 1;
    const at = this.track.sections ? roadPoint({x:lerp(old.x,proposed.x,fraction),z:lerp(old.z,proposed.z,fraction)},this.track,proposed.courseProgress) : { x: lerp(old.x, proposed.x, fraction), z: lerp(old.z, proposed.z, fraction) };
    const lands = !this.invalidFlight && crossing && vehicleSupported(at, s.heading, this.track);
    if (lands) height = landingHeight;
    // Only a compiled manual-hop corridor can grant actual-height clearance of its authored obstacle.
    const collision = sweepVehicle(old, proposed, oldHeading, s.heading, { x: vx, z: vz }, this.track, oldHeight, height, true, this.allowedHopBarriers(proposed));
    s.position = roadPoint(collision.position,this.track,proposed.courseProgress); s.velocity = collision.velocity; s.elevation = height; s.verticalVelocity -= gravity * dt;
    s.speed = Math.hypot(s.velocity.x, s.velocity.z); s.drifting = false; s.sandAmount = 0; s.acceleration = 0; s.steeringRate = 0;
    if (collision.collided && collision.impact > 1.5 && s.tick - this.lastCollisionTick > 24) {
      this.lastCollisionTick = s.tick; s.collisionCount++; this.markContact(now);
      this.events.push({ type: 'collision', time: now, point: collision.point, intensity: collision.impact });
    }
    if (lands && vehicleSupported(s.position, s.heading, this.track)) {
      this.events.push({ type: 'landing', time: now + fraction * dt, point: { ...at }, intensity: Math.abs(s.verticalVelocity) });
      s.movement = 'grounded'; s.activeJump = null; s.flightOrigin = null; s.verticalVelocity = 0; s.elevation = groundHeight(s.position, this.track); this.invalidFlight = false;
    }
    if(this.track.sections && !lands && (this.invalidFlight && now-s.flightStartedAt>.15 || jump?.kind==='crest'&&height<landingHeight&&s.verticalVelocity<0)){
      this.events.push({type:'collision',time:now+dt,point:{...s.position},intensity:8});this.recover(now+dt);return null;
    }
    if (this.invalidFlight && height <= 0 && vehicleSupported(s.position, s.heading, this.track)) {
      this.events.push({ type: 'collision', time: now + dt, point: { ...s.position }, intensity: Math.abs(s.verticalVelocity) }); this.recover(now + dt); return null;
    }
    if (s.elevation <= FLIGHT_RULES.waterHeight + 0.4) {
      this.events.push({ type: 'splash', time: now + dt, point: { ...s.position } }); this.recover(now + dt); return null;
    }
    return old;
  }
  /** Credit only final physical movement, after every contact has been resolved. */
  commitMotion(oldPosition: Point, dt: number, now: number, motionBudget = distance(oldPosition, this.state.position)) {
    const s = this.state; if(this.track.sections){s.position=roadPoint(s.position,this.track,sampleRoute(this.route,s.distance).courseProgress);s.supportSectionId=s.position.sectionId;} const surface = sampleSurface(s.position, this.track);
    s.speed = Math.hypot(s.velocity.x, s.velocity.z);
    s.slipAngle = s.speed > 0.05 ? angleDelta(Math.atan2(s.velocity.x, s.velocity.z), s.heading) : 0;
    const wasDrifting = s.drifting;
    const tiresSaturated = Math.abs(s.slipAngle) * surface.response * s.speed > surface.grip * 0.95;
    s.drifting = s.movement === 'grounded' && s.speed > 6 && Math.abs(s.slipAngle) > (wasDrifting ? RULES.driftEndAngle : RULES.driftStartAngle) && (wasDrifting || tiresSaturated || s.lineError > 1.5);
    if (s.drifting && !wasDrifting) { s.driftCount++; this.events.push({ type: 'drift', time: now }); }

    // Illegal water/corridor travel cannot finish or collect checkpoints before recovery.
    if (s.movement === 'airborne' && this.invalidFlight) { s.time = now + dt; return; }

    if (this.gridPending) {
      const a = this.track.start, b = this.track.centerline[1], dx = b.x - a.x, dz = b.z - a.z;
      if ((s.position.x - a.x) * dx + (s.position.z - a.z) * dz < 0) {
        if (now < this.collisionNearbyUntil) this.stuckTicks += dt / RULES.dt;
        if (this.stuckTicks >= 120) this.recover(now);
        return;
      }
      this.gridPending = false;
    }
    const gateDistance = s.checkpoint * this.route.length / 8;
    const projection = this.projectNear(s.position), previous = s.distance;
    s.lineError = projection.gap;
    // Credit physical progress, not the distance a virtual car would have covered on the line.
    s.distance = Math.max(previous, Math.min(projection.progress, previous + Math.min(distance(oldPosition, s.position), motionBudget) * 1.5));
    if (s.distance >= gateDistance) {
      if (distance(s.position, sampleRoute(this.route, gateDistance)) <= this.track.roadWidth * 0.8) s.checkpoint++;
      else s.distance = Math.max(previous, gateDistance - 0.001);
    }
    const movement = s.distance - previous;
    const inHopBranch = this.route.hopShortcuts?.some(h => s.distance % this.route.length >= h.entryDistance - this.track.carLength && s.distance % this.route.length <= h.exitDistance + this.track.carLength);
    const inBranch = inHopBranch || this.track.jumps?.some(j => { const c = jumpCoordinates(s.position, j); return this.route.jumps?.includes(j.id) && c.along > jumpCoordinates(j.branch[0],j).along-this.track.carLength/2 && c.along < j.corridorLength && Math.abs(c.across) < j.width; });
    if (s.movement === 'grounded' && !inBranch && vehicleSupported(s.position, s.heading, this.track) && s.lineError < 1 && !barrierContact(s.position, s.heading, this.track, 0.4, this.track.sections?s.elevation:0)) this.lastSafeDistance = s.distance;
    if (s.distance - this.progressAnchor > 0.5) { this.progressAnchor = s.distance; this.stuckTicks = 0; }
    else if (now < this.collisionNearbyUntil) this.stuckTicks += dt / RULES.dt;
    else this.stuckTicks = 0;
    if (this.stuckTicks >= 120) {
      this.recover(now);
    }
    s.time = now + dt;
    const boundary = s.lap * this.route.length;
    if (s.distance >= boundary) {
      const crossing = now + (boundary - previous) / Math.max(1e-9, movement) * dt;
      s.lapTimes.push(crossing - s.lapStartedAt);
      s.lapStartedAt = crossing;
      if (s.lap === this.lapCount) {
        s.finished = true; s.finishTime = crossing; s.distance = boundary;
        this.events.push({ type: 'finish', time: crossing });
      } else { s.lap++; this.events.push({ type: 'lap', time: crossing }); }
    }
  }
}

/** Bounded fixed-step clock. Long interruptions are handled by the session's pause state. */
export class FixedStepClock {
  accumulator = 0;
  advance(seconds: number, step: () => void) {
    this.accumulator += clamp(seconds, 0, 0.15);
    let count = 0;
    while (this.accumulator + 1e-10 >= RULES.dt && count < 10) { step(); this.accumulator -= RULES.dt; count++; }
    return clamp(this.accumulator / RULES.dt, 0, 1);
  }
  reset() { this.accumulator = 0; }
}
