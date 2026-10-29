import{Mesh}from'@babylonjs/core/Meshes/mesh';import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';import type{Scene}from'@babylonjs/core/scene';import type{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';import type{TrackDefinition}from'../core/types';import{terrainElevation}from'../core/elevation';import{insideBarrier}from'../core/barriers';import{supported}from'../core/support';import{buildTerrain,courseDistance}from'./landscape/terrain';import{Geometry,hex,mix,edgeDistance}from'./landscape/mesh';import{fbm2,smoothstep}from'./landscape/noise';import{yosemiteAppearance as art}from'./themes';import{yosemiteGranitePoint}from'./yosemite-granite';import type{RenderedSurface}from'./rendered-surface';
import{yosemiteMeadowColor}from'./yosemite-surfaces';
import{waterfallFaceWeight}from'./yosemite-waterfall-shape';

/** Native, vertex-coloured cliffs and forest, generated in a lazy chunk after frame one. */
export function buildYosemiteLandscape(scene:Scene,track:TrackDefinition,m:{meadow:StandardMaterial;stone:StandardMaterial;forest:StandardMaterial;detail:StandardMaterial},surface:RenderedSurface){
 const D=courseDistance(track,art.extent,4),height=(x:number,z:number)=>terrainElevation({x,z},track),bake=(name:string,g:Geometry,material:StandardMaterial)=>{const mesh=new Mesh(name,scene),v=g.toVertexData();v.uvs=Array.from({length:g.vertexCount},(_,i)=>[g.positions[i*3]/12,g.positions[i*3+2]/12]).flat();v.applyToMesh(mesh);mesh.material=material;mesh.isPickable=false;mesh.receiveShadows=true;mesh.freezeWorldMatrix();return mesh;};
 const{mesh:land}=buildTerrain('yosemite-valley-hills',scene,{extent:art.extent,cell:4,height(x,z){if(!supported({x,z},track))return-3;return height(x,z)-(1-smoothstep(7,10,D(x,z)))*.8;},color:yosemiteMeadowColor},m.meadow);
 m.meadow.diffuseColor.setAll(1);
 const cols=Math.ceil((art.extent.maxX-art.extent.minX)/4)+1,rows=Math.ceil((art.extent.maxZ-art.extent.minZ)/4)+1;surface.setGrid({p:land.getVerticesData(VertexBuffer.PositionKind)!,indices:land.getIndices()!,minX:art.extent.minX,minZ:art.extent.minZ,cell:4,cols,rows});land.isPickable=false;land.receiveShadows=true;land.freezeWorldMatrix();
 const granite=new Geometry();
 for(const b of track.barriers.filter(b=>b.kind==='rock')){
  const columns=b.height>20?96:40,layers=b.height>20?40:12;
  const summit=yosemiteGranitePoint(b,1,0),pole=granite.vertex(summit.x,summit.y,summit.z,hex(art.granite[2]));
  const rings=Array.from({length:layers+1},(_,k)=>k===layers?Array<number>(columns).fill(pole):Array.from({length:columns},(_,i)=>{
   const t=k/layers,angle=i/columns*Math.PI*2,p=yosemiteGranitePoint(b,t,angle),grain=fbm2(p.x*.3,p.y*.35+p.z*.08,3),streak=Math.pow(.5+.5*Math.sin(angle*19+.22*Math.sin(t*6)),10);
   let color=mix(hex(art.granite[0]),hex(art.granite[2]),Math.min(.88,Math.max(.1,.4+t*.24+grain*.28)));
   color=mix(color,hex(art.granite[3]),streak*.36*(1-smoothstep(.65,.9,t))+Math.max(0,-grain)*.2);
   color=mix(color,hex(art.lichen),(1-smoothstep(0,.24,t))*(.14+.12*Math.sin(angle*7)**2));
   color=mix(color,hex(art.waterfall.wetRock),waterfallFaceWeight(b,angle)*(1-smoothstep(.72,.84,t))*.5);
   return granite.vertex(p.x,p.y,p.z,color);
  }));
  for(let k=0;k<layers;k++)for(let i=0;i<columns;i++){const j=(i+1)%columns;granite.triangle(rings[k][i],rings[k+1][j],rings[k+1][i]);granite.triangle(rings[k][i],rings[k][j],rings[k+1][j]);}
 }
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
 } const forest=new Geometry(),cone=(x:number,y:number,z:number,r:number,h:number,c:ReturnType<typeof hex>,n=10)=>{
  const rings=[1,.66,.27,0].map((radius,k)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,rough=1+.1*Math.sin(i*2.3+x),t=k/3,color=mix(c,hex(art.forestLight),t*.25);return forest.vertex(x+Math.sin(a)*r*rough*radius,y+h*t,z+Math.cos(a)*r*rough*radius,color);}));
  for(let k=0;k<3;k++)for(let i=0;i<n;i++){const j=(i+1)%n;forest.triangle(rings[k][i],rings[k+1][i],rings[k][j]);forest.triangle(rings[k][j],rings[k+1][i],rings[k+1][j]);}
 };
 for(const[i,t]of trees.entries()){
  const y=height(t.x,t.z)-.25,h=t.height;cone(t.x,y,t.z,h*.028,h*.76,hex(art.bark),7);
  for(let layer=0;layer<5;layer++)cone(t.x+Math.sin(i+layer*.6)*h*.018,y+h*(.18+layer*.13),t.z+Math.cos(i)*h*.012,h*(.22-layer*.034),h*(.39-layer*.026),hex((i+layer)%4?art.forest:art.forestLight),9);
 }
 const woods=bake('yosemite-ponderosa-forest',forest,m.forest);woods.metadata={treeCount:trees.length,roadClearance:24,placements:trees};
 const groundDetail=new Geometry();
 for(let i=0;i<240;i++){
  const x=-150+rand()*300,z=-110+rand()*260,p={x,z};if(D(x,z)<24||!supported(p,track)||track.barriers.some(b=>insideBarrier(p,b)))continue;
  const y=height(x,z),r=.18+rand()*.4,c=hex(i%5===0?'#e5c66c':'#677f4e'),a=groundDetail.vertex(x-r,y+.03,z,c),b=groundDetail.vertex(x+r,y+.03,z,c),tip=groundDetail.vertex(x,y+.45,z+r,c);groundDetail.triangle(a,tip,b);
 }
 const flowers=bake('yosemite-meadow-wildflowers',groundDetail,m.detail);
 land.metadata={authoritativeTerrain:true,cosmeticMeadowPatches:true};cliffs.metadata={formations:track.barriers.filter(b=>b.kind==='rock').length,weatheredSkin:true};
 return[cliffs,woods,flowers];
}
