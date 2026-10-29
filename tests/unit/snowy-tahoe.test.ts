import { expect,test } from 'vitest';
import { snowyTahoeTrack as track } from '../../src/core/tracks/snowy-tahoe';
import { compileRoute,createPracticeSamples,sampleRoute } from '../../src/core/route';
import { RaceSimulation,RULES,sampleSurface } from '../../src/core/simulation';
import { computerRoute } from '../../src/core/computer';
import { minimumRadius } from '../../src/core/road-geometry';
import { gateCoordinates } from '../../src/core/start-finish';

test('a compact full-width snow course has open bends, a clear gate and an approved timber trail',()=>{
  expect(track.length).toBeGreaterThan(540);expect(track.length).toBeLessThan(610);
  expect(minimumRadius(track.centerline)).toBeGreaterThan(10);
  expect(track.roadWidth).toBe(16);
  const start=gateCoordinates(track.centerline[0],track);expect(start.along).toBe(0);
  for(const branch of [false,'forestry-trail']){
    const result=compileRoute(createPracticeSamples(track,8,branch),track);expect(result.ok,result.ok?'':result.message).toBe(true);
    if(result.ok){expect(result.route.hazards).toBeUndefined();expect(result.route.hopShortcuts?.length??0).toBe(branch?1:0);}
  }
});
test('packed snow has 55% asphalt grip, less than canyon dirt, and no on-lane drag',()=>{
  const road=sampleSurface(track.start,track),powder=sampleSurface({...track.start,z:track.start.z-12},track);
  expect(road.grip).toBeCloseTo(RULES.asphaltGrip*.55);expect(road.grip).toBeLessThan(RULES.dirtGrip);expect(road.sandAmount).toBe(0);expect(road.surface).toBe('packed-snow');
  expect(powder.surface).toBe('deep-snow');expect(powder.grip).toBeLessThan(road.grip);expect(powder.drag).toBe(1.1);
});
test('snow plans finish and CPU plans use real snow grip',()=>{
  for(const seconds of [2,7,14]){
    const result=compileRoute(createPracticeSamples(track,seconds),track);if(!result.ok)throw Error(result.message);
    const sim=new RaceSimulation(result.route,track,2);for(let i=0;i<18000&&!sim.state.finished;i++)sim.step();expect(sim.state.finished).toBe(true);
  }
  const cpu=computerRoute(track,'normal',0,92);expect(cpu.hazards).toBeUndefined();
  const sim=new RaceSimulation(cpu,track,6);for(let i=0;i<36000&&!sim.state.finished;i++)sim.step();expect(sim.state.finished).toBe(true);expect(sim.state.recoveryCount).toBe(0);
},90000);

test('the forestry obstacle is physical and a timed manual hop clears it',()=>{
  const result=compileRoute(createPracticeSamples(track,7,'forestry-trail'),track);if(!result.ok)throw Error(result.message);
  const before=result.route.points.reduce((best,p)=>Math.hypot(p.x-68,p.z+11)<Math.hypot(best.x-68,best.z+11)?p:best);
  for(const hop of [false,true]){
    const sim=new RaceSimulation(result.route,track),p=sampleRoute(result.route,before.distance);
    Object.assign(sim.state,{distance:before.distance,position:{x:p.x,z:p.z},heading:p.heading,speed:25,velocity:{x:Math.sin(p.heading)*25,z:Math.cos(p.heading)*25}});
    if(hop)sim.pressHop();for(let i=0;i<60;i++)sim.step();
    if(hop){expect(sim.state.collisionCount).toBe(0);expect(sim.state.position.z).toBeGreaterThan(3);}
    else expect(sim.state.collisionCount).toBeGreaterThan(0);
  }
});
