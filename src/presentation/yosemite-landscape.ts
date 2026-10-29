import{Mesh}from'@babylonjs/core/Meshes/mesh';import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';import type{Scene}from'@babylonjs/core/scene';import type{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';import type{TrackDefinition,Point}from'../core/types';import{terrainElevation}from'../core/elevation';import{insideBarrier}from'../core/barriers';import{supported}from'../core/support';import{buildTerrain,courseDistance}from'./landscape/terrain';import{Geometry,hex,mix,edgeDistance}from'./landscape/mesh';import{fbm2,smoothstep}from'./landscape/noise';import{yosemiteAppearance as art}from'./themes';import type{RenderedSurface}from'./rendered-surface';

/** Native, vertex-coloured cliffs and forest, generated in a lazy chunk after frame one. */
export function buildYosemiteLandscape(scene:Scene,track:TrackDefinition,m:{meadow:StandardMaterial;stone:StandardMaterial;forest:StandardMaterial;detail:StandardMaterial},surface:RenderedSurface){
 const D=courseDistance(track,art.extent,4),height=(x:number,z:number)=>terrainElevation({x,z},track),bake=(name:string,g:Geometry,material:StandardMaterial)=>{const mesh=new Mesh(name,scene),v=g.toVertexData();v.uvs=Array.from({length:g.vertexCount},(_,i)=>[g.positions[i*3]/12,g.positions[i*3+2]/12]).flat();v.applyToMesh(mesh);mesh.material=material;mesh.isPickable=false;mesh.receiveShadows=true;mesh.freezeWorldMatrix();return mesh;};
 const{mesh:land}=buildTerrain('yosemite-valley-hills',scene,{extent:art.extent,cell:4,height(x,z){if(!supported({x,z},track))return-3;return height(x,z)-(1-smoothstep(7,10,D(x,z)))*.8;},color(x,z,h,slope){const noise=fbm2(x/23,z/23,3)*.08;return mix(hex('#ffffff'),hex('#afb49e'),Math.min(.65,Math.max(0,slope*.4+h/130+noise)));}},m.meadow);
 const cols=Math.ceil((art.extent.maxX-art.extent.minX)/4)+1,rows=Math.ceil((art.extent.maxZ-art.extent.minZ)/4)+1;surface.setGrid({p:land.getVerticesData(VertexBuffer.PositionKind)!,indices:land.getIndices()!,minX:art.extent.minX,minZ:art.extent.minZ,cell:4,cols,rows});land.isPickable=false;land.receiveShadows=true;land.freezeWorldMatrix();
 const granite=new Geometry();
 for(const b of track.barriers.filter(b=>b.kind==='rock')){
  const cx=b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,cz=b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length,rim:Point[]=[];
  for(let i=0;i<b.footprint.length;i++){const a=b.footprint[i],q=b.footprint[(i+1)%b.footprint.length];for(let j=0;j<4;j++)rim.push({x:a.x+(q.x-a.x)*j/4,z:a.z+(q.z-a.z)*j/4});}
  const layers=b.height>20?24:7,rings=Array.from({length:layers+1},(_,k)=>rim.map((p,i)=>{const t=k/layers,scale=k===layers?0:t<.78?1-.18*Math.pow(t/.78,.8):.82*Math.cos((t-.78)/.22*Math.PI/2),x=cx+(p.x-cx)*scale,z=cz+(p.z-cz)*scale,y=(b.baseHeight??0)+b.height*t*(k===layers?1:.985+.012*Math.sin(i*.73+k*.18)),vein=.5+.5*Math.sin(i*.51+Math.sin(t*26)*.18),color=mix(hex(art.granite[0]),hex(art.granite[2]),.25+vein*.38);return granite.vertex(x,y,z,color);}));
  for(let k=0;k<layers;k++)for(let i=0;i<rim.length;i++){const j=(i+1)%rim.length;granite.triangle(rings[k][i],rings[k+1][j],rings[k+1][i]);granite.triangle(rings[k][i],rings[k][j],rings[k+1][j]);}
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
 } const forest=new Geometry(),cone=(x:number,y:number,z:number,r:number,h:number,c:ReturnType<typeof hex>,n=10)=>{const peak=forest.vertex(x,y+h,z,mix(c,hex('#99ad72'),.15)),ring=Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,rough=1+.11*Math.sin(i*2.3+x);return forest.vertex(x+Math.sin(a)*r*rough,y+Math.sin(i+x)*.07*h,z+Math.cos(a)*r*rough,c);});for(let i=0;i<n;i++)forest.triangle(ring[i],peak,ring[(i+1)%n]);};
 for(const[i,t]of trees.entries()){
  const y=height(t.x,t.z)-.25,h=t.height;cone(t.x,y,t.z,h*.028,h*.76,hex(art.bark),7);
  for(let layer=0;layer<5;layer++)cone(t.x+Math.sin(i)*h*.018,y+h*(.2+layer*.13),t.z,h*(.21-layer*.032),h*(.35-layer*.018),hex((i+layer)%3?art.forest:art.forestLight));
 }
 const woods=bake('yosemite-ponderosa-forest',forest,m.forest);woods.metadata={treeCount:trees.length,roadClearance:24,placements:trees};
 const groundDetail=new Geometry();
 for(let i=0;i<240;i++){
  const x=-150+rand()*300,z=-110+rand()*260,p={x,z};if(D(x,z)<24||!supported(p,track)||track.barriers.some(b=>insideBarrier(p,b)))continue;
  const y=height(x,z),r=.18+rand()*.4,c=hex(i%5===0?'#e5c66c':'#677f4e'),a=groundDetail.vertex(x-r,y+.03,z,c),b=groundDetail.vertex(x+r,y+.03,z,c),tip=groundDetail.vertex(x,y+.45,z+r,c);groundDetail.triangle(a,tip,b);
 }
 const flowers=bake('yosemite-meadow-wildflowers',groundDetail,m.detail);
 return[cliffs,woods,flowers];
}
