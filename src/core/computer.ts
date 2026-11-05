import { angleDelta, clamp, distance, modulo } from './geometry';
import { blockedRouteSection } from './barriers';
import { flightGravity, groundHeight, vehicleSupported } from './support';
import { compileRoute, createPracticeSamples, sampleRoute, PACE_RANGE } from './route';
import { RULES, sampleSurface } from './simulation';
import type { CompiledRoute, TrackDefinition } from './types';
import type { Difficulty } from './session';
import type { LocalRace } from './local-race';
import { trackSurface } from './surfaces';

export const AI_TUNING = { easy: 0.90, normal: 0.97, hard: 1 } as const;
/** Planning/controller compatibility is independent of unchanged human vehicle physics. */
export const COMPUTER_VERSION = 2;
export const AI_DRIVING = Object.freeze({ decisionTicks: 12, cornerGripShare: 0.64, brakingShare: 0.65, responseSeconds: 0.45, followingSeconds: 0.65, trafficRange: 32, minimumGap: 2.5, lineOffset: 1.8, lineVariation: .22, gripSampleSpacing: 4 });
const gripProfiles = new WeakMap<CompiledRoute, { track: TrackDefinition; values: Float64Array }>();
/** Immutable planned terrain is sampled once, not repeatedly on every ability decision.
 * The lower neighbouring grip is conservative at a surface transition. Curvature
 * and traffic are still evaluated live, and the simulation always samples reality.
 */
function plannedGrip(route: CompiledRoute, track: TrackDefinition, at: number) {
  let profile = gripProfiles.get(route);
  if (!profile || profile.track !== track) {
    const count = Math.ceil(route.length / AI_DRIVING.gripSampleSpacing);
    profile = { track, values: Float64Array.from({ length: count + 1 }, (_, i) => sampleSurface(sampleRoute(route, i / count * route.length), track).grip) };
    gripProfiles.set(route, profile);
  }
  const index = Math.min(profile.values.length - 2, Math.floor(modulo(at, route.length) / route.length * (profile.values.length - 1)));
  return Math.min(profile.values[index], profile.values[index + 1]);
}
export function computerRoute(track: TrackDefinition, difficulty: Difficulty, opponent: number, seed: number): CompiledRoute {
  const wantsJump = difficulty === 'hard' ? opponent < 2 : difficulty === 'normal' && opponent === 0;
  const raw = createPracticeSamples(track,7,wantsJump);
  const phase = ((Math.imul(seed ^ (opponent+1),1664525)>>>0)%628)/100;
  const varied = raw.map((p,i,a)=>{
    const before=a[Math.max(0,i-1)],after=a[Math.min(a.length-1,i+1)],d=distance(before,after)||1;
    // Independent, modest lane choices make room for passes without following the human.
    const offset=([-AI_DRIVING.lineOffset,AI_DRIVING.lineOffset,0][opponent%3])+Math.sin(i/(a.length-1)*Math.PI*2+phase)*AI_DRIVING.lineVariation;
    return {...p,x:p.x-(after.z-before.z)/d*offset,z:p.z+(after.x-before.x)/d*offset};
  });
  let result = compileRoute(varied,track);
  const safe = (r: ReturnType<typeof compileRoute>) => r.ok && !r.route.hazards?.length;
  if(!safe(result)) result=compileRoute(raw,track);
  if(!safe(result)) result=compileRoute(createPracticeSamples(track,7,false),track);
  if(!result.ok || result.route.hazards?.length)throw new Error(`No safe computer plan for ${track.name}`);
  const route=result.route, factor=AI_TUNING[difficulty]*(0.99+opponent*0.01);
  route.points.forEach(p=>{p.desiredSpeed=clamp(Math.sqrt(trackSurface(track).grip*AI_DRIVING.cornerGripShare/Math.max(0.008,Math.abs(p.curvature)))*factor,PACE_RANGE.min,Math.min(PACE_RANGE.max,PACE_RANGE.max*factor));});
  if(track.sections)for(const p of route.points)for(const j of track.jumps??[])if(j.kind==='crest'&&p.courseProgress!>=j.entryProgress&&p.courseProgress!<=j.exitProgress)p.desiredSpeed=Math.max(22,p.desiredSpeed);
  // No braking in flight: arrive at a ski crest with the landing bend already planned.
  for(const p of route.points)for(const j of track.terrainTakeoffs??[])if(p.courseProgress!>=j.progress-12&&p.courseProgress!<=j.progress+48)p.desiredSpeed=Math.min(p.desiredSpeed,j.planningSpeed*factor);
  // Work around the seam too: braking for turn one starts on the previous lap.
  const count=route.points.length-1;
  for(let pass=0;pass<3;pass++)for(let i=count-1;i>=0;i--){
    const p=route.points[i],n=route.points[(i+1)%count];
    p.desiredSpeed=Math.min(p.desiredSpeed,Math.sqrt(n.desiredSpeed*n.desiredSpeed+2*RULES.braking*AI_DRIVING.brakingShare*distance(p,n)));
  }
  route.points.at(-1)!.desiredSpeed=route.points[0].desiredSpeed;
  return route;
}

/** Same-level traffic ahead of the actual momentum, not merely any nearby car. */
export function computerTraffic(race: LocalRace, player: number): {gap:number;speed:number}|null {
  if (race.ghostStartRemaining > 0) return null;
  const s=race.racers[player].state,heading=s.speed>1?Math.atan2(s.velocity.x,s.velocity.z):s.heading;
  const forward={x:Math.sin(heading),z:Math.cos(heading)};
  let nearest: {gap:number;speed:number}|null=null;
  race.racers.forEach((r,i)=>{
    const o=r.state;
    const sameHillside=race.track.terrain&&s.movement==='grounded'&&o.movement==='grounded';
    if(i===player||o.finished||o.recoveryWaiting||o.time<o.recoveringUntil||(!sameHillside&&Math.abs(o.elevation-s.elevation)>1.2))return;
    const x=o.position.x-s.position.x,z=o.position.z-s.position.z,along=x*forward.x+z*forward.z,across=x*forward.z-z*forward.x;
    if(along<=0||along>AI_DRIVING.trafficRange||Math.abs(across)>race.track.carWidth*1.15)return;
    // A car pulling clear laterally need not hold up both lanes. Keep close
    // contacts conservative; only ignore a safely separated, opening gap.
    const sideways=(o.velocity.x-s.velocity.x)*forward.z-(o.velocity.z-s.velocity.z)*forward.x;
    if(Math.abs(across)>race.track.carWidth+.2&&across*sideways>0&&Math.abs(across+sideways*.4)>race.track.carWidth+.5)return;
    const gap=Math.max(0,along-race.track.carLength),speed=Math.max(0,o.velocity.x*forward.x+o.velocity.z*forward.z);
    if(!nearest||gap<nearest.gap)nearest={gap,speed};
  });
  return nearest;
}

/** Lift early for traffic or a slide; use ordinary acceleration/braking to regain control. */
export function computerPaceLimit(race: LocalRace,player:number) {
  const s=race.racers[player].state;
  let limit=Infinity;
  if(s.movement==='grounded'&&(Math.abs(s.slipAngle)>.25||s.lineError>2.5||s.sandAmount>.25))
    limit=Math.max(10,Math.min(s.speed,18));
  const traffic=computerTraffic(race,player);
  if(traffic&&s.movement==='grounded'){
    const desiredGap=AI_DRIVING.minimumGap+s.speed*AI_DRIVING.followingSeconds;
    // Once a legal passing Hop begins, the airborne car no longer follows a ground car.
    limit=Math.min(limit,Math.max(0,traffic.speed+(traffic.gap-desiredGap)/AI_DRIVING.followingSeconds));
  }
  return limit;
}

/** Predict the complete burst and braking room instead of treating every gentle bend as safe. */
export function shouldComputerThrust(race:LocalRace,player:number) {
  const s=race.racers[player].state,route=race.routes[player];
  if(s.finished||s.recoveryWaiting||s.time<s.recoveringUntil||s.time<s.thrustReadyAt||s.speed<5
    ||s.sandAmount>.15||Math.abs(s.slipAngle)>.18||s.lineError>2.5||computerPaceLimit(race,player)<s.speed+1)return false;
  const traffic=computerTraffic(race,player);
  if(traffic&&traffic.gap<AI_DRIVING.minimumGap+s.speed*1.2)return false;
  const boosted=Math.min(RULES.maxSpeed,s.speed+(RULES.thrustAcceleration+RULES.acceleration)*RULES.thrustDuration);
  const burstDistance=(s.speed+boosted)/2*RULES.thrustDuration;
  const responseDistance=boosted*AI_DRIVING.responseSeconds;
  const horizon=Math.max(48,burstDistance+responseDistance+boosted*boosted/(2*RULES.braking*AI_DRIVING.brakingShare));
  for(let ahead=0;ahead<=horizon;ahead+=4){
    const p=sampleRoute(route,s.distance+ahead);
    const inFlight=race.track.jumps?.some(j=>route.jumps?.includes(j.id)&&p.courseProgress!==undefined&&p.courseProgress>=j.entryProgress&&p.courseProgress<=j.exitProgress);
    if(inFlight)continue;
    const grip=plannedGrip(route,race.track,s.distance+ahead);
    const corner=Math.min(RULES.maxSpeed,Math.sqrt(grip*.82/Math.max(.0001,Math.abs(p.curvature))));
    const available=Math.max(0,ahead-burstDistance-responseDistance);
    const predicted=ahead<burstDistance?Math.min(boosted,Math.sqrt(s.speed*s.speed+2*(RULES.thrustAcceleration+RULES.acceleration)*ahead)):boosted;
    if(predicted*predicted>corner*corner+2*RULES.braking*AI_DRIVING.brakingShare*available)return false;
  }
  return true;
}

/** Conservative straight-line prediction, using the same hop impulse and supported surfaces. */
export function shouldComputerHop(race: LocalRace, player: number) {
  const s = race.racers[player].state, track = race.track;
  if (race.ghostStartRemaining > 0 || s.finished || s.recoveryWaiting || s.time < s.recoveringUntil || s.time < s.hopReadyAt
    || s.movement !== 'grounded' || s.speed < 6 || s.sandAmount > 0.2 || Math.abs(s.slipAngle) > 0.18) return false;
  const forward = { x: s.velocity.x / s.speed, z: s.velocity.z / s.speed };
  const blocked = race.racers.some((other, i) => {
    const o = other.state, x = o.position.x - s.position.x, z = o.position.z - s.position.z;
    const along = x * forward.x + z * forward.z, across = x * forward.z - z * forward.x;
    return i !== player && !o.finished && !o.recoveryWaiting && o.time >= o.recoveringUntil && o.movement === 'grounded'
      && Math.abs(o.elevation-s.elevation)<1.2 && along > 0 && along <= 10 && Math.abs(across) < track.carWidth * 1.5 && s.speed - o.speed >= 2;
  });
  if (!blocked) return false;
  const nominalDuration = 2 * RULES.hopLaunchSpeed / flightGravity('hop'), origin = groundHeight(s.position, track);
  const samples = [{ ...s.position }]; let duration = nominalDuration, landed = false;
  // Predict contact with the actual hillside rather than requiring sea-level
  // ground. This also refuses water, cliff-edge flights and a steep rising face.
  for(let n=1;n<=36;n++){
    const t=nominalDuration*1.15*n/36,p={x:s.position.x+s.velocity.x*t,z:s.position.z+s.velocity.z*t};
    if(!vehicleSupported(p,s.heading,track))return false;
    samples.push(p);
    const height=origin+RULES.hopLaunchSpeed*t-.5*flightGravity('hop')*t*t;
    if(height<=groundHeight(p,track)+.03){if(n<16)return false;duration=t;landed=true;break;}
  }
  if(!landed)return false;
  const line = Array.from({ length: 9 }, (_, n) => sampleRoute(race.routes[player], s.distance + s.speed * duration * n / 8));
  if (line.some(p => Math.abs(p.curvature) > 0.012 || Math.abs(angleDelta(Math.atan2(forward.x, forward.z), p.heading)) > Math.PI / 18)
    || blockedRouteSection(samples, track)) return false;
  const landing = samples.at(-1)!;
  return !race.racers.some((other, i) => {
    const o = other.state;
    return i !== player && !o.finished && !o.recoveryWaiting && o.time >= o.recoveringUntil
      && distance(landing, { x: o.position.x + o.velocity.x * duration, z: o.position.z + o.velocity.z * duration }) < track.carLength + 0.5;
  });
}

/** Decisions use only the shared fixed clock and legal ability commands. */
export function stepComputers(race: LocalRace, _difficulty: Difficulty) {
  for(let i=1;i<race.racers.length;i++){
    // Small fixed reaction offsets, independent of render rate and real time.
    if((race.tick+(i-1)*4)%AI_DRIVING.decisionTicks!==0)continue;
    const s=race.racers[i].state;
    if(s.finished||s.recoveryWaiting||s.time<s.recoveringUntil)continue;
    race.racers[i].setPaceLimit(computerPaceLimit(race,i));
    if(shouldComputerHop(race,i))race.pressHop(i);
    if(shouldComputerThrust(race,i))race.pressThrust(i);
  }
}
