import {Mesh} from '@babylonjs/core/Meshes/mesh';
import type {Scene} from '@babylonjs/core/scene';
import type {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import type {TrackDefinition} from '../core/types';
import {insideBarrier} from '../core/barriers';
import {CompositionShapes} from './composition-shapes';
import {venueComposition as art} from './themes';

export function bakeLandmark(name:string,g:CompositionShapes,scene:Scene,material:StandardMaterial){
 const mesh=new Mesh(name,scene),v=g.toVertexData();v.uvs=Float32Array.from({length:g.vertexCount*2},(_,i)=>g.positions[Math.floor(i/2)*3+(i%2?2:0)]/12);v.applyToMesh(mesh);mesh.material=material;mesh.isPickable=false;material.backFaceCulling=false;return mesh;
}

/** A club pavilion and shaded garden replace the industrial solar-roof silhouette.
 * Every vertex is inside the same protected garden; the road/runoff is untouched. */
export function newportClubhouse(track:TrackDefinition){
 const g=new CompositionShapes(),a=art.coastal,parcel=track.barriers.find(b=>b.id==='coastal-gardens')!;
 g.box(-17,.20,-5,25,.38,12,a.trim);g.box(-17,1.65,-5,24,2.9,10.8,a.wall);
 g.hipRoof(-17,-5,25,12,3.12,5.05,a.roof);
 for(const side of[-1,1]){
  const z=-5+side*5.43;g.box(-17,1.56,z,22,1.85,.06,a.glass);
  for(let x=-28;x<=-6;x+=2.75)g.box(x,1.64,z,.16,2.7,.14,a.trim);
  g.box(-17,2.63,z,24,.15,.14,a.wood);
 }
 // A broad veranda with a timber pergola, remaining inside the protected parcel.
 g.box(-17,.16,3.3,25,.22,4.7,a.wood);
 for(const x of[-28,-20,-12,-5]){g.box(x,1.55,5.35,.18,2.8,.18,a.trim);g.box(x,3.00,3.5,.13,.14,3.8,a.wood);}
 g.box(-17,3.02,5.35,24,.17,.25,a.wood);
 for(let x=-28;x<-5;x+=1.15)g.box(x,3.12,3.55,.14,.10,3.6,a.trim);
 for(const [x,z]of[[-31,3],[-25,12],[-10,10]]){
  const r=2.1;if(Array.from({length:12},(_,i)=>({x:x+Math.cos(i*Math.PI/6)*r,z:z+Math.sin(i*Math.PI/6)*r})).every(p=>insideBarrier(p,parcel)))g.palm(x,.12,z,5.5,r,a.wood,a.leaf);
 }
 // Visible shell-stone patio rather than a field of small industrial props.
 for(const [x,z]of[[-31,-6],[-18,9],[-8,6]])if(insideBarrier({x,z},parcel)){
  g.box(x,.06,z,3.5,.06,2.5,a.trim);g.box(x,.55,z,2.7,.14,.65,a.wood);
 }
 return g;
}

export function assemblyHall(){
 const g=new CompositionShapes(),a=art.industrial;
 g.hipRoof(-11,-14,38.5,11.2,7.15,8.45,a.roof);
 for(const x of[-25,-11,3]){
  // Recessed high bays and bright structural columns read at phone scale.
  g.box(x,3.05,-19.08,11,5.6,.11,a.dark);g.box(x,5.95,-19.16,11.4,.28,.22,a.trim);
  for(const side of[-1,1])g.box(x+side*5.6,3.1,-19.18,.26,5.9,.25,a.trim);
  const roofX=-11+(x+11)*.82;g.box(roofX,8.51,-14,8.1,.08,3.8,a.glass);
  for(let z=-15.5;z<-12.1;z+=.9)g.box(roofX,8.57,z,8.2,.05,.08,a.trim);
  for(let i=0;i<4;i++)g.box(x-3.4+i*2.3,1.0,-19.21,.14,1.7,.04,a.accent);
 }
 // Continuous clerestory and a deeper mission-control canopy.
 g.box(-11,6.55,-19.17,36,1.0,.07,a.glass);
 g.box(23,5.35,-21.70,11.7,.26,.58,a.trim);
 for(const x of[18,23,28])g.box(x,3.85,-21.62,.20,2.4,.17,a.steel);
 return g;
}

export function launchTowerDetail(){
 const g=new CompositionShapes(),a=art.industrial;
 for(const z of[23,26])for(let y=2;y<24;y+=3){
  g.beam([96.5,y,z],[99.5,y+2.7,z],.105,a.trim);g.beam([99.5,y,z],[96.5,y+2.7,z],.105,a.trim);
 }
 for(let y=3;y<25;y+=3){g.box(98,y,24.5,3.6,.12,3.5,a.roof);for(const z of[22.8,26.2])g.box(98,y+.65,z,3.5,.09,.07,a.accent);}
 return g;
}
