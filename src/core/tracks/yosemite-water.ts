import { roundedCircuit,roadEdges } from '../road-geometry';
import type {Point,TrackDefinition} from '../types';

/** Shared authored water geometry. Outlets are beyond the valley's rendered map;
 * the three existing road crossings retain their original centerlines and widths. */
export const YOSEMITE_WATER_LEVEL=-2.4;
export interface YosemiteLake {id:string;center:Point;level:number;width:number;depth:number;angle:number;footprint:Point[];protectedBy?:Point[]}
export const YOSEMITE_FALLS=[
 {id:'granite-falls',barrierId:'el-capitan-granite',angle:Math.PI/2+.04,lakeId:'granite-plunge-lake',faceImpact:true},
 {id:'creek-falls',barrierId:'bridalveil-granite',angle:Math.PI/2,lakeId:'bridalveil-headwater'},
 {id:'cathedral-falls',barrierId:'valley-west-cathedral',angle:0,lakeId:'cathedral-plunge-lake'},
 {id:'sentinel-falls',barrierId:'valley-south-sentinel-foot',angle:Math.PI/2,lakeId:'sentinel-plunge-lake'},
 {id:'sentinel-buttress-falls',barrierId:'valley-sentinel-buttress',angle:Math.PI/2+.04,lakeId:'sentinel-buttress-lake'},
 {id:'granite-twin-falls',barrierId:'el-capitan-granite',angle:2.05,lakeId:'granite-plunge-lake',faceImpact:true},
] as const;
export function waterRayToEdge(from:Point,angle:number,polygon:readonly Point[]){
 const dx=Math.cos(angle),dz=Math.sin(angle);let best=Infinity;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[j],b=polygon[i],ex=b.x-a.x,ez=b.z-a.z,den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;
  const t=((a.x-from.x)*ez-(a.z-from.z)*ex)/den,u=((a.x-from.x)*dz-(a.z-from.z)*dx)/den;
  if(t>0&&u>=0&&u<=1)best=Math.min(best,t);
 }return best;
}
const centerOf=(p:Point[])=>({x:p.reduce((s,q)=>s+q.x,0)/p.length,z:p.reduce((s,q)=>s+q.z,0)/p.length});
const extend=(path:Point[],tail:Point[])=>[...path,...roundedCircuit([path.at(-1)!,...tail],12,false).slice(1)];
const originalCreek=roundedCircuit([{x:14,z:20},{x:11,z:4},{x:18,z:-15},{x:14,z:-30},{x:14,z:-112},{x:40,z:-164}],8,false);
const headwater=roundedCircuit([{x:15,z:41.5},{x:-2,z:42},{x:-4,z:28},{x:4,z:22},originalCreek[0]],8,false);
export const yosemiteCreekPath=extend([...headwater,...originalCreek.slice(1)],[{x:58,z:-211},{x:40,z:-280}]);
export const yosemiteCreekBanks=roadEdges(yosemiteCreekPath,8,false);
export const yosemiteCreek=[...yosemiteCreekBanks[0],...yosemiteCreekBanks[1].slice().reverse()];
function cathedralPath(track:TrackDefinition){
 const j=track.jumps!.find(j=>j.id==='cathedral-creek-crest')!,c={x:j.from.x+j.forward.x*3,z:j.from.z+j.forward.z*3},side={x:-j.forward.z,z:j.forward.x};
 return roundedCircuit([{x:-129,z:35},{x:c.x-side.x*18,z:c.z-side.z*18},c,{x:c.x+side.x*24,z:c.z+side.z*24}],4,false);
}
export function yosemiteRivers(track:TrackDefinition){
 const west=cathedralPath(track).slice().reverse();
 const paths=[
  {id:'bridalveil-creek',path:yosemiteCreekPath,width:8},
  // From an interior headwater, over the existing southern jump, then out of the valley.
  {id:'sentinel-creek',path:roundedCircuit([{x:75,z:-31},{x:63,z:-49},{x:63,z:-90},{x:100,z:-84.5},{x:118,z:-88},{x:145,z:-132},{x:186,z:-192},{x:190,z:-280}],6,false),width:6},
  {id:'cathedral-creek',path:extend(west,[{x:-121,z:58},{x:-136,z:90},{x:-181,z:112},{x:-245,z:125},{x:-340,z:140}]),width:6},
 ];
 return paths.map(r=>{const banks=roadEdges(r.path,r.width,false);return{...r,level:YOSEMITE_WATER_LEVEL,banks,footprint:[...banks[0],...banks[1].slice().reverse()]};});
}

export function yosemiteLakes(track:TrackDefinition):YosemiteLake[]{
 const protectedLake=(id:string,barrierId:string,center:Point,width:number,depth:number,angle:number)=>{
  const b=track.barriers.find(b=>b.id===barrierId)!;return{id,center,width,depth,angle,level:(b.baseHeight??0)+.75,protectedBy:b.footprint};
 };
 const buttress=track.barriers.find(b=>b.id==='valley-sentinel-buttress')!,bc=centerOf(buttress.footprint),a=Math.PI/2+.04,br=waterRayToEdge(bc,a,buttress.footprint)*.89+.25;
 const west=cathedralPath(track),head=west.at(-1)!,next=west.at(-2)!;
 const specs=[
  protectedLake('granite-plunge-lake','el-capitan-granite',{x:42,z:48},16,10,Math.PI/2+.04),
  {id:'bridalveil-headwater',center:{x:15,z:41.5},level:YOSEMITE_WATER_LEVEL,width:12,depth:8,angle:Math.PI/2},
  {id:'cathedral-plunge-lake',center:{x:-129,z:35},level:YOSEMITE_WATER_LEVEL,width:12,depth:6,angle:0},
  {id:'sentinel-plunge-lake',center:{x:100,z:-84.5},level:YOSEMITE_WATER_LEVEL,width:12,depth:5,angle:Math.PI/2},
  protectedLake('sentinel-buttress-lake','valley-sentinel-buttress',{x:bc.x+Math.cos(a)*br,z:bc.z+Math.sin(a)*br},12,8,a),
  {id:'sentinel-headwater',center:{x:75,z:-31},level:YOSEMITE_WATER_LEVEL,width:10,depth:8,angle:-2.2},
  {id:'cathedral-headwater',center:head,level:YOSEMITE_WATER_LEVEL,width:10,depth:6,angle:Math.atan2(next.z-head.z,next.x-head.x)},
 ];
 return specs.map(spec=>{
  const footprint=Array.from({length:64},(_,i)=>{
   const t=i/64*Math.PI*2,rough=1+.035*Math.sin(t*3)+.022*Math.sin(t*7+.4),side=Math.cos(t)*spec.width/2*rough,forward=Math.sin(t)*spec.depth/2*rough;
   let p={x:spec.center.x-Math.sin(spec.angle)*side+Math.cos(spec.angle)*forward,z:spec.center.z+Math.cos(spec.angle)*side+Math.sin(spec.angle)*forward};
   if('protectedBy'in spec){const dx=p.x-spec.center.x,dz=p.z-spec.center.z,len=Math.hypot(dx,dz),limit=waterRayToEdge(spec.center,Math.atan2(dz,dx),spec.protectedBy)-.06;if(len>limit)p={x:spec.center.x+dx/len*limit,z:spec.center.z+dz/len*limit};}
   return p;
  });return{...spec,footprint};
 });
}
/** The exact polygon used for visible water, shoreline rings and physical support. */
export function yosemiteLakePoint(lake:YosemiteLake,angle:number,radius=1){
 const u=((angle/(Math.PI*2))%1+1)%1*lake.footprint.length,i=Math.floor(u),t=u-i,a=lake.footprint[i],b=lake.footprint[(i+1)%lake.footprint.length];
 let dx=(a.x+(b.x-a.x)*t-lake.center.x)*radius,dz=(a.z+(b.z-a.z)*t-lake.center.z)*radius;
 if(lake.protectedBy){const len=Math.hypot(dx,dz),limit=waterRayToEdge(lake.center,Math.atan2(dz,dx),lake.protectedBy)-.025;if(len>limit){dx*=limit/len;dz*=limit/len;}}
 return{x:lake.center.x+dx,y:lake.level,z:lake.center.z+dz};
}
