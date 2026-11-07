import { expect, test } from 'vitest';
import { laxTrack as track, laxPlanting, laxTerminals } from '../../src/core/tracks/lax';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { minimumRadius } from '../../src/core/road-geometry';
import { computerRoute, stepComputers } from '../../src/core/computer';
import { RaceSimulation } from '../../src/core/simulation';
import { LocalRace } from '../../src/core/local-race';
import { roadPoint } from '../../src/core/elevation';
import { cumulative, projectToPolyline } from '../../src/core/geometry';
import { laxGeometry } from '../../src/presentation/lax';
import { insideBarrier } from '../../src/core/barriers';

const plan=(branch=false)=>{const r=compileRoute(createPracticeSamples(track,7,branch?'center-way':false),track);if(!r.ok)throw Error(r.message);return r.route;};
test('LAX has wide rounded roads, elevated departures and two straight runway crests',()=>{
 expect(minimumRadius(track.centerline)).toBeGreaterThan(12);expect(track.roadWidth).toBe(16);
 expect(track.length).toBeGreaterThan(1000);expect(track.sections?.every(s=>s.to>s.from)).toBe(true);
 expect(track.terrainTakeoffs).toHaveLength(2);expect(Math.max(...track.centerline.map(p=>p.y??0))).toBe(6);
 const route=plan();expect(route.hazards??[]).toHaveLength(0);
 const shortcut=plan(true);expect(shortcut.hopShortcuts?.map(s=>s.id)).toContain('center-way');expect(shortcut.hazards??[]).toHaveLength(0);expect(shortcut.length).toBeLessThan(route.length-20);
});
test.each([20,30,42].flatMap(speed=>[-20,0,20].map(yaw=>({speed,yaw}))))('runway crests land safely at $speed m/s, body yaw $yaw',({speed,yaw})=>{
 for(const j of track.terrainTakeoffs!){
  const route=plan(),sim=new RaceSimulation(route,track),s=sim.state,at=route.points.reduce((a,b)=>Math.abs(a.courseProgress!-j.progress)<Math.abs(b.courseProgress!-j.progress)?a:b);
  s.position=roadPoint({x:j.center.x-j.forward.x*.1,z:j.center.z-j.forward.z*.1},track,j.progress-.1);s.elevation=s.position.y!;s.distance=at.distance-.1;s.checkpoint=Math.floor(s.distance/(route.length/8))+1;s.speed=speed;
  s.velocity={x:j.forward.x*speed+j.forward.z*1,z:j.forward.z*speed-j.forward.x*1};s.heading=Math.atan2(j.forward.x,j.forward.z)+yaw*Math.PI/180;
  const events:string[]=[];for(let i=0;i<120&&!events.includes('landing');i++){sim.step();events.push(...sim.drainEvents().map(e=>e.type));}
  expect(events).toContain('takeoff');expect(events,JSON.stringify({jump:j.id,state:s})).toContain('landing');expect(s.recoveryCount).toBe(0);expect(s.collisionCount).toBe(0);
 }
});
test.each(['easy','normal','hard'] as const)('four LAX drivers finish on %s',difficulty=>{
 const routes=[0,0,1,2].map(i=>computerRoute(track,difficulty,i,71)),race=new LocalRace(routes,track,2);
 for(let i=0;i<60*240&&!race.finished;i++){stepComputers(race,difficulty);race.step();}
 expect(race.finished,JSON.stringify(race.racers.map(r=>({distance:r.state.distance,recoveries:r.state.recoveryCount,position:r.state.position})))).toBe(true);
 expect(race.racers.every(r=>Number.isFinite(r.state.finishTime))).toBe(true);
},120000);
test('the hidden cross-connection is an actual hop obstacle and completes repeated laps',()=>{
 const route=plan(true),sim=new RaceSimulation(route,track,2),lane=track.hopShortcuts![0],ds=cumulative(lane.branch),obstacle=projectToPolyline({x:0,z:47},lane.branch,ds).progress;
 for(let i=0;i<60*240&&!sim.state.finished;i++){
  const q=projectToPolyline(sim.state.position,lane.branch,ds);if(q.distance<3&&q.progress>obstacle-14&&q.progress<obstacle-10)sim.pressHop();sim.step();
 }
 expect(sim.state.finished,JSON.stringify(sim.state)).toBe(true);expect(sim.state.hopCount).toBe(2);expect(sim.state.recoveryCount).toBe(0);
});
test('airport assets stay within the native triangle budget and contain no nonfinite vertices',()=>{
 const parts=laxGeometry(track),triangles=Object.values(parts).reduce((sum,p)=>sum+p.triangleCount,0);
 expect(triangles).toBeLessThan(120000);expect(Object.values(parts).every(p=>p.positions.every(Number.isFinite))).toBe(true);
});
test('seven terminal groups and native planting remain in their protected parcels, clear of roads and the Hop lane',()=>{
 expect(laxTerminals).toHaveLength(7);
 const paths=[track.centerline,...track.hopShortcuts!.map(h=>h.branch)].map(points=>({points,distances:cumulative(points)}));
 for(const p of laxPlanting){
  const owner=track.barriers.find(b=>b.id===p.parcel)!;expect(owner).toBeDefined();
  for(let i=0;i<24;i++)expect(insideBarrier({x:p.x+p.radius*Math.cos(i*Math.PI/12),z:p.z+p.radius*Math.sin(i*Math.PI/12)},owner)).toBe(true);
  const clearance=Math.min(...paths.map(path=>projectToPolyline(p,path.points,path.distances).distance))-p.radius-track.roadWidth/2;expect(clearance).toBeGreaterThan(2);
 }
});
