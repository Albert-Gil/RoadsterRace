import type {DeckSurface,Point,TrackDefinition} from '../core/types';
import {onDeck} from '../core/decks';
import {projectToPolyline} from '../core/geometry';
import {CompositionShapes} from './composition-shapes';
import {hex} from './landscape/mesh';
import {fleetAppearance as art} from './themes';

type Frame={world:(s:number,t:number,y:number)=>number[];local:(p:Point)=>Point};
type HullRow={y:number;s:number;t:number};
/** Painted stripes are flush ribbons, never cylindrical props standing above the steel. */
function deckStripe(g:CompositionShapes,a:number[],b:number[],width:number,color:string){
 const length=Math.hypot(b[0]-a[0],b[2]-a[2])||1,nx=-(b[2]-a[2])/length*width/2,nz=(b[0]-a[0])/length*width/2;
 g.quad([[a[0]-nx,a[1]+.012,a[2]-nz],[b[0]-nx,b[1]+.012,b[2]-nz],[b[0]+nx,b[1]+.012,b[2]+nz],[a[0]+nx,a[1]+.012,a[2]+nz]],color);
}
/** Closed, low-poly radomes and rescue craft. All shapes merge into the native venue batches. */
export function navalEllipsoid(g:CompositionShapes,x:number,y:number,z:number,rx:number,ry:number,rz:number,color:string,segments=12,rows=8){
 const rings=Array.from({length:rows+1},(_,row)=>{const p=-Math.PI/2+row/rows*Math.PI;return Array.from({length:segments},(_,i)=>{const a=i/segments*Math.PI*2;return g.vertex(x+Math.cos(p)*Math.cos(a)*rx,y+Math.sin(p)*ry,z+Math.cos(p)*Math.sin(a)*rz,hex(color));});});
 for(let row=0;row<rows;row++)for(let i=0;i<segments;i++){const n=(i+1)%segments;g.triangle(rings[row][i],rings[row+1][n],rings[row+1][i]);g.triangle(rings[row][i],rings[row][n],rings[row+1][n]);}
}
export function deckCrew(g:CompositionShapes,x:number,z:number,color:string){
 g.box(x,.98,z,.48,.62,.3,color);g.box(x,.64,z,.38,.16,.28,art.navy);
 for(const side of[-1,1]){g.beam([x+side*.13,.63,z],[x+side*.16,.14,z+.03],.09,art.navy,5);g.box(x+side*.16,.09,z+.08,.19,.14,.32,art.dark);g.beam([x+side*.27,1.2,z],[x+side*.36,.83,z+.11],.085,color,5);}
 navalEllipsoid(g,x,1.49,z,.22,.23,.22,art.helmet,7,5);g.box(x,1.47,z+.19,.3,.10,.06,art.glass);
}
/** Outfitting follows the actual tapered steel skin, below the entire driveable deck. */
export function hullOutfit(d:DeckSurface,frame:Frame,ps:Point[],rows:HullRow[],details:CompositionShapes,paint:CompositionShapes){
 const skin=(p:Point,y:number)=>{const i=Math.max(0,rows.findIndex((r,i)=>i<rows.length-1&&y<=r.y&&y>=rows[i+1].y)),u=(rows[i].y-y)/(rows[i].y-rows[i+1].y);const len=Math.hypot(p.x,p.z)||1;return frame.world(p.x*(rows[i].s+(rows[i+1].s-rows[i].s)*u)+p.x/len*.035,p.z*(rows[i].t+(rows[i+1].t-rows[i].t)*u)+p.z/len*.035,y);};
 // A warm anti-fouling belt makes the freeboard and waterline unmistakable.
 for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];paint.quad([skin(a,-1.48),skin(b,-1.48),skin(b,1.55),skin(a,1.55)],art.oxide);paint.beam(skin(a,1.65),skin(b,1.65),.10,art.coping,4);}
 for(const side of[-1,1]){
  const edge=ps.map((a,i)=>({a,b:ps[(i+1)%ps.length]})).filter(e=>((e.a.z+e.b.z)/2)*side>0).sort((a,b)=>Math.hypot(b.b.x-b.a.x,b.b.z-b.a.z)-Math.hypot(a.b.x-a.a.x,a.b.z-a.a.z))[0];if(!edge)continue;
  const {a,b}=edge,l=Math.hypot(b.x-a.x,b.z-a.z),at=(u:number,y:number)=>skin({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u},y),half=Math.min(d.kind==='carrier'?8:3,l*.09)/l;
  // Large recessed hangar-door illusions and structural surrounds: no new holes or support.
  if(d.kind==='carrier')for(const u of[.22,.47,.72]){
   const low=d.elevation*.48,high=d.elevation*.77;
   paint.quad([at(u-half,low),at(u+half,low),at(u+half,high),at(u-half,high)],art.hangar);
   for(const v of[u-half,u+half])details.beam(at(v,low),at(v,high),.23,art.coping,5);
   details.beam(at(u-half,high),at(u+half,high),.3,art.coping,5);details.beam(at(u-half,low),at(u+half,low),.18,art.equipment,5);
   for(let n=1;n<4;n++)paint.beam(at(u-half+(2*half*n/4),low+.2),at(u-half+(2*half*n/4),high-.2),.07,art.ribs,4);
  }
  const count=d.kind==='carrier'?3:1;
  for(let n=0;n<count;n++){
   const u=(n+1)/(count+1),y=d.elevation-4.1,p=at(u,y),s=a.x+(b.x-a.x)*u,t=(a.z+(b.z-a.z)*u)*.88;
   const boat=new CompositionShapes();navalEllipsoid(boat,0,0,0,d.kind==='carrier'?3.2:2.4,.83,.95,art.rescueOrange,12,6);navalEllipsoid(boat,.2,.45,0,2.0,.65,.72,art.superstructure,10,5);boat.box(.35,.8,0,1.9,.28,1.30,art.glass);boat.box(0,-.48,0,5.8,.16,.7,art.dark);
   const q=frame.world(s*.975,t,y);details.instance(boat,{x:q[0],y:q[1],z:q[2],heading:-Math.atan2(d.vessel!.forward.z,d.vessel!.forward.x)});
   // Davits and strong triangular under-deck brackets stay below deck height.
   for(const offset of[-4,4]){const top=frame.world(s+offset,t,d.elevation-1),inside=frame.world(s+offset,t-side*2,d.elevation-4.9);details.beam(inside,top,.18,art.coping,6);details.beam(top,[p[0]+d.vessel!.forward.x*offset,y+1.3,p[2]+d.vessel!.forward.z*offset],.14,art.ribs,5);}
  }
 }
}
/** Big aviation markings only on verified clear carrier deck, never on auxiliary ships. */
export function carrierDeckSignature(track:TrackDefinition,d:DeckSurface,frame:Frame,paint:CompositionShapes){
 const local=d.footprint.map(frame.local),s0=Math.min(...local.map(p=>p.x)),s1=Math.max(...local.map(p=>p.x));
 const clear=(x:number,z:number,w:number,h:number)=>[-.5,0,.5].every(a=>[-.5,0,.5].every(b=>{const q=frame.world(x+a*w,z+b*h,d.elevation),p={x:q[0],z:q[2]};return onDeck(p,d)&&projectToPolyline(p,track.centerline,track.distances).distance>track.roadWidth/2+1;}));
 const quad=(x:number,z:number,w:number,h:number,color:string,offset=.075)=>paint.quad([frame.world(x,z,d.elevation+offset),frame.world(x+w,z,d.elevation+offset),frame.world(x+w,z+h,d.elevation+offset),frame.world(x,z+h,d.elevation+offset)],color);
 // An oversized original deck identifier, chosen only on supported, non-racing pavement.
 const w=20,h=7;let found=false;
 for(const tz of[-26,-25,-28]){for(const sx of[s1-80,s1-86,s1-74]){if(!clear(sx+w/2,tz,w,h))continue;
  quad(sx,tz-h/2,w,h,art.navy);
  const glyphs:Record<string,number[][]>={'0':[[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0]],'1':[[.7,0,.7,1],[.35,.25,.7,0]],'4':[[0,0,0,.52],[0,.52,1,.52],[1,0,1,1]],'7':[[0,0,1,0],[1,0,.25,1]]};
  for(const[i,digit]of[...(d.id.endsWith('a')?'07':'14')].entries())for(const[x0,z0,x1,z1]of glyphs[digit]){
   const ax=sx+2+i*9+x0*6,az=tz-h/2+1+z0*5,bx=sx+2+i*9+x1*6,bz=tz-h/2+1+z1*5,len=Math.hypot(bx-ax,bz-az),nx=-(bz-az)/len*.31,nz=(bx-ax)/len*.31;
   paint.quad([frame.world(ax-nx,az-nz,d.elevation+.085),frame.world(bx-nx,bz-nz,d.elevation+.085),frame.world(bx+nx,bz+nz,d.elevation+.085),frame.world(ax+nx,az+nz,d.elevation+.085)],art.line);
  }
  found=true;break;
 }if(found)break;}
 // Flush aircraft elevator: a large inset panel, not a new level or a jump marker.
 const ex=s0+12,ez=-18,ew=16,eh=12;
 if(clear(ex+ew/2,ez,ew,eh)){
  quad(ex,ez-eh/2,ew,eh,art.deckApron);quad(ex+1,ez-eh/2+1,ew-2,eh-2,art.navy,.08);
  for(let n=1;n<4;n++)quad(ex+1+(ew-2)*n/4,ez-eh/2+1,.07,eh-2,art.ribs,.09);
  for(const dx of[0,ew-3])for(const dz of[-eh/2,eh/2-.28])quad(ex+dx,ez+dz,3,.28,art.rescueYellow,.10);
 }
 // Catapult guide channels, outside the racing ribbon and all unmarked Hop approaches.
 for(const t of[-31,-29.8])for(let x=s0+18;x<s1-24;x+=7)if(clear(x+3,t,6,.5))deckStripe(paint,frame.world(x,t,d.elevation+.08),frame.world(x+6,t,d.elevation+.08),.28,art.equipment);
}
/** Parked-aircraft apron, tie-down corners and helipad are contained by existing solid parcels. */
export function aircraftApron(b:import('../core/types').TrackBarrier,paint:CompositionShapes){
 const a=b.footprint[0],next=b.footprint[1],last=b.footprint.at(-1)!,at=(u:number,v:number)=>[a.x+(next.x-a.x)*u+(last.x-a.x)*v,(b.baseHeight??0)+.045,a.z+(next.z-a.z)*u+(last.z-a.z)*v];
 paint.quad([at(.02,.02),at(.98,.02),at(.98,.98),at(.02,.98)],art.deckApron);
 for(const side of[.05,.95]){deckStripe(paint,at(.08,side),at(.32,side),.22,art.equipment);deckStripe(paint,at(.68,side),at(.92,side),.22,art.equipment);}
 if(b.id.endsWith('-92')){
  const center=at(.5,.5),r=Math.min(Math.hypot(next.x-a.x,next.z-a.z),Math.hypot(last.x-a.x,last.z-a.z))*.39;
  for(let n=0;n<28;n++){const t=n/28*Math.PI*2,v=(n+1)/28*Math.PI*2;deckStripe(paint,[center[0]+Math.cos(t)*r,center[1]+.025,center[2]+Math.sin(t)*r],[center[0]+Math.cos(v)*r,center[1]+.025,center[2]+Math.sin(v)*r],.24,art.line);}
  for(const u of[.4,.6])deckStripe(paint,at(u,.28),at(u,.72),.30,art.line);deckStripe(paint,at(.4,.5),at(.6,.5),.30,art.line);
 }
}
