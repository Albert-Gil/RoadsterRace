import { test, expect } from 'vitest';
import { sanDiegoFleetTrack as track } from '../../src/core/tracks/san-diego-fleet';
import { carrierLaneGeometry } from '../../src/presentation/fleet-carrier-lane';
import { navalEnsign } from '../../src/presentation/fleet-flags';
import { CompositionShapes } from '../../src/presentation/composition-shapes';
import { crossingCoords, onDeck } from '../../src/core/decks';
import { mix, projectToPolyline } from '../../src/core/geometry';

// The support query excludes exact polygon edges; flush artwork may meet that edge.
const supported=(p:{x:number;z:number},d:NonNullable<typeof track.decks>[number])=>onDeck(p,d)||d.footprint.some((a,i)=>{
 const b=d.footprint[(i+1)%d.footprint.length],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
 return Math.hypot(p.x-a.x-u*dx,p.z-a.z-u*dz)<1e-6;
});

test('runway floors, edge lines and bend kerbs stay on the two carriers, never over water or manual shortcut decks',()=>{
 const geo=carrierLaneGeometry(track),carriers=track.decks!.filter(d=>d.kind==='carrier');
 expect(geo.floor.triangleCount).toBeGreaterThan(800);expect(geo.markings.triangleCount).toBeGreaterThan(500);expect(geo.kerbs.triangleCount).toBeGreaterThan(100);
 for(const g of Object.values(geo)){const normals=g.toVertexData().normals!;for(let i=1;i<normals.length;i+=3)expect(normals[i]).toBeGreaterThan(.99);}
 for(const g of Object.values(geo))for(let i=0;i<g.positions.length;i+=3){
  const p={x:g.positions[i],z:g.positions[i+2]},owner=carriers.find(d=>supported(p,d));expect(owner,'every painted/kerbed point has real carrier support').toBeDefined();
  expect(g.positions[i+1]-owner!.elevation).toBeGreaterThan(0);expect(g.positions[i+1]-owner!.elevation).toBeLessThan(.15);
  for(const j of track.jumps!.filter(j=>j.rampLength>0)){const c=crossingCoords(p,j);expect(c.along>.001&&c.along<j.rampLength-.001&&Math.abs(c.across)<j.width/2-.001,'lane must stop at ramp base').toBe(false);}
 }
});

test('new equipment and enlarged bridges remain supported with clear reference driving corridors',()=>{
 expect(track.version).toBe(6);
 for(const d of track.decks!.filter(d=>d.vessel)){
  const props=track.barriers.filter(b=>b.vesselSurfaceId===d.id);expect(props.filter(b=>b.id.includes('winch'))).toHaveLength(1);
  for(const b of props){expect(b.footprint.every(p=>onDeck(p,d)),b.id).toBe(true);
   for(let i=0;i<b.footprint.length;i++)for(let n=0;n<=16;n++)expect(projectToPolyline(mix(b.footprint[i],b.footprint[(i+1)%b.footprint.length],n/16),track.centerline,track.distances).distance-track.roadWidth/2,b.id).toBeGreaterThanOrEqual(1.999);
  }
 }
 const props=track.barriers.filter(b=>b.equipmentKind);
 for(const role of['deck-workshop','jet-deflector'])expect(props.filter(b=>b.equipmentKind===role)).toHaveLength(2);
 expect(props.filter(b=>b.equipmentKind==='fuel-bowser')).toHaveLength(4);expect(props.filter(b=>b.equipmentKind==='cable-winch')).toHaveLength(6);
 for(const b of track.barriers.filter(b=>b.id.startsWith('support-bridge')))expect(b.height).toBe(28);
 for(const b of track.barriers.filter(b=>b.id.startsWith('destroyer-bridge')))expect(b.height).toBe(36);
});

test('large static naval flags fit every command structure envelope without new animated scenery',()=>{
 for(const b of track.barriers.filter(b=>!b.equipmentKind&&(b.id.endsWith('-island')||b.id.startsWith('support-bridge')||b.id.startsWith('destroyer-bridge')))){
  const a=b.footprint[0],next=b.footprint[1],last=b.footprint.at(-1)!,w=Math.hypot(next.x-a.x,next.z-a.z),d=Math.hypot(last.x-a.x,last.z-a.z),g=new CompositionShapes();navalEnsign(g,w,d,b.height);
  expect(g.triangleCount).toBeGreaterThan(300);
  for(let i=0;i<g.positions.length;i+=3){expect(Math.abs(g.positions[i])).toBeLessThan(w/2);expect(Math.abs(g.positions[i+2])).toBeLessThan(d/2);expect(g.positions[i+1]).toBeGreaterThan(0);expect(g.positions[i+1]).toBeLessThan(b.height);}
 }
});
