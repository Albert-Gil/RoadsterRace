import{Mesh}from'@babylonjs/core/Meshes/mesh';
import{MeshBuilder}from'@babylonjs/core/Meshes/meshBuilder';
import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import{VertexData}from'@babylonjs/core/Meshes/mesh.vertexData';
import{Vector3}from'@babylonjs/core/Maths/math.vector';
import{Color3}from'@babylonjs/core/Maths/math.color';
import{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';
import{DynamicTexture}from'@babylonjs/core/Materials/Textures/dynamicTexture';
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
import{yosemiteGranitePoint}from'./yosemite-granite';
import{yosemiteDressing}from'./yosemite-dressing';
import{yosemiteMeadowColor}from'./yosemite-surfaces';

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
 // Subdivide the actual opening for depth colour and shoreline variation, not a rectangular lake.
 for(const[ia,ib,ic]of[[0,1,2],[0,2,5],[5,2,3],[5,3,4]]){
  const a=creek[ia],b=creek[ib],c=creek[ic],n=32,rows:number[][]=[];
  for(let i=0;i<=n;i++){
   const row:number[]=[];for(let j=0;j<=n-i;j++){
    const x=a.x+(b.x-a.x)*i/n+(c.x-a.x)*j/n,z=a.z+(b.z-a.z)*i/n+(c.z-a.z)*j/n;
    const depth=smoothstep(.2,3,edgeDistance({x,z},creek)),light=.5+.5*Math.sin(z*.35+x);
    row.push(g.vertex(x,-2.4,z,mix(hex(art.water),hex(art.waterDeep),Math.min(.88,depth*.75+light*.08))));
   }rows.push(row);
  }
  for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){g.triangle(rows[i][j],rows[i+1][j],rows[i][j+1]);if(j<n-i-1)g.triangle(rows[i][j+1],rows[i+1][j],rows[i+1][j+1]);}
 }
 const stream=new Mesh('bridalveil-flowing-creek',scene),v=g.toVertexData();v.normals=Array.from({length:g.vertexCount},()=>[0,1,0]).flat();v.uvs=Array.from({length:g.vertexCount},(_,i)=>[g.positions[i*3]/10,g.positions[i*3+2]/10]).flat();v.applyToMesh(stream);stream.material=water;
 const veil=new DynamicTexture('yosemite-waterfall-veil',{width:64,height:128},scene,true),ctx=veil.getContext() as CanvasRenderingContext2D,pixels=new ImageData(64,128);
 for(let y=0;y<128;y++)for(let x=0;x<64;x++){
  const u=x/63,flow=.68+.2*Math.sin(y*.31+x*.17)+.12*Math.sin(y*.81-x*.36),a=Math.pow(Math.sin(Math.PI*u),1.4)*flow,at=(y*64+x)*4;
  pixels.data[at]=pixels.data[at+1]=pixels.data[at+2]=255;pixels.data[at+3]=Math.max(0,a)*220;
 }
 ctx.putImageData(pixels,0,0);veil.hasAlpha=true;veil.vScale=3;veil.update();
 const fall=mat('yosemite-waterfall',art.foam);fall.alpha=.75;fall.diffuseTexture=veil;fall.useAlphaFromDiffuseTexture=true;fall.disableLighting=true;fall.emissiveColor=Color3.FromHexString(art.foam);fall.metadata={roadsterOverlay:true};
 for(const side of[-1,1]){
  const paths=[0,1].map(edge=>Array.from({length:64},(_,i)=>{const z=18-i*1.9,x=(side<0?10.35:17.65)+Math.sin(z*.22)*.12+side*edge*(.16+.1*Math.sin(z*.6));return new Vector3(x,-2.36,z);}));
  const foam=MeshBuilder.CreateRibbon('creek-shoreline-foam',{pathArray:paths,sideOrientation:Mesh.DOUBLESIDE},scene);foam.material=fall;
 }
 for(const[dx,width]of[[-2,1.3],[0,1.8],[1.7,.8]]){const f=MeshBuilder.CreateRibbon('bridalveil-waterfall',{pathArray:[[new Vector3(15+dx-width/2,15,25),new Vector3(15+dx-width/2,-2.3,19.8)],[new Vector3(15+dx+width/2,15,25),new Vector3(15+dx+width/2,-2.3,19.8)]],sideOrientation:Mesh.DOUBLESIDE},scene);f.material=fall;}
 const monolith=track.barriers.find(b=>b.id==='el-capitan-granite')!;
 for(const shift of[-.045,.05]){
  const paths=[-1,1].map(side=>Array.from({length:38},(_,i)=>{const t=.9*(1-i/37),angle=Math.PI/2+shift+side*.018,p=yosemiteGranitePoint(monolith,t,angle);return new Vector3(p.x+Math.cos(angle)*.13,p.y+.06,p.z+Math.sin(angle)*.13);}));
  const cascade=MeshBuilder.CreateRibbon('granite-face-cascade',{pathArray:paths,sideOrientation:Mesh.DOUBLESIDE},scene);cascade.material=fall;
 }
 const atmosphere=yosemiteAtmosphere(scene,track),pending={landscape:'capitan-yosemite'};scene.addPendingData(pending);
 const lateShadowCasters=new Promise<Mesh[]>(resolve=>scene.onAfterRenderObservable.addOnce(()=>{
  void import('./yosemite-landscape').then(({buildYosemiteLandscape})=>{
   if(scene.isDisposed){resolve([]);return;}const built=buildYosemiteLandscape(scene,track,{meadow,stone,forest,detail},groundSurface);base.setEnabled(false);scene.removePendingData(pending);resolve(built);
  }).catch(()=>{if(!scene.isDisposed)scene.removePendingData(pending);resolve([]);});
 }));
 return{groundSurface,shadowCasterMaterials:casters,lateShadowCasters,refinements:['sculpted granite with mineral seams and lichen','layered cedar and ponderosa forest','feathered packed-earth edges and worn paths','natural creek crossing','hidden fallen-cedar trail','flowing waterfall and valley mist','detailed timber lodges and campground'],update(time:number,reduced:boolean){waterTexture.vOffset=reduced?0:time*art.waterfall.speed*.08;veil.vOffset=reduced?0:time*art.waterfall.speed;atmosphere.update(time,reduced);}};
}
