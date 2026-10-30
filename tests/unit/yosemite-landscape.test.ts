import{expect,test}from'vitest';import{NullEngine}from'@babylonjs/core/Engines/nullEngine';import{Scene}from'@babylonjs/core/scene';import{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';import{yosemiteTrack as track}from'../../src/core/tracks/yosemite';import{buildYosemiteLandscape}from'../../src/presentation/yosemite-landscape';import{RenderedSurface}from'../../src/presentation/rendered-surface';import{insideBarrier}from'../../src/core/barriers';import{edgeDistance}from'../../src/presentation/landscape/mesh';import{projectToPolyline,cumulative}from'../../src/core/geometry';

test('Yosemite landscape is finite, batched, grounded and contained by its authored footprints',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),mat=(name:string)=>new StandardMaterial(name,scene),surface=new RenderedSurface();
 try{
  const meshes=buildYosemiteLandscape(scene,track,{meadow:mat('meadow'),stone:mat('stone'),forest:mat('forest'),detail:mat('detail')},surface);
  expect(meshes).toHaveLength(3);for(const mesh of meshes){const p=mesh.getVerticesData('position')!;expect(p.length).toBeGreaterThan(0);for(const v of p)expect(Number.isFinite(v)).toBe(true);}
  const land=scene.getMeshByName('yosemite-valley-hills')!,landPositions=land.getVerticesData('position')!,landColors=land.getVerticesData('color')!,landNormals=land.getVerticesData('normal')!;
  let skirtColor:number[]|undefined,skirtVertices=0;
  for(let i=0;i<landPositions.length;i+=3)if(landPositions[i]<-280||landPositions[i]>300||landPositions[i+2]<-220||landPositions[i+2]>320){
   const c=i/3*4,color=[landColors[c],landColors[c+1],landColors[c+2]];skirtColor??=color;expect(color).toEqual(skirtColor);expect(landNormals[i+1]).toBeCloseTo(1,6);skirtVertices++;
  }
  expect(skirtVertices).toBeGreaterThan(500);
  const rocks=meshes[0].getVerticesData('position')!,barriers=track.barriers.filter(b=>b.kind==='rock');
  // A welded summit shares its normal across the crown; split poles create radial lighting seams.
  const capitan=barriers.find(b=>b.id==='el-capitan-granite')!,top=(capitan.baseHeight??0)+capitan.height,peaks:number[]=[];
  for(let i=0;i<rocks.length;i+=3)if(Math.abs(rocks[i+1]-top)<.0001&&insideBarrier({x:rocks[i],z:rocks[i+2]},capitan))peaks.push(i/3);
  expect(peaks).toHaveLength(1);expect(meshes[0].getVerticesData('normal')![peaks[0]*3+1]).toBeGreaterThan(.98);
  for(let i=0;i<rocks.length;i+=3){const p={x:rocks[i],z:rocks[i+2]},matches=barriers.filter(b=>insideBarrier(p,b)||edgeDistance(p,b.footprint)<.001);expect(matches.length).toBeGreaterThan(0);expect(matches.some(b=>rocks[i+1]>=(b.baseHeight??0)-.001&&rocks[i+1]<=(b.baseHeight??0)+b.height+.001)).toBe(true);}
  const trees=meshes[1].metadata.placements;expect(trees.length).toBeGreaterThan(360);
  // Branches and the undersides of clumped foliage legitimately face downward.
  const normals=meshes[1].getVerticesData('normal')!;expect(normals.every(Number.isFinite)).toBe(true);
  expect(meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0)).toBeLessThan(600000);
  for(const t of trees){const parcel=track.barriers.find(b=>b.kind==='infield'&&insideBarrier(t,b));
   if(parcel){for(let i=0;i<8;i++){const a=i*Math.PI/4,p={x:t.x+Math.cos(a)*t.height*.24,z:t.z+Math.sin(a)*t.height*.24};expect(insideBarrier(p,parcel)).toBe(true);}}
   else {let gap=projectToPolyline(t,track.centerline,track.distances).distance;for(const h of track.hopShortcuts??[])gap=Math.min(gap,projectToPolyline(t,h.branch,cumulative(h.branch)).distance);expect(gap).toBeGreaterThanOrEqual(24+t.height*1.1);}
  }
 }finally{scene.dispose();engine.dispose();}
},90000);
