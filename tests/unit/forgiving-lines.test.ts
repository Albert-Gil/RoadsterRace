import { describe, expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { compileRoute, createPracticeSamples, sampleRoute } from '../../src/core/route';
import { RaceSimulation, RULES } from '../../src/core/simulation';
import { PROFILES, humanStroke } from '../support/strokes';

// Simulated human strokes: tidy, loose (about half a road width of wander), wild (off the
// road for long stretches) and cutter (cutting the inside of every bend), with sloppy
// starts and finishes, pauses and finger jitter. Every one is a valid lap and must race.
describe.each(circuits.map(c => c.track))('$id accepts sloppy drawings and every one can be raced', track => {
  test.each(PROFILES.map(p => p.name))('%s strokes compile and finish one lap', name => {
    const profile = PROFILES.find(p => p.name === name)!;
    for (const seed of [11, 23]) {
      const result = compileRoute(humanStroke(track, profile, seed * 7919 + track.id.length), track);
      if (!result.ok) throw new Error(`${track.id} ${name} seed ${seed}: ${result.message}`);
      const sim = new RaceSimulation(result.route, track, 1);
      for (let i = 0; i < 60 * 240 && !sim.state.finished; i++) sim.step();
      expect(sim.state.finished, `${track.id} ${name} seed ${seed}`).toBe(true);
    }
  }, 120000);
});

test('a car that keeps failing at the same spot is moved forward instead of looping', () => {
  // Feed actual zero committed motion after contact. Depending on a particular drift
  // to hit one building twice makes a recovery test break whenever grip is tuned.
  const track = circuits[0].track;
  const r = compileRoute(createPracticeSamples(track), track); if (!r.ok) throw new Error(r.message);
  expect(r.route.hazards).toBeUndefined();
  const sim = new RaceSimulation(r.route,track,1),recoveries:{distance:number;penalty?:number}[]=[];
  while(sim.state.distance<20)sim.step();
  const blockedDistance=sim.state.distance+2,p=sampleRoute(r.route,blockedDistance);
  for(let repeat=0;repeat<2;repeat++){
    while(sim.state.time<sim.state.recoveringUntil)sim.finishTick();
    Object.assign(sim.state,{position:{x:p.x+Math.cos(p.heading)*4,z:p.z-Math.sin(p.heading)*4},distance:blockedDistance,speed:0,velocity:{x:0,z:0}});
    sim.drainEvents();
    for(let tick=0;tick<180&&recoveries.length<=repeat;tick++){
      const before=sim.state.distance;sim.markContact(sim.state.time);
      sim.commitMotion({...sim.state.position},RULES.dt,sim.state.time,0);sim.finishTick();
      for(const e of sim.drainEvents())if(e.type==='recovery')recoveries.push({distance:sim.state.distance-before,penalty:e.penalty});
    }
  }
  expect(recoveries).toHaveLength(2);
  expect(recoveries[0].distance).toBeLessThan(0); expect(recoveries[0].penalty).toBeUndefined();
  expect(recoveries[1].distance).toBeGreaterThan(0); expect(recoveries[1].penalty).toBeGreaterThan(0);
  for(let i=0;i<18000&&!sim.state.finished;i++)sim.step();expect(sim.state.finished).toBe(true);
});
