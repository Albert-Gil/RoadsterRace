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
import { insideBarrier } from '../core/barriers';
import { cumulative, projectToPolyline } from '../core/geometry';

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
 const floor=MeshBuilder.CreateGround('dry-canyon-floor',{width:650,height:500},scene);floor.position.y=-2.6;floor.material=terrain;
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
  if(barrier.kind==='infield'){
   const cx=p.reduce((v,a)=>v+a.x,0)/p.length,cz=p.reduce((v,a)=>v+a.z,0)/p.length;
   // Thin, uneven sediment shelves instead of four identical stacked blocks.
   for(let layer=0;layer<venueDetail.rockLayers;layer++){
    const shape:Point[]=[];
    for(let i=0;i<p.length;i++){
     const a=p[i],b=p[(i+1)%p.length],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/3));
     for(let s=0;s<steps;s++){
      const t=s/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      const inset=layer===0?0:layer*.009+(1+Math.sin(i*5.7+s*2.6+layer*.8))*.009;
      shape.push({x:cx+(x-cx)*(1-inset),z:cz+(z-cz)*(1-inset)});
     }
    }
    rockVolume('eroded-'+barrier.id,shape,base+barrier.height*layer/venueDetail.rockLayers,base+barrier.height*(layer+1)/venueDetail.rockLayers,cliffs[[1,0,1,2,1,2,3][layer%7]],mesa);
   }
   // Rock fragments and sparse desert plants are confined to the protected mesa top.
   const edge=[...p,p[0]],distances=cumulative(edge);
   const x0=Math.min(...p.map(v=>v.x)),x1=Math.max(...p.map(v=>v.x)),z0=Math.min(...p.map(v=>v.z)),z1=Math.max(...p.map(v=>v.z));
   for(let i=0;i<venueDetail.mesaStones;i++){
    const x=x0+(x1-x0)*((i*.618034+.19)%1),z=z0+(z1-z0)*((i*.414214+.31)%1),point={x,z};
    if(!insideBarrier(point,barrier)||projectToPolyline(point,edge,distances).distance<2.6)continue;
    const radius=venueDetail.stoneScale*(.5+(i%5)*.24);
    const stone=MeshBuilder.CreateSphere('mesa-weathered-stone',{diameter:radius*2,segments:3},scene);
    stone.position.set(x,top+radius*.25,z);stone.scaling.set(1,.35+(i%3)*.12,.65);stone.rotation.y=i*2.4;stone.material=cliffs[i%4];stone.convertToFlatShadedMesh();
    if(i%4===0){
     const stem=MeshBuilder.CreateCylinder('mesa-cactus',{height:1.3,diameter:.22,tessellation:6},scene);stem.position.set(x+.6,top+.65,z+.7);stem.material=materials.get('foliage')!;
     for(const side of [-1,1]){const arm=MeshBuilder.CreateTube('cactus-arm',{path:[new Vector3(x+.6,top+.6,z+.7),new Vector3(x+.6+side*.35,top+.6,z+.7),new Vector3(x+.6+side*.35,top+1,z+.7)],radius:.09,tessellation:5},scene);arm.material=materials.get('foliage')!;}
    }
   }
  }else rockVolume('solid-'+barrier.id,p,base,top,cliffs[barrier.id.includes('hop')?2:1]);
 }
 // Layered distant walls stay outside the driving view; compact islands remain below nearby road sightlines.
 for(let i=0;i<38;i++){
  const x=-155+(i%19)*17+Math.sin(i*2.1)*4,z=(i<19?-1:1)*(105+Math.sin(i*1.9)*9),height=9+(i*17%18);
  for(let layer=0;layer<5;layer++){
   const taper=1-layer*.11,diameter=20+(i%4)*3;
   const m=MeshBuilder.CreateCylinder('eroded-canyon-buttress',{height:height/5+.05,diameterTop:diameter*taper*.94,diameterBottom:diameter*taper,tessellation:5+i%4},scene);
   m.position.set(x+Math.sin(layer+i)*.4,-2.6+height/10+layer*height/5,z);m.material=cliffs[[1,0,1,2,3][layer]];m.scaling.z=.55+(i%3)*.12;m.rotation.y=i*.7;
  }
 }
 for(let i=0;i<70;i++){
  const p=track.centerline[(i*37)%(track.centerline.length-1)],section=sectionAt(track,p.courseProgress!);if(section?.flight)continue;
  const a=track.centerline[((i*37)+1)%(track.centerline.length-1)],d=Math.hypot(a.x-p.x,a.z-p.z)||1,side=i%2?1:-1,offset=section!.supportWidth/2-1;
  const bush=MeshBuilder.CreateSphere('desert-scrub',{diameter:1.1+(i%3)*.25,segments:3},scene);bush.position.set(p.x-(a.z-p.z)/d*offset*side,roadHeight(track,p.courseProgress!)+.35,p.z+(a.x-p.x)/d*offset*side);bush.scaling.y=.55;bush.material=materials.get(i%3?'foliage':'foliageLight')!;
 }
 return {shadowCasterMaterials:casters,update(_time:number,_reduced:boolean){}};
}
