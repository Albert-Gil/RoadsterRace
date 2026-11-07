import type { Point, TrackDefinition } from '../core/types';
import { cumulative, mix, samplePolyline } from '../core/geometry';
import { roadEdges } from '../core/road-geometry';
import { crossingCoords, deckAt } from '../core/decks';
import { CompositionShapes } from './composition-shapes';
import { deckTriangles } from './fleet-deck-shapes';
import { hex } from './landscape/mesh';
import { fleetAppearance, fleetLaneAppearance as art } from './themes';

const cross=(a:Point,b:Point,p:Point)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
/** Clip each paint polygon to disjoint deck triangles: no lane or kerb spans a water gap. */
function intersection(subject:Point[],triangle:Point[]){
 let out=subject;
 for(let i=0;i<3&&out.length;i++){
  const a=triangle[i],b=triangle[(i+1)%3],input=out;out=[];
  for(let k=0;k<input.length;k++){
   const p=input[k],q=input[(k+1)%input.length],dp=cross(a,b,p),dq=cross(a,b,q);
   if(dp>=-1e-8)out.push(p);
   if((dp>=0)!==(dq>=0))out.push(mix(p,q,dp/(dp-dq)));
  }
 }
 return out;
}
/** Presentation-only guidance: the entire supported deck retains its existing grip. */
export function carrierLaneGeometry(track:TrackDefinition){
 const floor=new CompositionShapes(),markings=new CompositionShapes(),kerbs=new CompositionShapes();
 const carriers=(track.decks??[]).filter(d=>d.kind==='carrier').map(d=>({deck:d,triangles:deckTriangles(d.footprint).reduce<Point[][]>((all,_,i,ids)=>{if(i%3===0)all.push(ids.slice(i,i+3).map(k=>d.footprint[k]));return all;},[])}));
 const emit=(g:CompositionShapes,ps:Point[],owner:typeof carriers[number],height:number,color:string)=>{
  const minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x)),minZ=Math.min(...ps.map(p=>p.z)),maxZ=Math.max(...ps.map(p=>p.z));
  for(const tri of owner.triangles){
   if(Math.min(...tri.map(p=>p.x))>maxX||Math.max(...tri.map(p=>p.x))<minX||Math.min(...tri.map(p=>p.z))>maxZ||Math.max(...tri.map(p=>p.z))<minZ)continue;
   const clipped=intersection(ps,tri);if(clipped.length<3)continue;
   const faces:number[][]=[];
   for(let i=1;i<clipped.length-1;i++){
    const area=cross(clipped[0],clipped[i],clipped[i+1]);if(Math.abs(area)<1e-4)continue;
    // Babylon's clockwise convention: every flush top must face upward, regardless of source strip winding.
    faces.push(area>0?[0,i,i+1]:[0,i+1,i]);
   }
   const ids=new Map<number,number>();for(const i of new Set(faces.flat())){const p=clipped[i];ids.set(i,g.vertex(p.x,height,p.z,hex(color)));}
   for(const face of faces)g.triangle(ids.get(face[0])!,ids.get(face[1])!,ids.get(face[2])!);
  }
 };
 const ds=cumulative(track.centerline),length=ds.at(-1)!,dense=Array.from({length:Math.ceil(length)+1},(_,i)=>samplePolyline(track.centerline,ds,Math.min(i,length))),path:Point[]=[];
 // Explicitly split at ramp bases/lips and landings before clipping the floor and paint.
 for(let i=0;i<dense.length-1;i++){
  const a=dense[i],b=dense[i+1],cuts=[0];
  for(const j of track.jumps??[]){if(!j.mandatory)continue;const ac=crossingCoords(a,j),bc=crossingCoords(b,j);
   for(const edge of[0,j.rampLength,j.rampLength+j.gap])if(Math.abs(bc.along-ac.along)>1e-8){const t=(edge-ac.along)/(bc.along-ac.along);if(t>1e-7&&t<1-1e-7&&Math.abs(crossingCoords(mix(a,b,t),j).across)<j.width)cuts.push(t);}
  }
  for(const t of [...new Set(cuts)].sort((a,b)=>a-b))path.push(mix(a,b,t));
 }
 path.push(dense.at(-1)!);
 const edges=roadEdges(path,track.roadWidth),outer=roadEdges(path,track.roadWidth-art.edgeInset*2),inner=roadEdges(path,track.roadWidth-(art.edgeInset+art.edgeWidth)*2),curbIn=roadEdges(path,track.roadWidth+.25),curbOut=roadEdges(path,track.roadWidth+.25+art.kerbWidth*2),centre=roadEdges(path,.32),distances=cumulative(path);
 for(let i=0;i<path.length-1;i++){
  const mid=mix(path[i],path[i+1],.5),deck=deckAt(mid,track),owner=carriers.find(c=>c.deck.id===deck?.id);if(!owner)continue;
  if(track.jumps?.some(j=>{const c=crossingCoords(mid,j);return j.rampLength>0&&c.along>0&&c.along<j.rampLength&&Math.abs(c.across)<j.width/2;}))continue;
  const height=owner.deck.elevation+fleetAppearance.drivingOffset+.015;
  emit(floor,[edges[0][i],edges[1][i],edges[1][i+1],edges[0][i+1]],owner,height,art.surface);
  for(const side of[0,1])emit(markings,[outer[side][i],inner[side][i],inner[side][i+1],outer[side][i+1]],owner,height+.015,art.edge);
  const prev=path[(i+path.length-2)%(path.length-1)],a=path[i],b=path[i+1],dx=a.x-prev.x,dz=a.z-prev.z,ex=b.x-a.x,ez=b.z-a.z,turn=Math.atan2(dx*ez-dz*ex,dx*ex+dz*ez),curvature=turn/Math.max(.1,(Math.hypot(dx,dz)+Math.hypot(ex,ez))/2);
  if(Math.abs(curvature)>.012){const side=curvature>0?1:0;emit(kerbs,[curbIn[side][i],curbOut[side][i],curbOut[side][i+1],curbIn[side][i+1]],owner,height+art.kerbHeight,Math.floor(distances[i]/3)%2?art.kerbWhite:art.kerbRed);}
  else if(distances[i]%12<4)emit(markings,[centre[0][i],centre[1][i],centre[1][i+1],centre[0][i+1]],owner,height+.015,art.centre);
 }
 return{floor,markings,kerbs};
}
