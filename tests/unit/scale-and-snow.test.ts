import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {vehicleShadowGeometry} from '../../src/presentation/vehicle-shadow';
import {snowyTahoeTrack as snow} from '../../src/core/tracks/snowy-tahoe';
import {tahoeRoadsidePockets} from '../../src/core/tracks/tahoe-roadside';
import {tahoeExteriorLife} from '../../src/presentation/tahoe-roadside';
import {insideBarrier} from '../../src/core/barriers';
import {edgeDistance} from '../../src/presentation/landscape/mesh';
import {projectToPolyline,cumulative,mix} from '../../src/core/geometry';
import {orbitalTrack as launch} from '../../src/core/tracks/orbital';
import {launchsiteRemoteRockets} from '../../src/core/tracks/venue-parcels';

test('car shadow is a closed, bounded silhouette and remains within the 10k combined model budget',()=>{
 const g=vehicleShadowGeometry(),edges=new Map<string,number>();
 expect(g.triangleCount).toBe(92);expect(9904+g.triangleCount).toBeLessThan(10000);
 for(let i=0;i<g.indices.length;i+=3)for(const[a,b]of[[g.indices[i],g.indices[i+1]],[g.indices[i+1],g.indices[i+2]],[g.indices[i+2],g.indices[i]]]){const key=a<b?`${a}/${b}`:`${b}/${a}`;edges.set(key,(edges.get(key)??0)+1);}
 expect([...edges.values()].every(v=>v===2)).toBe(true);expect([...g.positions,...g.normals!].every(Number.isFinite)).toBe(true);
});

test('exterior Tahoe pockets preserve the full pre-upgrade terrain heightfield',()=>{
 expect(snow.version).toBe(6);
 expect(createHash('sha256').update(new Uint8Array(snow.terrain!.heights.buffer)).digest('hex')).toBe('0a4ec3d651c73622dec9a5abc0c54a523cc9c992961c0d72f51f718eab8172a1');
});

test('outside winter fleet is grounded within solid pockets, clear of the full road and forestry trail',()=>{
 const g=tahoeExteriorLife(snow),pads=snow.barriers.filter(b=>tahoeRoadsidePockets.some(p=>p.id===b.id));expect(pads).toHaveLength(4);expect(g.triangleCount).toBeLessThan(1800);
 for(let i=0;i<g.vertexCount;i++){const[x,y,z]=g.positions.slice(i*3,i*3+3),p={x,z};expect(pads.some(b=>(insideBarrier(p,b)||edgeDistance(p,b.footprint)<.001)&&y<=(b.baseHeight??0)+b.height)).toBe(true);}
 for(const b of pads)for(let i=0;i<b.footprint.length;i++)for(let j=0;j<=20;j++){
  const p=mix(b.footprint[i],b.footprint[(i+1)%b.footprint.length],j/20),gap=Math.min(projectToPolyline(p,snow.centerline,snow.distances).distance,...snow.hopShortcuts!.map(h=>projectToPolyline(p,h.branch,cumulative(h.branch)).distance));
  expect(gap,b.id).toBeGreaterThanOrEqual(snow.roadWidth/2+5);
 }
});

test('large remote rockets retain deliberate runoff and stay outside the driving ribbon',()=>{
 expect(launch.version).toBe(12);
 for(const r of launchsiteRemoteRockets){expect(r.height).toBeGreaterThanOrEqual(46);expect(r.radius).toBeGreaterThanOrEqual(3.6);const b=launch.barriers.find(b=>b.id===r.id)!;
  for(let i=0;i<b.footprint.length;i++)for(let j=0;j<=20;j++){const p=mix(b.footprint[i],b.footprint[(i+1)%b.footprint.length],j/20);expect(projectToPolyline(p,launch.centerline,launch.distances).distance,r.id).toBeGreaterThanOrEqual(launch.roadWidth/2+5);}
 }
});
