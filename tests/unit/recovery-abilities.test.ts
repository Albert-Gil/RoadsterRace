import { test, expect } from 'vitest';
import { cumulative, samplePolyline } from '../../src/core/geometry';
import { RaceSimulation, RULES } from '../../src/core/simulation';
import { COMPILER_VERSION } from '../../src/core/route';
import type { TrackDefinition, CompiledRoute } from '../../src/core/types';

const centerline=[{x:0,z:0},{x:0,z:200},{x:200,z:200},{x:200,z:0},{x:0,z:0}],distances=cumulative(centerline);
const flat:TrackDefinition={id:'recovery-fixture',name:'Recovery',version:1,centerline,distances,length:800,roadWidth:16,carWidth:2.2,carLength:5.2,start:centerline[0],barriers:[]};
const route:CompiledRoute={trackId:flat.id,trackVersion:1,version:COMPILER_VERSION,length:800,drawingDuration:7,points:Array.from({length:801},(_,distance)=>({...samplePolyline(centerline,distances,distance),distance,desiredSpeed:30,curvature:0}))};
const rect=(from:number,to:number)=>[{x:-10,z:from},{x:10,z:from},{x:10,z:to},{x:-10,z:to}];
const water={...flat,supports:[{id:'land',footprint:rect(-100,250)}],waterOpenings:[{id:'water',footprint:rect(9,20)}]};
const wall={...flat,barriers:[{id:'wall',height:.2,footprint:rect(9,10)}]};

function fail(track:TrackDefinition,line=route){
 const sim=new RaceSimulation(line,track,1);
 Object.assign(sim.state,{speed:20,velocity:{x:0,z:20},heading:0});sim.pressHop();sim.pressThrust();
 for(let i=0;i<500&&!sim.state.recoveryCount;i++)sim.step();
 expect(sim.state.recoveryCount).toBe(1);return sim;
}
function finishRecovery(sim:RaceSimulation){
 const s=sim.state,counts=[s.hopCount,s.thrustCount],until=s.recoveringUntil,time=s.time;
 expect(s.hopReadyAt).toBe(until);expect(s.thrustReadyAt).toBe(until);expect(s.speed).toBe(0);expect(s.thrustUntil).toBeLessThanOrEqual(time);
 sim.pressHop();sim.pressThrust(); // discarded during the hold, never buffered into a free activation
 for(let i=0;i<1000&&s.time<until+RULES.dt;i++)sim.step();
 expect(s.time).toBeGreaterThan(until);expect([s.hopCount,s.thrustCount]).toEqual(counts);expect(s.recoveryCount).toBe(1);
 expect(s.hopReadyAt).toBeLessThanOrEqual(s.time);expect(s.thrustReadyAt).toBeLessThanOrEqual(s.time);
 const activatedAt=s.time;sim.pressHop();sim.pressThrust();sim.step();
 expect(s.hopCount).toBe(counts[0]+1);expect(s.thrustCount).toBe(counts[1]+1);expect(s.movement).toBe('airborne');
 expect(s.hopReadyAt).toBeCloseTo(activatedAt+RULES.hopRecharge,9);expect(s.thrustReadyAt).toBeCloseTo(activatedAt+RULES.thrustRecharge,9);
}
test.each([['water',water],['barrier',wall]] as const)('%s recovery refills both abilities without clearing usage counts or buffering held commands',(_,track)=>{
 const sim=fail(track);expect(sim.state.recoveringUntil).toBeLessThan(RULES.thrustRecharge);expect(sim.state.distance).toBeLessThan(9);
 finishRecovery(sim);
});
test('drawn-hazard recovery preserves its full penalty and clock while restoring abilities at the end',()=>{
 const sim=fail(wall,{...route,hazards:[{from:6,to:18,course:40,kind:'barrier'}]}),recovery=sim.events.find(e=>e.type==='recovery')!;
 expect(recovery.penalty).toBe(2);expect(sim.state.recoveringUntil-recovery.time).toBeCloseTo(RULES.recoveryHold+2,9);
 expect(sim.state.distance).toBe(18);expect(sim.state.checkpoint).toBe(1);finishRecovery(sim);
});
