import { expect, test } from 'vitest';
import fixtures from '../fixtures/handling-v8.json';
import { COMPILER_VERSION } from '../../src/core/route';
import type { TrackDefinition, CompiledRoute } from '../../src/core/types';
import { LocalRace } from '../../src/core/local-race';
import { RULES } from '../../src/core/simulation';

// Keep historic geometry and pace frozen. Rules v15 intentionally increase saturated
// tire slip; these snapshots record that new handling independently of compiler changes.
test.each(fixtures)('$track.id has a repeatable v15 baseline on frozen geometry', ({ track: data, route: line }) => {
  const track=data as TrackDefinition, route={...line,version:COMPILER_VERSION} as CompiledRoute;
  const race = new LocalRace([route], track, 2);
  for (let tick = 0; tick < 18000 && !race.finished; tick++) {
    if (tick % 300 === 0) race.pressThrust(0);
    race.step();
  }
  const s = race.racers[0].state;
  expect(s.finished).toBe(true); expect(s.hopCount).toBe(0);
  const microseconds = (n: number) => Number(n.toFixed(6));
  expect({ finish: microseconds(s.finishTime!), laps: s.lapTimes.map(microseconds), drifts: s.driftCount, collisions: s.collisionCount, recoveries: s.recoveryCount }).toMatchSnapshot();
});

test('ground force tuning retains established grip, response, acceleration and thrust', () => {
  expect({ grip: RULES.asphaltGrip, sandGrip: RULES.sandGrip, response: RULES.asphaltResponse, sandResponse: RULES.sandResponse,
    acceleration: RULES.acceleration, braking: RULES.braking, thrust: RULES.thrustAcceleration, max: RULES.maxSpeed }).toEqual({
    grip: 48, sandGrip: 6.5, response: 7.5, sandResponse: 1.8, acceleration: 6, braking: 8.5, thrust: 25, max: 42,
  });
  expect(RULES.sandDrag).toBe(0.95);
  expect(RULES.driftGripLoss).toBe(.14); expect(RULES.driftSaturationRange).toBe(2);
});
