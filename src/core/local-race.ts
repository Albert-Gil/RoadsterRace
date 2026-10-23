import { clamp, lerp, modulo, projectToPolyline } from './geometry';
import { barrierContact } from './barriers';
import { projectCourse } from './route-cleanup';
import { contactImpulse, vehicleContact, sweptContact, separateBody, CONTACT_RULES, type ContactBody } from './vehicle-contact';
import { RaceSimulation, RULES } from './simulation';
import { DEFAULT_LAPS, validateLapCount } from './race-options';
import type { CompiledRoute, RaceEvent, TrackDefinition } from './types';
import { startGate } from './start-finish';
import { vehicleSupported } from './support';

export interface Standing {
  player: number;
  rank: number;
  progress: number;
  finished: boolean;
  finishTime: number | null;
}

export function gridPose(track: TrackDefinition, slot: number, across?: number) {
  const gate = startGate(track), a = gate.center, heading = Math.atan2(gate.forward.x, gate.forward.z);
  const back = 3.2 + Math.floor(slot / 2) * 6, side = across ?? (slot % 2 ? 1.6 : -1.6);
  return { x: a.x - Math.sin(heading) * back + Math.cos(heading) * side, z: a.z - Math.cos(heading) * back - Math.sin(heading) * side, heading };
}
/** Keep each driver near their own crossing anchor, without overlapping a neighbour. */
export function startingGrid(track: TrackDefinition, routes: CompiledRoute[], rotation = 0) {
  const gate = startGate(track), right = { x: gate.forward.z, z: -gate.forward.x };
  const limit = (gate.width - track.carWidth) / 2 - 0.2;
  const occupied: ReturnType<typeof gridPose>[] = [], poses = new Array<ReturnType<typeof gridPose>>(routes.length);
  for (let slot = 0; slot < routes.length; slot++) {
    const player = modulo(slot - rotation, routes.length), anchor = routes[player].points[0];
    const preferred = clamp((anchor.x - gate.center.x) * right.x + (anchor.z - gate.center.z) * right.z, -limit, limit);
    const candidates = [preferred, ...Array.from({ length: Math.ceil(limit * 8) + 1 }, (_, i) => clamp(-limit + i * 0.25, -limit, limit))];
    candidates.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred));
    const pose = candidates.map(across => gridPose(track, slot, across)).find(p => {
      const body = { position: p, velocity: { x: 0, z: 0 }, heading: p.heading };
      return !barrierContact(p, p.heading, track, 0.15) && vehicleSupported(p, p.heading, track)
        && !occupied.some(other => vehicleContact(body, { position: other, velocity: { x: 0, z: 0 }, heading: other.heading }, { ...track, carWidth: track.carWidth + 0.25 }));
    });
    if (!pose) throw new Error('The starting grid has no safe space for this driver.');
    poses[player] = pose; occupied.push(pose);
  }
  return poses;
}
/** Owns one shared clock; each car retains independent physics and ability state. */
export class LocalRace {
  readonly racers: RaceSimulation[];
  private courseMaps: number[][];
  tick = 0;
  private contactEvents: (RaceEvent & { player: number })[] = [];
  private pairLastImpact = new Map<string, number>();
  private pairLastScrape = new Map<string, number>();
  contactCount = 0;

  constructor(readonly routes: CompiledRoute[], readonly track: TrackDefinition, readonly lapCount: number = DEFAULT_LAPS, readonly gridRotation = 0) {
    validateLapCount(lapCount);
    if (routes.length < 1 || routes.length > 4) throw new Error('A local race needs one to four players.');
    if (routes.some(route => route.trackId !== track.id)) throw new Error('All players must race on the same circuit.');
    this.racers = routes.map(route => new RaceSimulation(route, track, lapCount));
    const grid = routes.length > 1 ? startingGrid(track, routes, gridRotation) : [];
    if (routes.length > 1) this.racers.forEach((racer, i) => {
      const pose = grid[i];
      if (barrierContact(pose, pose.heading, track)) throw new Error('The starting grid is blocked.');
      racer.state.position = { x: pose.x, z: pose.z }; racer.state.heading = pose.heading; racer.gridPending = true;
    });
    // Rank by progress around the common circuit, not by metres along differently sized lines.
    this.courseMaps = routes.map(route => {
      const projected = route.points.map(point => track.jumps?.length ? projectCourse(point, track).progress : projectToPolyline(point, track.centerline, track.distances).progress);
      let unwrapped = 0;
      const values = [0];
      for (let i = 1; i < projected.length; i++) {
        let delta = projected[i] - projected[i - 1];
        if (delta < -track.length / 2) delta += track.length;
        if (delta > track.length / 2) delta -= track.length;
        unwrapped += delta;
        values.push(Math.max(values[i - 1], unwrapped));
      }
      const length = values.at(-1)!;
      return values.map(value => clamp(value / Math.max(1e-9, length), 0, 1) * track.length);
    });
  }

  get time() { return this.tick * RULES.dt; }
  get ghostStartRemaining() { return this.racers.length > 1 ? Math.max(0, CONTACT_RULES.ghostStartSeconds - this.time) : 0; }
  get finished() { return this.racers.every(racer => racer.state.finished); }
  pressThrust(player: number) { this.racers[player]?.pressThrust(); }
  pressHop(player: number) { this.racers[player]?.pressHop(); }
  clearCommands() { this.racers.forEach(racer => racer.clearCommands()); }
  step() {
    if (this.finished) return;
    const active = this.racers.map(r => !r.state.finished), dt = RULES.dt / 2;
    for (let sub = 0; sub < 2; sub++) {
      const now = this.time + sub * dt;
      const contactsEnabled = this.racers.length === 1 || now >= CONTACT_RULES.ghostStartSeconds;
      const enabled = this.racers.map(r => !r.state.finished && now >= r.state.recoveringUntil);
      // A recovering car remains absent until its last safe position is unoccupied.
      this.racers.forEach((r, i) => {
        if (contactsEnabled && r.state.recoveringUntil >= 0 && now >= r.state.recoveringUntil && (r.state.recoveryWaiting || now < r.state.recoveringUntil + dt * 1.1)) {
          r.state.recoveryWaiting = this.racers.some((other, j) => j !== i && enabled[j] && vehicleContact(r.state, other.state, this.track));
          if (r.state.recoveryWaiting) { r.state.recoveringUntil = now + dt; enabled[i] = false; }
        }
      });
      const before = this.racers.map(r => ({ position: { ...r.state.position }, velocity: { ...r.state.velocity }, heading: r.state.heading, elevation: r.state.elevation }));
      const old = this.racers.map(r => r.integrate(dt, now));
      // A water failure can enter recovery during integration. Remove that car
      // from this very contact pass, not only from the following substep.
      this.racers.forEach((r, i) => { if (now < r.state.recoveringUntil || r.state.recoveryWaiting) enabled[i] = false; });
      const budgets = this.racers.map((r, i) => Math.hypot(r.state.position.x - before[i].position.x, r.state.position.z - before[i].position.z));
      for (let pass = 0; contactsEnabled && pass < CONTACT_RULES.passes; pass++) {
        // Jacobi corrections: all pair impulses read the same snapshot, then apply together.
        const bodies: ContactBody[] = this.racers.map(r => ({ position: { ...r.state.position }, velocity: { ...r.state.velocity }, heading: r.state.heading, elevation: r.state.elevation }));
        const deltas = bodies.map(() => ({ position: { x: 0, z: 0 }, velocity: { x: 0, z: 0 } }));
        for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
          if (!enabled[i] || !enabled[j]) continue;
          const a = { ...bodies[i], position: { ...bodies[i].position }, velocity: { ...bodies[i].velocity } }, b = { ...bodies[j], position: { ...bodies[j].position }, velocity: { ...bodies[j].velocity } };
          const sweep = pass === 0 ? sweptContact(before[i], a, before[j], b, this.track) : null;
          let contact = vehicleContact(a, b, this.track);
          if (!contact && sweep && sweep.t > 0) { a.position = sweep.a; b.position = sweep.b; contact = sweep; }
          if (!contact) continue;
          const impact = contactImpulse(a, b, contact.normal), depth = Math.min(contact.depth + 0.002, this.track.carWidth) / 2;
          a.position.x -= contact.normal.x * depth; a.position.z -= contact.normal.z * depth;
          b.position.x += contact.normal.x * depth; b.position.z += contact.normal.z * depth;
          for (const [index, body] of [[i, a], [j, b]] as const) {
            deltas[index].position.x += body.position.x - bodies[index].position.x; deltas[index].position.z += body.position.z - bodies[index].position.z;
            deltas[index].velocity.x += body.velocity.x - bodies[index].velocity.x; deltas[index].velocity.z += body.velocity.z - bodies[index].velocity.z;
            this.racers[index].markContact(now);
          }
          const key = `${i}:${j}`;
          if (impact > 1.5 && now - (this.pairLastImpact.get(key) ?? -Infinity) >= 0.12) {
            this.pairLastImpact.set(key, now); this.contactCount++; this.racers[i].state.collisionCount++; this.racers[j].state.collisionCount++;
            this.contactEvents.push({ type: 'car-impact', player: i, otherPlayer: j, time: now, point: contact.point, intensity: impact });
          } else if (Math.hypot(a.velocity.x - b.velocity.x, a.velocity.z - b.velocity.z) > 2 && now - (this.pairLastScrape.get(key) ?? -Infinity) >= 0.25) {
            this.pairLastScrape.set(key, now); this.contactEvents.push({ type: 'scrape', player: i, otherPlayer: j, time: now, intensity: 0.25 });
          }
        }
        this.racers.forEach((r, i) => {
          if (!enabled[i]) return;
          r.state.velocity.x += deltas[i].velocity.x; r.state.velocity.z += deltas[i].velocity.z;
          separateBody(r.state, deltas[i].position, this.track);
          const speed = Math.hypot(r.state.velocity.x, r.state.velocity.z);
          if (speed > RULES.maxSpeed) { r.state.velocity.x *= RULES.maxSpeed / speed; r.state.velocity.z *= RULES.maxSpeed / speed; }
          r.state.speed = Math.hypot(r.state.velocity.x, r.state.velocity.z);
        });
      }
      this.racers.forEach((r, i) => { if (old[i]) r.commitMotion(old[i]!, dt, now, budgets[i]); });
    }
    this.racers.forEach((r, i) => { if (active[i]) r.finishTick(); });
    this.tick++;
  }
  drainEvents(): (RaceEvent & { player: number })[] {
    return [...this.contactEvents.splice(0), ...this.racers.flatMap((racer, player) => racer.drainEvents().map(event => ({ ...event, player })))];
  }
  courseProgress(player: number) {
    const racer = this.racers[player], route = this.routes[player], values = this.courseMaps[player];
    if (racer.state.finished) return this.lapCount * this.track.length;
    const laps = Math.floor(racer.state.distance / route.length);
    const t = modulo(racer.state.distance, route.length) / route.length * (values.length - 1);
    const i = Math.min(values.length - 2, Math.floor(t));
    return laps * this.track.length + lerp(values[i], values[i + 1], t - i);
  }
  standings(): Standing[] {
    const ordered = this.racers.map((racer, player) => ({ player, progress: this.courseProgress(player), finished: racer.state.finished, finishTime: racer.state.finishTime, rank: 0 }));
    // Displayed hundredths define a tie; array order must never award a false winner.
    const hundredths = (value: number) => Math.round(value * 100);
    ordered.sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return a.finished ? hundredths(a.finishTime!) - hundredths(b.finishTime!) : b.progress - a.progress;
    });
    ordered.forEach((standing, i) => {
      const previous = ordered[i - 1];
      const tied = previous && standing.finished === previous.finished && (standing.finished
        ? hundredths(standing.finishTime!) === hundredths(previous.finishTime!)
        : Math.abs(standing.progress - previous.progress) < 0.01);
      standing.rank = tied ? previous.rank : i + 1;
    });
    return ordered;
  }
}
