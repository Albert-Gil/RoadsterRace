import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { minimumRadius, roadEdges } from '../../src/core/road-geometry';
import { roadHeight } from '../../src/core/elevation';
import { distance } from '../../src/core/geometry';
import { compileRoute, createPracticeSamples } from '../../src/core/route';

for(const {track} of circuits){
 test(`${track.id} has a full-width gate and 16 m roads without folded inside corners`,()=>{
  expect(track.roadWidth).toBe(16);expect(track.startFinish!.width).toBe(16);
  expect(minimumRadius(track.centerline)).toBeGreaterThan(8.5);
  const [a,b]=roadEdges(track.centerline,track.roadWidth);
  for(let i=0;i<a.length-1;i++){
   expect(distance(a[i],b[i])).toBeGreaterThanOrEqual(16-1e-6);
   expect(distance(a[i],b[i])).toBeLessThan(16.1);
   const cross=(b[i].x-a[i].x)*(a[i+1].z-a[i].z)-(b[i].z-a[i].z)*(a[i+1].x-a[i].x);
   expect(cross).toBeLessThan(-1e-6);
  }
  for(const edge of [a,b])for(let i=0;i<edge.length-1;i++)for(let j=i+2;j<edge.length-1;j++){
   if(i===0&&j===edge.length-2)continue;
   if(track.sections && Math.abs(roadHeight(track,track.distances[i])-roadHeight(track,track.distances[j]))>3)continue;
   const p=edge[i],q=edge[i+1],r=edge[j],s=edge[j+1];
   const turn=(a:typeof p,b:typeof p,c:typeof p)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
   expect(turn(p,q,r)*turn(p,q,s)<-1e-8&&turn(r,s,p)*turn(r,s,q)<-1e-8).toBe(false);
  }
 });
 test(`${track.id} centre and both lateral road plans compile`,()=>{
  for(const offset of [-2,0,2]){
   const samples=createPracticeSamples(track,7),edges=roadEdges(track.centerline,Math.abs(offset)*2);
   const path=offset?samples.map((p,i)=>({...p,...edges[offset<0?0:1][i]})):samples;
   const result=compileRoute(path,track);expect(result.ok,JSON.stringify(result)).toBe(true);
  }
 });
}

test('open road endpoints retain exactly the authored width',()=>{const [a,b]=roadEdges([{x:0,z:0},{x:20,z:0}],16,false);expect(distance(a[0],b[0])).toBe(16);expect(distance(a[1],b[1])).toBe(16);});
