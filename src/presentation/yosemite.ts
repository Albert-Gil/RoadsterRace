import{Mesh}from'@babylonjs/core/Meshes/mesh';
import{MeshBuilder}from'@babylonjs/core/Meshes/meshBuilder';
import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import{VertexData}from'@babylonjs/core/Meshes/mesh.vertexData';
import{Vector3}from'@babylonjs/core/Maths/math.vector';
import{Color3}from'@babylonjs/core/Maths/math.color';
import{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';

import type{Scene}from'@babylonjs/core/scene';
import type{Point,TrackDefinition}from'../core/types';
import{terrainElevation}from'../core/elevation';
import{supported}from'../core/support';
import{roadEdges}from'../core/road-geometry';
import{Geometry,hex,mix,edgeDistance}from'./landscape/mesh';
import{fbm2,smoothstep}from'./landscape/noise';
import{RenderedSurface}from'./rendered-surface';
import{surfaceTexture}from'./textures';
import{yosemiteAppearance as art,type PresentationTheme}from'./themes';
import{yosemiteAtmosphere}from'./yosemite-atmosphere';
import{buildYosemiteWaterfall}from'./yosemite-waterfall';
import{yosemiteDressing}from'./yosemite-dressing';
import{yosemiteMeadowColor}from'./yosemite-surfaces';
import { yosemiteCreekBanks } from '../core/tracks/yosemite-terrain';

/** Terrain and footprints come from core; all dressing and animation remain cosmetic. */
export function buildYosemite(scene:Scene,track:TrackDefinition,theme:PresentationTheme,materials:Map<string,StandardMaterial>){
 const groundSurface=new RenderedSurface(),casters=new Set<StandardMaterial>();
 const mat=(role:string,color:string,shadow=false)=>{const m=new StandardMaterial(role,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.setAll(.035);m.backFaceCulling=false;materials.set(role,m);if(shadow)casters.add(m);return m;};
 const meadow=mat('terrain',art.meadow),road=mat('asphalt',art.road),shoulder=mat('shoulder',art.shoulder),stone=mat('yosemite-granite','#ffffff',true),forest=mat('yosemite-forest','#ffffff',true);
 const detail=mat('yosemite-details','#ffffff',true);
 meadow.metadata={absoluteVertexColors:true};
 for(const m of[road,shoulder]){m.diffuseColor.setAll(1);m.metadata={absoluteVertexColors:true};}
 forest.twoSidedLighting=true;
 const roadTexture=surfaceTexture(scene,'gravel');road.diffuseTexture=roadTexture;
 const h=(x:number,z:number)=>terrainElevation({x,z},track);
 const ribbon=(name:string,path:Point[],width:number,offset:number,m:StandardMaterial)=>{
  const[a,b]=roadEdges(path,width,false),steps=Math.ceil(width/1.5),rows=Array.from({length:steps+1},(_,i)=>a.map((p,j)=>{const t=i/steps,x=p.x+(b[j].x-p.x)*t,z=p.z+(b[j].z-p.z)*t;return new Vector3(x,h(x,z)+offset,z);}));
  const mesh=MeshBuilder.CreateRibbon(name,{pathArray:rows,sideOrientation:Mesh.DOUBLESIDE},scene);mesh.material=m;
  const positions=mesh.getVerticesData(VertexBuffer.PositionKind)!,uvs:number[]=[],colors:number[]=[];
  for(let i=0;i<positions.length;i+=3){
   const x=positions[i],z=positions[i+2],across=Math.floor((i/3)/path.length)%(steps+1)/steps,noise=fbm2(x/8,z/8,3),edge=Math.abs(across-.5)*2;
   let color=hex('#ffffff');
   if(m===shoulder){
    // Feather only the visual shoulder; the physical road edge and terrain stay authoritative.
    const fade=smoothstep(.72+noise*.12,1,edge);
    color=mix(hex(art.shoulder),yosemiteMeadowColor(x,z,h(x,z)),fade);
   }else{
    const wear=Math.exp(-(((across-.30)/.085)**2))+Math.exp(-(((across-.70)/.085)**2));
    const brightness=.83+Math.min(1,.48+wear*.4+noise*.12)*.17;
    color=hex(art.road).map(v=>v*brightness) as [number,number,number];
   }
   colors.push(...color,1);uvs.push(x/14,z/14);
  }
  mesh.setVerticesData(VertexBuffer.UVKind,uvs);mesh.setVerticesData(VertexBuffer.ColorKind,colors);groundSurface.add(positions,mesh.getIndices()!,true);return mesh;
 };
 /** Insert exact support boundaries; no road skin bridges the unsupported creek. */
 const runs=(path:Point[])=>{const result:Point[][]=[];let run:Point[]=[];for(let i=0;i<path.length;i++){
  const p=path[i],yes=supported(p,track);if(yes)run.push(p);
  if(i===path.length-1)break;const q=path[i+1],next=supported(q,track);if(yes===next)continue;
  let a=0,b=1;for(let k=0;k<24;k++){const t=(a+b)/2;if(supported({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t},track)===yes)a=t;else b=t;}
  const t=(a+b)/2,edge={x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t};if(yes){run.push(edge);if(run.length>1)result.push(run);run=[];}else run=[edge];
 }if(run.length>1)result.push(run);return result;};
 for(const path of [track.centerline,...(track.hopShortcuts??[]).map(l=>l.branch)])for(const run of runs(path)){
  ribbon('valley-trail-fringe',run,20,.045,shoulder);ribbon('packed-earth-trail',run,track.roadWidth,.12,road);
 }
 const base=MeshBuilder.CreateGround('valley-loading-ground',{width:650,height:650},scene);base.position.y=-.1;base.material=meadow;base.metadata={dynamicScenery:true};
 const dressing=new Mesh('yosemite-ranger-dressing',scene);yosemiteDressing(track).toVertexData().applyToMesh(dressing);dressing.material=detail;dressing.isPickable=false;dressing.receiveShadows=true;dressing.metadata={protectedDressing:true};
 const water=mat('water','#ffffff');water.reflectionTexture=scene.environmentTexture;water.specularColor.setAll(.4);water.specularPower=110;
 water.metadata={absoluteVertexColors:true};
 const waterTexture=surfaceTexture(scene,'water');waterTexture.uScale=3;waterTexture.vScale=14;water.diffuseTexture=waterTexture;
 const creek=track.waterOpenings![0].footprint,g=new Geometry();
 // Follow the authoritative meandering banks; the straight eight-metre race gap is unchanged.
 const [left,right]=yosemiteCreekBanks,waterRows=left.map((a,i)=>Array.from({length:9},(_,j)=>{
  const t=j/8,x=a.x+(right[i].x-a.x)*t,z=a.z+(right[i].z-a.z)*t;
  const depth=smoothstep(.2,3,edgeDistance({x,z},creek)),light=.5+.5*Math.sin(z*.35+x);
  return g.vertex(x,-2.4,z,mix(hex(art.water),hex(art.waterDeep),Math.min(.88,depth*.75+light*.08)));
 }));
 for(let i=0;i<waterRows.length-1;i++)for(let j=0;j<8;j++){
  g.triangle(waterRows[i][j],waterRows[i+1][j],waterRows[i][j+1]);g.triangle(waterRows[i][j+1],waterRows[i+1][j],waterRows[i+1][j+1]);
 }
 const stream=new Mesh('bridalveil-flowing-creek',scene),v=g.toVertexData();v.normals=Array.from({length:g.vertexCount},()=>[0,1,0]).flat();v.uvs=Array.from({length:g.vertexCount},(_,i)=>[g.positions[i*3]/10,g.positions[i*3+2]/10]).flat();v.applyToMesh(stream);stream.material=water;
 const falling=buildYosemiteWaterfall(scene,track,water,stone);materials.set('yosemite-waterfall',falling.material);
 const atmosphere=yosemiteAtmosphere(scene,track),pending={landscape:'capitan-yosemite'};scene.addPendingData(pending);
 const lateShadowCasters=new Promise<Mesh[]>(resolve=>scene.onAfterRenderObservable.addOnce(()=>{
  void import('./yosemite-landscape').then(({buildYosemiteLandscape})=>{
   if(scene.isDisposed){resolve([]);return;}const built=buildYosemiteLandscape(scene,track,{meadow,stone,forest,detail},groundSurface);base.setEnabled(false);scene.removePendingData(pending);resolve([...built,falling.rim]);
  }).catch(()=>{if(!scene.isDisposed)scene.removePendingData(pending);resolve([]);});
 }));
 return{groundSurface,shadowCasterMaterials:casters,lateShadowCasters,refinements:['sculpted granite with mineral seams and lichen','layered cedar and ponderosa forest','feathered packed-earth edges and worn paths','natural creek crossing','hidden fallen-cedar trail','flowing waterfall and valley mist','detailed timber lodges and campground'],update(time:number,reduced:boolean){waterTexture.vOffset=reduced?0:time*art.waterfall.speed*.08;falling.update(time,reduced);atmosphere.update(time,reduced);}};
}
