import { expect, test } from 'vitest';
import { laNightsTrack as track } from '../../src/core/tracks/la-nights';
import { compileRoute, createPracticeSamples, sampleRoute } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
import { distance } from '../../src/core/geometry';
import { jumpPoint, supported, validateSupports } from '../../src/core/support';
import { insideBarrier } from '../../src/core/barriers';
import { validateHopShortcuts } from '../../src/core/hop-shortcuts';
import { laBuildings } from '../../src/content/la-night-art';
import { circuits } from '../../src/content/circuits';
import { createTournament } from '../../src/core/tournament';

function plan(branch: boolean|string=false){const r=compileRoute(createPracticeSamples(track,7,branch),track);if(!r.ok)throw Error(r.message);return r.route;}
test('LA nights has independent, shorter automatic-jump and manual-hop routes',()=>{
 const main=plan(),jump=plan(true),hop=plan('backlot-alley');
 expect(track.roadWidth).toBe(16);expect(jump.jumps).toEqual(['channel-crossing']);expect(hop.hopShortcuts).toHaveLength(1);
 expect(main.jumps).toBeUndefined();expect(main.hopShortcuts).toBeUndefined();
 expect(main.length-jump.length).toBeGreaterThan(25);expect(main.length-hop.length).toBeGreaterThan(25);
});
test.each([20,30,42])('the channel jump lands at %i m/s',speed=>{
 const r=plan(true),sim=new RaceSimulation(r,track,1),s=sim.state,j=track.jumps![0];
 Object.assign(s,{position:jumpPoint(j,7.9),elevation:1.185,heading:Math.PI/2,speed,velocity:{x:speed,z:0}});
 s.distance=r.points.reduce((best,p)=>distance(p,s.position)<distance(sampleRoute(r,best),s.position)?p.distance:best,0);
 let flew=false,landed=false;
 for(let i=0;i<240&&!landed;i++){sim.step();for(const e of sim.drainEvents()){flew||=e.type==='takeoff';landed||=e.type==='landing';}}
 expect(flew).toBe(true);expect(landed).toBe(true);expect(s.recoveryCount).toBe(0);
});
test.each([20,25,30])('manual hop clears the backlot barrier at %i m/s',speed=>{
 const r=plan('backlot-alley'),sim=new RaceSimulation(r,track,1),s=sim.state;
 Object.assign(s,{position:{x:-62,z:17},heading:Math.PI,speed,velocity:{x:0,z:-speed}});
 s.distance=r.points.reduce((best,p)=>distance(p,s.position)<distance(sampleRoute(r,best),s.position)?p.distance:best,0);
 sim.pressHop();for(let i=0;i<50;i++)sim.step();
 expect(s.position.z).toBeLessThan(5);expect(s.collisionCount).toBe(0);
});
test('missing hop impacts the actual divider',()=>{
 const r=plan('backlot-alley'),sim=new RaceSimulation(r,track,1),s=sim.state;
 Object.assign(s,{position:{x:-62,z:17},heading:Math.PI,speed:25,velocity:{x:0,z:-25}});
 s.distance=r.points.reduce((best,p)=>distance(p,s.position)<distance(sampleRoute(r,best),s.position)?p.distance:best,0);
 for(let i=0;i<90;i++)sim.step();expect(s.collisionCount).toBeGreaterThan(0);
});
test('partial/reverse alleys and unauthorized water crossings are rejected',()=>{
 const b=track.hopShortcuts![0].branch;
 expect(validateHopShortcuts(b.slice(35),track).ok).toBe(false);expect(validateHopShortcuts([...b].reverse(),track).ok).toBe(false);
 expect(validateSupports([{x:60,z:4},{x:74,z:4}],track).ok).toBe(false);
});
test('every building footprint is supported and inside a protected block',()=>{
 for(const b of laBuildings)for(const x of [-1,1])for(const z of [-1,1]){
  const p={x:b.x+x*(b.w/2+.2),z:b.z+z*(b.d/2+.2)};
  expect(supported(p,track)).toBe(true);expect(track.barriers.some(barrier=>insideBarrier(p,barrier)),JSON.stringify(b)).toBe(true);
 }
});
test.each([false,true,'backlot-alley'])('six laps finish on branch %s',branch=>{
 const sim=new RaceSimulation(plan(branch),track,6);
 for(let i=0;i<26000&&!sim.state.finished;i++){
  const s=sim.state;if(branch==='backlot-alley'&&Math.abs(s.position.x+62)<3&&s.position.z<19&&s.position.z>15&&s.velocity.z<-15)sim.pressHop();
  sim.step();
 }
 expect(sim.state.finished,JSON.stringify(sim.state)).toBe(true);expect(sim.state.lapTimes).toHaveLength(6);
 expect(sim.state.recoveryCount).toBe(0);if(branch==='backlot-alley')expect(sim.state.hopCount).toBe(6);
},30000);
test('new Full Tours append LA nights without changing an existing saved schedule',()=>{
 const rounds=circuits.map(c=>({circuitId:c.id,trackVersion:c.track.version}));
 const old=createTournament(rounds.slice(0,-1),2,1);
 const fresh=createTournament(rounds,2,1);
 expect(old.rounds).toHaveLength(5);expect(fresh.rounds).toHaveLength(6);expect(fresh.rounds.at(-1)?.circuitId).toBe('la-nights');
});
