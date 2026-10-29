import{Mesh}from'@babylonjs/core/Meshes/mesh';
import{VertexData}from'@babylonjs/core/Meshes/mesh.vertexData';
import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import type{Scene}from'@babylonjs/core/scene';
import type{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';
import type{RenderedSurface,SurfaceTriangle}from'./rendered-surface';
import{rotateContact}from'./vehicle-grounding';

/** One bounded mesh, copying real road triangles so the shadow cannot hover or cut through. */
export class ContactShadow{
 readonly mesh:Mesh;private positions:Float32Array;private uvs:Float32Array;
 constructor(scene:Scene,material:StandardMaterial,private capacity=512){
  this.positions=new Float32Array(capacity*9);this.uvs=new Float32Array(capacity*6);
  const d=new VertexData();d.positions=this.positions;d.uvs=this.uvs;d.indices=Array.from({length:capacity*3},(_,i)=>i);
  this.mesh=new Mesh('car-shadow',scene);d.applyToMesh(this.mesh,true);this.mesh.material=material;this.mesh.isPickable=false;this.mesh.alwaysSelectAsActiveMesh=true;
 }
 update(p:{x:number;z:number;heading:number},surfaceY:number,pitch:number,roll:number,scale:number,lift:number,surface?:RenderedSurface){
  const right=rotateContact({x:1,y:0,z:0},p.heading,pitch,roll),forward=rotateContact({x:0,y:0,z:1},p.heading,pitch,roll),w=3.5*scale,l=6.8*scale;
  const corners=[[-w/2,-l/2],[w/2,-l/2],[w/2,l/2],[-w/2,l/2]].map(([x,z])=>{const r=rotateContact({x,y:0,z},p.heading,pitch,roll);return{x:p.x+r.x,y:surfaceY+r.y,z:p.z+r.z};});
  let triangles=surface?.patch(Math.min(...corners.map(c=>c.x)),Math.min(...corners.map(c=>c.z)),Math.max(...corners.map(c=>c.x)),Math.max(...corners.map(c=>c.z)));
  if(!triangles?.length)triangles=[[corners[0],corners[1],corners[2]],[corners[0],corners[2],corners[3]]] as SurfaceTriangle[];
  let count=0;
  for(const triangle of triangles){
   if(count>=this.capacity)break;
   for(let i=0;i<3;i++){
    const q=triangle[i],dx=q.x-p.x,dy=q.y-surfaceY,dz=q.z-p.z,at=count*9+i*3,uv=count*6+i*2;
    this.positions[at]=q.x;this.positions[at+1]=q.y+lift;this.positions[at+2]=q.z;
    this.uvs[uv]=.5+(dx*right.x+dy*right.y+dz*right.z)/w;this.uvs[uv+1]=.5+(dx*forward.x+dy*forward.y+dz*forward.z)/l;
   }count++;
  }
  for(let i=count*9;i<this.positions.length;i+=3){this.positions[i]=p.x;this.positions[i+1]=surfaceY;this.positions[i+2]=p.z;}
  this.mesh.updateVerticesData(VertexBuffer.PositionKind,this.positions,true);this.mesh.updateVerticesData(VertexBuffer.UVKind,this.uvs);
  const sub=this.mesh.subMeshes[0];sub.indexCount=count*3;
  // A partial dynamic submesh no longer inherits the mesh bounds. Transparent
  // sorting needs its own refreshed bounds even before the first rendered frame.
  sub.refreshBoundingInfo(this.positions);sub.updateBoundingInfo(this.mesh.computeWorldMatrix(true));
 }
}
