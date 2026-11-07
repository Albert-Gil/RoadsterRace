import{deriveFleetRails}from'../../src/core/tracks/fleet-rail-geometry';
import{fleetRails}from'../../src/core/tracks/fleet-rails';
import {expect,test}from'vitest';
import{sanDiegoFleetTrack as t}from'../../src/core/tracks/san-diego-fleet';
import{compileRoute,createPracticeSamples,sampleRoute}from'../../src/core/route';
import{RaceSimulation,RULES}from'../../src/core/simulation';
import{jumpPoint,groundHeight,supported,jumpCoordinates}from'../../src/core/support';
import{cumulative,distance}from'../../src/core/geometry';
import{deckAt,deckVehicleSupported}from'../../src/core/decks';
import{drawingStartBounds}from'../../src/core/start-finish';
import{fleetGeometry,deckTriangles}from'../../src/presentation/fleet';
import{computerRoute,stepComputers}from'../../src/core/computer';
import{LocalRace}from'../../src/core/local-race';
const compile=(branch?:string)=>{const r=compileRoute(createPracticeSamples(t,7,branch??false),t);if(!r.ok)throw Error(r.message);return r.route;};
test('fleet supports the full start zone, ten-course envelope and both economical alternatives',()=>{
 expect(t.length).toBeGreaterThanOrEqual(700);expect(t.length).toBeLessThanOrEqual(780);expect(t.roadWidth).toBe(16);
 expect(t.decks?.filter(d=>d.kind==='carrier')).toHaveLength(2);expect(t.decks?.filter(d=>d.kind==='destroyer')).toHaveLength(2);expect(t.decks?.filter(d=>d.kind==='support-ship')).toHaveLength(2);
 for(const p of drawingStartBounds(t).corners)expect(supported(p,t)).toBe(true);
 const savings=t.hopShortcuts!.map(h=>h.exitProgress-h.entryProgress-cumulative(h.branch).at(-1)!);
 savings.forEach(v=>{expect(v).toBeGreaterThanOrEqual(20);expect(v).toBeLessThanOrEqual(45);});expect((t.length-savings.reduce((a,b)=>a+b))/2).toBeGreaterThanOrEqual(315);
});
test('ordered normal and support-vessel routes compile without hazards; guides are not support',()=>{
 const main=compile();expect(main.crossings!.map(c=>c.id)).toEqual(['carrier-a-crossing','carrier-b-crossing']);expect(main.hazards).toBeUndefined();
 for(const lane of t.hopShortcuts!){const r=compile(lane.id);expect(r.hazards).toBeUndefined();expect(r.crossings!.filter(c=>c.id.startsWith(lane.id.slice(0,9))).map(c=>c.id)).toEqual(lane.crossings);}
 for(const j of t.jumps!){const p=jumpPoint(j,j.rampLength+j.gap/2);expect(supported(p,t)).toBe(false);expect(groundHeight(p,t)).toBeGreaterThan(8);}
});
for(const speed of[20,30,42])test(`all six crossings land with ${speed} m/s momentum and yaw variation`,()=>{
 for(const j of t.jumps!)for(const yaw of[-20,0,20]){
  const branch=t.hopShortcuts!.find(h=>h.crossings?.includes(j.id)),route=compile(branch?.id),sim=new RaceSimulation(route,t,1),p=jumpPoint(j,j.activation==='hop'?-5:j.rampLength-.1),heading=Math.atan2(j.forward.x,j.forward.z),near=route.points.reduce((a,b)=>distance(a,p)<distance(b,p)?a:b);
  Object.assign(sim.state,{position:p,elevation:groundHeight(p,t),heading:heading+yaw*Math.PI/180,speed,velocity:{x:j.forward.x*speed+j.forward.z*2,z:j.forward.z*speed-j.forward.x*2},distance:near.distance});
  if(j.activation==='hop')sim.pressHop();let landed=false,recovered=false;
  for(let i=0;i<200;i++){sim.step();const es=sim.drainEvents();landed ||=es.some(e=>e.type==='landing');recovered ||=es.some(e=>e.type==='recovery');if(landed||recovered)break;}
  expect(recovered,j.id+'/'+yaw).toBe(false);expect(landed,j.id+'/'+yaw).toBe(true);expect(deckVehicleSupported(sim.state.position,sim.state.heading,t,j.landingSurfaceId),j.id).toBe(true);
 }
},120000);
test('finite hulls do not become support across water and old handling constants remain intact',()=>{
 const j=t.jumps![0];expect(deckAt(jumpPoint(j,j.rampLength+j.gap/2),t)).toBeUndefined();expect(t.carWidth).toBeCloseTo(2.9095);expect(RULES.hopLaunchSpeed).toBe(34);expect(RULES.maxSpeed).toBe(42);
 const g=fleetGeometry(t);expect(Object.values(g).reduce((n,x)=>n+x.triangleCount,0)).toBeLessThan(120000);for(const part of Object.values(g))expect(part.toVertexData().normals!.every(Number.isFinite)).toBe(true);
});
test('both shortcut variants complete six laps with one legal timed hop per branch per lap',()=>{
 for(const lane of t.hopShortcuts!){const sim=new RaceSimulation(compile(lane.id),t,6),j=t.jumps!.find(j=>j.id===lane.crossings![0])!;
  for(let n=0;n<24000&&!sim.state.finished;n++){const q=jumpCoordinates(sim.state.position,j);if(q.along>=-6&&q.along<=-4&&Math.abs(q.across)<5)sim.pressHop();sim.step();sim.drainEvents();}
  expect(sim.state.finished).toBe(true);expect(sim.state.hopCount).toBe(6);expect(sim.state.recoveryCount).toBe(0);
 }
},120000);
test('fifteen seeded four-car CPU races finish within 240 simulated seconds on the main decks',()=>{
 for(const difficulty of['easy','normal','hard']as const)for(const seed of[1,7,31,71,109]){
  const routes=[0,0,1,2].map(i=>computerRoute(t,difficulty,i,seed));routes.forEach(r=>{expect(r.hazards).toBeUndefined();expect(r.crossings?.every(c=>c.activation==='automatic')).toBe(true);});
  const race=new LocalRace(routes,t,2);for(let n=0;n<14400&&!race.finished;n++){stepComputers(race,difficulty);race.step();}expect(race.finished,difficulty+'/'+seed).toBe(true);expect(race.racers.every(r=>r.state.finishTime!<=240)).toBe(true);
 }
},240000);

test('concave deck triangulation does not bridge unsupported notches',()=>{
 for(const deck of t.decks!){const indices=deckTriangles(deck.footprint);expect(indices.length).toBe((deck.footprint.length-2)*3);for(let i=0;i<indices.length;i+=3){const points=indices.slice(i,i+3).map(i=>deck.footprint[i]),p={x:points.reduce((a,p)=>a+p.x,0)/3,z:points.reduce((a,p)=>a+p.z,0)/3};expect(deckAt(p,t,Infinity,deck.id)?.id).toBe(deck.id);}}
});
test('a missed water Hop returns to its pre-crossing carrier without forward credit',()=>{
 const sim=new RaceSimulation(compile('support-a-lane'),t,1);let before=0;
 for(let tick=0;tick<6000&&!sim.state.recoveryCount;tick++){before=sim.state.distance;sim.step();}
 expect(sim.state.recoveryCount).toBe(1);expect(sim.state.distance).toBeLessThanOrEqual(before);expect(sim.state.supportSurfaceId).toBe('carrier-a');expect(sim.state.elevation).toBe(24);
});

test('offline deck-edge rails match the authoritative deck and road geometry',()=>{expect(deriveFleetRails(t.decks!,[t.centerline,...t.hopShortcuts!.map(h=>h.branch)])).toEqual(fleetRails);});
