import {test,expect} from 'vitest';
import {createHash} from 'node:crypto';
import baseline from '../fixtures/newport-v7-shape.json';
import {coastalTrack} from '../../src/core/track';
import {NEWPORT_WORLD_SCALE as S} from '../../src/core/tracks/newport-layout';
import {findCircuit} from '../../src/content/circuits';
import {compileRoute,createPracticeSamples} from '../../src/core/route';
import {RaceSimulation} from '../../src/core/simulation';
import {insideBarrier} from '../../src/core/barriers';
import {jumpCoordinates} from '../../src/core/support';
import {reflectSantaVenue} from '../../src/core/tracks/santa-monica';
import {pierLandingGeometry} from '../../src/presentation/pier-ramp';
import {pierComposition} from '../../src/presentation/themes';
import {launchOperations,bayRoofscape,nightPictureHouse} from '../../src/presentation/venue-signatures';
import {edgeDistance,type Geometry} from '../../src/presentation/landscape/mesh';
import {cityBuildings} from '../../src/content/golden-city';

const hash=(ps:readonly{x:number;z:number}[])=>createHash('sha256').update(JSON.stringify(ps.map(p=>[Math.round(p.x*1e6),Math.round(p.z*1e6)]))).digest('hex');
test('Newport is exactly the frozen v7 shape at 115% scale, retaining its road width and protections',()=>{
 expect(coastalTrack.version).toBe(8);expect(coastalTrack.roadWidth).toBe(16);expect(coastalTrack.length).toBeCloseTo(baseline.length*S,8);
 expect(hash(coastalTrack.centerline.map(p=>({x:p.x/S,z:p.z/S})))).toBe(baseline.shape);
 for(const b of coastalTrack.barriers)expect(hash(b.footprint.map(p=>({x:p.x/S,z:p.z/S})))).toBe(baseline.barriers.find(v=>v.id===b.id)?.hash);
});
test.each([7,10])('the lengthened Newport completes six clean laps at a %s-second drawing pace',seconds=>{
 const result=compileRoute(createPracticeSamples(coastalTrack,seconds),coastalTrack);expect(result.ok).toBe(true);if(!result.ok)return;
 expect(result.route.hazards).toBeUndefined();const sim=new RaceSimulation(result.route,coastalTrack,6);
 for(let i=0;i<20000&&!sim.state.finished;i++)sim.step();
 expect(sim.state.finished).toBe(true);expect(sim.state.recoveryCount).toBe(0);expect(sim.state.lapTimes).toHaveLength(6);
});
test('the 32-metre wheel and its frames fit the original protected amusement deck',()=>{
 const t=reflectSantaVenue(findCircuit('santa-monica').track),b=t.barriers.find(b=>b.id==='amusement-protected')!,a=pierComposition;
 expect(a.wheelRadius/9.3).toBeGreaterThan(1.7);expect(a.wheelY-a.wheelRadius-1.4).toBeGreaterThan(0);
 for(const x of[a.wheelX-a.wheelRadius-1.07,a.wheelX+a.wheelRadius+1.07])for(const z of[a.wheelZ-2.54,a.wheelZ+2.54])expect(insideBarrier({x,z},b)).toBe(true);
});
test('the timber landing is supported, upward-lit and clear of the water opening',()=>{
 const t=reflectSantaVenue(findCircuit('santa-monica').track),j=t.jumps![0],g=pierLandingGeometry(j),v=g.toVertexData();let tops=0;
 for(let i=0;i<g.vertexCount;i++){
  const p={x:g.positions[i*3],z:g.positions[i*3+2]},c=jumpCoordinates(p,j),y=g.positions[i*3+1];
  expect(c.along).toBeGreaterThanOrEqual(j.rampLength+j.gap-1e-6);expect(Math.abs(c.across)).toBeLessThanOrEqual(j.width/2+.001);
  expect(y).toBeLessThanOrEqual(.11001);
 }
 for(let k=0;k<g.indices.length;k+=3){const ids=g.indices.slice(k,k+3);if(ids.every(i=>Math.abs(g.positions[i*3+1]-.11)<1e-6)){for(const i of ids)expect(v.normals![i*3+1]).toBeGreaterThan(.9);tops++;}}
 expect(tops).toBeGreaterThan(100);expect(g.triangleCount).toBeLessThan(2500);
});
const bounded=(g:Geometry,ids:string[],venue:string)=>{
 const barriers=findCircuit(venue).track.barriers.filter(b=>ids.includes(b.id));
 for(let i=0;i<g.vertexCount;i++){const p={x:g.positions[i*3],z:g.positions[i*3+2]};expect(barriers.some(b=>insideBarrier(p,b)||edgeDistance(p,b.footprint)<.001),JSON.stringify(p)).toBe(true);}
};
test('launch structures and service vehicles stay in their original protected parcels',()=>bounded(launchOperations(),['assembly-island','launch-complex'],'launchsite'));
test('the theatre stays inside its protected block and original eight-metre building envelope',()=>{
 const a=nightPictureHouse();for(const g of[a.paint,a.lights]){bounded(g,['arts-block'],'la-nights');for(let i=1;i<g.positions.length;i+=3)expect(g.positions[i]).toBeLessThanOrEqual(8.18);}
});
test('bay roof details stay within the existing building silhouettes',()=>{
 const g=bayRoofscape();
 for(let i=0;i<g.vertexCount;i++){const x=g.positions[i*3],y=g.positions[i*3+1],z=g.positions[i*3+2];expect(cityBuildings.some(b=>Math.abs(x-b.x)<=b.width/2+.001&&Math.abs(z-b.z)<=b.depth/2+.001&&y<=b.height+.181)).toBe(true);}
});
