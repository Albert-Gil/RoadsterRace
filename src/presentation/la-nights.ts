import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { TrackDefinition } from '../core/types';
import { laBuildings } from '../content/la-night-art';
import { nightAppearance as art, type PresentationTheme } from './themes';
import { surfaceTexture } from './textures';
import { projectToPolyline } from '../core/geometry';
import { jumpPoint } from '../core/support';
import { StaticBoxes } from './static-boxes';
import { buildLALandscape, LA, laLayout } from './la-landscape';

/** Night lighting is baked into batched emissive architecture and soft light pools.
 * No per-window lights, transparent skyscrapers, extra collision rules or shortcut signage.
 */
export function buildLANights(scene:Scene,track:TrackDefinition,theme:PresentationTheme,materials:Map<string,StandardMaterial>){
 const casters=new Set<StandardMaterial>();
 const mat=(name:string,color:string,casts=false,emissive=false)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.setAll(.12);m.backFaceCulling=false;if(emissive){m.disableLighting=true;m.emissiveColor=m.diffuseColor.clone();}if(casts)casters.add(m);materials.set(name,m);return m;};
 mat('terrain',theme.scene.terrain);const concrete=mat('embankment',theme.scene.embankment);
 concrete.diffuseTexture=surfaceTexture(scene,'concrete');
 const white=mat('architecture',theme.scene.curb,true),dark=mat('architecture-trim',theme.scene.structure,true),glass=mat('architecture-glass',theme.scene.glass);
 glass.reflectionTexture=scene.environmentTexture;glass.specularColor.setAll(.55);
 const facades=art.facades.map((c,i)=>mat(`la-facade-${i}`,c,true));
 const neon=art.neon.map((c,i)=>mat(`la-neon-${i}`,c,false,true));
 const windows=mat('la-windows',art.window,false,true),unlitWindow=mat('la-window-dark',art.darkWindow);
 const foliage=mat('foliage',theme.scene.foliage,true),leaf=mat('foliageLight',theme.scene.foliageLight,true),trunk=mat('trunk',theme.scene.trunk,true);mat('rock',theme.scene.rock,true);
 const boxes=new StaticBoxes();
 const box=(_name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:StandardMaterial)=>boxes.add(x,y,z,w,h,d,m);
 const patch=(name:string,x:number,z:number,w:number,d:number,m:StandardMaterial,y=-.035)=>{const mesh=MeshBuilder.CreateGround(name,{width:w,height:d},scene);mesh.position.set(x,y,z);mesh.material=m;return mesh;};
 // Four pieces leave the authoritative open channel uncovered.
 // The city ground carries a painted map of streets and lots (la-landscape.ts): world UVs over LA.map.
 // Its own material (not the theme's 'terrain'): the map is painted in full colour on a white base.
 const cityGround=mat('la-ground',theme.scene.terrain);
 const cityLand=(name:string,x:number,z:number,w:number,d:number)=>{const mesh=patch(name,x,z,w,d,cityGround),p=mesh.getVerticesData(VertexBuffer.PositionKind)!,uvs:number[]=[],e=LA.map;for(let k=0;k<p.length;k+=3)uvs.push((p[k]+x-e.minX)/(e.maxX-e.minX),(p[k+2]+z-e.minZ)/(e.maxZ-e.minZ));mesh.setVerticesData(VertexBuffer.UVKind,uvs);};
 cityLand('west-city-land',-219,0,562,1000);cityLand('east-city-land',286,0,428,1000);
 cityLand('north-channel-land',67,-263.5,10,473);cityLand('south-channel-land',67,255,10,490);
 const water=mat('water',theme.scene.water);water.diffuseTexture=surfaceTexture(scene,'water');water.specularColor.setAll(.5);
 patch('storm-water',67,-8.5,10,37,water,-2.4);
 box('west-channel-face',61.85,-1.2,-8.5,.3,2.4,37,concrete);box('east-channel-face',72.15,-1.2,-8.5,.3,2.4,37,concrete);
 for(let z=-25;z<10;z+=3)for(const x of [61.8,72.2])box('channel-concrete-joint',x,-1.1,z,.035,2.1,.035,dark);
 const j=track.jumps![0];
 const ramp=MeshBuilder.CreateRibbon('la-physical-ramp',{pathArray:[-1,1].map(side=>[0,j.rampLength].map(d=>{const p=jumpPoint(j,d,side*j.width/2);return new Vector3(p.x,.11+d/j.rampLength*j.lipHeight,p.z);})),sideOrientation:Mesh.DOUBLESIDE},scene);ramp.material=dark;
 const lightTexture=new DynamicTexture('la-soft-light',64,scene,false),lightContext=lightTexture.getContext() as CanvasRenderingContext2D;
 const gradient=lightContext.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,0.6)');gradient.addColorStop(.4,'rgba(255,255,255,0.24)');gradient.addColorStop(1,'rgba(255,255,255,0)');lightContext.fillStyle=gradient;lightContext.fillRect(0,0,64,64);lightTexture.hasAlpha=true;lightTexture.update();
 const pools=neon.map((m,i)=>{const p=mat(`la-light-pool-${i}`,art.neon[i],false,true);p.diffuseTexture=lightTexture;p.useAlphaFromDiffuseTexture=true;p.alpha=art.poolOpacity;return p;});
 // Flush paved courtyards and service parking live inside the solid blocks;
 // the generous driving runoff stays free of raised sidewalk props.
 for(const b of track.barriers.filter(b=>['downtown-block','arts-block','studio-block','skyline-block'].includes(b.id))){
  const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x0=Math.min(...xs)+.5,x1=Math.max(...xs)-.5,z0=Math.min(...zs)+.5,z1=Math.max(...zs)-.5;
  patch('la-protected-plaza',(x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,concrete,.035);
  for(let x=x0+4;x<x1;x+=5)box('la-paving-joint',x,.045,(z0+z1)/2,.035,.015,z1-z0,dark);
  for(let z=z0+4;z<z1;z+=5)box('la-paving-joint',(x0+x1)/2,.045,z,x1-x0,.015,.035,dark);
 }
 for(const [i,x] of [58,82,106].entries()){
  box('la-parked-service-car',x,.55,40.6,4.5,.75,1.9,facades[i]);
  box('la-parked-car-glass',x-.15,1.1,40.6,2.2,.55,1.6,glass);
  for(const side of [-1,1]){
   box('la-parking-bay',x,.065,40.6+side*1.6,5.4,.025,.08,white);
   for(const axle of [-1,1])box('la-parked-wheel',x+axle*1.45,.3,40.6+side*.9,.6,.6,.22,dark);
  }
 }
 for(const [index,b] of laBuildings.entries()){
  const material=facades[b.style],n=neon[b.style],y=.22+b.h;
  box('la-building-foundation',b.x,.12,b.z,b.w+.35,.3,b.d+.35,concrete);
  box('la-building-body',b.x,.22+b.h/2,b.z,b.w,b.h,b.d,material);
  box('la-building-roof',b.x,y+.15,b.z,b.w+.3,.3,b.d+.3,dark);
  for(const side of [-1,1]){
   box('la-roof-parapet',b.x,y+.45,b.z+side*b.d/2,b.w+.3,.6,.18,material);
   box('la-roof-edge-light',b.x,y+.31,b.z+side*(b.d/2+.13),b.w+.4,.055,.08,n);
   box('la-roof-parapet',b.x+side*b.w/2,y+.45,b.z,.18,.6,b.d,material);
  }
  // Four-sided window grids with deterministic occupied and dark rooms.
  for(let floor=2;floor<b.h-1;floor+=2.2)for(const side of [-1,1]){
   for(let x=-b.w/2+1.25;x<b.w/2-.7;x+=2.1){
    const lit=(Math.floor(floor)+Math.round(x*3)+index*7)%5!==0;
    box('la-window',b.x+x,floor,b.z+side*(b.d/2+.035),1.05,1.15,.06,lit?windows:unlitWindow);
   }
   for(let z=-b.d/2+1.5;z<b.d/2-.7;z+=2.3)box('la-side-window',b.x+side*(b.w/2+.035),floor,b.z+z,.06,1.15,1.1,(Math.round(z)+index)%4?windows:unlitWindow);
  }
  for(const side of [-1,1]){
   box('la-shopfront',b.x,1.15,b.z+side*(b.d/2+.06),b.w-1.5,1.7,.09,glass);
   box('la-marquee',b.x,2.2,b.z+side*(b.d/2+.35),b.w-.5,.16,.8,n);
   for(let x=-b.w/2+1;x<b.w/2;x+=1.8)box('la-marquee-bulb',b.x+x,2.05,b.z+side*(b.d/2+.7),.12,.12,.12,windows);
  }
  for(let i=0;i<2;i++){
   const x=b.x+(i?1:-1)*b.w*.25;
   box('la-rooftop-hvac',x,y+.65,b.z,2.4,1,2,dark);
   for(let k=0;k<5;k++)box('la-hvac-grille',x-.8+k*.4,y+1.16,b.z,.12,.03,1.5,concrete);
  }
  if(index%4===0){
   const tank=MeshBuilder.CreateCylinder('la-rooftop-water-tank',{height:1.7,diameter:2,tessellation:10},scene);tank.position.set(b.x,y+1.8,b.z+b.d*.24);tank.material=concrete;
   for(const side of [-1,1])box('la-tank-support',b.x+side*.6,y+.65,b.z+b.d*.24,.12,1.3,.12,dark);
  }
  if(index<10)patch('la-neon-pavement',b.x,b.z-b.d/2-1,b.w+6,9,pools[b.style],.055);
  else{
   box('la-skyline-crown',b.x,y+1.1,b.z,b.w*.7,1.7,b.d*.7,material);
   for(const side of [-1,1]){
    box('la-crown-light',b.x,y+1.98,b.z+side*b.d*.36,b.w*.72,.06,.08,n);
    box('la-crown-light',b.x+side*b.w*.36,y+1.98,b.z,.08,.06,b.d*.72,n);
   }
   box('la-roof-antenna',b.x,y+3,b.z,.12,3,.12,dark);
  }
 }
 // Original theater marquees, safely within the arts block.
 const signTexture=new DynamicTexture('la-original-signage',{width:1024,height:1024},scene,false),ctx=signTexture.getContext() as CanvasRenderingContext2D;
 for(const [i,[title,subtitle]] of [['LA NIGHTS','AFTER HOURS MOTOR CLUB'],['ORBIT','MIDNIGHT PICTURE HOUSE'],['ECHO','HOTEL & ROOFTOP'],['VOLT','ELECTRIC SERVICE GARAGE']].entries()){
  ctx.fillStyle=art.signBackground;ctx.fillRect(0,i*256,1024,256);ctx.fillStyle=art.neon[i%3];ctx.font='italic bold 126px sans-serif';ctx.textAlign='center';ctx.fillText(title,512,i*256+155);ctx.fillStyle=art.window;ctx.font='29px sans-serif';ctx.fillText(subtitle,512,i*256+215);
 }signTexture.update();
 const signMat=mat('la-neon-sign',art.window,false,true);signMat.diffuseTexture=signTexture;
 for(const [i,[x,y,z,width]] of [[55,4.3,14.8,14],[80,5.1,16.8,12],[-27,8.2,-4.2,12],[-86,4.5,14.8,12]].entries()){
  const sign=MeshBuilder.CreatePlane('la-theater-marquee',{width,height:width/4},scene);sign.position.set(x,y,z);sign.material=signMat;
  const uv=sign.getVerticesData(VertexBuffer.UVKind)!;for(let k=1;k<uv.length;k+=2)uv[k]=(3-i+uv[k])/4;sign.setVerticesData(VertexBuffer.UVKind,uv);
 }
 // Palms and street lamps are confined to protected plazas, outside road/runoff.
 for(const [x,z] of [[-38,-29],[-38,29],[1,31],[47,40],[73,40],[99,40],[116,15],[-92,37]]){
  box('la-palm-trunk',x,2.6,z,.24,5.2,.24,trunk);
  for(let k=0;k<8;k++){const a=k*Math.PI/4;const path=[0,1,2,3].map(t=>new Vector3(x+Math.cos(a)*t,5.2+Math.sin(t)*.5-t*.24,z+Math.sin(a)*t));const frond=MeshBuilder.CreateTube('la-palm-frond',{path,radius:.16,tessellation:3},scene);frond.material=k%2?foliage:leaf;}
  box('la-streetlamp',x+.8,2.2,z,.09,4.4,.09,dark);box('la-lamp-head',x+.8,4.45,z,.7,.14,.35,windows);
  patch('la-lamp-pool',x+.8,z,5,5,pools[2],.06);
  const road=projectToPolyline({x,z},track.centerline,track.distances).point;
  if(Math.hypot(road.x-67,road.z+8)>24)patch('la-road-light-spill',road.x,road.z,18,18,pools[2],.126);
 }
 // Parked cars in the lots and along the avenues beyond the corridor (batched with the architecture).
 const city=laLayout(track);
 for(const car of city.scatter().cars){
  const ux=Math.sin(car.heading),uz=Math.cos(car.heading),along=Math.abs(uz)>.5,w=along?1.9:4.5,d=along?4.5:1.9,paint=facades[car.colour%facades.length];
  box('la-street-car',car.x,.55,car.z,w,.75,d,car.colour<3?paint:white);box('la-street-car-glass',car.x-ux*.15,1.1,car.z-uz*.15,along?1.6:2.2,.55,along?2.2:1.6,glass);
  for(const axle of [-1,1])for(const side of [-1,1])box('la-street-car-wheel',car.x+ux*axle*1.45+(along?side*.9:0),.3,car.z+uz*axle*1.45+(along?0:side*.9),along?.22:.6,.6,along?.6:.22,dark);
 }
 // Street lamps along the avenues: a pole, a lamp head among the batched emissive architecture and a warm pool.
 for(const street of LA.streets.filter(st=>st.width>=16)){
  const len=Math.hypot(street.to.x-street.from.x,street.to.z-street.from.z);
  for(let t=14,k=0;t<len;t+=30,k++){
   const side=k%2?1:-1,pole=city.along(street,t,side*(street.width/2+1)),pool=city.along(street,t,side*(street.width/2-3));
   if(!city.visible(pole)||!city.clear(pole,LA.corridor+4)||LA.streets.some(o=>o!==street&&city.onStreet(o,pole,4)))continue;
   box('la-avenue-lamp',pole.x,3,pole.z,.14,6,.14,dark);box('la-avenue-lamp-head',(pole.x+pool.x)/2,6,(pole.z+pool.z)/2,1,.16,1,windows);
   patch('la-avenue-light-pool',pool.x,pool.z,13,13,pools[2],.06);
  }
 }
 boxes.build(scene,'la-architecture');
 const landscape=buildLALandscape(scene,track,materials,cityGround,theme.scene.terrain,city);
 return {shadowCasterMaterials:casters,lateShadowCasters:landscape.shadowCasters,update(_time:number,_reduced:boolean){}};
}
