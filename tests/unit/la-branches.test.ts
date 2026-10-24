import { expect, test } from 'vitest';
import { laNightsTrack as track } from '../../src/core/tracks/la-nights';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { cumulative, samplePolyline } from '../../src/core/geometry';
import { RaceSimulation } from '../../src/core/simulation';

test('one accepted lap can use both LA shortcuts and repeat six times',()=>{
 const j=track.jumps![0],hop=createPracticeSamples(track,7,'backlot-alley');
 const a=track.distances.findIndex(d=>d>=j.entryProgress),b=track.distances.findIndex(d=>d>=j.exitProgress),branchDistances=cumulative(j.branch);
 const branch=Array.from({length:78},(_,i)=>samplePolyline(j.branch,branchDistances,i/77*branchDistances.at(-1)!));
 const points=[...hop.slice(0,a),...branch,...hop.slice(b)],ds=cumulative(points);
 // Both branches shorten the lap substantially: use a five-second stroke so
 // its shared pace mapping still supplies enough speed for the water crossing.
 const result=compileRoute(points.map((p,i)=>({...p,time:ds[i]/ds.at(-1)!*5000})),track);
 if(!result.ok)throw Error(result.message);
 expect(result.route.jumps).toHaveLength(1);expect(result.route.hopShortcuts).toHaveLength(1);
 const sim=new RaceSimulation(result.route,track,6);let takeoffs=0;
 for(let i=0;i<26000&&!sim.state.finished;i++){
  const s=sim.state;if(Math.abs(s.position.x+62)<3&&s.position.z<19&&s.position.z>15&&s.velocity.z<-15)sim.pressHop();
  sim.step();takeoffs+=sim.drainEvents().filter(e=>e.type==='takeoff').length;
 }
 expect(sim.state.finished,JSON.stringify(sim.state)).toBe(true);expect(sim.state.recoveryCount).toBe(0);expect(sim.state.hopCount).toBe(6);expect(takeoffs).toBeGreaterThanOrEqual(6);
},30000);

test('a slow channel attempt fails physically and recovers without awarding the crossing',()=>{
 const r=compileRoute(createPracticeSamples(track,24,true),track);if(!r.ok)throw Error(r.message);
 const sim=new RaceSimulation(r.route,track,1),events:string[]=[];
 for(let i=0;i<10000&&!sim.state.recoveryCount;i++){sim.step();events.push(...sim.drainEvents().map(e=>e.type));}
 expect(events).toContain('takeoff');expect(events).toContain('splash');expect(events).toContain('recovery');
 expect(sim.state.position.x).toBeLessThan(track.jumps![0].from.x);expect(sim.state.finished).toBe(false);
 expect(sim.state.distance).toBeLessThan(track.jumps![0].entryProgress);expect(sim.state.speed).toBe(0);
});
