import{expect,test}from'vitest';
import{snowyTahoeTrack as track}from'../../src/core/tracks/snowy-tahoe';
import{compileRoute,createPracticeSamples,sampleRoute}from'../../src/core/route';
import{RaceSimulation,RULES}from'../../src/core/simulation';
import{groundHeight,terrainTakeoffCrossing}from'../../src/core/support';
import type{TerrainTakeoff}from'../../src/core/types';
import{computerRoute}from'../../src/core/computer';

const compiled=compileRoute(createPracticeSamples(track,7),track);if(!compiled.ok)throw Error(compiled.message);
const route=compiled.route,launch=track.terrainTakeoffs![0];
function approach(speed:number,yaw=0,j:TerrainTakeoff=launch){
 const p=route.points.reduce((a,b)=>Math.abs(b.courseProgress!-j.progress+3)<Math.abs(a.courseProgress!-j.progress+3)?b:a),at=sampleRoute(route,p.distance),sim=new RaceSimulation(route,track);
 Object.assign(sim.state,{distance:p.distance,position:{...p},elevation:groundHeight(p,track),heading:at.heading+yaw,speed,velocity:{x:Math.sin(at.heading)*speed,z:Math.cos(at.heading)*speed}});
 return sim;
}

test.each(track.terrainTakeoffs!.flatMap(j=>[20,30,42].map(speed=>({j,speed}))))('$j.id launches at $speed m/s without a live ability',({j,speed})=>{
 for(const yaw of[-Math.PI/9,0,Math.PI/9]){
  const sim=approach(speed,yaw,j);let flew=false,landed=false,peak=0;
  for(let i=0;i<300;i++){
   sim.step();flew||=sim.state.flightOrigin==='ski';peak=Math.max(peak,sim.state.elevation);
   if(flew&&sim.state.movement==='grounded'){landed=true;break;}
  }
  expect(flew).toBe(true);expect(landed).toBe(true);expect(peak).toBeGreaterThan(groundHeight(j.center,track)+.4);
  expect(sim.state.recoveryCount,JSON.stringify({yaw,events:sim.drainEvents(),position:sim.state.position})).toBe(0);expect(sim.state.hopCount).toBe(0);expect(sim.state.thrustCount).toBe(0);
  expect(sim.state.elevation).toBeCloseTo(groundHeight(sim.state.position,track),5);
 }
});

test('a ski takeoff is directional, full-width and does not create a shortcut corridor',()=>{
 expect(route.jumps).toBeUndefined();expect(route.hazards).toBeUndefined();
 const p=(s:number,w=0)=>({x:launch.center.x+launch.forward.x*s+launch.forward.z*w,z:launch.center.z+launch.forward.z*s-launch.forward.x*w,courseProgress:launch.progress+s});
 expect(terrainTakeoffCrossing(p(-2),p(2),track)?.launch.id).toBe(launch.id);
 expect(terrainTakeoffCrossing(p(2),p(-2),track)).toBeNull();
 expect(terrainTakeoffCrossing(p(-2,9),p(2,9),track)).toBeNull();
});

test('stale route progress cannot change physical ground under an airborne car',()=>{
 for(const p of track.centerline.filter(p=>p.courseProgress!>380&&p.courseProgress!<475)){
  expect(groundHeight({...p,courseProgress:launch.progress+20},track)).toBeCloseTo(groundHeight({x:p.x,z:p.z},track),8);
 }
});

test('slow cars remain grounded and manual Hop before the crest never stacks a ski impulse',()=>{
 const slow=approach(0);for(let i=0;i<15;i++)slow.step();expect(slow.state.flightOrigin).toBeNull();
 const sim=approach(25);sim.pressHop();let crossed=false;
 for(let i=0;i<30;i++){sim.step();if(sim.state.position.courseProgress!>launch.progress){crossed=true;expect(sim.state.flightOrigin).toBe('hop');expect(sim.state.verticalVelocity).toBeLessThan(RULES.hopLaunchSpeed);}}
 expect(crossed).toBe(true);expect(sim.drainEvents().filter(e=>e.type==='takeoff')).toHaveLength(0);
});

test.each(['easy','normal','hard'] as const)('%s computer plans use the regular ski jump every lap',difficulty=>{
 const plan=computerRoute(track,difficulty,0,921),sim=new RaceSimulation(plan,track,6);let takeoffs=0;
 for(let i=0;i<36000&&!sim.state.finished;i++){sim.step();takeoffs+=sim.drainEvents().filter(e=>e.type==='takeoff').length;}
 expect(sim.state.finished).toBe(true);expect(takeoffs).toBe(track.terrainTakeoffs!.length*6);expect(sim.state.recoveryCount).toBe(0);
},90000);
