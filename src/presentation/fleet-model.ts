import {navalCommand} from './fleet-superstructure';
import {navalEquipment} from './fleet-equipment';
import type { DeckSurface, Point, TrackBarrier } from '../core/types';
import { CompositionShapes } from './composition-shapes';
import { hex, mix } from './landscape/mesh';
import { fleetAppearance as art } from './themes';
import {navalEllipsoid,deckCrew,hullOutfit} from './fleet-outfit';

export function vesselFrame(d: DeckSurface) {
 const origin=d.vessel!.origin,f=d.vessel!.forward,r={x:-f.z,z:f.x};
 return {local:(p:Point)=>({x:(p.x-origin.x)*f.x+(p.z-origin.z)*f.z,z:(p.x-origin.x)*r.x+(p.z-origin.z)*r.z}),world:(s:number,t:number,y:number):number[]=>[origin.x+s*f.x+t*r.x,y,origin.z+s*f.z+t*r.z]};
}
/** Multiple continuous chines, a narrower waterline and a deep keel give a ship, not a vertical platform. */
export function navalHull(d:DeckSurface,hull:CompositionShapes,paint:CompositionShapes,details:CompositionShapes) {
 const frame=vesselFrame(d),outline=d.footprint.map(frame.local),height=d.elevation;
 const ps=outline.flatMap((a,i)=>{const b=outline[(i+1)%outline.length],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/8));return Array.from({length:n},(_,k)=>({x:a.x+(b.x-a.x)*k/n,z:a.z+(b.z-a.z)*k/n}));});
 const s0=Math.min(...ps.map(p=>p.x)),s1=Math.max(...ps.map(p=>p.x));
 const rows=[{y:height,s:1,t:1},{y:height-1.15,s:.997,t:.985},{y:height-2.4,s:.97,t:d.kind==='carrier'?.88:.96},{y:height*.51,s:.94,t:d.kind==='carrier'?.69:.83},{y:-1.6,s:.9,t:d.kind==='carrier'?.58:.71},{y:-5.5,s:.82,t:.34}];
 const atRing=(p:Point,row:number)=>{const r=rows[row],u=(p.x-s0)/(s1-s0),fine=Math.min(1,Math.max(.035,(1-u)/(d.kind==='carrier'?.22:.36)))*(.73+.27*Math.min(1,u/.07)),blend=(d.kind==='carrier'?[0,0,.12,.80,1,1]:[0,0,.38,.90,1,1])[row];return frame.world(p.x*r.s,p.z*r.t*(1-blend+blend*fine),r.y);};
 // Use the same refined skin for labels, hangars and outfitting, not the old slab approximation.
 const skin=(p:Point,y:number)=>{const i=Math.max(0,rows.findIndex((r,i)=>i<rows.length-1&&y<=r.y&&y>=rows[i+1].y)),u=(rows[i].y-y)/(rows[i].y-rows[i+1].y),a=atRing(p,i),b=atRing(p,i+1),x=a[0]+(b[0]-a[0])*u,z=a[2]+(b[2]-a[2])*u,dx=x-d.vessel!.origin.x,dz=z-d.vessel!.origin.z,n=Math.hypot(dx,dz)||1;return[x+dx/n*.045,y,z+dz/n*.045];};
 for(let row=0;row<rows.length-1;row++)for(let i=0;i<ps.length;i++){
  const a=ps[i],b=ps[(i+1)%ps.length];
  const shade=row===0?art.coping:row===4?art.bootTop:row===3?art.waterline:row===1?art.hullShade:art.hull;
  hull.quad([atRing(a,row),atRing(b,row),atRing(b,row+1),atRing(a,row+1)].reverse(),mix(hex(shade),hex('#273b48'),i%3===0?.12:0));
  if(row===3)paint.beam(atRing(a,row+1),atRing(b,row+1),.14,art.bootTop,5);
 }
 // Long steel strakes, drainage ports and under-flight-deck bracing are baked into the hull batch.
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length],length=Math.hypot(b.x-a.x,b.z-a.z),count=Math.floor(length/7);
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
 const longEdge=outline.map((a,i)=>({a,b:outline[(i+1)%outline.length]})).filter(e=>(e.a.z+e.b.z)/2<0).sort((a,b)=>Math.hypot(b.b.x-b.a.x,b.b.z-b.a.z)-Math.hypot(a.b.x-a.a.x,a.b.z-a.a.z))[0];
 if(longEdge){const{a,b}=longEdge,edgeLength=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/edgeLength,dz=(b.z-a.z)/edgeLength,center={x:a.x+(b.x-a.x)*.74,z:a.z+(b.z-a.z)*.74};
  const at=(x:number,y:number)=>skin({x:center.x+dx*x,z:center.z+dz*x},y);
  const digitSegments:Record<string,string>={'0':'abcedf','1':'bc','2':'abged','4':'fgbc','6':'afgecd','7':'abc'},segments:Record<string,[number,number,number,number]>={a:[0,1,1,.14],b:[.5,.5,.14,1],c:[.5,-.5,.14,1],d:[0,-1,1,.14],e:[-.5,-.5,.14,1],f:[-.5,.5,.14,1],g:[0,0,1,.14]},label=d.kind==='carrier'?(d.id.endsWith('a')?'07':'14'):d.kind==='destroyer'?(d.id.endsWith('a')?'21':'22'):(d.id.endsWith('a')?'61':'62'),scale=d.kind==='carrier'?2.5:1.7,cy=height*.48;
  for(const[n,digit]of[...label].entries())for(const segment of digitSegments[digit]??''){const[x,y,w,h]=segments[segment],cx=(n-.5)*scale*1.6+x*scale,yy=cy+y*scale;paint.quad([at(cx-w*scale/2,yy-h*scale/2),at(cx+w*scale/2,yy-h*scale/2),at(cx+w*scale/2,yy+h*scale/2),at(cx-w*scale/2,yy+h*scale/2)],art.line);}
  const anchorX=-scale*5,ay=height*.7;details.beam(at(anchorX,ay+1.3),at(anchorX,ay-1.5),.18,art.dark,6);details.beam(at(anchorX-1.2,ay+.6),at(anchorX+1.2,ay+.6),.12,art.dark,6);for(const side of[-1,1])details.beam(at(anchorX,ay-1.5),at(anchorX+side*1.1,ay-.8),.17,art.dark,6);
 }
 hullOutfit(d,frame,outline,rows,details,paint,skin,ps);
}
function tapered(g:CompositionShapes,x:number,y:number,z:number,w:number,h:number,d:number,topScale:number,color:string,topColor=art.coping){
 const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,tx=w*topScale/2,tz=d*topScale/2;
 g.quad([[a,y,c],[b,y,c],[x+tx,y+h,z-tz],[x-tx,y+h,z-tz]],color);g.quad([[b,y,e],[a,y,e],[x-tx,y+h,z+tz],[x+tx,y+h,z+tz]],color);
 g.quad([[a,y,e],[a,y,c],[x-tx,y+h,z-tz],[x-tx,y+h,z+tz]],mix(hex(color),hex('#1a2d37'),.12));g.quad([[b,y,c],[b,y,e],[x+tx,y+h,z+tz],[x+tx,y+h,z-tz]],color);
 g.quad([[x-tx,y+h,z-tz],[x+tx,y+h,z-tz],[x+tx,y+h,z+tz],[x-tx,y+h,z+tz]],topColor);
}
/** Closed, sectioned jet fuselage; parked aircraft share the venue's equipment batch. */
function fighter(g:CompositionShapes,w:number,d:number,h:number,folded:boolean){
 const color=folded?art.jetBlue:art.aircraft;
 const rows=[[-.46,.76,.075,.3],[-.30,.94,.13,.43],[.04,1.0,.12,.46],[.27,.83,.085,.32],[.49,.68,.008,.025]],rings=rows.map(([s,y,beam,rise])=>Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2;return g.vertex(s*w,y+Math.sin(a)*rise,Math.cos(a)*d*beam,hex(color));}));
 for(let row=0;row<rings.length-1;row++)for(let i=0;i<10;i++){const n=(i+1)%10;g.triangle(rings[row][i],rings[row+1][n],rings[row+1][i]);g.triangle(rings[row][i],rings[row][n],rings[row+1][n]);}
 for(const end of[0,rings.length-1])for(let i=1;i<9;i++)g.triangle(rings[end][0],rings[end][end===0?i:i+1],rings[end][end===0?i+1:i]);
 for(const side of[-1,1]){
  const wing=[[-w*.24,.77,side*d*.10],[w*.16,.77,side*d*.10],[-w*.12,folded?h*.72:.84,side*d*(folded?.30:.48)],[-w*.42,folded?h*.65:.84,side*d*(folded?.25:.37)]];
  g.quad(side<0?[...wing].reverse():wing,color);g.quad((side<0?wing:[...wing].reverse()).map(p=>[p[0],p[1]-.14,p[2]]),art.hullShade);
  for(let i=0;i<4;i++)g.quad([wing[i],wing[(i+1)%4],wing[(i+1)%4].map((v,j)=>j===1?v-.14:v),wing[i].map((v,j)=>j===1?v-.14:v)],art.coping);
  // Folding tips, canted fins and separate horizontal tailplanes give a naval silhouette.
  g.beam(wing[3],wing[2],.065,art.dark,5);
  g.quad([[-w*.42,1,side*d*.09],[-w*.44,h*.88,side*d*.18],[-w*.24,h*.77,side*d*.18],[-w*.14,1,side*d*.09]],art.navy);
  g.beam([-w*.42,h*.80,side*d*.18],[-w*.27,h*.70,side*d*.18],.13,art.rescueYellow,5);
  g.quad([[-w*.44,.85,side*d*.08],[-w*.26,.85,side*d*.08],[-w*.32,.91,side*d*.28],[-w*.48,.91,side*d*.25]],art.aircraft);
  g.beam([-w*.46,.72,side*d*.066],[-w*.30,.72,side*d*.066],.27,art.dark,10);
  g.beam([-w*.455,.72,side*d*.066],[-w*.44,.72,side*d*.066],.31,art.ribs,10);
  // Dark intake shoulders and a restrained original aircraft identification stripe.
  g.box(-w*.02,.79,side*d*.115,w*.18,.29,.1,art.dark);
  g.beam([-w*.31,1.02,side*d*.30],[-w*.25,1.02,side*d*.32],.09,art.line,5);
 }
 tapered(g,w*.15,1.03,0,w*.25,.72,d*.155,.58,art.glass,art.glass);
 g.beam([w*.05,1.7,0],[w*.26,1.43,0],.035,art.coping,5);
 for(const x of[-w*.26,w*.27])for(const z of[-d*.09,d*.09]){g.beam([x,.13,z],[x,.65,z],.055,art.ribs,6);g.box(x,.16,z,.38,.32,.22,art.dark);}
 for(const side of[-1,1]){g.box(-w*.06,.55,side*d*.23,w*.12,.27,.12,art.hullShade);g.beam([-w*.18,.4,side*d*.23],[w*.05,.4,side*d*.23],.16,art.coping,8);deckCrew(g,w*.34,side*d*.38,side===1?art.rescueYellow:art.rescueOrange);}
}
/** Each kit part remains inside the authoritative parked-aircraft / superstructure envelope. */
export function navalProp(b:TrackBarrier,details:CompositionShapes,radar:CompositionShapes) {
 const a=b.footprint[0],next=b.footprint[1],last=b.footprint.at(-1)!,w=Math.hypot(next.x-a.x,next.z-a.z),d=Math.hypot(last.x-a.x,last.z-a.z),center={x:b.footprint.reduce((v,p)=>v+p.x,0)/b.footprint.length,z:b.footprint.reduce((v,p)=>v+p.z,0)/b.footprint.length},base=b.baseHeight??0,g=new CompositionShapes(),h=b.height;
 if(navalEquipment(b,g,w,d,h)){
  // Native working equipment uses the same transformed physical rectangle as its collision.
 }else if(b.id.includes('aircraft')&&b.id.endsWith('-92')){
  navalEllipsoid(g,0,1.55,0,3.6,1.23,1.48,art.rescueYellow,14,8);
  tapered(g,1.7,1.45,0,2.7,1.0,2.65,.68,art.glass,art.glass);g.box(-.6,1.5,0,2.0,1.4,2.83,art.rescueYellow);
  for(const side of[-1,1]){g.box(-.6,1.9,side*1.45,1.5,.6,.04,art.glass);g.beam([-1.9,1.15,side*1.5],[1.3,1.15,side*1.5],.10,art.superstructure,6);g.beam([-2.5,.38,side*1.6],[2.1,.38,side*1.6],.14,art.dark,7);for(const x of[-1.8,1.4])g.beam([x,.4,side*1.6],[x,1.1,side*1.1],.11,art.coping,6);}
  g.beam([-2,1.8,0],[-6.4,2.45,0],.32,art.rescueOrange,10);g.quad([[-6.3,2.2,-.12],[-7,4.1,-.12],[-5.7,3.8,-.12],[-5.1,2.2,-.12]],art.navy);
  g.beam([-6.1,2.7,-.45],[-6.1,2.7,.45],.12,art.coping,6);g.box(-6.1,2.7,-.5,.12,2.2,.12,art.dark);g.box(-6.1,2.7,-.5,1.8,.12,.12,art.dark);
  g.beam([0,2.5,0],[0,3.9,0],.17,art.ribs,8);g.box(0,2.85,0,2.5,.6,1.6,art.superstructure);
  const rotor=new CompositionShapes(),span=Math.min(w,d)*.72;for(const side of[-1,1]){rotor.box(side*span*.27,0,0,span*.47,.12,.38,art.dark);rotor.box(0,0,side*span*.27,.38,.12,span*.47,art.dark);rotor.box(side*span*.48,0,0,.25,.14,.39,art.rescueYellow);rotor.box(0,0,side*span*.48,.39,.14,.25,art.rescueYellow);}radar.instance(rotor,{x:center.x,y:base+4.0,z:center.z});
  deckCrew(g,w*.33,d*.32,art.rescueOrange);
 }else if(b.id.includes('deck-tractor')){
  g.box(0,.7,0,w*.95,.85,d*.84,art.equipment);g.box(-w*.22,1.25,0,w*.37,.4,d*.7,art.equipment);g.box(w*.2,1.6,0,w*.3,.85,d*.64,art.glass);g.box(w*.2,2.1,0,w*.4,.18,d*.8,art.coping);
  for(const x of[-w*.3,w*.3])for(const z of[-d*.4,d*.4])g.box(x,.42,z,.8,.84,.52,art.dark);
  g.box(-w*.48,.6,0,.16,.3,d*.8,art.dark);
  g.box(w*.2,2.24,0,w*.16,.1,d*.55,art.rescueOrange);deckCrew(g,-w*.35,d*.30,art.rescueYellow);
 }else if(b.id.includes('aircraft')){
  fighter(g,w,d,h,b.id.endsWith('-44')||b.id.endsWith('-20'));
 }else if(b.id.includes('turret')){
  g.beam([0,.15,.8],[0,1.2,.8],w*.40,art.navy,14);navalEllipsoid(g,0,2.18,.8,w*.37,1.53,d*.25,art.superstructure,14,9);
  g.box(0,2.6,-1.3,w*.48,.6,.45,art.glass);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;g.beam([Math.cos(a)*.26,1.95+Math.sin(a)*.26,-.3],[Math.cos(a)*.26,2.2+Math.sin(a)*.26,-d*.47],.08,art.dark,6);}
  for(const side of[-1,1])g.box(side*w*.3,2.0,1.1,.28,.7,d*.17,art.ribs);
 }else{
  navalCommand(b,g,radar,w,d,h,center.x,center.z);
 }
 // Follow both authored footprint axes, including the staggered fleet's sheared rectangles.
 // Instance rotation alone would let parked equipment protrude beyond its actual collider.
 for(let i=0;i<g.positions.length;i+=3){const x=g.positions[i],z=g.positions[i+2];g.positions[i]=center.x+x*(next.x-a.x)/w+z*(last.x-a.x)/d;g.positions[i+1]+=base;g.positions[i+2]=center.z+x*(next.z-a.z)/w+z*(last.z-a.z)/d;}
 details.instance(g,{x:0,y:0,z:0});
}
