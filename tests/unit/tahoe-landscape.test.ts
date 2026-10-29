import { expect,test } from 'vitest';
import { snowyTahoeTrack as track } from '../../src/core/tracks/snowy-tahoe';
import { insideBarrier } from '../../src/core/barriers';
import { groundHeight } from '../../src/core/support';
import { locateRoad } from '../../src/core/elevation';
import { tahoeLayout } from '../../src/presentation/tahoe';
import { snowyTahoeAppearance as art } from '../../src/presentation/themes';

test('alpine scenery matches the physical alpine ground and keeps the planning corridor visible',()=>{
  const layout=tahoeLayout(track);
  for(const p of [...track.centerline,...track.hopShortcuts![0].branch]){
    for(const dx of [-16,0,16])expect(layout.height(p.x+dx,p.z)).toBeCloseTo(groundHeight({x:p.x+dx,z:p.z},track),5);
  }
  expect(layout.trees.filter(t=>!t.authored)).toHaveLength(art.treeCount);
  for(const t of layout.trees){
    if(t.authored){expect(insideBarrier(t,track.barriers[0])).toBe(true);continue;}
    expect(layout.distance(t.x,t.z)).toBeGreaterThanOrEqual(34+t.height*1.1);
    const road=locateRoad(t,track),above=t.height+Math.max(0,layout.height(t.x,t.z)-road.height);
    expect(layout.distance(t.x,t.z)).toBeGreaterThanOrEqual(track.roadWidth/2+above*1.1);
    expect(track.barriers.some(b=>insideBarrier(t,b))).toBe(false);
  }
  expect(layout.height(158,0)).toBeLessThan(-2.4);
  expect(layout.height(-250,160)).toBeGreaterThan(10);
});
