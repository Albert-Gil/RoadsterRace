import type { DeckSurface, Point, TrackBarrier } from '../core/types';
import { CompositionShapes } from './composition-shapes';
import { hex, mix } from './landscape/mesh';
import { fleetAppearance as art } from './themes';

export function vesselFrame(d: DeckSurface) {
 const origin=d.vessel!.origin,f=d.vessel!.forward,r={x:-f.z,z:f.x};
 return {local:(p:Point)=>({x:(p.x-origin.x)*f.x+(p.z-origin.z)*f.z,z:(p.x-origin.x)*r.x+(p.z-origin.z)*r.z}),world:(s:number,t:number,y:number):number[]=>[origin.x+s*f.x+t*r.x,y,origin.z+s*f.z+t*r.z]};
}
/** Multiple continuous chines, a narrower waterline and a deep keel give a ship, not a vertical platform. */
export function navalHull(d:DeckSurface,hull:CompositionShapes,paint:CompositionShapes,details:CompositionShapes) {
 const frame=vesselFrame(d),ps=d.footprint.map(frame.local),height=d.elevation;
 const rows=[{y:height,s:1,t:1},{y:height-1.15,s:.997,t:.985},{y:height-2.4,s:.97,t:d.kind==='carrier'?.88:.96},{y:height*.51,s:.94,t:d.kind==='carrier'?.69:.83},{y:-1.6,s:.9,t:d.kind==='carrier'?.58:.71},{y:-5.5,s:.82,t:.34}];
 for(let row=0;row<rows.length-1;row++)for(let i=0;i<ps.length;i++){
  const a=ps[i],b=ps[(i+1)%ps.length],hi=rows[row],lo=rows[row+1];
  const shade=row===0?art.coping:row===4?art.bootTop:row===3?art.waterline:row===1?art.hullShade:art.hull;
  hull.quad([frame.world(a.x*hi.s,a.z*hi.t,hi.y),frame.world(b.x*hi.s,b.z*hi.t,hi.y),frame.world(b.x*lo.s,b.z*lo.t,lo.y),frame.world(a.x*lo.s,a.z*lo.t,lo.y)].reverse(),mix(hex(shade),hex('#273b48'),i%3===0?.12:0));
  if(row===3)paint.beam(frame.world(a.x*lo.s,a.z*lo.t,lo.y+.1),frame.world(b.x*lo.s,b.z*lo.t,lo.y+.1),.14,art.bootTop,5);
 }
 // Long steel strakes, drainage ports and under-flight-deck bracing are baked into the hull batch.
 for(let i=0;i<ps.length;i++){
  const a=ps[i],b=ps[(i+1)%ps.length],length=Math.hypot(b.x-a.x,b.z-a.z),count=Math.floor(length/7);
  for(let n=1;n<count;n++){
   const u=n/count,s=a.x+(b.x-a.x)*u,t=a.z+(b.z-a.z)*u;
   details.beam(frame.world(s*.97,t*.88,height-2.5),frame.world(s,t,height-.55),.12,art.ribs,4);
   const w=.5;
   paint.beam(frame.world(s-w,t*.86,height*.55),frame.world(s+w,t*.86,height*.55),.22,art.dark,5);
   if(n%3===0){details.beam(frame.world(s-1.1,t*.99,height-1.5),frame.world(s+1.1,t*.99,height-1.5),.18,art.coping,5);details.beam(frame.world(s,t*.97,height-3),frame.world(s,t*.97,height-.7),.09,art.ribs,4);}
   if(n%5===0&&Math.abs(t)>15){paint.beam(frame.world(s-2,t*.915,height*.79),frame.world(s+2,t*.915,height*.79),.35,art.dark,5);details.beam(frame.world(s-1.8,t*.92,height*.79),frame.world(s+1.8,t*.92,height*.79),.05,art.coping,4);}
  }
 }
 // Hull identification and anchors are large enough to read from the overview.
 const longEdge=ps.map((a,i)=>({a,b:ps[(i+1)%ps.length]})).filter(e=>(e.a.z+e.b.z)/2<0).sort((a,b)=>Math.hypot(b.b.x-b.a.x,b.b.z-b.a.z)-Math.hypot(a.b.x-a.a.x,a.b.z-a.a.z))[0];
 if(longEdge){const{a,b}=longEdge,edgeLength=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/edgeLength,dz=(b.z-a.z)/edgeLength,center={x:a.x+(b.x-a.x)*.74,z:a.z+(b.z-a.z)*.74};
  const at=(x:number,y:number)=>{const high=rows.findIndex((r,i)=>i<rows.length-1&&y<=r.y&&y>=rows[i+1].y),i=Math.max(0,high),u=(rows[i].y-y)/(rows[i].y-rows[i+1].y),s=rows[i].s+(rows[i+1].s-rows[i].s)*u,t=rows[i].t+(rows[i+1].t-rows[i].t)*u;return frame.world((center.x+dx*x)*s,(center.z+dz*x)*t-.045,y);};
  const digitSegments:Record<string,string>={'0':'abcedf','1':'bc','2':'abged','4':'fgbc','6':'afgecd','7':'abc'},segments:Record<string,[number,number,number,number]>={a:[0,1,1,.14],b:[.5,.5,.14,1],c:[.5,-.5,.14,1],d:[0,-1,1,.14],e:[-.5,-.5,.14,1],f:[-.5,.5,.14,1],g:[0,0,1,.14]},label=d.kind==='carrier'?(d.id.endsWith('a')?'07':'14'):d.kind==='destroyer'?(d.id.endsWith('a')?'21':'22'):(d.id.endsWith('a')?'61':'62'),scale=d.kind==='carrier'?2.5:1.7,cy=height*.48;
  for(const[n,digit]of[...label].entries())for(const segment of digitSegments[digit]??''){const[x,y,w,h]=segments[segment],cx=(n-.5)*scale*1.6+x*scale,yy=cy+y*scale;paint.quad([at(cx-w*scale/2,yy-h*scale/2),at(cx+w*scale/2,yy-h*scale/2),at(cx+w*scale/2,yy+h*scale/2),at(cx-w*scale/2,yy+h*scale/2)],art.line);}
  const anchorX=-scale*5,ay=height*.7;details.beam(at(anchorX,ay+1.3),at(anchorX,ay-1.5),.18,art.dark,6);details.beam(at(anchorX-1.2,ay+.6),at(anchorX+1.2,ay+.6),.12,art.dark,6);for(const side of[-1,1])details.beam(at(anchorX,ay-1.5),at(anchorX+side*1.1,ay-.8),.17,art.dark,6);
 }
 if(d.kind==='carrier')for(const side of[-1,1])for(let s=-78;s<60;s+=18){
  // Life-raft capsules and diagonal hangar-side braces sit below the outboard deck.
  const t=side*31.2,y=height-3.1;details.beam(frame.world(s-1.8,t,y),frame.world(s+1.8,t,y),.42,art.coping,8);details.beam(frame.world(s-2.2,t-side*.7,y-1.1),frame.world(s-2.2,t,y+.3),.1,art.ribs,5);details.beam(frame.world(s+2.2,t-side*.7,y-1.1),frame.world(s+2.2,t,y+.3),.1,art.ribs,5);
 }
}
function tapered(g:CompositionShapes,x:number,y:number,z:number,w:number,h:number,d:number,topScale:number,color:string){
 const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,tx=w*topScale/2,tz=d*topScale/2;
 g.quad([[a,y,c],[b,y,c],[x+tx,y+h,z-tz],[x-tx,y+h,z-tz]],color);g.quad([[b,y,e],[a,y,e],[x-tx,y+h,z+tz],[x+tx,y+h,z+tz]],color);
 g.quad([[a,y,e],[a,y,c],[x-tx,y+h,z-tz],[x-tx,y+h,z+tz]],mix(hex(color),hex('#1a2d37'),.12));g.quad([[b,y,c],[b,y,e],[x+tx,y+h,z+tz],[x+tx,y+h,z-tz]],color);
 g.quad([[x-tx,y+h,z-tz],[x+tx,y+h,z-tz],[x+tx,y+h,z+tz],[x-tx,y+h,z+tz]],art.coping);
}
/** Each kit part remains inside the authoritative parked-aircraft / superstructure envelope. */
export function navalProp(b:TrackBarrier,details:CompositionShapes,radar:CompositionShapes) {
 const a=b.footprint[0],next=b.footprint[1],last=b.footprint.at(-1)!,w=Math.hypot(next.x-a.x,next.z-a.z),d=Math.hypot(last.x-a.x,last.z-a.z),center={x:b.footprint.reduce((v,p)=>v+p.x,0)/b.footprint.length,z:b.footprint.reduce((v,p)=>v+p.z,0)/b.footprint.length},base=b.baseHeight??0,g=new CompositionShapes(),h=b.height;
 if(b.id.includes('aircraft')&&b.id.endsWith('-92')){
  tapered(g,0,.4,0,6,1.8,2.2,.8,art.aircraft);tapered(g,1.5,1.3,0,2.4,1.1,2.05,.75,art.glass);
  g.beam([-2,.9,0],[-6,1.9,0],.25,art.hull);g.quad([[-6,1.6,-.18],[-6.6,3.7,-.18],[-5.1,3.3,-.18],[-4.9,1.6,-.18]],art.equipment);
  g.beam([0,2.2,0],[0,3.6,0],.15,art.ribs,6);g.box(0,3.65,0,10.2,.12,.3,art.dark);g.box(0,3.65,0,.3,.12,10.2,art.dark);
  for(const side of[-1,1]){g.beam([-2,.3,side*1.3],[2,.3,side*1.3],.12,art.dark,6);g.beam([-1,.3,side*1.3],[-1,.9,side*.8],.08,art.ribs,5);g.beam([1,.3,side*1.3],[1,.9,side*.8],.08,art.ribs,5);}
 }else if(b.id.includes('deck-tractor')){
  g.box(0,.7,0,w*.95,.85,d*.84,art.equipment);g.box(-w*.22,1.25,0,w*.37,.4,d*.7,art.equipment);g.box(w*.2,1.6,0,w*.3,.85,d*.64,art.glass);g.box(w*.2,2.1,0,w*.4,.18,d*.8,art.coping);
  for(const x of[-w*.3,w*.3])for(const z of[-d*.4,d*.4])g.box(x,.42,z,.8,.84,.52,art.dark);
  g.box(-w*.48,.6,0,.16,.3,d*.8,art.dark);
 }else if(b.id.includes('aircraft')){
  // A slender fuselage, pointed radome, folded wings, separate cockpit and twin engines.
  g.beam([-w*.35,1.2,0],[w*.3,1.2,0],d*.095,art.aircraft,10);
  g.quad([[w*.3,.4,-d*.08],[w*.49,.58,0],[w*.3,1.0,d*.08],[w*.3,1.0,-d*.08]],art.aircraft);
  for(const side of[-1,1]){
   g.quad([[-w*.25,.65,side*d*.07],[w*.17,.65,side*d*.1],[-w*.09,.72,side*d*.49],[-w*.43,.72,side*d*.39]],art.aircraft);
   g.quad([[-w*.43,.72,side*d*.39],[-w*.09,.72,side*d*.49],[-w*.1,1.65,side*d*.39],[-w*.4,1.55,side*d*.3]],art.coping);
   g.quad([[-w*.43,.7,side*d*.12],[-w*.46,h*.91,side*d*.17],[-w*.2,h*.67,side*d*.17],[-w*.15,.7,side*d*.12]],art.aircraft);
   g.beam([-w*.44,.65,side*d*.08],[-w*.26,.65,side*d*.08],.22,art.dark,8);
  }
  tapered(g,w*.13,.9,0,w*.31,.65,d*.2,.66,art.glass);
  for(const x of[-w*.27,w*.24])for(const z of[-d*.1,d*.1]){g.beam([x,.1,z],[x,.5,z],.06,art.ribs,5);g.box(x,.16,z,.36,.32,.2,art.dark);}
 }else if(b.id.includes('turret')){
  tapered(g,0,.1,0,w*.8,h*.58,d*.55,.74,art.hull);g.box(0,.2,0,w*.92,.3,d*.64,art.ribs);
  for(const x of[-w*.21,0,w*.21])g.beam([x,h*.53,-d*.1],[x,h*.69,-d*.48],.15,art.hullShade,7);
  g.box(0,h*.69,.3,w*.48,.2,d*.3,art.coping);
 }else{
  const carrier=b.id.includes('carrier'),support=b.id.includes('support'),levels=2;
  tapered(g,0,0,0,w*.98,h*.36,d*.98,.88,art.hullShade);
  for(let level=0;level<levels;level++){
   const y=h*(.32+level*.16),ww=w*(.96-level*.15),dd=d*(.93-level*.16);
   g.box(0,y,0,ww,.24,dd,art.coping);tapered(g,0,y+.12,0,ww*.92,h*.135,dd*.86,.9,art.hull);
   for(const side of[-1,1])for(let i=0;i<5;i++)g.box(-ww*.36+i*ww*.18,y+h*.075,side*dd*.435,ww*.12,h*.045,.04,art.glass);
   for(const side of[-1,1])for(let i=0;i<3;i++)g.box(side*ww*.463,y+h*.075,-dd*.28+i*dd*.28,.04,h*.045,dd*.18,art.glass);
  }
  // Separate stack, dark exhaust top and louvered intake face.
  if(!support){tapered(g,w*.22,h*.45,d*.25,w*.32,h*.28,d*.26,.85,art.hullShade);g.box(w*.22,h*.73,d*.25,w*.28,.15,d*.23,art.dark);for(let i=0;i<5;i++)g.box(w*.22,h*(.48+i*.035),d*.39,w*.25,.07,.035,art.ribs);}
  const mastY=h*.76;g.beam([0,mastY,0],[0,h*.99,0],.13,art.ribs,6);
  for(const side of[-1,1]){g.beam([side*w*.28,h*.65,0],[0,h*.95,0],.075,art.coping,5);g.beam([-w*.35,h*.86,side*d*.12],[w*.35,h*.86,side*d*.12],.07,art.ribs,4);g.beam([side*w*.27,h*.61,-d*.18],[side*w*.27,h*.91,-d*.18],.04,art.coping,5);}
  // Original canted array and bridge roof radome, kept under the physical mast height.
  g.beam([w*.27,h*.72,d*.23],[w*.27,h*.85,d*.23],Math.min(w*.1,d*.24),art.coping,8);
  const rotor=new CompositionShapes();rotor.box(0,0,0,w*.62,.28,d*.055,art.ribs);for(let i=-2;i<=2;i++)rotor.box(i*w*.1,.25,0,.05,.65,d*.04,art.coping);
  radar.instance(rotor,{x:center.x,y:base+h*.94,z:center.z});
  for(const side of[-1,1])for(let i=0;i<4;i++)g.box(side*w*.48,.7+i*.36,-d*.3,.07,.12,1.1,art.coping);
 }
 details.instance(g,{x:center.x,y:base,z:center.z,heading:-Math.atan2(next.z-a.z,next.x-a.x)});
}
