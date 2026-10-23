import { expect,test } from 'vitest';
import { LapRecorder,lapRecordKey,replayPose } from '../../src/core/lap-replay';
import { validRecord } from '../../src/presentation/lap-storage';
import { coastalTrack } from '../../src/core/track';
import { compileRoute,createPracticeSamples } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
test('records exact lap boundaries at 30 Hz, with a fresh zero-time frame every lap',()=>{
  const route=compileRoute(createPracticeSamples(coastalTrack,7),coastalTrack);if(!route.ok)throw Error(route.message);
  const sim=new RaceSimulation(route.route,coastalTrack,3),recorder=new LapRecorder(lapRecordKey(coastalTrack)),records=[];
  recorder.sample(sim.state);
  for(let i=0;i<24000&&!sim.state.finished;i++){sim.step();const record=recorder.sample(sim.state);if(record)records.push(record);}
  expect(records.length).toBe(3);
  records.forEach((r,i)=>{expect(validRecord(r,r.key)).toBe(true);expect(r.duration).toBe(sim.state.lapTimes[i]);expect(r.frames.length).toBeLessThan(r.duration*31+3);expect(replayPose(r,-1)).toBeNull();expect(replayPose(r,r.duration+1)).toBeNull();});
  expect(records[0].frames.at(-1)!.x).toBeCloseTo(records[1].frames[0].x,8);
  expect(records[0].frames.at(-1)!.z).toBeCloseTo(records[1].frames[0].z,8);
  expect(validRecord(records[0],'older-track')).toBe(false);
  const before=JSON.stringify(sim.state);replayPose(records[0],5.2);expect(JSON.stringify(sim.state)).toBe(before);
});

test('malformed stored ghost frames are rejected without throwing',()=>{expect(validRecord({version:1,key:'x',duration:1,frames:[null,null]},'x')).toBe(false);});
