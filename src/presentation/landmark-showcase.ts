import {CompositionShapes} from './composition-shapes';
import {landmarkShowcase as art,venueComposition} from './themes';
import {hex,mix} from './landscape/mesh';

/** Additional launch vehicles inside the existing launch-complex footprint. */
export function launchFleet(){
 const g=new CompositionShapes(),a=venueComposition.industrial;
 for(const [index,r]of art.rockets.entries()){
  const base=1.25;
  g.box(r.x,base-.25,r.z,r.radius*2.6,.5,r.radius*2.6,a.dark);
  const rings=[[base,r.radius*.72],[base+2.5,r.radius],[base+r.height*.72,r.radius],[base+r.height*.87,r.radius*.92],[base+r.height,.035]];
  const rows=rings.map(([y,radius])=>Array.from({length:16},(_,i)=>g.vertex(r.x+Math.cos(i/16*Math.PI*2)*radius,y,r.z+Math.sin(i/16*Math.PI*2)*radius,hex(index?'#e6e8dd':'#eef0e8'))));
  for(let k=1;k<rows.length;k++)for(let i=0;i<16;i++){const j=(i+1)%16;g.triangle(rows[k-1][i],rows[k-1][j],rows[k][j]);g.triangle(rows[k-1][i],rows[k][j],rows[k][i]);}
  for(const fraction of[.14,.45,.72]){
   const y=base+r.height*fraction;
   for(let i=0;i<16;i++){const a0=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2;g.beam([r.x+Math.cos(a0)*r.radius,y,r.z+Math.sin(a0)*r.radius],[r.x+Math.cos(b)*r.radius,y,r.z+Math.sin(b)*r.radius],.055,a.steel);}
  }
  for(const side of[-1,1]){g.box(r.x+side*r.radius*.96,base+3.2,r.z,.18,4.1,r.radius*1.2,a.dark);g.box(r.x,base+2.8,r.z+side*r.radius*.96,r.radius*1.3,3.2,.18,a.dark);}
  for(const z of[-.55,.55])g.beam([r.x,base+.25,r.z+z],[r.x,base+1.0,r.z+z],.4,a.steel,10);
 }
 return g;
}

/** Vehicles, equipment and a substantial après-ski terrace in the protected resort. */
export function tahoeResortLife(){
 const g=new CompositionShapes(),a=art.tahoe;
 // The lodge's terrace, bar, timber pergola and warm cafe seating.
 g.box(-24,.17,4.5,22,.28,6,a.wood);g.box(-24,1.1,5.7,9,1.8,1.4,a.red);g.box(-24,2.05,5.7,9.4,.18,1.8,a.wood);
 for(const x of[-34,-24,-14]){g.box(x,1.7,6.8,.2,3.2,.2,a.wood);g.box(x,3.35,4.5,.22,.20,5.7,a.wood);}
 for(let x=-34;x<=-14;x+=1.1)g.box(x,3.5,4.5,.14,.13,5.8,a.wood);
 for(const x of[-31,-17])for(const z of[2.8,6]){
  g.box(x,.82,z,2.4,.18,1.1,a.wood);for(const side of[-1,1])g.box(x,.43,z+side*.9,2.5,.18,.38,a.red);
  g.beam([x,.2,z],[x,2.8,z],.06,a.steel);g.hipRoof(x,z,3.6,2.8,2.8,3.45,a.cloth);
 }
 for(let x=-33;x<-14;x+=1.4)g.box(x,3.15,1.8,.18,.20,.18,a.warm);
 // The lodge's actual south facade is z=1; keep the entire terrace in front.
 for(let k=2;k<g.positions.length;k+=3)g.positions[k]-=9;
 // Four large winter cars on the open east side of the reserve.
 for(const [i,z]of[-17,-10,-3,4].entries()){
  const x=28,y=.2;
  g.box(x,y+.7,z,5.5,1.15,2.5,i%2?a.red:a.steel);g.box(x-.4,y+1.6,z,2.9,.9,2.1,a.glass);g.box(x-.4,y+2.1,z,3.15,.18,2.3,a.snow);
  for(const axle of[-1,1])for(const side of[-1,1])g.box(x+axle*1.7,y+.42,z+side*1.2,.85,.85,.25,a.steel);
  g.box(x-.2,y+2.3,z,3.8,.16,.5,a.red);
 }
 // Full-sized tracked snowplow; tracks, windows, roof beacon and broad blade.
 const x=-48,z=20;
 g.box(x,.75,z,7.4,1.15,3.7,a.red);g.box(x-1.0,1.9,z,3.6,1.65,3.05,a.glass);g.box(x-1.0,2.85,z,3.9,.25,3.4,a.snow);
 for(const side of[-1,1]){g.box(x,.48,z+side*1.55,7.8,.8,1,a.steel);for(let i=0;i<10;i++)g.box(x-3.4+i*.75,.92,z+side*1.55,.2,.12,1.1,a.shade);}
 g.box(x+4,.5,z,.45,1.0,5.2,a.red);g.box(x-1,3.09,z,.7,.22,.7,a.warm);
 // Snowmobiles face the open service apron rather than the racing road.
 for(const [i,x]of[5,10.5,15.5].entries()){
  const z=26;g.box(x,.7,z,3.5,.7,1.2,i%2?a.red:a.steel);g.box(x-.5,1.05,z,1.3,.35,.85,a.steel);
  for(const side of[-1,1]){g.box(x+1.3,.15,z+side*.7,1.8,.12,.16,a.steel);g.beam([x+.9,.2,z+side*.7],[x+.7,.8,z+side*.45],.08,a.steel);}
  g.box(x-1,.28,z,1.4,.4,.95,a.steel);g.box(x+.8,1.2,z,.15,.65,1.0,a.glass);
 }
 // Large sculpted powder piles, contained within the protected grove.
 for(const [x,z,w,d,h]of[[-50,5,8,6,2.3],[-37,28,11,5,2.8],[31,12,8,7,3.2]]){
  const rows=Array.from({length:7},(_,k)=>Array.from({length:17},(_,i)=>{const t=k/6,angle=i/16*Math.PI*2,r=Math.sqrt(Math.max(0,1-t*t));return g.vertex(x+Math.cos(angle)*w/2*r,h*t,z+Math.sin(angle)*d/2*r,mix(hex(a.shade),hex(a.snow),.4+t*.6));}));
  for(let k=1;k<7;k++)for(let i=0;i<16;i++){g.triangle(rows[k-1][i],rows[k-1][i+1],rows[k][i+1]);g.triangle(rows[k-1][i],rows[k][i+1],rows[k][i]);}
 }
 return g;
}

/** Setback downtown towers: compact silhouettes, capped window counts, no live lights. */
export function nightTower(b:{x:number;z:number;width:number;depth:number;height:number},index:number){
 const paint=new CompositionShapes(),lights=new CompositionShapes(),a=art.skyline,{x,z,width:w,depth:d,height:h}=b;
 const face=venueComposition.night.facades[index%venueComposition.night.facades.length],sw=w*.70,sd=d*.70,base=.18;
 paint.box(x,base+3,z,w-.06,6,d-.06,face);paint.box(x,base+6.1,z,w-.08,.2,d-.08,a.roof);
 paint.box(x,base+h*.44+3,z,sw,h*.88-6,sd,a.facade);
 paint.box(x,base+h*.92,z,sw*.68,h*.08,sd*.68,face);paint.box(x,base+h*.975,z,sw*.40,h*.03,sd*.4,a.roof);
 paint.beam([x,base+h*.97,z],[x,base+h,z],.13,a.cool);
 const floors=Math.min(18,Math.floor((h*.84-7)/3.2)),cols=4;
 for(const side of[-1,1])for(let row=0;row<floors;row++)for(let c=0;c<cols;c++){
  const y=base+8+row*(h*.80-8)/Math.max(1,floors-1),lit=(row*3+c+index)%5!==0,target=lit?lights:paint;
  target.panelZ(x-sw*.4+(c+.5)*sw*.8/cols,y,z+side*(sd/2+.006),sw*.8/cols*.7,1.45,lit?(row%4?a.warm:a.cool):a.facade,side);
  target.panelX(x+side*(sw/2+.006),y,z-sd*.4+(c+.5)*sd*.8/cols,sd*.8/cols*.7,1.45,lit?a.warm:a.facade,side);
 }
 for(const side of[-1,1]){
  lights.box(x+side*sw*.47,base+h*.47,z-sd/2-.01,.10,h*.76,.04,a.cool);
  lights.box(x,base+h*.88,z+side*sd/2,sw,.14,.08,a.warm);
 }
 return{paint,lights};
}
