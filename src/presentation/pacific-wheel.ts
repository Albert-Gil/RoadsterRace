import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer';
import type {Scene} from '@babylonjs/core/scene';
import type {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {CompositionShapes} from './composition-shapes';
import {Geometry} from './landscape/mesh';
import {pierComposition as art} from './themes';

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
  g.beam([0,0,0],[0,.32,0],.055,art.ivory);return g.withNormals();
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
 const g=new CompositionShapes();
 g.box(95.5,.075,31,38,.05,13.5,art.timber);
 for(let x=77;x<114;x+=1.6)g.box(x,.11,31,.055,.015,13.3,art.deckSeam);
 for(const [i,x]of[79,85,91,97,103,109].entries()){
  const color=art.cabins[i%art.cabins.length];g.box(x,.82,30,4.4,1.35,1.6,color);g.hipRoof(x,30,4.6,1.9,1.55,2.28,art.ivory);
  g.box(x,1.04,30.82,3.35,.55,.04,art.glass);g.box(x,.72,30.82,3.8,.10,.10,art.ivory);
 }
 return g;
}
