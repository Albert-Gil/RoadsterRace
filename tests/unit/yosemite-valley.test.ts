import { expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { yosemiteTrack as track } from '../../src/core/tracks/yosemite';
import { terrainElevation } from '../../src/core/elevation';
import { supported } from '../../src/core/support';
import { cumulative, projectToPolyline, mix } from '../../src/core/geometry';
import { yosemiteCreekBanks } from '../../src/core/tracks/yosemite-terrain';
import { insideBarrier } from '../../src/core/barriers';
import { yosemiteTreeTemplates } from '../../src/presentation/yosemite-forest';

test('v2 preserves the complete v1 road, branch, support and 24 m drawing-corridor heightfield',()=>{
 const hash=createHash('sha256'),branches=track.hopShortcuts!.map(h=>({path:h.branch,distances:cumulative(h.branch)}));let count=0;
 for(let z=-130;z<=140;z+=2)for(let x=-150;x<=150;x+=2){
  const p={x,z};let gap=projectToPolyline(p,track.centerline,track.distances).distance;
  for(const b of branches)gap=Math.min(gap,projectToPolyline(p,b.path,b.distances).distance);
  if(gap>24)continue;
  hash.update(`${x},${z},${terrainElevation(p,track).toFixed(5)},${supported(p,track)};`);count++;
 }
 // Recorded from Yosemite v1 at 092b30d, before any valley changes (2 m sample grid).
 expect(count).toBe(9379);expect(hash.digest('hex')).toBe('8c14670995130b3c54d767c12777d96144eeb1ad186007f290d7aaf5421724d8');
});

test('new valley geology has authored solid footprints and leaves the road and timber trail clear',()=>{
 const rocks=track.barriers.filter(b=>b.id.startsWith('valley-')&&b.kind==='rock');expect(rocks).toHaveLength(44);
 const paths=[{path:track.centerline,distances:track.distances},...track.hopShortcuts!.map(h=>({path:h.branch,distances:cumulative(h.branch)}))];
 for(const b of rocks)for(let i=0;i<b.footprint.length;i++)for(let j=0;j<=10;j++){
  const p=mix(b.footprint[i],b.footprint[(i+1)%b.footprint.length],j/10);
  const gap=Math.min(...paths.map(path=>projectToPolyline(p,path.path,path.distances).distance));
  expect(gap,b.id).toBeGreaterThan(34);expect(b.height).toBeGreaterThan(0);expect(Number.isFinite(b.baseHeight)).toBe(true);
 }
});

test('the creek follows its banks and leaves the original jump opening exactly eight metres wide',()=>{
 const [a,b]=yosemiteCreekBanks;
 expect(a.length).toBe(b.length);expect(a.length).toBeGreaterThan(100);
 for(let i=0;i<a.length;i++)expect(Math.hypot(a[i].x-b[i].x,a[i].z-b[i].z)).toBeGreaterThanOrEqual(7.999);
 for(const z of[-90,-70,-50]){expect(supported({x:9.99,z},track)).toBe(true);expect(supported({x:14,z},track)).toBe(false);expect(supported({x:18.01,z},track)).toBe(true);}
 expect(insideBarrier({x:14,z:-70},{id:'creek',height:0,footprint:track.waterOpenings![0].footprint})).toBe(true);
});

test('forest templates are bounded, varied, outward-facing and economical enough to batch',()=>{
 const templates=yosemiteTreeTemplates();expect(templates).toHaveLength(8);
 for(const g of templates){
  expect(g.triangleCount).toBeLessThan(500);const normals=g.toVertexData().normals!;expect(normals.every(Number.isFinite)).toBe(true);
  let outward=0,samples=0;
  // The trunk's first 18 vertices: its radial normals face away from its axis.
  for(let i=0;i<18;i++){const x=g.positions[i*3],z=g.positions[i*3+2];if(Math.hypot(x,z)<.01)continue;outward+=normals[i*3]*x+normals[i*3+2]*z;samples++;}
  expect(samples).toBeGreaterThan(8);expect(outward).toBeGreaterThan(0);
  for(let i=0;i<g.positions.length;i+=3){expect(Math.hypot(g.positions[i],g.positions[i+2])).toBeLessThan(.27);expect(g.positions[i+1]).toBeGreaterThanOrEqual(0);expect(g.positions[i+1]).toBeLessThanOrEqual(1.05);}
 }
 expect(new Set(templates.map(g=>JSON.stringify(g.positions))).size).toBe(8);
});
