import{Mesh}from'@babylonjs/core/Meshes/mesh';
import{VertexData}from'@babylonjs/core/Meshes/mesh.vertexData';
import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import{DynamicTexture}from'@babylonjs/core/Materials/Textures/dynamicTexture';
import{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';
import{Color3}from'@babylonjs/core/Maths/math.color';
import type{Scene}from'@babylonjs/core/scene';
import{landmarkShowcase}from'./themes';

/** One fixed-size billboard batch. White cryogenic venting, without fire or lights. */
export function rocketBoilOff(scene:Scene){
 const a=landmarkShowcase.boilOff,n=a.capacity,texture=new DynamicTexture('cryogenic-vapor',64,scene,false),ctx=texture.getContext()as CanvasRenderingContext2D;
 const grad=ctx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'rgba(255,255,255,.8)');grad.addColorStop(.45,'rgba(255,255,255,.45)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);texture.hasAlpha=true;texture.update();
 const m=new StandardMaterial('cryogenic-vapor',scene);m.diffuseTexture=texture;m.useAlphaFromDiffuseTexture=true;m.disableLighting=true;m.emissiveColor=Color3.FromHexString(a.color);m.backFaceCulling=false;m.disableDepthWrite=true;
 m.metadata={roadsterOverlay:true}; // Translucent gas must not write false surfaces into AO/reflections.
 const p=new Float32Array(n*12),colors=new Float32Array(n*16),uvs=new Float32Array(n*8),indices:number[]=[];
 for(let i=0;i<n;i++){uvs.set([0,0,1,0,1,1,0,1],i*8);const v=i*4;indices.push(v,v+1,v+2,v,v+2,v+3);}
 const mesh=new Mesh('launchsite-bounded-boiloff',scene),data=new VertexData();data.positions=p;data.colors=colors;data.uvs=uvs;data.indices=indices;data.normals=new Float32Array(n*12);data.applyToMesh(mesh,true);mesh.material=m;mesh.hasVertexAlpha=true;mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;mesh.metadata={dynamicScenery:true,particleCapacity:n,cosmetic:true};
 const update=(time:number,reduced:boolean)=>{
  const view=scene.activeCamera!.getViewMatrix().m,t=reduced?0:time;
  for(let i=0;i<n;i++){
   const source=a.vents[i%a.vents.length],u=(t/a.period+i/n)%1,phase=i*2.39996,size=a.sizeStart+u*a.sizeGrowth;
   const x=source.x+u*a.drift+Math.sin(phase+u*5)*u*1.8,z=source.z-u*1.7+Math.cos(phase+u*4)*u*1.6,y=source.y+u*a.rise;
   const alpha=Math.sin(u*Math.PI)**2*a.opacity;
   for(let k=0;k<4;k++){const sx=(k===0||k===3?-1:1)*size,sy=(k<2?-1:1)*size,at=(i*4+k)*3;
    p[at]=x+view[0]*sx+view[1]*sy;p[at+1]=y+view[4]*sx+view[5]*sy;p[at+2]=z+view[8]*sx+view[9]*sy;colors.set([1,1,1,alpha],(i*4+k)*4);
   }
  }
  mesh.updateVerticesData(VertexBuffer.PositionKind,p);mesh.updateVerticesData(VertexBuffer.ColorKind,colors);
 };update(0,true);return{mesh,update};
}
