import{Mesh}from'@babylonjs/core/Meshes/mesh';import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';import type{Scene}from'@babylonjs/core/scene';import type{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';import type{TrackDefinition}from'../core/types';import{terrainElevation}from'../core/elevation';import{insideBarrier}from'../core/barriers';import{supported}from'../core/support';import{buildTerrain,courseDistance}from'./landscape/terrain';import{Geometry,hex,mix,edgeDistance}from'./landscape/mesh';import{fbm2,smoothstep}from'./landscape/noise';import{yosemiteAppearance as art}from'./themes';import{yosemiteGeology}from'./yosemite-geology';import{yosemiteTreeTemplates,yosemiteUndergrowth}from'./yosemite-forest';import type{RenderedSurface}from'./rendered-surface';
import{yosemiteMeadowColor}from'./yosemite-surfaces';


/** Native, vertex-coloured cliffs and forest, generated in a lazy chunk after frame one. */
export function buildYosemiteLandscape(scene:Scene,track:TrackDefinition,m:{meadow:StandardMaterial;stone:StandardMaterial;forest:StandardMaterial;detail:StandardMaterial},surface:RenderedSurface){
 const D=courseDistance(track,art.extent,4),height=(x:number,z:number)=>terrainElevation({x,z},track),bake=(name:string,g:Geometry,material:StandardMaterial)=>{const mesh=new Mesh(name,scene),v=g.toVertexData();v.uvs=Array.from({length:g.vertexCount},(_,i)=>[g.positions[i*3]/12,g.positions[i*3+2]/12]).flat();v.applyToMesh(mesh);mesh.material=material;mesh.isPickable=false;mesh.receiveShadows=true;mesh.freezeWorldMatrix();return mesh;};
 const{mesh:land}=buildTerrain('yosemite-valley-hills',scene,{extent:art.extent,cell:4,height(x,z){if(!supported({x,z},track))return-3;return height(x,z)-(1-smoothstep(7,10,D(x,z)))*.8;},color:yosemiteMeadowColor},m.meadow);
 // The distant extension has very long triangles. Fade its border to one quiet
 // meadow tone and up-normal so copied edge patches cannot become radial stripes.
 // This changes only colours/normals, far outside the entire driving corridor.
 const landPositions=land.getVerticesData(VertexBuffer.PositionKind)!,landColors=land.getVerticesData(VertexBuffer.ColorKind)!,landNormals=land.getVerticesData(VertexBuffer.NormalKind)!,horizon=mix(hex(art.meadow),hex(art.dryMeadow),.35);
 for(let i=0;i<landPositions.length;i+=3){
  const x=landPositions[i],z=landPositions[i+2],edge=Math.min(x-art.extent.minX,art.extent.maxX-x,z-art.extent.minZ,art.extent.maxZ-z),fade=1-smoothstep(0,26,edge);if(!fade)continue;
  const c=i/3*4;for(let j=0;j<3;j++)landColors[c+j]+=(horizon[j]-landColors[c+j])*fade;
  landNormals[i]*=1-fade;landNormals[i+1]+=(1-landNormals[i+1])*fade;landNormals[i+2]*=1-fade;
  const length=Math.hypot(landNormals[i],landNormals[i+1],landNormals[i+2])||1;for(let j=0;j<3;j++)landNormals[i+j]/=length;
 }
 land.setVerticesData(VertexBuffer.ColorKind,landColors);land.setVerticesData(VertexBuffer.NormalKind,landNormals);
 m.meadow.diffuseColor.setAll(1);
 const cols=Math.ceil((art.extent.maxX-art.extent.minX)/4)+1,rows=Math.ceil((art.extent.maxZ-art.extent.minZ)/4)+1;surface.setGrid({p:land.getVerticesData(VertexBuffer.PositionKind)!,indices:land.getIndices()!,minX:art.extent.minX,minZ:art.extent.minZ,cell:4,cols,rows});land.isPickable=false;land.receiveShadows=true;land.freezeWorldMatrix();
 const granite=yosemiteGeology(track);
 const cliffs=bake('weathered-yosemite-granite',granite,m.stone);
 let seed=6923;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const trees:{x:number;z:number;height:number}[]=[];
 for(let i=0;i<18000&&trees.length<art.treeCount;i++){
  const x=-245+rand()*500,z=-160+rand()*430,h=art.treeHeight[0]+rand()*(art.treeHeight[1]-art.treeHeight[0]),p={x,z};
  if(!supported(p,track)||D(x,z)<26+h*1.1||track.barriers.some(b=>insideBarrier(p,b)))continue;
  trees.push({x,z,height:h});
 }
 for(const reserve of track.barriers.filter(b=>b.kind==='infield')){
  const xs=reserve.footprint.map(p=>p.x),zs=reserve.footprint.map(p=>p.z);
  for(let i=0;i<260;i++){const p={x:Math.min(...xs)+rand()*(Math.max(...xs)-Math.min(...xs)),z:Math.min(...zs)+rand()*(Math.max(...zs)-Math.min(...zs))},h=4.5+rand()*5.5,r=h*.27;
   if(!insideBarrier(p,reserve)||edgeDistance(p,reserve.footprint)<r||track.barriers.filter(b=>b!==reserve).some(b=>insideBarrier(p,b)||edgeDistance(p,b.footprint)<r+.4))continue;
   if(trees.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<(t.height+h)*.16))continue;
   trees.push({...p,height:h});
  }
 }
 const forest=new Geometry(),templates=yosemiteTreeTemplates();
 for(const[i,t]of trees.entries())forest.instance(templates[i%templates.length],{x:t.x,y:height(t.x,t.z)-.05,z:t.z,scale:t.height,heading:i*2.39996});
 const woods=bake('yosemite-ponderosa-forest',forest,m.forest);woods.metadata={treeCount:trees.length,roadClearance:24,placements:trees};
 const groundDetail=new Geometry();
 let patches=0;
 for(let i=0;i<5000&&patches<1400;i++){
  const x=-185+rand()*370,z=-155+rand()*370,p={x,z};if(D(x,z)<24||!supported(p,track)||track.barriers.some(b=>insideBarrier(p,b)))continue;
  yosemiteUndergrowth(groundDetail,x,height(x,z),z,.35+rand()*.85,i);patches++;
 }
 for(const reserve of track.barriers.filter(b=>b.kind==='infield')){
  const xs=reserve.footprint.map(p=>p.x),zs=reserve.footprint.map(p=>p.z);
  for(let i=0;i<120;i++){
   const p={x:Math.min(...xs)+rand()*(Math.max(...xs)-Math.min(...xs)),z:Math.min(...zs)+rand()*(Math.max(...zs)-Math.min(...zs))};
   if(!insideBarrier(p,reserve)||edgeDistance(p,reserve.footprint)<1.4||track.barriers.some(b=>b!==reserve&&insideBarrier(p,b)))continue;
   yosemiteUndergrowth(groundDetail,p.x,height(p.x,p.z),p.z,.4+rand()*.5,i);
  }
 }
 const flowers=bake('yosemite-meadow-wildflowers',groundDetail,m.detail);
 land.metadata={authoritativeTerrain:true,cosmeticMeadowPatches:true};cliffs.metadata={formations:track.barriers.filter(b=>b.kind==='rock').length,weatheredSkin:true};
 return[cliffs,woods,flowers];
}
