import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { LocalRace } from '../../src/core/local-race';

// Recorded before the v8 supported-surface/flight extension. These unchanged
// circuits are the evidence required for the narrow v7 tournament migration.
test.each(circuits.slice(0, 3))('$id retains its recorded handling', ({ track }) => {
  const result = compileRoute(createPracticeSamples(track, 7), track);
  if (!result.ok) throw new Error(result.message);
  const race = new LocalRace([result.route], track, 2);
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
