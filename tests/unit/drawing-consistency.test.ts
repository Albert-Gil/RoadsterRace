import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { samplePolyline } from '../../src/core/geometry';
import { compileRoute, sampleRoute } from '../../src/core/route';
import { compressDrawingPauses, gestureSpeeds, prepareDrawingSamples, paceToSpeed } from '../../src/core/drawing-pace';

test.each(circuits)('$id preserves a deliberate pace profile at 30–240 Hz',({track})=>{
  const routes=[30,60,120,240].map(hz=>{
    const seconds=10,n=hz*seconds;
    // Slow in the middle, quicker at either end. Identical world path and recorded clock.
    const samples=Array.from({length:n+1},(_,i)=>{
      const t=i/n,u=t-Math.sin(t*Math.PI*2)*.09;
      return {...samplePolyline(track.centerline,track.distances,u*track.length),time:t*seconds*1000};
    });
    const result=compileRoute(samples,track);expect(result.ok,result.ok?undefined:result.message).toBe(true);
    if(!result.ok)throw Error(result.message);return result.route;
  });
  for(const route of routes){
    expect(route.drawingDuration).toBeCloseTo(10,2);
    for(let u=.03;u<.97;u+=.03)
      expect(Math.abs(sampleRoute(route,route.length*u).desiredSpeed-sampleRoute(routes.at(-1)!,routes.at(-1)!.length*u).desiredSpeed)).toBeLessThan(.55);
  }
});

test('resting-finger compression is the same for sparse, coalesced and frequent events',()=>{
  const durations=[1,5,30,120].map(hz=>{
    const samples=[{x:0,z:0,time:0},{x:10,z:0,time:1000},
      ...Array.from({length:4*hz},(_,i)=>({x:10,z:0,time:1000+(i+1)/hz*1000})),
      {x:20,z:0,time:6000}];
    const prepared=prepareDrawingSamples(samples);
    expect(prepared.at(-1)!.time).toBeCloseTo(2400,5);
    return gestureSpeeds(prepared,100);
  });
  expect(durations[0]).toEqual(durations[1]);expect(durations[1]).toEqual(durations[2]);expect(durations[2]).toEqual(durations[3]);
});

test('exact pace windows retain intentional timing without normalizing each stroke',()=>{
  for(const spacing of [.1,.5,2,3]){
    const samples=Array.from({length:Math.floor(120/spacing)+1},(_,i)=>({x:i*spacing,z:0,time:i*spacing/15*1000}));
    for(const speed of gestureSpeeds(samples,200))expect(speed).toBeCloseTo(paceToSpeed(15,200),8);
  }
  expect(compressDrawingPauses([{x:0,z:0,time:0},{x:1,z:0,time:400},{x:2,z:0,time:800}]).at(-1)!.time).toBe(800);
});
