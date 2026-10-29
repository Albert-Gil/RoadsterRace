import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { Point, TrackDefinition } from '../core/types';
import { insideBarrier } from '../core/barriers';
import { roadEdges } from '../core/road-geometry';
import { terrainElevation,locateRoad,roadGrade } from '../core/elevation';
import {samplePolyline}from'../core/geometry';
import { supported } from '../core/support';
import { courseDistance, buildTerrain } from './landscape/terrain';
import { fbm2,smoothstep } from './landscape/noise';
import { Geometry,hex,mix } from './landscape/mesh';
import { snowyTahoeAppearance as art,type PresentationTheme } from './themes';
import { surfaceTexture } from './textures';
import { tahoeWeather } from './tahoe-weather';
import { tahoeDetails } from './tahoe-details';
import{RenderedSurface}from'./rendered-surface';

/** Placement is cosmetic; the road, runoff, buildings and hillside share core ground heights. */
export function tahoeLayout(track:TrackDefinition){
  const D=courseDistance(track,art.extent,4),height=(x:number,z:number)=>terrainElevation({x,z},track);
  let seed=173;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const trees:{x:number;z:number;height:number;authored:boolean}[]=[];
  for(let tries=0;tries<10000&&trees.length<art.treeCount;tries++){
    const x=-205+random()*340,z=-145+random()*340,h=5+random()*6,p={x,z};
    if(!supported(p,track)||D(x,z)<34+h*1.1||track.barriers.some(b=>insideBarrier(p,b)))continue;
    const road=locateRoad(p,track),above=h+Math.max(0,height(x,z)-road.height);
    if(D(x,z)<track.roadWidth/2+above*1.1)continue;
    // Leave the lift cable and its station approaches legible.
    if(x>-173&&x<-146&&z>-66&&z<148)continue;
    trees.push({x,z,height:h,authored:false});
  }
  const reserve=track.barriers.find(b=>b.id==='forest-reserve')!;
  for(let x=-53;x<34;x+=6.8)for(let z=-17;z<29;z+=7.4){
    const p={x:x+(random()-.5)*4,z:z+(random()-.5)*4},h=3.2+random()*2.2;
    if(!insideBarrier(p,reserve)||D(p.x,p.z)<17)continue;
    const radius=h*.24;
    if(Array.from({length:8},(_,i)=>({x:p.x+Math.cos(i*Math.PI/4)*radius,z:p.z+Math.sin(i*Math.PI/4)*radius})).some(q=>!insideBarrier(q,reserve)))continue;
    if(track.barriers.filter(b=>b.kind==='building').some(b=>{const xs=b.footprint.map(q=>q.x),zs=b.footprint.map(q=>q.z);return p.x>Math.min(...xs)-2&&p.x<Math.max(...xs)+2&&p.z>Math.min(...zs)-2&&p.z<Math.max(...zs)+2;}))continue;
    trees.push({...p,height:h,authored:true});
  }
  return{distance:D,height,trees};
}

/** A genuine alpine circuit: terrain-supported grades, chalets, a working lift and snowfall. */
export function buildTahoe(scene:Scene,track:TrackDefinition,theme:PresentationTheme,materials:Map<string,StandardMaterial>){
  const casters=new Set<StandardMaterial>(),layout=tahoeLayout(track);
  const groundSurface=new RenderedSurface();
  const mat=(role:string,color:string,shadow=false)=>{const m=new StandardMaterial(role,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.setAll(.035);m.backFaceCulling=false;materials.set(role,m);if(shadow)casters.add(m);return m;};
  const snow=mat('terrain',art.snow),road=mat('asphalt',art.packed),shoulder=mat('shoulder',theme.scene.shoulder),ruts=mat('tahoe-ruts',art.ruts);ruts.alpha=.55;
  const snowTexture=surfaceTexture(scene,'snow');snowTexture.uScale=snowTexture.vScale=16;snow.diffuseTexture=snowTexture;road.diffuseTexture=surfaceTexture(scene,'snow');
  const wood=mat('tahoe-timber',art.timber,true),steel=mat('architecture-trim',art.steel,true),wall=mat('tahoe-lodge',art.cabin,true),roof=mat('tahoe-roof',art.roof,true),glass=mat('tahoe-windows',art.window),red=mat('tahoe-lift-red',art.lift,true);
  glass.emissiveColor=Color3.FromHexString(art.window).scale(.16);
  const forest=mat('tahoe-fir','#ffffff',true),caps=mat('tahoe-snowcaps','#ffffff',true),stone=mat('tahoe-granite','#ffffff',true);
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:StandardMaterial)=>{const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=m;return mesh;};
  const bake=(name:string,data:Geometry,m:StandardMaterial)=>{
    const mesh=new Mesh(name,scene),v=data.toVertexData();
    for(let i=0;i<(v.normals?.length??0);i+=3)if(v.normals![i+1]<0){v.normals![i]*=-1;v.normals![i+1]*=-1;v.normals![i+2]*=-1;}
    v.uvs=new Float32Array(data.vertexCount*2);v.applyToMesh(mesh);mesh.material=m;return mesh;
  };
  const ribbon=(name:string,path:Point[],width:number,offset:number,m:StandardMaterial,closed=true)=>{
    const [a,b]=roadEdges(path,width,closed),strips=Math.max(1,Math.ceil(width/1.5));
    // Sample across the road as well as along it: steep curved crowns are not
    // one planar quad, and must agree with the surface used by the car and input.
    const rows=Array.from({length:strips+1},(_,i)=>a.map((p,n)=>{const t=i/strips,x=p.x+(b[n].x-p.x)*t,z=p.z+(b[n].z-p.z)*t;
      const y=m===ruts?(groundSurface.height(x,z)??layout.height(x,z)+art.surfaceOffsets.road)+art.slopeGrooming.surfaceGap:layout.height(x,z)+offset;
      return new Vector3(x,y,z);}));
    const mesh=MeshBuilder.CreateRibbon(name,{pathArray:rows,sideOrientation:Mesh.DOUBLESIDE},scene);mesh.material=m;
    const positions=mesh.getVerticesData(VertexBuffer.PositionKind)!,uvs:number[]=[];for(let i=0;i<positions.length;i+=3)uvs.push(positions[i]/14,positions[i+2]/14);mesh.setVerticesData(VertexBuffer.UVKind,uvs);
    if(m===road||m===shoulder)groundSurface.add(positions,mesh.getIndices()!,true);return mesh;
  };
  const base=MeshBuilder.CreateGround('alpine-loading-ground',{width:480,height:570},scene);base.position.set(-80,-.08,15);base.material=snow;base.metadata={dynamicScenery:true};
  const water=mat('water',art.lake);water.specularColor.setAll(.48);water.specularPower=110;water.reflectionTexture=scene.environmentTexture;
  const waterTexture=surfaceTexture(scene,'water');waterTexture.uScale=waterTexture.vScale=40;water.diffuseTexture=waterTexture;
  const lake=MeshBuilder.CreateGround('tahoe-blue-lake',{width:1600,height:1600},scene);lake.position.set(350,-2.4,15);lake.material=water;
  ribbon('powder-trail-fringe',track.centerline,20,art.surfaceOffsets.fringe,shoulder);ribbon('packed-snow-road',track.centerline,track.roadWidth,art.surfaceOffsets.road,road);
  for(const lane of track.hopShortcuts??[]){ribbon('forestry-powder',lane.branch,20,art.surfaceOffsets.branchFringe,shoulder,false);ribbon('forestry-snow',lane.branch,lane.width,art.surfaceOffsets.branch,road,false);}
  for(const path of [track.centerline,...(track.hopShortcuts??[]).map(h=>h.branch)]){
    const closed=path===track.centerline,trimmed=closed?path:path.slice(7,-7);
    for(const edge of roadEdges(trimmed,4.6,closed))ribbon('compressed-snow-wheel-path',edge,.6,.15,ruts,closed);
  }
  // Quiet groomer impressions follow the real gradient rather than a flat overlay.
  const grooves=new Geometry(),cfg=art.slopeGrooming;
  for(let s=cfg.spacing;s<track.length;s+=cfg.spacing){
    if(Math.abs(roadGrade(track,s))<cfg.minimumGrade)continue;
    const p=samplePolyline(track.centerline,track.distances,s),q=samplePolyline(track.centerline,track.distances,s+.2),l=Math.hypot(q.x-p.x,q.z-p.z),nx=-(q.z-p.z)/l,nz=(q.x-p.x)/l,half=track.roadWidth/2-cfg.inset;
    const rows=[-.5,.5].map(side=>Array.from({length:9},(_,i)=>{const w=-half+i*half/4,x=p.x+nx*w+(q.x-p.x)/l*cfg.width*side,z=p.z+nz*w+(q.z-p.z)/l*cfg.width*side;return grooves.vertex(x,(groundSurface.height(x,z)??layout.height(x,z)+art.surfaceOffsets.road)+cfg.surfaceGap,z,hex('#ffffff'));}));
    for(let i=0;i<8;i++){grooves.triangle(rows[0][i],rows[1][i],rows[1][i+1]);grooves.triangle(rows[0][i],rows[1][i+1],rows[0][i+1]);}
  }
  bake('slope-groomer-impressions',grooves,ruts);
  for(const t of layout.trees.filter(t=>t.authored))box('fir-trunk',t.x,layout.height(t.x,t.z)+t.height*.22,t.z,.22,t.height*.44,.22,wood);
  const stones=new Geometry();
  // Several uneven, overlapping rock crowns within each authoritative granite footprint.
  for(const b of track.barriers.filter(b=>b.kind==='rock')){
    const cx=b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,cz=b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length,y=b.baseHeight??0;
    const rings=[0,.6,1].map((t,layer)=>b.footprint.map((p,i)=>stones.vertex(p.x+(cx-p.x)*t,y+(layer===0?0:layer===1?b.height*(.65+.12*Math.sin(i*2.3)):b.height),p.z+(cz-p.z)*t,hex(layer===2?art.roof:art.rock))));
    for(let layer=0;layer<2;layer++)for(let i=0;i<b.footprint.length;i++){const j=(i+1)%b.footprint.length;stones.triangle(rings[layer][i],rings[layer+1][i],rings[layer+1][j]);stones.triangle(rings[layer][i],rings[layer+1][j],rings[layer][j]);}
  }
  bake('snow-capped-granite-outcrops',stones,stone);
  const reserve=track.barriers.find(b=>b.id==='forest-reserve')!,cx=-8,cz=5,bank=new Geometry(),rim:Point[]=[];
  for(let i=0;i<reserve.footprint.length;i++){const a=reserve.footprint[i],b=reserve.footprint[(i+1)%reserve.footprint.length],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.5);for(let k=0;k<n;k++)rim.push({x:a.x+(b.x-a.x)*k/n,z:a.z+(b.z-a.z)*k/n});}
  const rings=[0,.8,2.8].map((inset,layer)=>rim.map((p,i)=>{const L=Math.hypot(cx-p.x,cz-p.z);return bank.vertex(p.x+(cx-p.x)/L*inset,layer===1?.5+.3*Math.sin(i*.9)**2:.06,p.z+(cz-p.z)/L*inset,hex(layer===1?art.powder:art.snow));}));
  for(let layer=0;layer<2;layer++)for(let i=0;i<rim.length;i++){const j=(i+1)%rim.length;bank.triangle(rings[layer][i],rings[layer+1][i],rings[layer+1][j]);bank.triangle(rings[layer][i],rings[layer+1][j],rings[layer][j]);}bake('forest-weathered-snow-bank',bank,caps);
  const details=tahoeDetails(scene,track,{wood,wall,roof,glass,steel,stone,red});
  for(const [z,y]of [[-.35,.32],[.35,.32],[0,.92]]){const log=MeshBuilder.CreateCylinder('fallen-forestry-log',{height:16,diameter:.64,tessellation:12},scene);log.rotation.z=Math.PI/2;log.position.set(68,y,z);log.material=wood;for(const side of [-1,1]){const end=MeshBuilder.CreateCylinder('fresh-cut-timber-end',{height:.025,diameter:.56,tessellation:12},scene);end.rotation.z=Math.PI/2;end.position.set(68+side*8,y,z);end.material=wall;}}
  const weather=tahoeWeather(scene,track),pending={landscape:'snowy-tahoe'};scene.addPendingData(pending);
  const lateShadowCasters=new Promise<Mesh[]>(resolve=>scene.onAfterRenderObservable.addOnce(()=>{
    void import('./tahoe-forest').then(({tahoeForest})=>{
      if(scene.isDisposed){resolve([]);return;}
      const trees=bake('snow-laden-fir-forest',tahoeForest(layout.trees,layout.height),forest);trees.isPickable=false;trees.receiveShadows=true;trees.freezeWorldMatrix();
      const {mesh:hills}=buildTerrain('tahoe-snow-hills',scene,{extent:art.extent,cell:3,height(x,z){
        // Keep the hidden substrate just below the road skin; this avoids
        // competing triangles between the world grid and the curved ribbon.
        return layout.height(x,z)-1*(1-smoothstep(7,10,layout.distance(x,z)));
      },color(x,z,h,slope){
        const shade=smoothstep(4,72,h)*.18+Math.min(.4,slope*.23),noise=Math.max(0,fbm2(x/24,z/24,3))*.065;
        return mix(hex('#ffffff'),hex('#9bb0c5'),shade+noise);
      }},snow);groundSurface.setGrid({p:hills.getVerticesData(VertexBuffer.PositionKind)!,indices:hills.getIndices()!,minX:art.extent.minX,minZ:art.extent.minZ,cell:3,cols:Math.ceil((art.extent.maxX-art.extent.minX)/3)+1,rows:Math.ceil((art.extent.maxZ-art.extent.minZ)/3)+1});hills.isPickable=false;hills.receiveShadows=true;hills.freezeWorldMatrix();base.setEnabled(false);scene.removePendingData(pending);resolve([trees,details.moving]);
    }).catch(()=>{if(!scene.isDisposed)scene.removePendingData(pending);resolve([]);});
  }));
  return{groundSurface,shadowCasterMaterials:casters,lateShadowCasters,refinements:['three main-road snow jumps','surface-fitted tyres and shadows','slippery packed snow','detailed rental and rescue chalets','moving ski lift','dense gusting snow and drifting powder','snow-laden firs and granite'],update(time:number,reduced:boolean){waterTexture.uOffset=reduced?0:time*.001;weather.update(time,reduced);details.update(time,reduced);}};
}
