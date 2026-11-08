import { expect, test } from 'vitest';
import { laxTrack as track, laxPlanting, laxTerminals, laxRunways, laxStreetExtensions, LAX_LAYOUT } from '../../src/core/tracks/lax';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { minimumRadius } from '../../src/core/road-geometry';
import { computerRoute, stepComputers } from '../../src/core/computer';
import { RaceSimulation, sampleSurface } from '../../src/core/simulation';
import { LocalRace } from '../../src/core/local-race';
import { roadPoint, sectionAt } from '../../src/core/elevation';
import { cumulative, projectToPolyline, samplePolyline } from '../../src/core/geometry';
import { laxGeometry } from '../../src/presentation/lax';
import { insideBarrier, barrierContact, sweepVehicle } from '../../src/core/barriers';
import { drawingStartBounds, gateCoordinates } from '../../src/core/start-finish';
import { groundHeight, vehicleSupported } from '../../src/core/support';

const plan=(branch=false)=>{const r=compileRoute(createPracticeSamples(track,7,branch?'center-way':false),track);if(!r.ok)throw Error(r.message);return r.route;};
test('LAX has a rectangular layout, long runway straights and open rounded inside corners',()=>{
 expect(minimumRadius(track.centerline)).toBeGreaterThan(12);expect(track.roadWidth).toBe(16);
 expect(track.length).toBeGreaterThan(1250);expect(track.length).toBeLessThan(1400);expect(track.sections?.every(s=>s.to>s.from)).toBe(true);
 const xs=track.centerline.map(p=>p.x),zs=track.centerline.map(p=>p.z);expect((Math.max(...zs)-Math.min(...zs))/(Math.max(...xs)-Math.min(...xs))).toBeGreaterThan(1.75);
 for(const side of[-1,1]){const straight=track.centerline.filter(p=>Math.abs(p.x-side*LAX_LAYOUT.runwayX)<1e-5).map(p=>p.z);expect(Math.max(...straight)-Math.min(...straight)).toBeGreaterThan(240);}
 expect(track.terrainTakeoffs).toHaveLength(2);expect(Math.max(...track.centerline.map(p=>p.y??0))).toBeCloseTo(6.2,1);
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
 const route=plan(true),sim=new RaceSimulation(route,track,2),lane=track.hopShortcuts![0],ds=cumulative(lane.branch),obstacle=projectToPolyline({x:0,z:LAX_LAYOUT.hopZ},lane.branch,ds).progress;
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

test('the complete touchdown rectangle stays clear of airport equipment and buildings',()=>{
 const gate=drawingStartBounds(track);
 for(const b of track.barriers){
  const points=b.footprint.map(p=>gateCoordinates(p,track)),along=points.map(p=>p.along),across=points.map(p=>p.across);
  const overlaps=Math.max(...along)>gate.from&&Math.min(...along)<gate.to&&Math.max(...across)>-gate.halfWidth&&Math.min(...across)<gate.halfWidth;
  expect(overlaps,b.id).toBe(false);
 }
});

test('exactly two broad runways contain the racing straights and stay clear of parked equipment',()=>{
 expect(laxRunways).toHaveLength(2);
 for(const r of laxRunways){
  expect(r.width).toBe(44);
  for(const p of track.centerline.filter(p=>Math.sign(p.x)===Math.sign(r.x)&&sectionAt(track,p.courseProgress!)?.id.includes('runway')))
   expect(Math.abs(p.x-r.x)+track.roadWidth/2).toBeLessThanOrEqual(r.width/2+1e-6);
  for(const b of track.barriers.filter(b=>b.id.includes('aircraft')||b.id.includes('ground-vehicle')||b.id.includes('hangar'))){
   const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z);
   expect(Math.min(...xs)<r.x+r.width/2&&Math.max(...xs)>r.x-r.width/2&&Math.min(...zs)<r.z+r.length/2&&Math.max(...zs)>r.z-r.length/2,b.id).toBe(false);
  }
 }
});

test('new apron obstacles and street closures leave five metres outside the reference road',()=>{
 for(const b of track.barriers.filter(b=>b.id.startsWith('lax-taxi-')||b.id.startsWith('lax-public-street-closure'))){
  for(let i=0;i<b.footprint.length;i++)for(let n=0;n<=10;n++){
   const a=b.footprint[i],c=b.footprint[(i+1)%b.footprint.length],t=n/10,p={x:a.x+(c.x-a.x)*t,z:a.z+(c.z-a.z)*t};
   expect(projectToPolyline(p,track.centerline,track.distances).distance-track.roadWidth/2,b.id).toBeGreaterThan(4.9);
  }
 }
});

test.each(laxStreetExtensions)('the public street at x=$x has a physical closure before support ends',street=>{
 const physical={...track,barriers:track.barriers.filter(b=>b.id.startsWith('lax-public-street-closure'))};let contact=Infinity,unsupported=Infinity;
 for(let n=0;n<=350;n++){
  const p={x:street.x,z:street.fromZ+2-n*.1};
  if(contact===Infinity&&barrierContact(p,Math.PI,physical,0,groundHeight(p,track)))contact=n;
  if(unsupported===Infinity&&!vehicleSupported(p,Math.PI,track))unsupported=n;
 }
 expect(Number.isFinite(contact)).toBe(true);expect(contact).toBeLessThan(unsupported);
});

test('public-street tails and apron kerbs have upward-facing surface normals',()=>{
 const parts=laxGeometry(track),road=parts.road.toVertexData(),paint=parts.paint.toVertexData();let tails=0,kerbs=0;
 for(let i=0;i<parts.road.vertexCount;i++){
  const x=road.positions![i*3],y=road.positions![i*3+1],z=road.positions![i*3+2];
  if(Math.abs(Math.abs(x)-26)<8.1&&z<laxStreetExtensions[0].toZ+47&&z>laxStreetExtensions[0].toZ+7&&y>2.9){expect(road.normals![i*3+1]).toBeGreaterThan(.95);tails++;}
 }
 for(let i=0;i<parts.paint.indices!.length;i+=3){
  const ids=Array.from(paint.indices!.slice(i,i+3));
  if(ids.every(n=>paint.positions![n*3+2]>80&&Math.abs(paint.positions![n*3+1]-.07)<1e-5)){
   for(const n of ids)expect(paint.normals![n*3+1]).toBeGreaterThan(.99);kerbs++;
  }
 }
 expect(tails).toBeGreaterThan(100);expect(kerbs).toBeGreaterThan(20);
});

test('both apron barrier ribbons are continuous and preserve five metres of road runoff',()=>{
 for(const side of[0,1]){
  const barriers=track.barriers.filter(b=>b.id.startsWith(`lax-apron-edge-${side}-`));expect(barriers.length).toBeGreaterThan(10);
  for(const [i,b] of barriers.entries()){
   expect(b.height).toBe(LAX_LAYOUT.apronBarrierHeight);
   if(i){const previous=barriers[i-1].footprint,n=previous.length/2;expect(previous[n-1]).toEqual(b.footprint[0]);expect(previous[n]).toEqual(b.footprint.at(-1));}
   for(let k=0;k<b.footprint.length;k++)for(let t=0;t<=1;t+=.2){const a=b.footprint[k],c=b.footprint[(k+1)%b.footprint.length],p={x:a.x+(c.x-a.x)*t,z:a.z+(c.z-a.z)*t};expect(projectToPolyline(p,track.centerline,track.distances).distance-track.roadWidth/2,b.id).toBeGreaterThan(5);}
  }
 }
});

test.each([0,1])('apron side %i stops a swept 42 m/s impact instead of tunneling',side=>{
 const section=track.sections!.find(s=>s.id==='north-apron')!,at=(section.from+section.to)/2,p=samplePolyline(track.centerline,track.distances,at),ahead=samplePolyline(track.centerline,track.distances,at+.1),len=Math.hypot(ahead.x-p.x,ahead.z-p.z),sign=side?1:-1,normal={x:-(ahead.z-p.z)/len*sign,z:(ahead.x-p.x)/len*sign},heading=Math.atan2(normal.x,normal.z);
 const physical={...track,barriers:track.barriers.filter(b=>b.id.startsWith('lax-apron-edge-'))},result=sweepVehicle(p,{x:p.x+normal.x*30,z:p.z+normal.z*30},heading,heading,{x:normal.x*42,z:normal.z*42},physical);
 expect(result.collided).toBe(true);expect(result.impact).toBeGreaterThan(20);expect(projectToPolyline(result.position,track.centerline,track.distances).distance).toBeLessThan(track.roadWidth/2+LAX_LAYOUT.apronBarrierRunoff);
});
test('v6: the full width of both runways grips like the road; ground beyond them stays loose',()=>{
 expect(track.version).toBe(6);expect(track.pavedAreas).toHaveLength(2);
 for(const r of laxRunways)for(const dx of[-21,-12,0,12,21])for(const z of[-150,-60,40,160,280]){
  const s=sampleSurface({x:r.x+dx,z},track);expect(s.sandAmount).toBe(0);expect(s.surface).toBe('asphalt');
 }
 for(const p of[{x:-121,z:40},{x:121,z:40},{x:-66,z:40},{x:66,z:40}])expect(sampleSurface(p,track).sandAmount).toBe(1);
});
test('v6: a line along the outer runway edge keeps road speed instead of sliding through sand',()=>{
 // After the start, swing 18 m outward along the western runway (still on runway tarmac), then rejoin.
 const ramp=(z:number)=>Math.min(1,Math.max(0,(z-60)/20))*Math.min(1,Math.max(0,(150-z)/20));
 const reference=createPracticeSamples(track,7),outer=reference.map(p=>Math.abs(p.x+LAX_LAYOUT.runwayX)<1e-5?{...p,x:p.x-18*ramp(p.z)}:p);
 const r=compileRoute(outer,track);if(!r.ok)throw Error(r.message);expect(r.route.hazards).toBeUndefined();
 const sim=new RaceSimulation(r.route,track,1);let maxSand=0,outerTicks=0;
 for(let tick=0;tick<12000&&!sim.state.finished;tick++){sim.step();const s=sim.state;if(s.position.x<-94&&s.position.z>85&&s.position.z<125){outerTicks++;maxSand=Math.max(maxSand,s.sandAmount);}}
 expect(sim.state.finished).toBe(true);expect(sim.state.recoveryCount).toBe(0);expect(outerTicks).toBeGreaterThan(30);expect(maxSand).toBe(0);
},60000);
