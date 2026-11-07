import{test,expect}from'vitest';
import{sanDiegoFleetTrack as t}from'../../src/core/tracks/san-diego-fleet';
import{jumpPoint}from'../../src/core/support';
import{deckAt,onDeck,deckElevation,crossingCoords}from'../../src/core/decks';
import{projectToPolyline,mix}from'../../src/core/geometry';
import{fleetGeometry}from'../../src/presentation/fleet';
import{fleetAppearance}from'../../src/presentation/themes';
import{computerRoute}from'../../src/core/computer';
import{compileRoute,createPracticeSamples}from'../../src/core/route';

test('ramp axes match the straight racing ribbon and mouths are square to the world-space launch axis',()=>{
 for(const j of t.jumps!){
  const near=jumpPoint(j,j.rampLength-.02),over=jumpPoint(j,j.rampLength+.02);
  for(const across of[-7.9,0,7.9]){const a=jumpPoint(j,j.rampLength-.02,across),b=jumpPoint(j,j.rampLength+.02,across);expect(deckAt(a,t),j.id).toBeDefined();expect(deckAt(b,t),j.id).toBeUndefined();expect(deckAt(jumpPoint(j,j.rampLength+j.gap+.02,across),t)?.id,j.id).toBe(j.landingSurfaceId);}
  if(!j.mandatory)continue;
  for(const fraction of[0,.25,.5,.75,1])expect(projectToPolyline(jumpPoint(j,j.rampLength*fraction),t.centerline,t.distances).distance,j.id).toBeLessThan(.03);
  expect(Math.hypot(near.x-over.x,near.z-over.z)).toBeCloseTo(.04);
 }
});

test('rendered road triangles stop at every water opening, and ramp bases meet the deck without a step',()=>{
 const g=fleetGeometry(t);
 for(const j of t.jumps!){
  if(j.activation==='hop')continue;
  const d=t.decks!.find(d=>d.rampId===j.id)!;
  for(const p of d.footprint){const height=deckElevation(p,d)+fleetAppearance.drivingOffset;expect(g.deck.positions.some((v,i)=>i%3===0&&Math.abs(v-p.x)<1e-6&&Math.abs(g.deck.positions[i+1]-height)<1e-6&&Math.abs(g.deck.positions[i+2]-p.z)<1e-6),j.id+' visible ramp must meet its deck on both sides').toBe(true);}
  for(const across of[-7.9,0,7.9])expect(deckElevation(jumpPoint(j,0,across),d)).toBe(j.takeoffElevation);
  for(let i=0;i<g.road.positions.length;i+=3){const p={x:g.road.positions[i],z:g.road.positions[i+2]},q=crossingCoords(p,j);if(Math.abs(q.across)>j.width/2-.01)continue;expect(q.along>j.rampLength+.001&&q.along<j.rampLength+j.gap-.001,j.id).toBe(false);}
 }
 for(let i=0;i<g.road.indices.length;i+=3){const ids=g.road.indices.slice(i,i+3),p={x:ids.reduce((n,k)=>n+g.road.positions[k*3],0)/3,z:ids.reduce((n,k)=>n+g.road.positions[k*3+2],0)/3};expect(deckAt(p,t),'road triangle must have real deck support').toBeDefined();}
});

test('each stationary ship has a supported navigation structure; raised auxiliaries retain a wide clear working deck',()=>{
 for(const d of t.decks!.filter(d=>d.vessel)){
  const structures=t.barriers.filter(b=>b.vesselSurfaceId===d.id);expect(structures.length,d.id).toBeGreaterThan(0);
  for(const b of structures){expect(b.baseHeight).toBe(d.elevation);expect(b.footprint.every(p=>onDeck(p,d)),b.id).toBe(true);}
  if(d.kind!=='support-ship')continue;
  const parent=t.decks!.find(p=>p.id===(d.id.endsWith('a')?'carrier-a':'carrier-b'))!;expect(d.elevation).toBe(parent.elevation);
  const f=d.vessel!.forward,o=d.vessel!.origin;for(const b of structures)for(const p of b.footprint)expect(Math.abs((p.x-o.x)*f.z-(p.z-o.z)*f.x)).toBeGreaterThanOrEqual(10);
 }
 // Physical superstructure parcels must not overlap parked aircraft, tractors or one another.
 const parts=t.barriers.filter(b=>!b.deckSurfaceId&&!b.id.startsWith('fleet-rail'));
 for(let i=0;i<parts.length;i++)for(let k=i+1;k<parts.length;k++){const a=parts[i],b=parts[k];if(a.baseHeight!==b.baseHeight)continue;for(let side=0;side<a.footprint.length;side++)for(let n=1;n<8;n++)expect(onDeck(mix(mix(a.footprint[side],a.footprint[(side+1)%a.footprint.length],n/8),{x:a.footprint.reduce((s,p)=>s+p.x,0)/a.footprint.length,z:a.footprint.reduce((s,p)=>s+p.z,0)/a.footprint.length},.0001),{id:b.id,elevation:b.baseHeight!,kind:'carrier',footprint:b.footprint}),a.id+' / '+b.id).toBe(false);}
});

test('CPU approach targets brake before the uphill carrier landings without changing human pace or other courses',()=>{
 const authored=t.jumps!.filter(j=>j.planningSpeed!==undefined);expect(authored.map(j=>j.id)).toEqual(['destroyer-a-return','destroyer-b-return']);
 const cpu=computerRoute(t,'normal',0,71),human=compileRoute(createPracticeSamples(t,2),t);expect(human.ok).toBe(true);if(!human.ok)return;
 for(const j of authored){const window=cpu.points.filter(p=>p.courseProgress!>=j.entryProgress-30&&p.courseProgress!<=j.exitProgress);expect(window.length).toBeGreaterThan(20);expect(window.every(p=>p.desiredSpeed<=j.planningSpeed!*.97*.99+.001)).toBe(true);expect(human.route.points.filter(p=>p.courseProgress!>=j.entryProgress&&p.courseProgress!<=j.exitProgress).some(p=>p.desiredSpeed>j.planningSpeed!)).toBe(true);}
});
