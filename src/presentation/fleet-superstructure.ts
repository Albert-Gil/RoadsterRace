import type{TrackBarrier}from'../core/types';
import{CompositionShapes}from'./composition-shapes';
import{fleetAppearance as art}from'./themes';
import{navalEllipsoid}from'./fleet-outfit';
import{navalEnsign}from'./fleet-flags';
/** Original naval command kit: asymmetric island, integrated mast and compact service wheelhouse. */
export function navalCommand(b:TrackBarrier,g:CompositionShapes,radar:CompositionShapes,w:number,d:number,h:number,cx:number,cz:number){
 const carrier=b.id.includes('carrier'),support=b.id.startsWith('support'),base=b.baseHeight??0;
 const block=(x:number,y:number,z:number,ww:number,hh:number,dd:number,inset:number,color:string)=>{
  const rings=[[y,ww/2,dd/2],[y+hh,ww/2-inset,dd/2-inset]];
  for(let i=0;i<4;i++){const corners=[[-1,-1],[1,-1],[1,1],[-1,1]],a=corners[i],b=corners[(i+1)%4];g.quad([[x+a[0]*rings[0][1],y,z+a[1]*rings[0][2]],[x+b[0]*rings[0][1],y,z+b[1]*rings[0][2]],[x+b[0]*rings[1][1],y+hh,z+b[1]*rings[1][2]],[x+a[0]*rings[1][1],y+hh,z+a[1]*rings[1][2]]],color);}
  g.box(x,y+hh-.06,z,ww-inset*2,.12,dd-inset*2,art.coping);
 };
 // Match glazing to the sloped wall at both edges of the band; inset boxes disappear inside it.
 const windows=(x:number,bottom:number,z:number,ww:number,hh:number,dd:number,inset:number,y:number,band:number)=>{
  const lo=y-band/2,hi=y+band/2,offset=(at:number)=>Math.max(0,Math.min(1,(at-bottom)/hh))*inset;
  const xl=ww/2-offset(lo),xh=ww/2-offset(hi),zl=dd/2-offset(lo),zh=dd/2-offset(hi);
  for(const sign of[-1,1]){
   const side=[[x-xl+.25,lo,z+sign*(zl+.035)],[x+xl-.25,lo,z+sign*(zl+.035)],[x+xh-.25,hi,z+sign*(zh+.035)],[x-xh+.25,hi,z+sign*(zh+.035)]];
   const face=[[x+sign*(xl+.035),lo,z+zl-.25],[x+sign*(xl+.035),lo,z-zl+.25],[x+sign*(xh+.035),hi,z-zh+.25],[x+sign*(xh+.035),hi,z+zh-.25]];
   g.quad(sign<0?side:side.reverse(),art.glass);g.quad(sign<0?face:face.reverse(),art.glass);
   for(let i=-3;i<=3;i++)g.beam([x+i*xl*.26,lo,z+sign*(zl+.055)],[x+i*xh*.26,hi,z+sign*(zh+.055)],.04,art.coping,4);
   for(let i=-1;i<=1;i++)g.beam([x+sign*(xl+.055),lo,z+i*zl*.50],[x+sign*(xh+.055),hi,z+i*zh*.50],.04,art.coping,4);
  }
 };
 const balcony=(x:number,y:number,z:number,ww:number,dd:number)=>{g.box(x,y,z,ww,.17,dd,art.hullShade);for(const sign of[-1,1]){g.beam([x-ww/2,y+.65,z+sign*dd/2],[x+ww/2,y+.65,z+sign*dd/2],.045,art.coping,4);for(let n=0;n<=6;n++)g.beam([x-ww/2+ww*n/6,y,z+sign*dd/2],[x-ww/2+ww*n/6,y+.65,z+sign*dd/2],.035,art.ribs,4);}};
 if(carrier){
  block(0,0,0,w*.96,h*.22,d*.94,.55,art.hullShade);
  // Forward navigation bridge and aft flight-control cabin are distinct, not a tiered hotel.
  block(w*.22,h*.22,0,w*.43,h*.36,d*.89,.75,art.superstructure);
  for(const y of[.30,.41,.52]){windows(w*.22,h*.22,0,w*.43,h*.36,d*.89,.75,h*y,h*.043);balcony(w*.22,h*(y-.035),0,w*.46,d*.94);}
  block(-w*.26,h*.22,0,w*.30,h*.24,d*.80,.55,art.hull);
  windows(-w*.26,h*.22,0,w*.30,h*.24,d*.80,.55,h*.40,h*.04);
  // Two separate black-capped exhaust trunks with louvred side faces.
  for(const x of[-w*.12,-w*.35]){block(x,h*.40,d*.10,w*.13,h*.19,d*.45,.2,art.hullShade);g.box(x,h*.59,d*.10,w*.12,.24,d*.41,art.dark);for(let n=0;n<5;n++)g.box(x,h*(.43+n*.026),-d*.13,w*.105,.08,.045,art.ribs);}
  // Tall lattice mast, flat search arrays, thin yardarms and small satellite domes.
  for(const sign of[-1,1])g.beam([sign*w*.055,h*.44,0],[0,h*.96,0],.18,art.coping,6);
  for(let i=0;i<5;i++){const y=h*(.5+i*.085),spread=w*.055*(.96-y/h)/.52;g.beam([-spread,y,0],[spread,y,0],.10,art.ribs,4);g.beam([-spread,y,0],[spread*.65,y+h*.07,0],.075,art.ribs,4);}
  g.beam([0,h*.45,0],[0,h*.99,0],.15,art.coping,6);
  for(const sign of[-1,1]){g.box(sign*w*.07,h*.66,0,w*.075,h*.12,d*.32,art.navy);g.beam([-w*.12,h*.79,sign*d*.15],[w*.12,h*.79,sign*d*.15],.09,art.coping,5);}
  for(const [x,z,y,r]of[[-w*.43,-d*.28,h*.57,2.4],[w*.34,-d*.19,h*.65,Math.min(d*.18,3.4)]]){g.beam([x,y-r-1,z],[x,y,z],.30,art.coping,8);navalEllipsoid(g,x,y,z,r,r,r,art.superstructure,16,10);}
  // Exposed access galleries, structural ribs and the large original island number.
  for(const sign of[-1,1]){for(let n=0;n<16;n++){const x=-w*.42+n*w*.052,y=h*(.10+n*.013);g.box(x,y,sign*d*.46,w*.05,.16,.70,art.coping);}g.beam([-w*.42,h*.12,sign*d*.46],[w*.36,h*.315,sign*d*.46],.06,art.coping,5);for(let n=0;n<8;n++)g.box(-w*.38+n*w*.10,h*.09,sign*d*.472,.12,h*.15,.05,art.ribs);}
  const segs:Record<string,number[][]>={a:[[0,1],[1,1]],b:[[1,1],[1,0]],c:[[1,0],[1,-1]],d:[[0,-1],[1,-1]],e:[[0,0],[0,-1]],f:[[0,1],[0,0]],g:[[0,0],[1,0]]},digits:Record<string,string>={'0':'abcdef','1':'bc','4':'fgbc','7':'abc'};
  for(const side of[-1,1])for(const[n,digit]of[...(b.id.includes('-a-')?'07':'14')].entries())for(const key of digits[digit]){const [a,c]=segs[key],x=-w*.32+n*4.8,y=h*.11,z=side*d*.475;g.beam([x+a[0]*3.5,y+a[1]*3.2,z],[x+c[0]*3.5,y+c[1]*3.2,z],.22,art.line,4);}

 }else if(support){
  block(-w*.04,0,0,w*.90,h*.30,d*.91,.15,art.hullShade);
  block(w*.18,h*.30,0,w*.48,h*.23,d*.88,.15,art.superstructure);
  windows(w*.18,h*.30,0,w*.48,h*.23,d*.88,.15,h*.45,h*.085);
  balcony(w*.18,h*.37,0,w*.56,d*.95);
  for(const sign of[-1,1])g.box(-w*.24,h*.15,sign*d*.46,w*.26,h*.12,.04,art.ribs);
  g.box(-w*.28,h*.37,0,w*.14,h*.22,d*.65,art.hull);g.box(-w*.28,h*.49,0,w*.13,.14,d*.59,art.dark);
  g.beam([0,h*.3,0],[0,h*.97,0],.12,art.coping,7);g.beam([-w*.09,h*.77,0],[w*.09,h*.77,0],.06,art.coping,5);
  for(const x of[-w*.38,-w*.20])g.box(x,.3,0,w*.10,.6,d*.74,art.dark);
 }else{
  block(0,0,0,w*.94,h*.28,d*.94,.35,art.hullShade);
  block(0,h*.28,d*.19,w*.94,h*.20,d*.47,.3,art.superstructure);
  windows(0,h*.28,d*.19,w*.94,h*.20,d*.47,.3,h*.40,h*.065);
  // Faceted integrated radar mast and forward/aft flat panels.
  block(0,h*.46,0,w*.72,h*.27,d*.28,.9,art.hull);
  for(const sign of[-1,1]){g.box(sign*w*.30,h*.60,0,.10,h*.13,d*.15,art.navy);g.box(0,h*.60,sign*d*.12,w*.47,h*.13,.12,art.navy);}
  block(0,h*.28,-d*.29,w*.72,h*.17,d*.20,.2,art.hullShade);g.box(0,h*.45,-d*.29,w*.62,.2,d*.17,art.dark);
  g.beam([0,h*.60,0],[0,h*.99,0],.15,art.coping,7);g.beam([-w*.38,h*.81,0],[w*.38,h*.81,0],.08,art.coping,5);
  navalEllipsoid(g,0,h*.54,-d*.30,w*.22,w*.22,w*.22,art.superstructure,10,7);
  // Flush missile-cell lids on the protected low afterhouse, distinct from the road.
  for(const x of[-w*.24,0,w*.24])for(let i=0;i<4;i++)g.box(x,h*.283,-d*.07-i*d*.045,w*.16,.08,d*.033,art.dark);
 }
 // Every vessel has a small rotating search radar, bounded by the collision parcel.
 navalEnsign(g,w,d,h);
 const rotor=new CompositionShapes(),span=Math.min(w,d)*.63;rotor.box(0,0,0,span,h*.04,.16,art.navy);for(let i=-3;i<=3;i++)rotor.box(i*span*.13,0,-.10,.04,h*.05,.035,art.coping);radar.instance(rotor,{x:cx,y:base+h*.90,z:cz});
 // Access doors, ladders, maintenance rails and small original signal pennants.
 for(const sign of[-1,1]){g.box(sign*w*.34,.95,-d*.43,.8,1.7,.045,art.dark);for(let n=0;n<10;n++)g.box(sign*w*.45,.35+n*.24,-d*.22,.07,.07,Math.min(.8,d*.22),art.coping);}
 const px=-w*.43,pz=d*.31;g.beam([px,h*.35,pz],[px,h*.72,pz],.045,art.coping,5);for(let i=0;i<3;i++){const y=h*(.67-i*.06);g.quad([[px,y,pz],[px+w*.09,y-.07,pz+.06],[px+w*.10,y-h*.035,pz],[px,y-h*.04,pz]],i%2?art.rescueYellow:art.rescueOrange);}
}
