import { angleDelta, clamp, distance } from './geometry';
import { blockedRouteSection } from './barriers';
import { flightGravity, groundHeight, vehicleSupported } from './support';
import { compileRoute, createPracticeSamples, sampleRoute, PACE_RANGE } from './route';
import { RULES, sampleSurface } from './simulation';
import type { CompiledRoute, TrackDefinition } from './types';
import type { Difficulty } from './session';
import type { LocalRace } from './local-race';

export const AI_TUNING = { easy: 0.90, normal: 0.97, hard: 1 } as const;
export const AI_DRIVING = Object.freeze({ decisionTicks: 12, cornerGripShare: 0.64, brakingShare: 0.65, responseSeconds: 0.45, followingSeconds: 0.65, trafficRange: 32, minimumGap: 2.5 });
export function computerRoute(track: TrackDefinition, difficulty: Difficulty, opponent: number, seed: number): CompiledRoute {
  const wantsJump = difficulty === 'hard' ? opponent < 2 : difficulty === 'normal' && opponent === 0;
  const raw = createPracticeSamples(track,7,wantsJump);
  const phase = ((Math.imul(seed ^ (opponent+1),1664525)>>>0)%628)/100;
  const varied = raw.map((p,i,a)=>{
    const before=a[Math.max(0,i-1)],after=a[Math.min(a.length-1,i+1)],d=distance(before,after)||1;
    // Independent, modest lane choices make room for passes without following the human.
    const offset=([-0.65,0.65,0][opponent%3])+Math.sin(i/(a.length-1)*Math.PI*2+phase)*0.2;
    return {...p,x:p.x-(after.z-before.z)/d*offset,z:p.z+(after.x-before.x)/d*offset};
  });
  let result = compileRoute(varied,track);
  const safe = (r: ReturnType<typeof compileRoute>) => r.ok && !r.route.hazards?.length;
  if(!safe(result)) result=compileRoute(raw,track);
  if(!safe(result)) result=compileRoute(createPracticeSamples(track,7,false),track);
  if(!result.ok || result.route.hazards?.length)throw new Error(`No safe computer plan for ${track.name}`);
  const route=result.route, factor=AI_TUNING[difficulty]*(0.99+opponent*0.01);
  route.points.forEach(p=>{p.desiredSpeed=clamp(Math.sqrt((track.surface==='packed-dirt'?RULES.dirtGrip:RULES.asphaltGrip)*AI_DRIVING.cornerGripShare/Math.max(0.008,Math.abs(p.curvature)))*factor,PACE_RANGE.min,Math.min(PACE_RANGE.max,PACE_RANGE.max*factor));});
  if(track.sections)for(const p of route.points)for(const j of track.jumps??[])if(j.kind==='crest'&&p.courseProgress!>=j.entryProgress&&p.courseProgress!<=j.exitProgress)p.desiredSpeed=Math.max(22,p.desiredSpeed);
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
    if(i===player||o.finished||o.recoveryWaiting||o.time<o.recoveringUntil||Math.abs(o.elevation-s.elevation)>1.2)return;
    const x=o.position.x-s.position.x,z=o.position.z-s.position.z,along=x*forward.x+z*forward.z,across=x*forward.z-z*forward.x;
    if(along<=0||along>AI_DRIVING.trafficRange||Math.abs(across)>race.track.carWidth*1.15)return;
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
    const grip=sampleSurface(p,race.track).grip;
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
  const duration = 2 * RULES.hopLaunchSpeed / flightGravity('hop');
  const samples = Array.from({ length: 25 }, (_, n) => ({ x: s.position.x + s.velocity.x * duration * n / 24, z: s.position.z + s.velocity.z * duration * n / 24 }));
  const line = Array.from({ length: 9 }, (_, n) => sampleRoute(race.routes[player], s.distance + s.speed * duration * n / 8));
  if (line.some(p => Math.abs(p.curvature) > 0.012 || Math.abs(angleDelta(Math.atan2(forward.x, forward.z), p.heading)) > Math.PI / 18)
    || samples.some(p => !vehicleSupported(p, s.heading, track) || groundHeight(p, track) > 0)
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
