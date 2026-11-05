import {CompositionShapes} from './composition-shapes';
import {venueSignatureAppearance as art} from './themes';
import {cityBuildings} from '../content/golden-city';

/** Larger original industrial forms, all within existing protected parcels. */
export function launchOperations(){
 const g=new CompositionShapes(),a=art.launch;
 // A bold roof frame and clerestories replace a low-contrast warehouse top.
 for(const z of[-16.25,-11.75])g.box(-11,8.57,z,32,.17,.28,a.orange);
 for(const x of[-25,-11,3]){
  g.box(x,8.63,-14,6.7,.16,4.1,a.white);g.box(x,8.73,-14,6.2,.08,3.6,a.glass);
  for(let z=-15.5;z<-12.2;z+=.7)g.box(x,8.8,z,6.3,.07,.10,a.steel);
 }
 // Connected service carts and loading equipment below the hangar face.
 for(const [i,x]of[-26,-17,-7,3].entries()){
  g.box(x,.54,-21.2,4.1,.65,1.3,i%2?a.white:a.orange);g.box(x-1.15,1.03,-21.2,1.2,.45,1.22,a.glass);
  for(const side of[-1,1])for(const axle of[-1,1])g.box(x+axle*1.3,.29,-21.2+side*.62,.55,.5,.18,a.steel);
 }
 // Bright gantry elevators, service decks and diagonal lattice.
 for(let y=2;y<25;y+=3){
  g.box(99.45,y+1.2,24.5,.55,2.4,2.4,a.orange);
  for(const z of[23,26]){g.beam([96.6,y,z],[99.35,y+2.65,z],.17,a.white);g.beam([99.35,y,z],[96.6,y+2.65,z],.17,a.white);}
 }
 // A readable circular launch pad, inside the same complex.
 for(let i=0;i<48;i++){const a0=i/48*Math.PI*2,b=(i+1)/48*Math.PI*2;g.beam([95+Math.cos(a0)*7.8,.38,20+Math.sin(a0)*7.8],[95+Math.cos(b)*7.8,.38,20+Math.sin(b)*7.8],.11,a.white);}
 return g;
}

/** Large roof shapes and glazed dormers give the existing city blocks identity. */
export function bayRoofscape(){
 const g=new CompositionShapes(),a=art.bay;
 for(const [i,b]of cityBuildings.entries()){
  if(b.id?.includes('skyline'))continue;
  const w=Math.min(b.width*.45,5.8),d=Math.min(b.depth*.38,4.1),top=b.height+.16;
  g.box(b.x,top-.38,b.z,w,.55,d,a.ivory);g.box(b.x,top-.08,b.z,w-.30,.08,d-.30,a.glass);
  g.box(b.x,top-.015,b.z,.12,.05,d-.30,a.trim);
  if(i%2===0)for(const side of[-1,1])g.box(b.x+side*b.width*.32,top-.48,b.z+b.depth*.18,.55,.8,.65,a.brick);
 }
 return g;
}

/** An art-deco theatre front and roof terrace in the protected arts block. */
export function nightPictureHouse(){
 const paint=new CompositionShapes(),lights=new CompositionShapes(),a=art.night;
 paint.box(55,2.75,11.05,23,.45,1.6,a.canopy);
 for(const x of[44.5,65.5]){
  paint.box(x,4.5,11.1,.8,4.6,1.7,a.frame);
  for(const dx of[-.22,.22])lights.box(x+dx,4.5,10.23,.10,4.3,.06,a.amber);
 }
 for(const y of[2.58,2.84,3.1])lights.box(55,y,10.21,22.6,.08,.06,a.amber);
 // Terraced rooftop silhouette, held beneath the existing building's top.
 for(const [w,d,y,h]of[[15,15,6.8,.55],[11,11,7.35,.45],[7,7,7.78,.35]]){
  paint.box(55,y,25,w,h,d,a.roof);
  for(const side of[-1,1]){lights.box(55,y+h/2,25+side*(d/2-.08),w-.1,.06,.10,a.coral);lights.box(55+side*(w/2-.08),y+h/2,25,.10,.06,d-.1,a.coral);}
 }
 for(const x of[49,61]){paint.box(x,6.95,31,2.4,.5,3,a.planter);paint.box(x,7.25,31,2,.32,2.6,a.leaf);}
 return{paint,lights};
}
