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
import{Geometry,hex,rayToEdge}from'./landscape/mesh';
import{RenderedSurface}from'./rendered-surface';
import{surfaceTexture}from'./textures';
import{yosemiteAppearance as art,type PresentationTheme}from'./themes';
import{yosemiteAtmosphere}from'./yosemite-atmosphere';

/** Terrain and footprints come from core; all dressing and animation remain cosmetic. */
export function buildYosemite(scene:Scene,track:TrackDefinition,theme:PresentationTheme,materials:Map<string,StandardMaterial>){
 const groundSurface=new RenderedSurface(),casters=new Set<StandardMaterial>();
 const mat=(role:string,color:string,shadow=false)=>{const m=new StandardMaterial(role,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.setAll(.035);m.backFaceCulling=false;materials.set(role,m);if(shadow)casters.add(m);return m;};
 const meadow=mat('terrain',art.meadow),road=mat('asphalt',art.road),shoulder=mat('shoulder',art.shoulder),stone=mat('yosemite-granite','#ffffff',true),forest=mat('yosemite-forest','#ffffff',true);
 const wood=mat('yosemite-timber',art.timber,true),roof=mat('yosemite-roofs',art.roof,true),glass=mat('yosemite-windows',art.window),detail=mat('yosemite-details','#ffffff',true);
 forest.twoSidedLighting=true;
 const roadTexture=surfaceTexture(scene,'gravel');road.diffuseTexture=roadTexture;wood.diffuseTexture=surfaceTexture(scene,'timber');
 const h=(x:number,z:number)=>terrainElevation({x,z},track);
 const ribbon=(name:string,path:Point[],width:number,offset:number,m:StandardMaterial)=>{
  const[a,b]=roadEdges(path,width,false),steps=Math.ceil(width/1.5),rows=Array.from({length:steps+1},(_,i)=>a.map((p,j)=>{const t=i/steps,x=p.x+(b[j].x-p.x)*t,z=p.z+(b[j].z-p.z)*t;return new Vector3(x,h(x,z)+offset,z);}));
  const mesh=MeshBuilder.CreateRibbon(name,{pathArray:rows,sideOrientation:Mesh.DOUBLESIDE},scene);mesh.material=m;
  const positions=mesh.getVerticesData(VertexBuffer.PositionKind)!,uvs:number[]=[];for(let i=0;i<positions.length;i+=3)uvs.push(positions[i]/14,positions[i+2]/14);mesh.setVerticesData(VertexBuffer.UVKind,uvs);groundSurface.add(positions,mesh.getIndices()!,true);return mesh;
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
 const box=(name:string,x:number,y:number,z:number,w:number,hh:number,d:number,m:StandardMaterial)=>{const b=MeshBuilder.CreateBox(name,{width:w,height:hh,depth:d},scene);b.position.set(x,y,z);b.material=m;return b;};
 for(const b of track.barriers.filter(b=>b.kind==='building')){
  const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs),y=b.baseHeight??0;
  box('ranger-stone-foundation',x,y+.25,z,w,.5,d,stone);box('ranger-timber-lodge',x,y+b.height*.42,z,w,b.height*.76,d,wood);
  for(const side of[-1,1]){const rr=box('pitched-cabin-roof',x+side*w*.255,y+b.height*.88,z,w*.6,.35,d+.7,roof);rr.rotation.z=-side*.36;}
  for(let dx=-w*.3;dx<w*.4;dx+=w*.3)for(const side of[-1,1])box('cabin-window',x+dx,y+b.height*.44,z+side*(d/2+.02),1.35,1.3,.06,glass);
  box('cabin-door',x+w/2+.03,y+1.2,z,.06,2.1,1.2,roof);
 }
 // A fallen cedar has the same full-width footprint as its physical Hop obstacle.
 const log=track.barriers.find(b=>b.id==='yosemite-fallen-cedar')!,xs=log.footprint.map(p=>p.x),cx=(Math.min(...xs)+Math.max(...xs))/2;
 const cedar=MeshBuilder.CreateCylinder('fallen-cedar',{height:16,diameter:1.3,tessellation:12},scene);cedar.rotation.z=Math.PI/2;cedar.position.set(cx,.9,20);cedar.material=wood;
 for(const side of[-1,1]){const end=MeshBuilder.CreateCylinder('cedar-growth-rings',{height:.025,diameter:1.15,tessellation:12},scene);end.rotation.z=Math.PI/2;end.position.set(cx+side*8,.9,20);end.material=shoulder;}
 // Small grounded campground details stay inside the protected conservation parcel.
 for(const[x,z]of[[-36,-17],[-37,12],[-38,34]]){box('picnic-table',x,.85,z,3.2,.15,1.5,wood);for(const side of[-1,1]){box('picnic-bench',x,.5,z+side*1.2,3.2,.15,.5,wood);box('picnic-legs',x+side*1,.4,z,.16,.8,2.6,roof);}}
 const water=mat('water',art.water);water.reflectionTexture=scene.environmentTexture;water.specularColor.setAll(.4);water.specularPower=110;
 const waterTexture=surfaceTexture(scene,'water');waterTexture.uScale=3;waterTexture.vScale=14;water.diffuseTexture=waterTexture;
 const creek=track.waterOpenings![0].footprint,g=new Geometry(),rim=creek.map(p=>g.vertex(p.x,-2.4,p.z,hex('#ffffff')));
 for(const[a,b,c]of[[0,1,2],[0,2,5],[5,2,3],[5,3,4]])g.triangle(rim[a],rim[b],rim[c]);
 const stream=new Mesh('bridalveil-flowing-creek',scene),v=g.toVertexData();v.normals=Array.from({length:g.vertexCount},()=>[0,1,0]).flat();v.uvs=Array.from({length:g.vertexCount},(_,i)=>[g.positions[i*3]/10,g.positions[i*3+2]/10]).flat();v.applyToMesh(stream);stream.material=water;
 const fall=mat('yosemite-waterfall',art.foam);fall.alpha=.75;fall.diffuseTexture=waterTexture;fall.metadata={roadsterOverlay:true};
 for(const[dx,width]of[[-2,1.3],[0,1.8],[1.7,.8]]){const f=MeshBuilder.CreateRibbon('bridalveil-waterfall',{pathArray:[[new Vector3(15+dx-width/2,15,25),new Vector3(15+dx-width/2,-2.3,19.8)],[new Vector3(15+dx+width/2,15,25),new Vector3(15+dx+width/2,-2.3,19.8)]],sideOrientation:Mesh.DOUBLESIDE},scene);f.material=fall;}
 const monolith=track.barriers.find(b=>b.id==='el-capitan-granite')!,origin={x:monolith.footprint.reduce((s,p)=>s+p.x,0)/monolith.footprint.length,z:monolith.footprint.reduce((s,p)=>s+p.z,0)/monolith.footprint.length};
 for(const shift of[-.045,.05]){
  const paths=[-1,1].map(side=>Array.from({length:22},(_,i)=>{const t=.9*(1-i/21),angle=Math.PI/2+shift+side*.018,scale=t<.78?1-.18*Math.pow(t/.78,.8):.82*Math.cos((t-.78)/.22*Math.PI/2),r=rayToEdge(origin,angle,monolith.footprint)*scale+.4;return new Vector3(origin.x+Math.cos(angle)*r,(monolith.baseHeight??0)+monolith.height*t*.99+.1,origin.z+Math.sin(angle)*r);}));
  const cascade=MeshBuilder.CreateRibbon('granite-face-cascade',{pathArray:paths,sideOrientation:Mesh.DOUBLESIDE},scene);cascade.material=fall;
 }
 const atmosphere=yosemiteAtmosphere(scene,track),pending={landscape:'capitan-yosemite'};scene.addPendingData(pending);
 const lateShadowCasters=new Promise<Mesh[]>(resolve=>scene.onAfterRenderObservable.addOnce(()=>{
  void import('./yosemite-landscape').then(({buildYosemiteLandscape})=>{
   if(scene.isDisposed){resolve([]);return;}const built=buildYosemiteLandscape(scene,track,{meadow,stone,forest,detail},groundSurface);base.setEnabled(false);scene.removePendingData(pending);resolve(built);
  }).catch(()=>{if(!scene.isDisposed)scene.removePendingData(pending);resolve([]);});
 }));
 return{groundSurface,shadowCasterMaterials:casters,lateShadowCasters,refinements:['towering weathered granite','terrain-supported forest climbs','natural creek crossing','hidden fallen-cedar trail','flowing waterfall and valley mist','ranger lodges and campground'],update(time:number,reduced:boolean){waterTexture.vOffset=reduced?0:time*art.waterfall.speed*.08;atmosphere.update(time,reduced);}};
}
