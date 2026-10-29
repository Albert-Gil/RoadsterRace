import{expect,test}from'vitest';
import{yosemiteTrack as track}from'../../src/core/tracks/yosemite';
import{insideBarrier}from'../../src/core/barriers';
import{edgeDistance}from'../../src/presentation/landscape/mesh';
import{yosemiteGranitePoint}from'../../src/presentation/yosemite-granite';
import{waterfallPoint,yosemiteWaterfallSites}from'../../src/presentation/yosemite-waterfall-shape';
import{waterfallBasin,waterfallCurtains}from'../../src/presentation/yosemite-waterfall';

test('Yosemite waterfalls descend through clear air from a real stone lip',()=>{
 const sites=yosemiteWaterfallSites(track);expect(sites[0].lip.y-sites[0].impact.y).toBeGreaterThan(35);
 for(const site of sites){
  const b=site.barrier,c={x:b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,z:b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length};
  for(let i=1;i<19;i++){
   const p=waterfallPoint(site,i/20),q=waterfallPoint(site,(i+1)/20);expect(q.y).toBeLessThan(p.y);
   const angle=Math.atan2(p.z-c.z,p.x-c.x),fraction=(p.y-(b.baseHeight??0))/b.height;
   if(fraction>0){const skin=yosemiteGranitePoint(b,fraction,angle);expect(Math.hypot(p.x-c.x,p.z-c.z)-Math.hypot(skin.x-c.x,skin.z-c.z)).toBeGreaterThan(.03);}
  }
 }
});

test('plunge basin and its stone rim stay within the existing protected granite parcel',()=>{
 const site=yosemiteWaterfallSites(track)[0],basin=waterfallBasin(site);
 for(const g of[basin.water,basin.rim])for(let i=0;i<g.positions.length;i+=3){
  const p={x:g.positions[i],z:g.positions[i+2]};expect(insideBarrier(p,site.barrier)||edgeDistance(p,site.barrier.footprint)<.001).toBe(true);
  expect(g.positions[i+1]).toBeGreaterThanOrEqual(site.barrier.baseHeight??0);
 }
});

test('falling sheets remain a small finite batch with visible breaks and longitudinal flow UVs',()=>{
 const {geometry:g,uvs}=waterfallCurtains(yosemiteWaterfallSites(track));
 expect(g.triangleCount).toBeLessThan(2500);expect(uvs.length).toBe(g.vertexCount*2);
 expect([...g.positions,...g.colors,...uvs,...g.toVertexData().normals!].every(Number.isFinite)).toBe(true);
 expect(Math.max(...g.positions.filter((_,i)=>i%3===1))-Math.min(...g.positions.filter((_,i)=>i%3===1))).toBeGreaterThan(40);
});
