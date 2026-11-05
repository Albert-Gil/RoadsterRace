import {expect,test} from 'vitest';
import {yosemiteTrack as track} from '../../src/core/tracks/yosemite';
import {yosemiteRivers,yosemiteLakes,yosemiteLakePoint} from '../../src/core/tracks/yosemite-water';
import {insideBarrier} from '../../src/core/barriers';
import {yosemiteWaterfallSites} from '../../src/presentation/yosemite-waterfall-shape';
import {yosemiteAppearance} from '../../src/presentation/themes';
import {yosemiteBankGround} from '../../src/presentation/yosemite-creek-bank';
const rivers=yosemiteRivers(track),lakes=yosemiteLakes(track),sites=yosemiteWaterfallSites(track);
const inside=(p:{x:number;z:number},b:{id:string;footprint:{x:number;z:number}[]})=>insideBarrier(p,{...b,height:0});

test('all rivers begin in an interior headwater and flow out beyond the valley map',()=>{
 const e=yosemiteAppearance.extent,inMap=(p:{x:number;z:number})=>p.x>e.minX&&p.x<e.maxX&&p.z>e.minZ&&p.z<e.maxZ;
 expect(rivers).toHaveLength(3);
 for(const river of rivers){
  expect(inMap(river.path[0]),river.id).toBe(true);expect(inMap(river.path.at(-1)!),river.id).toBe(false);
  expect(lakes.some(l=>inside(river.path[0],l)),`${river.id} headwater`).toBe(true);
  expect(river.path.length).toBeGreaterThan(100);expect(river.footprint.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z))).toBe(true);
 }
});

test('six substantial waterfalls end inside real receiving waters at their actual surface height',()=>{
 expect(sites).toHaveLength(6);expect(lakes).toHaveLength(7);
 for(const site of sites){
  expect(site.lip.y-site.impact.y,site.id).toBeGreaterThan(16);expect(site.width).toBeGreaterThanOrEqual(6);
  expect(inside(site.impact,site.lake),site.id).toBe(true);expect(site.impact.y).toBe(site.lake.level);
  expect(track.waterOpenings?.some(w=>w.id===site.lake.id&&inside(site.impact,w)),site.id).toBe(true);
 }
});

test('receiving lakes have submerged beds and remain contained by their authored shore',()=>{
 const ground=yosemiteBankGround(track);
 for(const lake of lakes){
  expect(ground(lake.center.x,lake.center.z),lake.id).toBeLessThan(lake.level);
  for(let i=0;i<64;i++){
   const p=yosemiteLakePoint(lake,i/64*Math.PI*2,.65);
   expect(inside(p,lake),lake.id).toBe(true);expect(p.y).toBe(lake.level);
   if(lake.protectedBy)expect(inside(p,{id:lake.id,footprint:lake.protectedBy}),lake.id).toBe(true);
  }
 }
 for(const id of ['bridalveil-headwater','cathedral-plunge-lake','sentinel-plunge-lake']){
  const lake=lakes.find(l=>l.id===id)!;expect(rivers.some(r=>r.path.some(p=>inside(p,lake))),id).toBe(true);
 }
});
