import { expect, test } from 'vitest';
import { orbitalTrack as track } from '../../src/core/tracks/orbital';
import { compileRoute, createPracticeSamples, sampleRoute } from '../../src/core/route';
import { FixedStepClock, RaceSimulation } from '../../src/core/simulation';
import { computerRoute } from '../../src/core/computer';
import { distance } from '../../src/core/geometry';
import { permittedHopBarriers, assessHopShortcuts } from '../../src/core/hop-shortcuts';
import { LocalRace } from '../../src/core/local-race';
import { stepComputers } from '../../src/core/computer';
import { barrierContact, sweepVehicle } from '../../src/core/barriers';
import { roadEdges } from '../../src/core/road-geometry';

function plan(shortcut = true) {
  const r = compileRoute(createPracticeSamples(track, 7, shortcut ? 'service-hop' : false), track);
  if (!r.ok) throw Error(r.message); return r.route;
}
test('the complete optional lane compiles and saves 20–35 metres against the safe bypass', () => {
  const main = plan(false), hop = plan();
  expect(hop.hopShortcuts).toHaveLength(1); expect(main.hopShortcuts).toBeUndefined();
  expect(main.length-hop.length).toBeGreaterThanOrEqual(20); expect(main.length-hop.length).toBeLessThanOrEqual(35);
});
test.each([-6,-4,4,6])('the safe bypass retains its normal %i m lateral road line',offset=>{
  const raw=createPracticeSamples(track),edge=roadEdges(track.centerline,Math.abs(offset)*2)[offset<0?0:1];
  const result=compileRoute(raw.map((p,i)=>({...p,...edge[i]})),track);
  expect(result.ok,JSON.stringify(result)).toBe(true);if(result.ok)expect(result.route.hopShortcuts).toBeUndefined();
});
test('reversed and obstacle-end cuts never receive a barrier exemption', () => {
  const branch = track.hopShortcuts![0].branch;
  for (const points of [[...branch].reverse(), branch.map(p => ({x:p.x+7,z:p.z}))])
    expect(assessHopShortcuts(points, track).obstacles).toEqual([]);
  // Compiler v15: joining the lane part-way still commits once the whole car crosses the barrier inside it.
  expect(assessHopShortcuts(branch.slice(15), track).obstacles).toEqual(['service-hop-barrier']);
});
test.each([20,25,30])('a manual hop at %i m/s clears the full obstacle footprint', speed => {
  const route=plan(), sim=new RaceSimulation(route,track,1), s=sim.state;
  const start={x:52,z:-26}; s.position=start; s.heading=0; s.velocity={x:0,z:speed}; s.speed=speed;
  s.distance=route.points.reduce((best,p)=>distance(p,start)<distance(sampleRoute(route,best),start)?p.distance:best,0);
  sim.pressHop(); let peak=0;
  for(let i=0;i<50;i++){sim.step();peak=Math.max(peak,s.elevation);}
  expect(s.position.z).toBeGreaterThan(-12); expect(s.collisionCount).toBe(0); expect(peak).toBeCloseTo(8.028,2);
});
test.each(['none','late','early'])('a %s hop makes physical contact instead of bypassing the obstacle', timing => {
  const route=plan(), sim=new RaceSimulation(route,track,1), s=sim.state;
  s.position={x:52,z:timing==='early'?-50:-21};s.heading=0;s.velocity={x:0,z:25};s.speed=25;
  s.distance=route.points.reduce((best,p)=>distance(p,s.position)<distance(sampleRoute(route,best),s.position)?p.distance:best,0);
  for(let i=0;i<120;i++){ if(timing==='early'&&i===0||timing==='late'&&s.position.z>-20)sim.pressHop();sim.step(); }
  expect(s.collisionCount).toBeGreaterThan(0);
});
test('permission requires compiled traversal, manual flight, forward travel and actual corridor',()=>{
  const route=plan(), sim=new RaceSimulation(route,track);const s=sim.state;
  Object.assign(s,{position:{x:52,z:-16},distance:route.hopShortcuts![0].entryDistance+30,heading:0,speed:25,velocity:{x:0,z:25},movement:'airborne',flightOrigin:'hop'});
  expect(permittedHopBarriers(s,route,track)).toEqual(['service-hop-barrier']);
  expect(permittedHopBarriers({...s,flightOrigin:'ramp'},route,track)).toEqual([]);
  expect(permittedHopBarriers({...s,velocity:{x:0,z:-25}},route,track)).toEqual([]);
  expect(permittedHopBarriers(s,{...route,hopShortcuts:[]},track)).toEqual([]);
  expect(permittedHopBarriers(s,route,track,{x:60,z:-16})).toEqual([]);
});
test.each(['easy','normal','hard'] as const)('all %s CPUs retain the safe bypass', difficulty=>{
  for(let i=0;i<3;i++)expect(computerRoute(track,difficulty,i,42).hopShortcuts).toBeUndefined();
});
test('a six-lap shortcut run finishes with one deliberate hop per lap',()=>{
  const route=plan(), sim=new RaceSimulation(route,track,6);
  for(let i=0;i<18000&&!sim.state.finished;i++) {
    const s=sim.state;
    if(s.position.x>49&&s.position.x<55&&s.position.z>-29&&s.position.z<-25&&s.velocity.z>15)sim.pressHop();
    sim.step();
  }
  expect(sim.state.finished).toBe(true);expect(sim.state.hopCount).toBe(6);
  expect(sim.state.collisionCount).toBe(0);expect(sim.state.recoveryCount).toBe(0);
});
test('recorded shortcut inputs are deterministic across rendering rates',()=>{
  const route=plan();
  const results=[30,60,120].map(fps=>{
    const sim=new RaceSimulation(route,track,1),clock=new FixedStepClock();
    for(let f=0;f<fps*40;f++)clock.advance(1/fps,()=>{
      const s=sim.state;
      if(s.position.x>49&&s.position.x<55&&s.position.z>-29&&s.position.z<-25&&s.velocity.z>15)sim.pressHop();
      sim.step();
    });
    return sim.state;
  });
  expect(results[0].finished).toBe(true);expect(results[0]).toEqual(results[1]);expect(results[1]).toEqual(results[2]);
});
test('a human shortcut and three CPU bypasses finish a shared six-lap race',()=>{
  const routes=[plan(),...Array.from({length:3},(_,i)=>computerRoute(track,'normal',i,42))];
  const race=new LocalRace(routes,track,6);
  for(let i=0;i<24000&&!race.finished;i++){
    const s=race.racers[0].state;
    if(s.position.x>49&&s.position.x<55&&s.position.z>-29&&s.position.z<-25&&s.velocity.z>15)race.pressHop(0);
    stepComputers(race,'normal');race.step();
  }
  expect(race.finished).toBe(true);expect(race.racers.every(r=>r.state.lapTimes.length===6)).toBe(true);
  expect(race.racers[0].state.hopCount).toBeGreaterThanOrEqual(6);
},90000);
test('swept clearance protects the full capsule and all unnamed end sections',()=>{
  const permit=['service-hop-barrier'];
  expect(barrierContact({x:52,z:-16},0,track,0,1.16,true,permit)).toBeNull();
  expect(barrierContact({x:52,z:-16},0,track,0,1.1,true,permit)?.barrier.id).toBe('service-hop-barrier');
  expect(barrierContact({x:61,z:-16},0,track,0,4,true,permit)?.barrier.id).toBe('service-hop-right-end');
  const hit=sweepVehicle({x:52,z:-22},{x:52,z:-10},0,0,{x:0,z:42},track,0,0,true,permit);
  // The weathered face can leave a tiny sliding component after this nearly head-on hit.
  expect(hit.collided).toBe(true);expect(hit.position.z).toBeLessThan(-19);expect(Math.abs(hit.velocity.z)).toBeLessThan(0.1);
  // Even after the nose clears, the tail must not land through the barrier.
  expect(barrierContact({x:52,z:-14},0,track,0,1,true,permit)).not.toBeNull();
});
test('a missed shortcut recovers behind its entry without keeping forward checkpoints',()=>{
  const route=plan(),sim=new RaceSimulation(route,track,1);
  for(let i=0;i<3600&&!sim.state.recoveryCount;i++)sim.step();
  expect(sim.state.recoveryCount).toBe(1);
  expect(sim.state.distance).toBeLessThan(route.hopShortcuts![0].entryDistance);
  expect(sim.state.checkpoint).toBeLessThanOrEqual(2);
  expect(sim.state.speed).toBe(0);expect(sim.state.hopCount).toBe(0);
  expect(sim.state.time).toBeGreaterThan(7);
});
