import{clamp,cumulative,lerp,projectToPolyline}from'./geometry';
import{insideBarrier}from'./barriers';
import type{DeckSurface,Point,TrackDefinition,TrackJump}from'./types';

// Runtime track polygons are immutable. Most wheel/landing probes are nowhere near
// a given vessel: reject those cheaply, retaining the exact polygon test at its edges.
const deckBounds=new WeakMap<Point[],{minX:number;maxX:number;minZ:number;maxZ:number}>();
export const onDeck=(p:Point,d:DeckSurface)=>{
 let b=deckBounds.get(d.footprint);if(!b){b={minX:Math.min(...d.footprint.map(p=>p.x))-1e-7,maxX:Math.max(...d.footprint.map(p=>p.x))+1e-7,minZ:Math.min(...d.footprint.map(p=>p.z))-1e-7,maxZ:Math.max(...d.footprint.map(p=>p.z))+1e-7};deckBounds.set(d.footprint,b);}
 return p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ&&insideBarrier(p,{id:d.id,height:0,footprint:d.footprint});
};
export function deckElevation(p:Point,d:DeckSurface){if(d.from&&d.to&&d.toElevation!==undefined){const dx=d.to.x-d.from.x,dz=d.to.z-d.from.z,n=d.gradeNormal??{x:dx,z:dz},t=clamp(((p.x-d.from.x)*n.x+(p.z-d.from.z)*n.z)/(dx*n.x+dz*n.z),0,1);return lerp(d.elevation,d.toElevation,t);}return d.elevation;}
export function deckAt(p:Point,t:TrackDefinition,ceiling=Infinity,id?:string){
 let result:DeckSurface|undefined,height=-Infinity;
 for(const d of t.decks??[]){if(id&&d.id!==id||!onDeck(p,d))continue;const h=deckElevation(p,d);if(h<=ceiling+.05&&h>height){result=d;height=h;}}
 return result;
}
export function crossingCoords(p:Point,j:TrackJump){const dx=p.x-j.from.x,dz=p.z-j.from.z;return{along:dx*j.forward.x+dz*j.forward.z,across:dx*j.forward.z-dz*j.forward.x};}
export function crossingHeight(p:Point,j:TrackJump){const c=crossingCoords(p,j),base=j.takeoffElevation??0;if(c.along<=j.rampLength)return base+clamp(c.along/Math.max(.001,j.rampLength),0,1)*j.lipHeight;return lerp(base+j.lipHeight,j.landingElevation??0,clamp((c.along-j.rampLength)/Math.max(.001,j.gap),0,1));}
/** Guides are presentation/planning surfaces only. Physical support always uses deckAt. */
export function deckPlanningHeight(p:Point,t:TrackDefinition){
 const ramp=t.jumps?.find(j=>{const c=crossingCoords(p,j);return c.along>=0&&c.along<=j.rampLength&&Math.abs(c.across)<=j.width/2;});if(ramp)return crossingHeight(p,ramp);
 const deck=deckAt(p,t);if(deck)return deckElevation(p,deck);
 const flight=t.jumps?.find(j=>{const c=crossingCoords(p,j);return c.along>=0&&c.along<=j.rampLength+j.gap&&Math.abs(c.across)<=j.width/2;});if(flight)return crossingHeight(p,flight);
 return undefined;
}
export function deckVehicleSupported(p:Point,heading:number,t:TrackDefinition,id?:string){
 const half=t.carLength/2-.15,side=t.carWidth/2-.1;
 return[-1,1].every(f=>[-1,1].every(s=>!!deckAt({x:p.x+Math.sin(heading)*half*f+Math.cos(heading)*side*s,z:p.z+Math.cos(heading)*half*f-Math.sin(heading)*side*s},t,Infinity,id)));
}
/** Every crossing is recognized separately and in route order, including alternate returns. */
export function deckCrossings(points:Point[],t:TrackDefinition){
 const ds=cumulative(points),found:{id:string;entryDistance:number;exitDistance:number;activation:'automatic'|'hop'}[]=[];
 for(const j of t.jumps??[]){const half=(j.width-t.carWidth)/2,c=points.map(p=>crossingCoords(p,j)),a=c.findIndex((q,i)=>i>0&&c[i-1].along<=0&&q.along>0&&Math.abs(q.across)<=half);
  // A skewed ship's landing mouth may reach one rear wheel later than the centreline.
  // Keep the crossing active until the whole footprint is on its named receiving deck.
  if(a<0)continue;const b=c.findIndex((q,i)=>i>a&&q.along>=j.rampLength+j.gap+t.carLength/2&&Math.abs(q.across)<=half&&deckVehicleSupported(points[i],Math.atan2(points[i].x-points[i-1].x,points[i].z-points[i-1].z),t,j.landingSurfaceId));if(b<0)continue;
  if(!c.slice(a,b+1).every((q,i,all)=>Math.abs(q.across)<=half&&(!i||q.along>=all[i-1].along-.5)))continue;
  found.push({id:j.id,entryDistance:ds[a],exitDistance:ds[b],activation:j.activation??'automatic'});
 }
 // A support-ship entry and return must both be present, forward and in order.
 const rejected=new Set<string>();for(const lane of t.hopShortcuts??[])if(lane.crossings){const a=found.find(c=>c.id===lane.crossings![0]),b=found.find(c=>c.id===lane.crossings![1]);if(!a||!b||a.exitDistance>=b.entryDistance)lane.crossings.forEach(id=>rejected.add(id));}
 return found.filter(c=>!rejected.has(c.id)).sort((a,b)=>a.entryDistance-b.entryDistance);
}
export function projectDeckBranch(p:Point,branch:Point[],from:number,to:number){const ds=cumulative(branch),r=projectToPolyline(p,branch,ds);return{...r,progress:lerp(from,to,r.progress/ds.at(-1)!)};}
