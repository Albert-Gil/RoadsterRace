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
import { roadHeight } from '../core/elevation';
import { canyonAppearance as art, venueDetail, type PresentationTheme } from './themes';
import { surfaceTexture } from './textures';
import { buildCanyonLandscape, CANYON } from './canyon-landscape';
import { canyonTrails, canyonBankGeometry, canyonShoulderGeometry, canyonRoadGeometry } from './canyon-earthwork';

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
 const ribbon=(name:string,path:Point[],width:number,offset:number,material:StandardMaterial)=>{
  if(path.length<2)return;const edges=roadEdges(path,width,false),sides=edges.map(side=>side.map((p,i)=>new Vector3(p.x,roadHeight(track,path[i].courseProgress!)+offset,p.z)));
  const m=MeshBuilder.CreateRibbon(name,{pathArray:sides,sideOrientation:Mesh.DOUBLESIDE},scene);m.material=material;
  // World-space grain prevents radial streaks at corners and stretched dirt on long sections.
  const positions=m.getVerticesData(VertexBuffer.PositionKind)!;
  const uv:number[]=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i]/12,positions[i+2]/12);
  m.setVerticesData(VertexBuffer.UVKind,uv);
 };
 // Earthen trails over broad, sloping hillsides; visible borders break up into the shoulder.
 const trails=canyonTrails(track),bankMaterial=mat('canyon-trail-rock','#ffffff',true);
 bankMaterial.twoSidedLighting=true;bankMaterial.diffuseTexture=surfaceTexture(scene,'sandstone');
 const banks=new Mesh('canyon-eroded-trail-foundations',scene);canyonBankGeometry(trails).toVertexData().applyToMesh(banks);banks.material=bankMaterial;
 // Fine mineral beds remain legible on the much broader hillside faces, including Low.
 const bankPositions=banks.getVerticesData(VertexBuffer.PositionKind)!,bankNormals=banks.getVerticesData(VertexBuffer.NormalKind)!,bankUvs:number[]=[];
 for(let i=0;i<bankPositions.length;i+=3){const along=Math.abs(bankNormals[i])>Math.abs(bankNormals[i+2])?bankPositions[i+2]:bankPositions[i];bankUvs.push(along/8,bankPositions[i+1]/3);}
 banks.setVerticesData(VertexBuffer.UVKind,bankUvs);
 const shoulders=new Mesh('canyon-weathered-trail-shoulders',scene);canyonShoulderGeometry(trails).toVertexData().applyToMesh(shoulders);shoulders.material=shoulder;
 const shoulderPositions=shoulders.getVerticesData(VertexBuffer.PositionKind)!,shoulderUvs:number[]=[],extent=CANYON.extent;
 for(let i=0;i<shoulderPositions.length;i+=3)shoulderUvs.push((shoulderPositions[i]-extent.minX)/(extent.maxX-extent.minX),(shoulderPositions[i+2]-extent.minZ)/(extent.maxZ-extent.minZ));
 shoulders.setVerticesData(VertexBuffer.UVKind,shoulderUvs);
 const dirt=new Mesh('packed-dirt-road',scene);canyonRoadGeometry(trails,track.roadWidth,theme.scene.asphalt,theme.scene.shoulder).toVertexData().applyToMesh(dirt);dirt.material=road;
 const positions=dirt.getVerticesData(VertexBuffer.PositionKind)!,uvs:number[]=[];
 for(let i=0;i<positions.length;i+=3)uvs.push(positions[i]/12,positions[i+2]/12);dirt.setVerticesData(VertexBuffer.UVKind,uvs);
 for(const trail of trails)for(const [side,edge]of roadEdges(trail.path,4.6,false).entries()){
  const worn=edge.map((p,i)=>{const c=trail.path[i],wave=Math.sin(p.x*.19+p.z*.11+side)*.16;return {...p,x:p.x+(p.x-c.x)*wave,z:p.z+(p.z-c.z)*wave,courseProgress:c.courseProgress};});
  ribbon('dirt-tire-path',worn,.45,trail.section?.118:.148,ruts);
 }
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
  if(barrier.kind==='rock'||barrier.kind==='infield'||barrier.kind==='cliff-face')continue;
  rockVolume('solid-'+barrier.id,p,base,top,cliffs[barrier.id.includes('hop')?2:1]);
 }
 // Canyon floor, rock and plants (landscape/), with their own late shadow casters.
 const landscape=buildCanyonLandscape(scene,track,materials);
 return {shadowCasterMaterials:casters,lateShadowCasters:landscape.shadowCasters,update(_time:number,_reduced:boolean){}};
}
