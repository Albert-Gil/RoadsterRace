import {expect,test} from 'vitest';
import {yosemiteTrack as track} from '../../src/core/tracks/yosemite';
import {yosemiteDressing} from '../../src/presentation/yosemite-dressing';
import {insideBarrier} from '../../src/core/barriers';
import {edgeDistance} from '../../src/presentation/landscape/mesh';
import {yosemiteGranitePoint} from '../../src/presentation/yosemite-granite';

test('native ranger buildings, campground and cedar stay inside protected physical footprints',()=>{
 const g=yosemiteDressing(track),allowed=track.barriers.filter(b=>b.kind==='building'||b.kind==='infield'||b.id==='yosemite-fallen-cedar');
 expect(g.triangleCount).toBeLessThan(5000);
 for(let i=0;i<g.positions.length;i+=3){
  const [x,y,z]=g.positions.slice(i,i+3);expect([x,y,z].every(Number.isFinite)).toBe(true);
  const parcels=allowed.filter(b=>insideBarrier({x,z},b)||edgeDistance({x,z},b.footprint)<.001);
  expect(parcels.length,JSON.stringify({x,y,z})).toBeGreaterThan(0);
  const solid=parcels.find(b=>b.kind==='building'||b.id==='yosemite-fallen-cedar');
  if(solid){expect(y).toBeGreaterThanOrEqual((solid.baseHeight??0)-.001);expect(y).toBeLessThanOrEqual((solid.baseHeight??0)+solid.height+.001);}
 }
 const normals=g.toVertexData().normals!;expect(normals.every(Number.isFinite)).toBe(true);
 let barkSamples=0;
 for(let i=0;i<g.positions.length;i+=3){const[x,y,z]=g.positions.slice(i,i+3);
  if(Math.abs(x+65)<7.7&&Math.abs(z-20)>.35&&Math.abs(z-20)<.66&&y>1&&y<1.5){
   expect(normals[i+1]*(y-.83)+normals[i+2]*(z-20)).toBeGreaterThan(.2);barkSamples++;
  }
 }
 expect(barkSamples).toBeGreaterThan(40);
});

test('waterfall attachment skin and weathered cliffs remain within each authored rock and height',()=>{
 for(const b of track.barriers.filter(b=>b.kind==='rock'))for(let layer=0;layer<=20;layer++)for(let i=0;i<72;i++){
  const p=yosemiteGranitePoint(b,layer/20,i/72*Math.PI*2);
  expect(insideBarrier(p,b)||edgeDistance(p,b.footprint)<.001).toBe(true);
  expect(p.y).toBeGreaterThanOrEqual(b.baseHeight??0);expect(p.y).toBeLessThanOrEqual((b.baseHeight??0)+b.height);
 }
});
