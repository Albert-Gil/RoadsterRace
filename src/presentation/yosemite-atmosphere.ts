import{Mesh}from'@babylonjs/core/Meshes/mesh';
import{VertexData}from'@babylonjs/core/Meshes/mesh.vertexData';
import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import{DynamicTexture}from'@babylonjs/core/Materials/Textures/dynamicTexture';
import{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';
import{Color3}from'@babylonjs/core/Maths/math.color';
import{Vector3}from'@babylonjs/core/Maths/math.vector';
import type{Scene}from'@babylonjs/core/scene';
import type{TrackDefinition}from'../core/types';
import{terrainElevation}from'../core/elevation';
import{yosemiteAppearance as art}from'./themes';
import{waterfallPoint,waterfallPoolPoint,yosemiteWaterfallSites}from'./yosemite-waterfall-shape';

/** One bounded batch for descending water, impact spray and restrained valley haze. */
export function yosemiteAtmosphere(scene:Scene,track:TrackDefinition){
 const sites=yosemiteWaterfallSites(track),n=art.mist.count+art.waterfall.sprayCount+art.waterfall.dropletCount;
 const p=new Float32Array(n*12),colors=new Float32Array(n*16),uvs:number[]=[],indices:number[]=[];
 for(let i=0;i<n;i++){const b=i*4;indices.push(b,b+1,b+2,b,b+2,b+3);uvs.push(0,0,1,0,1,1,0,1);}
 const tex=new DynamicTexture('valley-mist-sprite',32,scene,false),ctx=tex.getContext()as CanvasRenderingContext2D,gradient=ctx.createRadialGradient(16,16,1,16,16,15);
 gradient.addColorStop(0,'rgba(240,249,249,.9)');gradient.addColorStop(1,'rgba(240,249,249,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);tex.hasAlpha=true;tex.update();
 const m=new StandardMaterial('yosemite-mist-overlay',scene);m.diffuseTexture=tex;m.useAlphaFromDiffuseTexture=true;m.disableLighting=true;m.emissiveColor=Color3.White();m.disableDepthWrite=true;m.backFaceCulling=false;m.metadata={roadsterOverlay:true};
 const v=new VertexData();v.positions=p;v.colors=colors;v.uvs=uvs;v.indices=indices;
 const mesh=new Mesh('bounded-yosemite-mist',scene);v.applyToMesh(mesh,true);mesh.material=m;mesh.hasVertexAlpha=true;mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;mesh.metadata={dynamicScenery:true,fallingWaterCount:art.waterfall.dropletCount,splashCount:art.waterfall.sprayCount};
 const worldUp=Vector3.Up();
 return{mesh,update(time:number,reduced:boolean){
  mesh.setEnabled(!reduced);if(reduced||!scene.activeCamera)return;
  const right=scene.activeCamera.getDirection(Vector3.Right()),cameraUp=scene.activeCamera.getDirection(Vector3.Up());
  for(let i=0;i<n;i++){
   let x:number,y:number,z:number,width:number,height:number,alpha:number,vertical=false;
   if(i<art.mist.count){
    const phase=(time*.07+i*.618)%1;x=6+Math.sin(i*2.3+time*.13)*9;z=12-i/art.mist.count*130+phase*9;y=terrainElevation({x,z},track)+.7+Math.sin(i+time*.2)*.2;
    width=12+3*Math.sin(i);height=width*.18;alpha=art.mist.opacity*Math.sin(phase*Math.PI);
   }else{
    const index=i-art.mist.count,site=sites[index%4===0?1:0];
    if(index<art.waterfall.sprayCount){
     const phase=(time*.85+index*.618)%1,a=index*2.399,pool=waterfallPoolPoint(site,a,.08+phase*.95);
     x=pool.x;y=site.impact.y+Math.sin(phase*Math.PI)*1.8;z=pool.z;width=1+phase*3;height=width*.72;alpha=art.waterfall.sprayOpacity*Math.sin(phase*Math.PI);
    }else{
     const duration=Math.sqrt(2*(site.lip.y-site.impact.y)/art.waterfall.gravity),phase=(time/duration+index*.618)%1;
     const across=Math.sin(index*7.31)*site.width*.55,drop=waterfallPoint(site,phase,across*(1+phase*.2));
     x=drop.x;y=drop.y;z=drop.z;width=.16+phase*.32;height=.7+phase*1.9;alpha=.78*Math.sin(phase*Math.PI);vertical=true;
    }
   }
   const up=vertical?worldUp:cameraUp;
   for(let j=0;j<4;j++){
    const a=(j===0||j===3?-1:1)*width/2,b=(j<2?-1:1)*height/2,at=i*12+j*3,c=i*16+j*4;
    p[at]=x+right.x*a+up.x*b;p[at+1]=y+right.y*a+up.y*b;p[at+2]=z+right.z*a+up.z*b;
    colors[c]=.94;colors[c+1]=.98;colors[c+2]=1;colors[c+3]=alpha;
   }
  }
  mesh.updateVerticesData(VertexBuffer.PositionKind,p);mesh.updateVerticesData(VertexBuffer.ColorKind,colors);
 }};
}
