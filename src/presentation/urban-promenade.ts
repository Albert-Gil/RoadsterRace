import type {TrackDefinition,Point} from '../core/types';
import {roadEdges} from '../core/road-geometry';
import {insideBarrier} from '../core/barriers';
import {projectToPolylineNear} from '../core/nearest';
import {CompositionShapes} from './composition-shapes';
import {hex,mix} from './landscape/mesh';
import {venueComposition as art} from './themes';

/** Flat paved verges embed the circuit in its city. They never add support,
 * collision or tire grip. Every bridge/water opening remains uncovered. */
export function urbanPromenade(track:TrackDefinition,night:boolean,onLand:(p:Point)=>boolean){
 const g=new CompositionShapes(),inner=roadEdges(track.centerline,track.roadWidth+1.65),outer=roadEdges(track.centerline,track.roadWidth+5.6),color=hex(night?art.night.paving:art.city.paving);
 const clear=(p:Point)=>onLand(p)&&projectToPolylineNear(p,track.centerline,track.distances).distance>=track.roadWidth/2+.6&&!track.waterOpenings?.some(w=>insideBarrier(p,{...w,height:0}));
 for(const side of[0,1])for(let i=0;i<track.centerline.length-1;i++){
  const ps=[inner[side][i],inner[side][i+1],outer[side][i+1],outer[side][i]];if(!ps.every(clear))continue;
  const joints=Math.floor(track.distances[i]/3)%2,c=joints?mix(color,[0,0,0],.055):color;
  for(const tri of[[0,1,2],[0,2,3]]){
   const[a,b,cPoint]=tri.map(i=>ps[i]),area=(cPoint.z-a.z)*(b.x-a.x)-(cPoint.x-a.x)*(b.z-a.z);if(Math.abs(area)<1e-8)continue;
   const ids=(area>0?tri:tri.slice().reverse()).map(i=>g.vertex(ps[i].x,.038,ps[i].z,c));g.triangle(ids[0],ids[1],ids[2]);
  }
 }
 return g;
}
