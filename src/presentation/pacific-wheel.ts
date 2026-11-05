import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer';
import type {Scene} from '@babylonjs/core/scene';
import type {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {CompositionShapes} from './composition-shapes';
import {Geometry} from './landscape/mesh';
import {pierComposition as art} from './themes';
import {SANTA_AMUSEMENT} from '../core/tracks/santa-monica';

/** A larger native wheel with upright gondolas. Rim and cabins remain one mesh. */
export function buildPacificWheel(scene:Scene,material:StandardMaterial){
 const rim=new CompositionShapes(),radius=art.wheelRadius;
 for(const side of[-1,1])for(let i=0;i<48;i++){
  const a=i/48*Math.PI*2,b=(i+1)/48*Math.PI*2;
  rim.beam([Math.cos(a)*radius,Math.sin(a)*radius,side*.42],[Math.cos(b)*radius,Math.sin(b)*radius,side*.42],.23,art.coral);
 }
 for(let i=0;i<16;i++){
  const a=i/16*Math.PI*2;for(const side of[-1,1])rim.beam([0,0,side*.38],[Math.cos(a)*radius,Math.sin(a)*radius,side*.42],.11,art.ivory);
  if(i%2===0)rim.beam([Math.cos(a)*radius,Math.sin(a)*radius,-.33],[Math.cos(a)*radius,Math.sin(a)*radius,.33],.09,art.gold);
 }
 const cabins=Array.from({length:12},(_,i)=>{
  const g=new CompositionShapes(),color=art.cabins[i%art.cabins.length];
  g.box(0,-.88,0,2,.88,1.55,color);g.box(0,-.34,0,2.05,.12,1.60,art.ivory);g.box(0,-.04,0,2.13,.15,1.72,color);
  for(const side of[-1,1]){g.box(side*.87,-.22,0,.10,.65,1.48,art.ivory);g.box(0,-.56,side*.78,1.65,.28,.03,art.glass);}
  g.beam([0,0,0],[0,.32,0],.055,art.ivory);for(let k=0;k<g.positions.length;k++)g.positions[k]*=1.2;return g.withNormals();
 });
 const all=new Geometry();all.append(rim);const starts=cabins.map(g=>{const start=all.vertexCount;all.append(g);return start;});
 const mesh=new Mesh('animated-pacific-wheel',scene),data=all.toVertexData();data.uvs=new Float32Array(all.vertexCount*2);data.applyToMesh(mesh,true);mesh.material=material;material.backFaceCulling=false;mesh.metadata={dynamicScenery:true,uprightGondolas:12,cabinRanges:starts.map((start,i)=>({start,count:cabins[i].vertexCount}))};mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;
 const positions=new Float32Array(all.positions),normals=new Float32Array(all.normals!);rim.withNormals();
 const update=(time:number,reduced:boolean)=>{
  const angle=reduced?0:time*art.speed,c=Math.cos(angle),s=Math.sin(angle);
  for(let i=0;i<rim.vertexCount;i++){
   const at=i*3,x=rim.positions[at],y=rim.positions[at+1],n=rim.normals!;
   positions[at]=art.wheelX+x*c-y*s;positions[at+1]=art.wheelY+x*s+y*c;positions[at+2]=art.wheelZ+rim.positions[at+2];
   normals[at]=n[at]*c-n[at+1]*s;normals[at+1]=n[at]*s+n[at+1]*c;normals[at+2]=n[at+2];
  }
  for(let k=0;k<cabins.length;k++){
   const g=cabins[k],a=k/cabins.length*Math.PI*2+angle,x=art.wheelX+Math.cos(a)*radius,y=art.wheelY+Math.sin(a)*radius;
   for(let i=0;i<g.vertexCount;i++){const at=(starts[k]+i)*3,base=i*3;positions[at]=x+g.positions[base];positions[at+1]=y+g.positions[base+1];positions[at+2]=art.wheelZ+g.positions[base+2];normals[at]=g.normals![base];normals[at+1]=g.normals![base+1];normals[at+2]=g.normals![base+2];}
  }
  mesh.updateVerticesData(VertexBuffer.PositionKind,positions);mesh.updateVerticesData(VertexBuffer.NormalKind,normals);
 };update(0,true);mesh.refreshBoundingInfo();return{mesh,update};
}

export function amusementBoardwalk(){
 const g=new CompositionShapes(),b=SANTA_AMUSEMENT.protected,cx=b.x+b.width/2,cz=b.z+b.depth/2;
 g.box(cx,.075,cz,b.width-.4,.05,b.depth-.4,art.timber);
 for(let x=b.x+.5;x<b.x+b.width-.4;x+=1.6)g.box(x,.11,cz,.055,.015,b.depth-.5,art.deckSeam);
 // A proper pier perimeter, with a pedestrian entrance and car-width bollards.
 for(const z of[b.z+.10,b.z+b.depth-.10]){
  const pieces=z<20?[[b.x+.1,b.x+b.width-.1]]:[[b.x+.1,93],[97,b.x+b.width-.1]];
  for(const [a,k]of pieces){g.box((a+k)/2,.68,z,k-a,.16,.18,art.ivory);for(let x=a+.15;x<k;x+=2.7)g.box(x,.41,z,.16,.8,.16,art.ivory);}
 }
 for(const x of[b.x+.1,b.x+b.width-.1]){g.box(x,.68,cz,.18,.16,b.depth-.2,art.ivory);for(let z=b.z+.3;z<b.z+b.depth;z+=2.7)g.box(x,.41,z,.16,.8,.16,art.ivory);}
 for(const x of[93.4,95,96.6])g.box(x,.42,39.88,.28,.8,.24,art.coral);
 for(const [i,x]of[79,85,91,97,103,109].entries()){
  const z=21.5,color=art.cabins[i%art.cabins.length];g.box(x,.82,z,4.4,1.35,1.6,color);g.hipRoof(x,z,4.6,1.9,1.55,2.28,art.ivory);
  g.box(x,1.04,z+.82,3.35,.55,.04,art.glass);g.box(x,.72,z+.82,3.8,.10,.10,art.ivory);
 }
 return g;
}

export function amusementAccess(){
 const g=new CompositionShapes();
 for(let z=39.8;z<46;z+=.32)g.box(95,.075,z,3.62,.11,.29,art.timber);
 for(const x of[93.15,96.85])for(const z of[40.1,42.7,45.4])g.box(x,-1.13,z,.22,2.3,.22,art.ivory);
 for(const x of[91,99]){g.box(x,1.9,39.3,.30,3.8,.30,art.coral);g.box(x,3.9,39.3,.6,.22,.6,art.gold);}
 g.box(95,3.65,39.3,8.3,.45,.32,art.coral);
 return g;
}

export function coasterPosition(angle:number){
 const a=art.coaster;return{x:a.x+Math.cos(angle)*a.rx,y:a.base+(1+Math.cos(angle*2+.6))*a.amplitude,z:a.z+Math.sin(angle)*a.rz};
}
