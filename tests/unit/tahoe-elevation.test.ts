import{expect,test}from'vitest';
import{snowyTahoeTrack as track}from'../../src/core/tracks/snowy-tahoe';
import{roadGrade,roadHeight,roadPoint,drawingRay,terrainElevation}from'../../src/core/elevation';
import{groundHeight,supported}from'../../src/core/support';
import{compileRoute,createPracticeSamples,sampleRoute}from'../../src/core/route';
import{RaceSimulation,RULES}from'../../src/core/simulation';
import{computerRoute,computerTraffic}from'../../src/core/computer';
import{planningHeight}from'../../src/presentation/planning-height';
import{samplePolyline}from'../../src/core/geometry';
import{vehicleContact,sweptContact}from'../../src/core/vehicle-contact';
import{LocalRace}from'../../src/core/local-race';

test('Tahoe climbs and descends smoothly, retaining a level gate and forestry lane',()=>{
 expect(track.version).toBe(5);expect(Math.max(...track.centerline.map(p=>p.y!))).toBeCloseTo(60.8,1);
 for(const s of [0,10,24,track.length-30,track.length-1])expect(roadHeight(track,s)).toBe(0);
 for(const p of track.hopShortcuts![0].branch)expect(groundHeight(p,track)).toBe(0);
 const grades=Array.from({length:Math.ceil(track.length*2)},(_,i)=>roadGrade(track,i*.5));
 expect(Math.max(...grades)).toBeGreaterThan(.88);expect(Math.min(...grades)).toBeLessThan(-.6);
 for(const grade of grades)expect(Math.abs(grade)).toBeLessThan(.92);
 for(const b of track.barriers.filter(b=>b.terrainAnchor)){
  const p={x:b.footprint.reduce((sum,q)=>sum+q.x,0)/b.footprint.length,z:b.footprint.reduce((sum,q)=>sum+q.z,0)/b.footprint.length};expect(groundHeight(p,track)).toBeCloseTo(b.baseHeight!,6);
 }
});

test('drawing intersects the real alpine surface and off-road powder remains supported',()=>{
 for(let i=0;i<track.centerline.length;i+=11){
  const p=track.centerline[i],hit=drawingRay({origin:{x:p.x+12,y:p.y!+80,z:p.z-8},direction:{x:-.15,y:-1,z:.1}},track,{...p,courseProgress:p.courseProgress});
  expect(hit).not.toBeNull();expect(Math.hypot(hit!.x-p.x,hit!.z-p.z)).toBeLessThan(.06);expect(hit!.y).toBeCloseTo(p.y!,2);
 }
 const p=roadPoint({x:-110,z:64},track);expect(supported(p,track)).toBe(true);expect(p.y).toBeCloseTo(terrainElevation(p,track));expect(p.y).toBeGreaterThan(0);
 expect(planningHeight({x:p.x,z:p.z},track)).toBeCloseTo(p.y!,6);
});

test('grounded cars still collide and anticipate traffic on a steep hillside',()=>{
 const s=track.hopShortcuts![0].exitProgress+68;
 const a=roadPoint(samplePolyline(track.centerline,track.distances,s),track),b=roadPoint(samplePolyline(track.centerline,track.distances,s+4.8),track);
 const heading=Math.atan2(b.x-a.x,b.z-a.z),make=(position:typeof a,speed:number)=>({position,heading,elevation:position.y!,movement:'grounded' as const,velocity:{x:Math.sin(heading)*speed,z:Math.cos(heading)*speed}});
 const aa=make(a,25),bb=make(b,15);expect(Math.abs(aa.elevation-bb.elevation)).toBeGreaterThan(1.05);
 expect(vehicleContact(aa,bb,track)).not.toBeNull();
 const before=make(roadPoint(samplePolyline(track.centerline,track.distances,s-2),track),25);
 expect(sweptContact(before,aa,bb,bb,track)).not.toBeNull();
 expect(vehicleContact({...aa,movement:'airborne',elevation:aa.elevation+8},bb,track)).toBeNull();
 const route=computerRoute(track,'normal',0,92),race=new LocalRace([route,route],track);race.tick=Math.round(6/RULES.dt);
 for(const [i,body]of [aa,bb].entries())Object.assign(race.racers[i].state,body,{speed:i?15:25,time:race.time});
 expect(computerTraffic(race,0)?.speed).toBeCloseTo(15,4);
 race.racers[1].state.movement='airborne';race.racers[1].state.elevation+=8;
 expect(computerTraffic(race,0)).toBeNull();
});

test('elevated snow routes race physically on the surface, including six CPU laps',()=>{
 const result=compileRoute(createPracticeSamples(track,7),track);if(!result.ok)throw Error(result.message);expect(result.route.hazards).toBeUndefined();
 const sim=new RaceSimulation(result.route,track,2);let peak=0;
 for(let i=0;i<18000&&!sim.state.finished;i++){sim.step();peak=Math.max(peak,sim.state.elevation);if(sim.state.movement==='grounded')expect(sim.state.elevation).toBeCloseTo(groundHeight(sim.state.position,track),3);}
 expect(sim.state.finished).toBe(true);expect(peak).toBeGreaterThan(59);expect(sim.state.recoveryCount).toBe(0);
 const cpu=new RaceSimulation(computerRoute(track,'normal',0,92),track,6);for(let i=0;i<36000&&!cpu.state.finished;i++)cpu.step();expect(cpu.state.finished).toBe(true);
 expect(sampleRoute(result.route,result.route.length*.6).y).toBeGreaterThan(20);
},90000);
