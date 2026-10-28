import { expect, test } from 'vitest';
import { orbitalTrack } from '../../src/core/tracks/orbital';
import { laNightsTrack } from '../../src/core/tracks/la-nights';
import { backlotCases, backlotCaseParts, serviceConduit, obstacleRectangle, hopPropIds } from '../../src/core/tracks/hop-obstacles';
import { barrierContact } from '../../src/core/barriers';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { LAUNCHSITE } from '../../src/presentation/launchsite';

test('the compact conduit and case row share their actual bounds with physics',()=>{
  for(const [track,id,p] of [[orbitalTrack,'service-hop-barrier',serviceConduit],[laNightsTrack,'backlot-service-divider',backlotCases]] as const){
    const b=track.barriers.find(b=>b.id===id)!;
    expect(b.kind).toBe('service-barrier');expect(b.height).toBe(p.height);
    expect(b.footprint).toEqual(obstacleRectangle(p.x,p.z,p.width,p.depth));
    expect(p.depth).toBeLessThanOrEqual(1.25);
  }
  expect(backlotCaseParts()).toHaveLength(4);
  expect(backlotCases.gap).toBeLessThan(laNightsTrack.carWidth);
});

test('gaps between individual studio cases cannot fit a car or create invisible collision space',()=>{
  const main=laNightsTrack.barriers.find(b=>b.id==='backlot-service-divider')!;
  const compound={...laNightsTrack,barriers:[main]};
  const separate={...laNightsTrack,barriers:backlotCaseParts().map((p,i)=>({id:`case-${i}`,height:p.height-.15,baseHeight:.15,footprint:obstacleRectangle(p.x,p.z,p.width,p.depth)}))};
  for(let x=-70.5;x<=-53.5;x+=.5)for(const z of [4,5,6,7,8,9,10])for(const y of [0,.9,1.3,1.6])for(const heading of [-.35,0,.35,Math.PI]){
    expect(!!barrierContact({x,z},heading,separate,0,y),`${x},${z},${y},${heading}`).toBe(!!barrierContact({x,z},heading,compound,0,y));
  }
});

test('Hop obstacles and their protected ends no longer generate rock rows',()=>{
  for(const track of [orbitalTrack,laNightsTrack])for(const b of track.barriers.filter(b=>hopPropIds.includes(b.id)))expect(b.kind).not.toBe('rock');
  for(const id of ['service-hop-barrier','service-hop-left-end','service-hop-right-end'])expect(LAUNCHSITE.formations[id]).toBeUndefined();
  expect(laNightsTrack.barriers.filter(b=>b.kind==='rock')).toHaveLength(0);
});

test.each([[orbitalTrack,'service-hop'],[laNightsTrack,'backlot-alley']] as const)('$0.name normal and manual-Hop routes retain their approval', (track,lane)=>{
  for(const branch of [false,lane]){
    const result=compileRoute(createPracticeSamples(track,7,branch),track);
    expect(result.ok,result.ok?undefined:result.message).toBe(true);
    if(result.ok){expect(result.route.hazards??[]).toHaveLength(0);expect(result.route.hopShortcuts?.length??0).toBe(branch?1:0);}
  }
});
