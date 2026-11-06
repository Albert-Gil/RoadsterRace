import type {TrackDefinition} from '../core/types';
import {terrainElevation} from '../core/elevation';
import {tahoeRoadsidePockets} from '../core/tracks/tahoe-roadside';
import {CompositionShapes} from './composition-shapes';
import {Geometry,hex} from './landscape/mesh';
import {landmarkShowcase} from './themes';

const a=landmarkShowcase.tahoe;
function winterCar(paint:string){
 const g=new CompositionShapes();g.box(0,.8,0,5.5,1.15,2.5,paint);g.box(-.4,1.7,0,2.9,.9,2.1,a.glass);g.box(-.4,2.2,0,3.15,.18,2.3,a.snow);
 for(const axle of[-1,1])for(const side of[-1,1])g.box(axle*1.7,.52,side*1.2,.85,.85,.25,a.steel);
 for(const side of[-1,1]){g.box(2.77,.9,side*.85,.06,.28,.42,a.warm);g.box(-2.77,.9,side*.85,.06,.28,.42,a.red);g.box(-.5,1.2,side*1.28,.4,.08,.04,a.snow);}
 g.box(-.2,2.4,0,3.8,.16,.5,a.red);return g;
}
function winterPlow(){
 const g=new CompositionShapes();g.box(0,.75,0,7.4,1.15,3.7,a.red);g.box(-1,1.9,0,3.6,1.65,3.05,a.glass);g.box(-1,2.85,0,3.9,.25,3.4,a.snow);
 for(const side of[-1,1]){g.box(0,.48,side*1.55,7.8,.8,1,a.steel);for(let i=0;i<10;i++)g.box(-3.4+i*.75,.92,side*1.55,.2,.12,1.1,a.shade);}
 g.box(4,.5,0,.45,1,5.2,a.red);g.box(-1,3.09,0,.7,.22,.7,a.warm);
 for(const side of[-1,1])g.beam([2,.7,side*1.4],[3.8,.4,side*2],.14,a.steel);
 return g;
}
/** Outside service vehicles on the unchanged physical snow, in one existing colour batch. */
export function tahoeExteriorLife(track:TrackDefinition){
 const g=new CompositionShapes(),car=winterCar(a.red),steelCar=winterCar(a.steel),plow=winterPlow();
 const place=(model:Geometry,x:number,z:number)=>{
  const h=(dx:number,dz:number)=>terrainElevation({x:x+dx,z:z+dz},track),pitch=Math.atan2(h(0,2)-h(0,-2),4),roll=Math.atan2(h(2,0)-h(-2,0),4);
  g.instance(model,{x,y:h(0,0)+.05,z,tilt:[-pitch,roll]});
 };
 for(const p of tahoeRoadsidePockets){
  // Compacted pullout follows the existing hill; it is not new support or a flattening collar.
  const rows=Array.from({length:5},(_,j)=>Array.from({length:5},(_,i)=>{const x=p.x+(i/4-.5)*(p.width-.2),z=p.z+(j/4-.5)*(p.depth-.2);return g.vertex(x,terrainElevation({x,z},track)+.028,z,hex(i%2?a.snow:a.shade));}));
  for(let j=0;j<4;j++)for(let i=0;i<4;i++){g.triangle(rows[j][i],rows[j+1][i+1],rows[j+1][i]);g.triangle(rows[j][i],rows[j][i+1],rows[j+1][i+1]);}
  if(p.kind==='plow')place(plow,p.x,p.z);
  else if(p.kind==='cars'){place(car,p.x,p.z-3.1);place(steelCar,p.x,p.z+3.1);}
  else{place(car,p.x-3,p.z);place(steelCar,p.x+3,p.z);}
 }
 return g;
}
