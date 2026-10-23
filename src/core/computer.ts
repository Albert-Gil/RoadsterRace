import { clamp, distance } from './geometry';
import { compileRoute, createPracticeSamples, sampleRoute, PACE_RANGE } from './route';
import { RULES } from './simulation';
import type { CompiledRoute, TrackDefinition } from './types';
import type { Difficulty } from './session';
import type { LocalRace } from './local-race';

export const AI_TUNING = { easy: 0.90, normal: 0.97, hard: 1 } as const;
export function computerRoute(track: TrackDefinition, difficulty: Difficulty, opponent: number, seed: number): CompiledRoute {
  const wantsJump = difficulty === 'hard' ? opponent < 2 : difficulty === 'normal' && opponent === 0;
  const raw = createPracticeSamples(track,7,wantsJump);
  const phase = ((Math.imul(seed ^ (opponent+1),1664525)>>>0)%628)/100;
  const varied = raw.map((p,i,a)=>{
    const before=a[Math.max(0,i-1)],after=a[Math.min(a.length-1,i+1)],d=distance(before,after)||1;
    const offset=Math.sin(i/(a.length-1)*Math.PI*2+phase)*0.22;
    return {...p,x:p.x-(after.z-before.z)/d*offset,z:p.z+(after.x-before.x)/d*offset};
  });
  let result = compileRoute(varied,track);
  if(!result.ok) result=compileRoute(raw,track);
  if(!result.ok) result=compileRoute(createPracticeSamples(track,7,false),track);
  if(!result.ok)throw new Error(`No safe computer plan for ${track.name}: ${result.message}`);
  const route=result.route, factor=AI_TUNING[difficulty]*(0.99+opponent*0.01);
  route.points.forEach(p=>{p.desiredSpeed=clamp(Math.sqrt(RULES.asphaltGrip*0.68/Math.max(0.008,Math.abs(p.curvature)))*factor,PACE_RANGE.min,Math.min(PACE_RANGE.max,PACE_RANGE.max*factor));});
  // Anticipate braking rather than giving the controller stronger brakes.
  for(let pass=0;pass<2;pass++)for(let i=route.points.length-2;i>=0;i--){const p=route.points[i],n=route.points[i+1];p.desiredSpeed=Math.min(p.desiredSpeed,Math.sqrt(n.desiredSpeed*n.desiredSpeed+2*RULES.braking*0.65*distance(p,n)));}
  route.points.at(-1)!.desiredSpeed=route.points[0].desiredSpeed;
  return route;
}

/** Decisions use only the shared fixed clock and legal thrust commands. */
export function stepComputers(race: LocalRace, difficulty: Difficulty) {
  if(race.tick%12!==0)return;
  for(let i=1;i<race.racers.length;i++){
    const s=race.racers[i].state,route=race.routes[i];
    if(s.finished||s.recoveryWaiting||s.time<s.recoveringUntil||s.time<s.thrustReadyAt||s.sandAmount>0.2||Math.abs(s.slipAngle)>0.18)continue;
    const traffic=race.racers.some((r,j)=>j!==i&&!r.state.finished&&distance(s.position,r.state.position)<7&&r.state.speed<s.speed+1);
    if(traffic)continue;
    const horizon= s.speed*1.4+8;
    const upcoming=Array.from({length:9},(_,n)=>sampleRoute(route,s.distance+horizon*n/8));
    const safe=upcoming.every(p=>Math.abs(p.curvature)<(difficulty==='easy'?0.018:0.024));
    const jump=race.track.jumps?.find(j=>route.jumps?.includes(j.id)&&j.entryProgress>race.courseProgress(i)%race.track.length&&j.entryProgress-race.courseProgress(i)%race.track.length<30);
    if(safe||jump||s.movement==='airborne')race.pressThrust(i);
  }
}
