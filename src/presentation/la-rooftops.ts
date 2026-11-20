import {CompositionShapes} from './composition-shapes';
import {laRooftopAppearance as art} from './themes';
import {hex} from './landscape/mesh';

interface Roofed{x:number;z:number;w:number;d:number;h:number;style:number}

/**
 * LA nights rooftops (presentation only): the low and mid-rise roofs the overview camera looks
 * straight down on get mechanical plant, timber water tanks, solar rows, skylights and a few
 * lit rooftop details. Everything stands on the roof slab inside each building's footprint
 * (the night architecture's roof sits at base + 0.80 × height). Towers (≥ 32 m) keep their crowns.
 * `paint` bakes onto the lit architecture batch; `lights` onto the emissive window batch.
 */
export function laRooftops(buildings:readonly Roofed[]){
 const paint=new CompositionShapes(),lights=new CompositionShapes();
 for(const [index,b] of buildings.entries()){
  if(b.h>=32||b.w<8||b.d<8)continue;
  const roof=.18+b.h*.80+.16,hx=b.w/2-art.inset,hz=b.d/2-art.inset,kind=index%4;
  // Mechanical plant: a cluster of units with dark fan discs in the front corner.
  const cx=b.x-hx+2.2,cz=b.z-hz+1.6;
  for(let i=0;i<2+(index%2);i++){
   const x=cx+i*2.3;if(x+1.1>b.x+hx)break;
   paint.box(x,roof+.55,cz,2,1.1,1.8,art.unit);
   for(const dz of[-.42,.42])paint.box(x,roof+1.12,cz+dz,.8,.04,.8,art.fan);
  }
  paint.box(cx+1.5,roof+.25,cz+1.4,4.6,.22,.35,art.duct);
  if(kind===0||kind===2){
   // A timber water tank on a steel stand in the back corner.
   const tx=b.x+hx-2,tz=b.z+hz-2;
   for(const [u,v] of[[-1,-1],[1,-1],[1,1],[-1,1]])paint.beam([tx+u*.9,roof,tz+v*.9],[tx+u*.9,roof+1.6,tz+v*.9],.07,art.steel,4);
   paint.box(tx,roof+1.7,tz,2.4,.12,2.4,art.steel);
   paint.beam([tx,roof+1.76,tz],[tx,roof+3.7,tz],1.05,art.tank,10);
   cone(paint,tx,roof+3.7,tz,1.12,.7,art.tankRoof);
  }
  if(kind===1&&b.w>=16){
   // Solar rows across the back of the roof.
   for(let r=0;r<3;r++){const z=b.z+hz-1.2-r*1.6;if(z<b.z+b.d*.3)break;paint.quad([[b.x-hx+1,roof+.25,z-.5],[b.x+hx-1,roof+.25,z-.5],[b.x+hx-1,roof+.7,z+.5],[b.x-hx+1,roof+.7,z+.5]],art.solar);}
  }
  if(kind===3){
   // Glazed skylights with a warm glow from below.
   for(let i=0;i<3;i++){const x=b.x-hx+3+i*2.6;if(x>b.x+hx-2)break;const z=b.z+hz-2.2;paint.box(x,roof+.2,z,1.8,.4,2.6,art.skylightFrame);lights.box(x,roof+.42,z,1.5,.04,2.3,art.skylight);}
  }
  // A small lit stair/elevator penthouse door on every roof.
  const px=b.x+hx-1.6,pz=b.z-hz+1.6;paint.box(px,roof+1.2,pz,2.4,2.4,2.2,art.penthouse);paint.box(px,roof+2.45,pz,2.6,.12,2.4,art.steel);
  lights.box(px-.5,roof+.95,pz-1.12,.9,1.6,.03,art.doorLight);
 }
 return{paint,lights};
}

function cone(g:CompositionShapes,x:number,y:number,z:number,r:number,h:number,color:string){
 const n=10,rgb=hex(color),top=g.vertex(x,y+h,z,rgb);
 const ring=Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return g.vertex(x+Math.cos(a)*r,y,z+Math.sin(a)*r,rgb);});
 for(let i=0;i<n;i++)g.triangle(top,ring[i],ring[(i+1)%n]);
}
