import {expect,test} from 'vitest';
import {findCircuit} from '../../src/content/circuits';
import {insideBarrier} from '../../src/core/barriers';
import {inFootprint,supported} from '../../src/core/support';
import {reflectSantaVenue} from '../../src/core/tracks/santa-monica';
import {launchFleet,tahoeResortLife,nightTower} from '../../src/presentation/landmark-showcase';
import {amusementAccess,coasterPosition} from '../../src/presentation/pacific-wheel';
import {landmarkShowcase,pierComposition} from '../../src/presentation/themes';
import {edgeDistance,type Geometry} from '../../src/presentation/landscape/mesh';
import {tahoeLayout} from '../../src/presentation/tahoe-layout';
const points=(g:Geometry)=>Array.from({length:g.vertexCount},(_,i)=>({x:g.positions[i*3],y:g.positions[i*3+1],z:g.positions[i*3+2]}));
test('five large rockets fit their protected launch and remote staging footprints',()=>{
 const t=findCircuit('launchsite').track,ids=['launch-complex','north-booster-pad','north-stage-pad','west-booster-pad'],pads=t.barriers.filter(b=>ids.some(id=>b.id===id||b.id===`${id}-rocket`)),g=launchFleet();
 expect(landmarkShowcase.rockets).toHaveLength(5);for(const p of points(g))expect(pads.some(b=>(insideBarrier(p,b)||edgeDistance(p,b.footprint)<.001)&&(b.id==='launch-complex'||p.y<=(b.baseHeight??0)+b.height+1e-6))).toBe(true);
 expect(Math.max(...g.positions.filter((_,i)=>i%3===1))).toBeGreaterThan(32);expect(g.triangleCount).toBeLessThan(7500);
 const normals=g.toVertexData().normals!;let checked=0;
 for(let i=0;i<g.vertexCount;i++)for(const r of landmarkShowcase.rockets){const dx=g.positions[i*3]-r.x,dz=g.positions[i*3+2]-r.z,y=g.positions[i*3+1];if(Math.abs(Math.hypot(dx,dz)-r.radius)<1e-5&&y>5&&y<1.25+r.height*.8){expect(normals[i*3]*dx+normals[i*3+2]*dz).toBeGreaterThan(0);checked++;}}
 expect(checked).toBeGreaterThan(30);
});
test('Santa Monica has a 48-metre wheel, a large high coaster and fully supported access',()=>{
 const t=reflectSantaVenue(findCircuit('santa-monica').track),b=t.barriers.find(b=>b.id==='amusement-protected')!;
 expect(t.version).toBe(5);expect(pierComposition.wheelRadius*2).toBe(48);expect(pierComposition.wheelY-pierComposition.wheelRadius-1.7).toBeGreaterThan(0);
 for(const x of[-1,1])for(const z of[-1,1])expect(insideBarrier({x:pierComposition.wheelX+x*(pierComposition.wheelRadius+1.28),z:pierComposition.wheelZ+z*2.7},b)).toBe(true);
 const course=Array.from({length:361},(_,i)=>coasterPosition(i/180*Math.PI));expect(Math.max(...course.map(p=>p.y))).toBeGreaterThan(25);
 for(const p of course){expect(insideBarrier(p,b)).toBe(true);expect(supported(p,t)).toBe(true);}
 for(const p of points(amusementAccess()))expect(t.supports!.some(s=>inFootprint(p,s.footprint))).toBe(true);
 const entry={x:95,z:42.2};expect(t.barriers.some(v=>insideBarrier(entry,v))).toBe(false);expect(supported(entry,t)).toBe(true);
});
test('resort equipment stays in the protected, grounded reserve and clears the buildings',()=>{
 const t=findCircuit('snowy-tahoe').track,b=t.barriers.find(b=>b.id==='forest-reserve')!,g=tahoeResortLife();
 for(const p of points(g)){expect(insideBarrier(p,b),JSON.stringify(p)).toBe(true);expect(t.barriers.filter(v=>v.kind==='building').some(v=>insideBarrier(p,v)),JSON.stringify(p)).toBe(false);}
 expect(g.triangleCount).toBeLessThan(5000);
 for(const tree of tahoeLayout(t).trees.filter(v=>v.authored))expect(landmarkShowcase.tahoe.clearings.some(b=>tree.x>b.x&&tree.x<b.x+b.width&&tree.z>b.z&&tree.z<b.z+b.depth)).toBe(false);
});
test('downtown towers keep setbacks, height envelopes and bounded window geometry',()=>{
 const b={x:0,z:0,width:20,depth:20,height:92},g=nightTower(b,1);
 for(const part of[g.paint,g.lights]){for(const p of points(part)){expect(Math.abs(p.x)).toBeLessThanOrEqual(10);expect(Math.abs(p.z)).toBeLessThanOrEqual(10);expect(p.y).toBeLessThanOrEqual(92.181);}expect(part.triangleCount).toBeLessThan(3000);}
 expect(Math.max(...g.paint.positions.filter((_,i)=>i%3===1))).toBeCloseTo(92.18);
});
