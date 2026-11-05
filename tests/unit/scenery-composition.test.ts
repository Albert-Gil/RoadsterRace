import {test,expect} from 'vitest';
import {circuits,findCircuit} from '../../src/content/circuits';
import {laBuildings} from '../../src/content/la-night-art';
import {cityBuildings} from '../../src/content/golden-city';
import {laCityBlocks} from '../../src/core/tracks/la-city-blocks';
import {insideBarrier} from '../../src/core/barriers';
import {cumulative,projectToPolyline} from '../../src/core/geometry';
import {urbanArchitecture} from '../../src/presentation/urban-architecture';
import {newportClubhouse,assemblyHall,launchTowerDetail} from '../../src/presentation/venue-landmarks';
import {alpineOutcrops,alpineGroundColor} from '../../src/presentation/mountain-composition';
import {amusementBoardwalk} from '../../src/presentation/pacific-wheel';
import {reflectSantaVenue} from '../../src/core/tracks/santa-monica';
import {edgeDistance,type Geometry} from '../../src/presentation/landscape/mesh';
import {urbanPromenade} from '../../src/presentation/urban-promenade';
import {onCityLand} from '../../src/content/golden-city';

const contains=(p:{x:number;z:number},b:{footprint:{x:number;z:number}[]})=>insideBarrier(p,{...b,id:'',height:0})||edgeDistance(p,b.footprint)<.001;
function bounded(g:Geometry,polygons:{footprint:{x:number;z:number}[]}[]){
 expect([...g.positions,...g.toVertexData().normals!].every(Number.isFinite)).toBe(true);
 for(let i=0;i<g.positions.length;i+=3){const p={x:g.positions[i],z:g.positions[i+2]};expect(polygons.some(b=>contains(p,b)),JSON.stringify(p)).toBe(true);}
}
test('connected urban architecture stays inside its authored protected blocks',()=>{
 const night=findCircuit('la-nights').track,day=findCircuit('golden-gate').track;
 const a=urbanArchitecture(laBuildings.map(b=>({...b,width:b.w,depth:b.d,height:b.h,color:b.style})),true),b=urbanArchitecture(cityBuildings.map(b=>({...b,style:b.style==='office'?2:b.style==='brick'?1:0})),false);
 for(const g of[a.paint,a.lights])bounded(g,night.barriers);bounded(b.paint,day.barriers);
 expect(a.paint.triangleCount).toBeLessThan(55000);expect(b.paint.triangleCount).toBeLessThan(35000);
});
test('new LA frontage preserves deliberate road and approved-lane runoff',()=>{
 const t=findCircuit('la-nights').track;expect(t.version).toBe(5);expect(laCityBlocks).toHaveLength(17);
 for(const b of laCityBlocks){
  const barrier=t.barriers.find(v=>v.id===b.id)!;expect(barrier.height).toBeCloseTo(b.height+.18);
  for(const p of barrier.footprint){expect(projectToPolyline(p,t.centerline,t.distances).distance-t.roadWidth/2,b.id).toBeGreaterThan(5);
   for(const h of t.hopShortcuts!)expect(projectToPolyline(p,h.branch,cumulative(h.branch)).distance-h.width/2,b.id).toBeGreaterThan(5);}
 }
});
test('clubhouse, palms and launch structures stay inside their existing parcels',()=>{
 const n=findCircuit('newport').track,l=findCircuit('launchsite').track;
 bounded(newportClubhouse(n),n.barriers.filter(b=>b.id==='coastal-gardens'));
 bounded(assemblyHall(),l.barriers.filter(b=>b.id==='assembly-island'));
 bounded(launchTowerDetail(),l.barriers.filter(b=>b.id==='launch-complex'));
});
test('amusement boardwalk and stalls remain on the protected supported pier',()=>{
 const t=reflectSantaVenue(findCircuit('santa-monica').track),g=amusementBoardwalk();bounded(g,t.barriers.filter(b=>b.id==='amusement-protected'));bounded(g,t.supports!);
});
test('alpine rock skins remain within actual collision footprints and height envelopes',()=>{
 const t=findCircuit('snowy-tahoe').track,g=alpineOutcrops(t),rocks=t.barriers.filter(b=>b.kind==='rock');
 for(let i=0;i<g.positions.length;i+=3){const p={x:g.positions[i],z:g.positions[i+2]},y=g.positions[i+1];expect(rocks.some(b=>contains(p,b)&&y>=(b.baseHeight??0)-.001&&y<=(b.baseHeight??0)+b.height+.001)).toBe(true);}
 expect(g.triangleCount).toBeLessThan(12000);
});
test('mountain colors remain finite while revealing slopes beyond the driving lane',()=>{
 const flat=alpineGroundColor(30,20,48,0,20),steep=alpineGroundColor(30,20,48,.8,20);expect(flat).not.toEqual(steep);
 for(const c of[flat,steep,alpineGroundColor(0,0,0,0,0)])expect(c.every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);
 expect(circuits).toHaveLength(9);
});
test('city pavements are flat, upward-facing and leave water openings untouched',()=>{
 for(const id of['la-nights','golden-gate']){
  const t=findCircuit(id).track,g=urbanPromenade(t,id==='la-nights',id==='golden-gate'?onCityLand:()=>true);expect(g.vertexCount).toBeGreaterThan(500);
  const n=g.toVertexData().normals!;for(let i=0;i<g.vertexCount;i++){const p={x:g.positions[i*3],z:g.positions[i*3+2]};expect(g.positions[i*3+1]).toBeCloseTo(.038);expect(n[i*3+1]).toBeGreaterThan(.99);expect(t.waterOpenings?.some(w=>insideBarrier(p,{...w,height:0}))).not.toBe(true);}
 }
});
