import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { Point, TrackDefinition } from '../core/types';
import { roadEdges } from '../core/road-geometry';
import { roadHeight, sectionAt } from '../core/elevation';
import { canyonAppearance as art, venueDetail, type PresentationTheme } from './themes';
import { surfaceTexture } from './textures';
import { buildCanyonLandscape } from './canyon-landscape';

/** Original layered sandstone, supported earthen trails and real unsupported crossing. */
export function buildCanyon(scene:Scene,track:TrackDefinition,theme:PresentationTheme,materials:Map<string,StandardMaterial>){
 const casters=new Set<StandardMaterial>();
 const mat=(name:string,color:string,shadow=false)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.setAll(.02);m.backFaceCulling=false;materials.set(name,m);if(shadow)casters.add(m);return m;};
 const terrain=mat('terrain',theme.scene.terrain),shoulder=mat('shoulder',theme.scene.shoulder),road=mat('asphalt',theme.scene.asphalt),ruts=mat('canyon-ruts',art.ruts),cliffs=art.cliff.map((c,i)=>mat(`sandstone-${i}`,c,true));
 for(const cliff of cliffs){cliff.diffuseTexture=surfaceTexture(scene,'sandstone');cliff.emissiveColor=cliff.diffuseColor.scale(venueDetail.strataContrast);}
 const mesa=mat('mesa-cap',art.mesa);mesa.diffuseTexture=surfaceTexture(scene,'gravel');
 const terrainGrain=surfaceTexture(scene,'sand'),roadGrain=surfaceTexture(scene,'gravel');
 terrain.diffuseTexture=terrainGrain;road.diffuseTexture=roadGrain;shoulder.diffuseTexture=surfaceTexture(scene,'sand');ruts.alpha=venueDetail.dirtWearOpacity;
 terrainGrain.uScale=terrainGrain.vScale=10;
 roadGrain.uScale=roadGrain.vScale=venueDetail.dirtTextureScale;
 for(const [name,color] of [['architecture',theme.scene.structure],['embankment',theme.scene.embankment],['rock',theme.scene.rock],['foliage',theme.scene.foliage],['foliageLight',theme.scene.foliageLight],['trunk',theme.scene.trunk]] as const)mat(name,color);
 const ribbon=(name:string,path:Point[],width:number,offset:number,material:StandardMaterial,banks=false)=>{
  if(path.length<2)return;const edges=roadEdges(path,width,false),sides=edges.map(side=>side.map((p,i)=>new Vector3(p.x,roadHeight(track,path[i].courseProgress!)+offset,p.z)));
  const m=MeshBuilder.CreateRibbon(name,{pathArray:sides,sideOrientation:Mesh.DOUBLESIDE},scene);m.material=material;
  // World-space grain prevents radial streaks at corners and stretched dirt on long sections.
  const positions=m.getVerticesData(VertexBuffer.PositionKind)!;
  const uv:number[]=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i]/12,positions[i+2]/12);
  m.setVerticesData(VertexBuffer.UVKind,uv);
  if(banks)for(const side of sides){const bank=MeshBuilder.CreateRibbon('natural-earth-bank',{pathArray:[side,side.map(p=>new Vector3(p.x,-2.6,p.z))],sideOrientation:Mesh.DOUBLESIDE},scene);bank.material=cliffs[1];}
 };
 for(const section of track.sections!){
  if(section.flight)continue;
  const path=track.centerline.filter(p=>p.courseProgress!>=section.from-1e-5&&p.courseProgress!<=section.to+1e-5);
  const endpoint=(progress:number)=>{let i=track.distances.findIndex(d=>d>=progress);if(i<0)i=track.centerline.length-1;const a=track.centerline[Math.max(0,i-1)],b=track.centerline[i],t=(progress-track.distances[Math.max(0,i-1)])/(track.distances[i]-track.distances[Math.max(0,i-1)]||1);return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,courseProgress:progress};};
  path.unshift(endpoint(section.from));path.push(endpoint(section.to));
  ribbon('packed-earth-shoulder',path,section.supportWidth,.03,shoulder,true);ribbon('packed-dirt-road',path,track.roadWidth,.10,road);
  for(const edge of roadEdges(path,4.6,false))ribbon('dirt-tire-path',edge.map((p,i)=>({...p,courseProgress:path[i].courseProgress})),.7,.118,ruts);
 }
 for(const h of track.hopShortcuts??[]){ribbon('service-earth',h.branch,h.width+2,.04,shoulder);ribbon('service-dirt',h.branch,h.width,.11,road);}
 const rockVolume=(name:string,p:Point[],base:number,top:number,material:StandardMaterial,capMaterial=material)=>{
  const positions:number[]=[],indices:number[]=[],uvs:number[]=[];
  for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],n=positions.length/3,len=Math.hypot(b.x-a.x,b.z-a.z);positions.push(a.x,base,a.z,b.x,base,b.z,b.x,top,b.z,a.x,top,a.z);indices.push(n,n+1,n+2,n,n+2,n+3);uvs.push(0,base/4,len/12,base/4,len/12,top/4,0,top/4);}
  const data=new VertexData(),normals:number[]=[];data.positions=positions;data.indices=indices;VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;data.uvs=uvs;
  const sides=new Mesh(name,scene);data.applyToMesh(sides);sides.material=material;
  const cap=new VertexData(),verts=p.flatMap(v=>[v.x,top,v.z]),tris:number[]=[];for(let i=1;i<p.length-1;i++)tris.push(0,i,i+1);cap.positions=verts;cap.indices=tris;cap.normals=p.flatMap(()=>[0,1,0]);cap.uvs=p.flatMap(v=>[v.x/15,v.z/15]);const m=new Mesh(name+'-cap',scene);cap.applyToMesh(m);m.material=capMaterial;
 };
 for(const barrier of track.barriers){
  const p=barrier.footprint,base=barrier.baseHeight??0,top=base+barrier.height;
  // Infield mesas and solid canyon rock are drawn by the landscape (canyon-landscape.ts), inside their footprints.
  if(barrier.kind==='rock'||barrier.kind==='infield')continue;
  rockVolume('solid-'+barrier.id,p,base,top,cliffs[barrier.id.includes('hop')?2:1]);
 }
 for(let i=0;i<70;i++){
  const p=track.centerline[(i*37)%(track.centerline.length-1)],section=sectionAt(track,p.courseProgress!);if(section?.flight)continue;
  const a=track.centerline[((i*37)+1)%(track.centerline.length-1)],d=Math.hypot(a.x-p.x,a.z-p.z)||1,side=i%2?1:-1,offset=section!.supportWidth/2-1;
  const bush=MeshBuilder.CreateSphere('desert-scrub',{diameter:1.1+(i%3)*.25,segments:3},scene);bush.position.set(p.x-(a.z-p.z)/d*offset*side,roadHeight(track,p.courseProgress!)+.35,p.z+(a.x-p.x)/d*offset*side);bush.scaling.y=.55;bush.material=materials.get(i%3?'foliage':'foliageLight')!;
 }
 // Canyon floor, rock and plants (landscape/), with their own late shadow casters.
 const landscape=buildCanyonLandscape(scene,track,materials);
 return {shadowCasterMaterials:casters,lateShadowCasters:landscape.shadowCasters,update(_time:number,_reduced:boolean){}};
}
