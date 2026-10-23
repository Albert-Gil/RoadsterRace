import { expect, test } from 'vitest';
import fixtures from '../fixtures/handling-v8.json';
import { COMPILER_VERSION } from '../../src/core/route';
import type { TrackDefinition, CompiledRoute } from '../../src/core/types';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { LocalRace } from '../../src/core/local-race';

// Frozen pre-widening geometry isolates unchanged vehicle physics from authored course changes.
test.each(fixtures)('$track.id retains the v8 physics on frozen geometry', ({ track: data, route: line }) => {
  const track=data as TrackDefinition, route={...line,version:COMPILER_VERSION} as CompiledRoute;
  const race = new LocalRace([route], track, 2);
  for (let tick = 0; tick < 18000 && !race.finished; tick++) {
    if (tick % 300 === 0) race.pressThrust(0);
    race.step();
  }
  const s = race.racers[0].state;
  const expected = {
    'coastal-launch': { finish: 41.57099934730101, laps: [21.21315257423602, 20.357846773064992], drifts: 6, collisions: 2, recoveries: 0 },
    'orbital-launchyard': { finish: 50.70356243354509, laps: [24.813470651367318, 25.89009178217777], drifts: 11, collisions: 0, recoveries: 0 },
    'golden-gate': { finish: 73.45151031687591, laps: [38.49902327848429, 34.952487038391624], drifts: 17, collisions: 3, recoveries: 3 },
  }[track.id]!;
  expect(s.finishTime).toBeCloseTo(expected.finish, 8);
  s.lapTimes.forEach((time, i) => expect(time).toBeCloseTo(expected.laps[i], 8));
  expect({ drifts: s.driftCount, collisions: s.collisionCount, recoveries: s.recoveryCount }).toEqual({ drifts: expected.drifts, collisions: expected.collisions, recoveries: expected.recoveries });
});
