import{cumulative,projectToPolyline}from'../geometry';
import type{DeckSurface,Point,TrackBarrier}from'../types';
/** Offline authoritative rail authoring; no ship/road generation on app startup. */
export function deriveFleetRails(decks:DeckSurface[],roadPaths:Point[][]){const barriers:TrackBarrier[]=[];
// Protective deck-edge rails leave every road and authored takeoff/landing mouth clear.
const roadDistances=roadPaths.map(cumulative);
for(const d of decks.filter(d=>d.kind!=='transfer'))for(let edge=0;edge<d.footprint.length;edge++){
 const a=d.footprint[edge],b=d.footprint[(edge+1)%d.footprint.length],dx=b.x-a.x,dz=b.z-a.z,n=Math.ceil(Math.hypot(dx,dz)/3),normal={x:-dz/Math.hypot(dx,dz)*.2,z:dx/Math.hypot(dx,dz)*.2};let first:number|undefined;
 const clear=(u:number)=>{const p={x:a.x+dx*u,z:a.z+dz*u};return roadPaths.every((path,i)=>projectToPolyline(p,path,roadDistances[i]).distance>10.5);};
 for(let i=0;i<=n;i++){
  const allowed=i<n&&clear((i+.5)/n)&&clear(i/n)&&clear((i+1)/n);
  if(allowed&&first===undefined)first=i/n;
  if(!allowed&&first!==undefined){const p={x:a.x+dx*first,z:a.z+dz*first},q={x:a.x+dx*i/n,z:a.z+dz*i/n};barriers.push({id:'fleet-rail-'+d.id+'-'+edge+'-'+i,kind:'pier-rail',baseHeight:d.elevation,height:1.1,footprint:[{x:p.x-normal.x,z:p.z-normal.z},{x:q.x-normal.x,z:q.z-normal.z},{x:q.x+normal.x,z:q.z+normal.z},{x:p.x+normal.x,z:p.z+normal.z}]});first=undefined;}
 }
}

return barriers;}
