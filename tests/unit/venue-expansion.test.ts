import { expect,test } from 'vitest';
import { canyonSouthRimTrack as canyon } from '../../src/core/tracks/canyon-south-rim';
import { grandCanyonTrack as original } from '../../src/core/tracks/grand-canyon';
import { yosemiteTrack as yosemite } from '../../src/core/tracks/yosemite';
import { coastalTrack } from '../../src/core/track';
import { compileRoute,createPracticeSamples,sampleRoute } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
import { computerRoute,stepComputers } from '../../src/core/computer';
import { LocalRace } from '../../src/core/local-race';
import { groundHeight,jumpPoint,vehicleSupported } from '../../src/core/support';
import { drawingRay,roadPoint } from '../../src/core/elevation';
import { shortcutProjection, clearedShortcut } from '../../src/core/hop-shortcuts';
import { findCircuit,circuits } from '../../src/content/circuits';
import { urbanRampGeometry } from '../../src/presentation/urban-ramp';
import { jumpCoordinates } from '../../src/core/support';
import type {TrackDefinition} from '../../src/core/types';

const plan=(t:TrackDefinition,id:boolean|string=false,seconds=6.5)=>{const r=compileRoute(createPracticeSamples(t,seconds,id),t);if(!r.ok)throw Error(r.message);expect(r.route.hazards).toBeUndefined();return r.route;};
test('South Rim is the only registered Grand Canyon; the retired original link opens it',()=>{
 expect(findCircuit(canyon.id).track).toBe(canyon);expect(findCircuit('grand-canyon').track).toBe(canyon);expect(circuits.some(c=>c.id==='grand-canyon')).toBe(false);
 expect(canyon.name).toBe('Grand Canyon');expect(original.version).toBe(5);expect(circuits[4]?.id).toBe(canyon.id);expect(canyon.version).toBe(3);
 expect(canyon.length).toBeGreaterThan(800);expect(canyon.length).toBeLessThan(900);expect(canyon.roadWidth).toBe(16);
 expect(canyon.hopShortcuts).toHaveLength(2);expect(plan(canyon).jumps).toEqual(['south-rim-crossing']);
});
test('Newport v8 keeps its original loop shape and scenery parcels at a larger world scale',()=>{
 expect(coastalTrack.version).toBe(8);expect(coastalTrack.length).toBeCloseTo(351.4,0);expect(coastalTrack.roadWidth).toBe(16);
 expect(coastalTrack.start.x).toBeCloseTo(-18*1.15);expect(coastalTrack.start.z).toBeCloseTo(-30*1.15);expect(coastalTrack.barriers.map(b=>b.id)).toEqual(['gantry-support','grandstand','coastal-gardens','apex-rocks']);
});
test('Yosemite timber trail now saves at least twenty metres and leaves the cedar obstacle meaningful',()=>{
 const normal=plan(yosemite),short=plan(yosemite,'ranger-timber-trail');expect(normal.length-short.length).toBeGreaterThan(20);expect(normal.length-short.length).toBeLessThan(40);
 expect(normal.jumps).toHaveLength(3);expect(yosemite.waterOpenings).toHaveLength(10);expect(short.hopShortcuts?.[0].id).toBe('ranger-timber-trail');
});
for(const t of[yosemite,canyon])for(const j of t.jumps!)test.each([20,30,42])(`${t.name}/${j.id}: safe natural launch at %s m/s and modest yaw`,speed=>{
 const route=plan(t),start=jumpPoint(j,-.1),point=route.points.reduce((a,b)=>Math.hypot(b.x-start.x,b.z-start.z)<Math.hypot(a.x-start.x,a.z-start.z)?b:a);
 for(const yaw of[-Math.PI/9,0,Math.PI/9]){
  const sim=new RaceSimulation(route,t),heading=Math.atan2(j.forward.x,j.forward.z),p=roadPoint(start,t,point.courseProgress);
  Object.assign(sim.state,{position:p,distance:point.distance,checkpoint:Math.floor(point.distance/(route.length/8))+1,elevation:groundHeight(p,t),heading:heading+yaw,velocity:{x:j.forward.x*speed,z:j.forward.z*speed},speed});
  const events:string[]=[];for(let i=0;i<180&&!events.includes('landing')&&!sim.state.recoveryCount;i++){sim.step();events.push(...sim.drainEvents().map(e=>e.type));}
  expect(events).toContain('takeoff');expect(events).toContain('landing');expect(sim.state.recoveryCount).toBe(0);expect(sim.state.hopCount).toBe(0);
 }
});
test('new canyon crossing associates the upper guide and lower road independently',()=>{
 const upper=roadPoint({x:0,z:0},canyon,canyon.sections!.find(s=>s.flight)!.from+15),lower=roadPoint({x:0,z:0},canyon,canyon.sections!.at(-1)!.from+22);
 expect(upper.y).toBeCloseTo(11);expect(lower.y).toBe(0);expect(upper.sectionId).not.toBe(lower.sectionId);
 const ray={origin:{x:0,y:55,z:0},direction:{x:0,y:-1,z:0}};
 for(const p of[upper,lower]){const hit=drawingRay(ray,canyon,{...p,courseProgress:p.courseProgress!-.5});expect(hit?.sectionId).toBe(p.sectionId);expect(hit?.y).toBe(p.y);}
 expect(vehicleSupported(upper,Math.PI/2,canyon)).toBe(false);expect(vehicleSupported(lower,Math.PI,canyon)).toBe(true);
});
for(const h of canyon.hopShortcuts!)test(`${h.id}: saves distance and completes repeated laps with a real manual hop`,()=>{
 const route=plan(canyon,h.id),normal=plan(canyon);expect(normal.length-route.length).toBeGreaterThan(25);expect(route.hopShortcuts?.[0].id).toBe(h.id);
 const b=canyon.barriers.find(b=>b.id===h.obstacleId)!,center={x:b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,z:b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length},obstacle=shortcutProjection(center,h).progress,sim=new RaceSimulation(route,canyon,2);
 for(let tick=0;tick<18000&&!sim.state.finished;tick++){const q=shortcutProjection(sim.state.position,h);if(q.progress>obstacle-12&&q.progress<obstacle-8&&q.distance<3)sim.pressHop();sim.step();}
 expect(sim.state.finished).toBe(true);expect(sim.state.hopCount).toBe(2);expect(sim.state.recoveryCount).toBe(0);expect(sim.state.collisionCount).toBe(0);
 const missed=new RaceSimulation(route,canyon,1);for(let tick=0;tick<12000&&!missed.state.recoveryCount;tick++)missed.step();expect(missed.state.collisionCount).toBeGreaterThan(0);
},60000);
test.each(['easy','normal','hard']as const)('three %s CPU drivers and the human complete the new canyon',difficulty=>{
 const race=new LocalRace([plan(canyon),...[0,1,2].map(i=>computerRoute(canyon,difficulty,i,71))],canyon,1);
 for(let tick=0;tick<18000&&!race.finished;tick++){stepComputers(race,difficulty);race.step();}
 expect(race.finished).toBe(true);expect(race.racers.every(r=>Number.isFinite(r.state.finishTime))).toBe(true);
 // Shared contact can disrupt a jump: finishing after an ordinary recovery is
 // legitimate. Independently generated CPU routes must still avoid static hazards.
 for(const route of race.routes){expect(route.hazards).toBeUndefined();expect(route.jumps).toContain('south-rim-crossing');}
},90000);
test('LA maintenance causeway stays inside the existing physical ramp and remains inexpensive',()=>{
 const j=findCircuit('la-nights').track.jumps![0],before=JSON.stringify(j),g=urbanRampGeometry(j);expect(g.triangleCount).toBeLessThan(500);
 for(let i=0;i<g.positions.length;i+=3){const c=jumpCoordinates({x:g.positions[i],z:g.positions[i+2]},j);expect(c.along).toBeGreaterThanOrEqual(-.001);expect(c.along).toBeLessThanOrEqual(j.rampLength+.001);expect(Math.abs(c.across)).toBeLessThanOrEqual(j.width/2+.001);expect(g.positions[i+1]).toBeLessThanOrEqual(.11+c.along*j.lipHeight/j.rampLength);}
 expect(g.toVertexData().normals!.every(Number.isFinite)).toBe(true);expect(g.toVertexData().normals![1]).toBeGreaterThan(.8);expect(JSON.stringify(j)).toBe(before);
});
test('Grand Canyon v3: Juniper Saddle joins keep fast cars supported and its rock and merge are level with the road',()=>{
 const h=canyon.hopShortcuts!.find(s=>s.id==='juniper-saddle')!,b=canyon.barriers.find(b=>b.id===h.obstacleId)!;
 const center={x:b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,z:b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length},obstacle=shortcutProjection(center,h).progress;
 // v1: 70–75° joins threw a fast car off the narrow branch support even with a correct Hop.
 // v2 left the merge 1–2 m below the neighbouring road, so the road's bank was drawn over the trail.
 expect(b.baseHeight).toBeCloseTo(10.4);expect(h.branch.slice(Math.ceil(h.branch.length*.6)).every(p=>Math.abs(p.y!-10.4)<1e-6)).toBe(true);
 for(const seconds of[5,6.5])for(const lead of[6,10]){
  const route=plan(canyon,h.id,seconds),sim=new RaceSimulation(route,canyon,1);let pressed=false;
  for(let tick=0;tick<9000&&!sim.state.finished;tick++){const q=shortcutProjection(sim.state.position,h);if(!pressed&&q.distance<6&&q.progress>obstacle-lead-2&&q.progress<obstacle-lead){sim.pressHop();pressed=true;}sim.step();}
  expect(sim.state.finished).toBe(true);expect(sim.state.hopCount).toBe(1);expect(sim.state.recoveryCount).toBe(0);expect(sim.state.collisionCount).toBe(0);
 }
},60000);
test('shortcut feedback only reports a landing beyond the rock on a trail the route uses',()=>{
 const h=canyon.hopShortcuts!.find(s=>s.id==='juniper-saddle')!,route=plan(canyon,h.id),normal=plan(canyon),after=h.branch[h.branch.length-6],before=h.branch[8];
 const cleared=clearedShortcut(after,route,canyon);expect(cleared?.id).toBe('juniper-saddle');expect(cleared!.saved).toBeGreaterThan(40);expect(cleared!.saved).toBeLessThan(52);
 expect(clearedShortcut(before,route,canyon)).toBeNull();expect(clearedShortcut(after,normal,canyon)).toBeNull();expect(clearedShortcut({x:0,z:-74},route,canyon)).toBeNull();
});
