import {CompositionShapes} from './composition-shapes';
import {hex,mix} from './landscape/mesh';
import {venueComposition as art} from './themes';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import type {Scene} from '@babylonjs/core/scene';
import type {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';

export interface UrbanBuilding {id?:string;x:number;z:number;width:number;depth:number;height:number;color:number;style:number}
/** Whole buildings, with roof terraces, stepped crowns, bays and deep storefronts.
 * The envelope is exactly the supplied footprint and height. */
export function urbanArchitecture(buildings:readonly UrbanBuilding[],night:boolean){
 const paint=new CompositionShapes(),lights=new CompositionShapes(),palette=night?art.night:art.city;
 for(const [index,b]of buildings.entries()){
  const{x,z,width:w,depth:d,height:h}=b,base=.18,face=palette.facades[b.color%palette.facades.length],roof=palette.roofs[index%palette.roofs.length],wall=h*(night?.80:b.style===2?.90:.74),top=base+h,pad=b.id?.startsWith('avenue-')?.5:0;
  paint.box(x,base+.12,z,w+pad,.24,d+pad,palette.foot);paint.box(x,base+wall/2,z,w-.06,wall,d-.06,face);
  // Strong continuous bands and colored roofs read at the gameplay camera angle.
  paint.box(x,base+wall-.12,z,w,.24,d,palette.trim);
  if(!night&&b.style!==2){paint.hipRoof(x,z,w-.04,d-.04,base+wall,top-.05,roof);}
  else{
   paint.box(x,base+wall+.08,z,w-.18,.16,d-.18,roof);
   const inset=Math.min(w,d)*.08,ph=Math.max(.18,h*.06);
   for(const side of[-1,1]){paint.box(x,base+wall+ph/2,z+side*(d/2-inset/2),w-.06,ph,inset,face);paint.box(x+side*(w/2-inset/2),base+wall+ph/2,z,inset,ph,d-.06,face);}
   if(b.style===0){
    paint.box(x-w*.12,top-h*.12,z,w*.58,h*.22,d*.55,face);paint.box(x-w*.12,top-.07,z,w*.61,.14,d*.58,palette.trim);
    if(night)for(let i=0;i<3;i++)lights.box(x-w*.12,top-h*.20+i*h*.055,z-d*.28,w*.53,.075,.06,palette.light);
   }else{
    paint.box(x,base+wall+.10,z,w*.67,.05,d*.58,palette.terrace);
    for(let i=0;i<Math.floor(w*.60/1.2);i++)paint.box(x-w*.30+i*1.2,base+wall+.14,z,.055,.035,d*.55,palette.trim);
    for(const side of[-1,1]){paint.box(x+side*w*.25,base+wall+.28,z+d*.15,w*.22,.28,d*.26,palette.plant);paint.box(x+side*w*.25,base+wall+.10,z+d*.15,w*.25,.1,d*.3,palette.trim);}
   }
  }
  // The whole building remains inside its protected envelope, including ledges.
  const floors=Math.max(1,Math.floor((wall-1)/2.4)),cols=Math.max(2,Math.floor(w/2.4));
  for(const side of[-1,1]){
   const front=z+side*(d/2-.05);
   paint.box(x,base+1.30,front,w*.88,1.95,.025,palette.window);
   paint.box(x,base+2.4,z+side*(d/2-.19),w-.15,.22,.36,palette.trim);
   for(let i=0;i<=cols;i++)paint.box(x-w*.44+i*w*.88/cols,base+1.25,front,.11,2.2,.045,palette.trim);
   for(let floor=0;floor<floors;floor++){
    const y=base+3.45+floor*2.25;if(y+.55>base+wall-.18)continue;
    for(let col=0;col<cols;col++){
     const xx=x-w*.40+(col+.5)/cols*w*.8,lit=(col+floor*3+index)%5!==0,target=night&&lit?lights:paint;
     paint.box(xx,y,front,w/cols*.70,1.32,.03,palette.trim);target.panelZ(xx,y+.02,z+side*(d/2-.005),w/cols*.57,1.1,night&&lit?palette.light:palette.window,side);
     if(b.style===1)paint.box(xx,y-.67,z+side*(d/2-.12),w/cols*.80,.10,.22,palette.trim);
    }
    paint.box(x,y-.82,z+side*(d/2-.06),w-.16,.10,.12,mix(hex(face),hex(palette.trim),.35));
   }
   if(night){
    lights.box(x,base+2.58,z+side*(d/2-.16),w-.3,.10,.28,palette.neon[index%palette.neon.length]);
    for(const sx of[-1,1])lights.box(x+sx*(w/2-.20),base+wall*.56,front,.10,wall*.63,.05,palette.neon[(index+1)%palette.neon.length]);
   }
  }
  // Larger bay windows on the narrow sides and a recessed door on the front.
  for(const side of[-1,1])for(let i=0;i<Math.max(1,Math.floor(d/3));i++){
   const zz=z-d*.38+(i+.5)/Math.max(1,Math.floor(d/3))*d*.76;
   paint.panelX(x+side*(w/2-.005),base+wall*.52,zz,d*.12,Math.max(1,wall*.54),palette.window,side);
  }
  paint.box(x,base+1.04,z-d/2+.04,Math.min(1.5,w*.24),1.90,.05,palette.door);
 }
 return{paint,lights};
}

export function buildUrbanArchitecture(scene:Scene,buildings:readonly UrbanBuilding[],night:boolean,paintMaterial:StandardMaterial,lightMaterial:StandardMaterial){
 const geometry=urbanArchitecture(buildings,night);paintMaterial.diffuseColor.setAll(1);paintMaterial.backFaceCulling=false;
 for(const [role,g,material]of[['paint',geometry.paint,paintMaterial],['lights',geometry.lights,lightMaterial]]as const){
  if(!g.vertexCount)continue;const mesh=new Mesh(`composed-city-${role}`,scene),data=g.toVertexData();data.uvs=Float32Array.from({length:g.vertexCount*2},(_,i)=>g.positions[Math.floor(i/2)*3+(i%2?2:0)]/12);data.applyToMesh(mesh);mesh.material=material;mesh.isPickable=false;
 }
}
