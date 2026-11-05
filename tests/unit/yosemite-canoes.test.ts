import {test,expect} from 'vitest';
import {yosemiteTrack as track} from '../../src/core/tracks/yosemite';
import {yosemiteRivers} from '../../src/core/tracks/yosemite-water';
import {insideBarrier} from '../../src/core/barriers';
import {yosemiteCanoes} from '../../src/presentation/yosemite-river-life';
import {jumpCoordinates} from '../../src/core/support';
import {transformPoint} from '../../src/presentation/landscape/mesh';

test('canoes and paddles fit wholly inside the main river, clear of solid footprints and jumps',()=>{
 const river=yosemiteRivers(track).find(r=>r.id==='bridalveil-creek')!,boats=yosemiteCanoes(track);expect(boats).toHaveLength(3);
 for(const boat of boats){
  expect(boat.level).toBe(river.level);
  for(let i=0;i<boat.geometry.vertexCount;i++){
   const p=boat.geometry.positions.slice(i*3,i*3+3),[x,,z]=transformPoint(p[0],p[1],p[2],{...boat.position,y:boat.level,heading:boat.heading}),point={x,z};
   expect(insideBarrier(point,{id:river.id,height:0,footprint:river.footprint})).toBe(true);
   expect(track.barriers.some(b=>insideBarrier(point,b))).toBe(false);
   for(const j of track.jumps!){const c=jumpCoordinates(point,j);expect(c.along< -j.rampLength-5||c.along>j.corridorLength+5||Math.abs(c.across)>j.width/2+5).toBe(true);}
  }
 }
});

test('open canoes remain bounded native geometry with two independently moving paddles',()=>{
 for(const boat of yosemiteCanoes(track)){
  const g=boat.geometry;expect(g.triangleCount).toBeLessThan(1000);expect(boat.paddles).toHaveLength(2);
  expect([...g.positions,...g.colors,...g.normals!].every(Number.isFinite)).toBe(true);
  expect(g.colors.some((v,i)=>i%4===0&&v>.8)).toBe(true);
  // Water-level wake faces must light from above rather than turning into dark dashes.
  const wake=Array.from({length:g.vertexCount},(_,i)=>i).filter(i=>Math.abs(g.positions[i*3+1]-.012)<1e-9);
  expect(wake.length).toBeGreaterThan(20);for(const i of wake)expect(g.normals![i*3+1]).toBeGreaterThan(.9);
 }
});
