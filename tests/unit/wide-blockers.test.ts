import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { barrierContact, sweepVehicle } from '../../src/core/barriers';
import { samplePolyline } from '../../src/core/geometry';
import { buildingGeometry } from '../../src/presentation/building-geometry';
import { edgeDistance, insidePolygon } from '../../src/presentation/landscape/mesh';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
import { launchsiteVessels, goldenMarketFrontage } from '../../src/core/tracks/venue-parcels';

// These paths avoid the small first-revision blockers. Checking them prevents a
// regression to a point obstacle that only happens to hit the original red chord.
const bypasses = [
  ['coastal-launch', 'apex-rocks', [[24,-29],[16,-20],[16,-12],[20,-4],[30,4]]],
  ['coastal-launch', 'apex-rocks', [[24,-29],[37,-19],[41,-14],[40,-7],[30,4]]],
  ['orbital-launchyard', 'utility-storage-tower', [[-2,19],[-8,13],[-20,12],[-30,15],[-36,26]]],
  ['orbital-launchyard', 'utility-storage-tower', [[-2,19],[-8,32],[-14,40],[-28,33],[-36,26]]],
  ['orbital-launchyard', 'utility-storage-tower', [[-2,19],[0,39],[0,45],[-20,43],[-36,26]]],
  ['golden-gate', 'market-annex', [[-30,-40],[-43,-30],[-43,-22],[-44,-6]]],
  ['golden-gate', 'market-annex', [[-30,-40],[-50,-32],[-52,-24],[-44,-6]]],
] as const;

test.each(bypasses)('%s %s stops an around-the-end detour', (id, barrierId, coordinates) => {
  const source = circuits.find(c => c.id === id)!.track;
  const track = { ...source, barriers: source.barriers.filter(b => b.id === barrierId) };
  const points = coordinates.map(([x,z]) => ({x,z}));
  for (const height of [0, 8.03]) {
    let hit = false;
    for (let i = 1; i < points.length; i++) {
      const a = points[i-1], b = points[i], h = Math.atan2(b.x-a.x,b.z-a.z);
      hit ||= sweepVehicle(a,b,h,h,{x:Math.sin(h)*42,z:Math.cos(h)*42},track,height,height,true).collided;
    }
    expect(hit).toBe(true);
  }
});

test.each(['coastal-launch','orbital-launchyard','golden-gate'])('%s expanded protection leaves the normal road corridor clear', id => {
  const source = circuits.find(c => c.id === id)!.track;
  const track = { ...source, barriers: source.barriers.filter(b => b.runoffException === 'cut-protection') };
  for(let d=1;d<track.length-1;d+=1){
    const p=samplePolyline(track.centerline,track.distances,d), a=samplePolyline(track.centerline,track.distances,d-.2), b=samplePolyline(track.centerline,track.distances,d+.2);
    const h=Math.atan2(b.x-a.x,b.z-a.z);
    for(const offset of [-5.5,0,5.5]){
      const q={x:p.x+Math.cos(h)*offset,z:p.z-Math.sin(h)*offset};
      expect(barrierContact(q,h,track),`${id} at ${d}, offset ${offset}`).toBeNull();
    }
  }
});

test('the concave Launchsite utility body has no roof or wall over the neighbouring road', () => {
  const track=circuits.find(c=>c.id==='orbital-launchyard')!.track;
  const barrier=track.barriers.find(b=>b.id==='utility-storage-tower')!;
  for(const footprint of [barrier.footprint,[...barrier.footprint].reverse()]){
    const g=buildingGeometry(footprint,barrier.height), n=footprint.length;
    expect(g.triangleCount).toBe(n-2+n*2);
    for(let i=0;i<g.indices.length;i+=3){
      const p=g.indices.slice(i,i+3).map(k=>({x:g.positions[k*3],z:g.positions[k*3+2]}));
      for(const [u,v] of [[1/3,1/3],[.1,.1],[.8,.1],[.1,.8]]){
        const q={x:p[0].x*(1-u-v)+p[1].x*u+p[2].x*v,z:p[0].z*(1-u-v)+p[1].z*u+p[2].z*v};
        expect(insidePolygon(q,barrier.footprint)||edgeDistance(q,barrier.footprint)<1e-6).toBe(true);
      }
    }
    expect(Math.max(...g.positions.filter((_,i)=>i%3===1))).toBe(barrier.height);
  }
});

test('individual tanks and storefronts use the same dimensions in physical and visual authoring', () => {
  const launch=circuits.find(c=>c.id==='orbital-launchyard')!.track, golden=circuits.find(c=>c.id==='golden-gate')!.track;
  for(const v of launchsiteVessels){
    const b=launch.barriers.find(b=>b.id===v.id)!;
    expect(b.baseHeight).toBe(1.25);expect(b.height).toBe(v.height);
    for(const p of b.footprint)expect(Math.hypot(p.x-v.x,p.z-v.z)).toBeCloseTo(v.radius,7);
  }
  for(const v of goldenMarketFrontage){
    const b=golden.barriers.find(b=>b.id===v.id)!;
    expect(b.height).toBe(v.height+.28);
    expect(Math.max(...b.footprint.map(p=>p.x))-Math.min(...b.footprint.map(p=>p.x))).toBeCloseTo(v.width,7);
    expect(Math.max(...b.footprint.map(p=>p.z))-Math.min(...b.footprint.map(p=>p.z))).toBeCloseTo(v.depth,7);
  }
});

test.each(['coastal-launch','orbital-launchyard','golden-gate'])('%s low protected parcel preserves racing behavior with Hop and thrust', id => {
  const track=circuits.find(c=>c.id===id)!.track;
  const result=compileRoute(createPracticeSamples(track),track);if(!result.ok)throw Error(result.message);
  const heavy={...track,barriers:track.barriers.map(b=>b.runoffException==='cut-protection'&&b.kind==='infield'?{...b,height:9.5}:b)};
  const run=(t:typeof track)=>{
    const race=new RaceSimulation(result.route,t,1);
    for(let tick=0;tick<18000&&!race.state.finished;tick++){
      if(tick%300===0)race.pressThrust();if(tick%480===240)race.pressHop();race.step();
    }
    expect(race.state.finished).toBe(true);
    const s=race.state;return {time:s.finishTime,laps:s.lapTimes,collisions:s.collisionCount,recoveries:s.recoveryCount,hops:s.hopCount};
  };
  expect(run(track)).toEqual(run(heavy));
},30000);
