import { describe, expect, test } from 'vitest';
import { circuits, findCircuit } from '../../src/content/circuits';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { LocalRace } from '../../src/core/local-race';
import { RaceSimulation } from '../../src/core/simulation';
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
  // Fixed-interval hops make this Golden Gate car hit the same building twice.
  const track = findCircuit('golden-gate').track, r = compileRoute(createPracticeSamples(track), track); if (!r.ok) throw new Error(r.message);
  expect(r.route.hazards).toBeUndefined();
  const race = new LocalRace([r.route], track, 2), recoveries: { distance: number; penalty?: number }[] = [];
  for (let tick = 0; tick < 18000 && !race.finished; tick++) {
    if (tick % 300 === 0) race.pressThrust(0); if (tick % 480 === 240) race.pressHop(0);
    const before = race.racers[0].state.distance;
    race.step();
    for (const e of race.racers[0].drainEvents()) if (e.type === 'recovery') recoveries.push({ distance: race.racers[0].state.distance - before, penalty: e.penalty });
  }
  expect(race.finished).toBe(true);
  expect(recoveries.length).toBeGreaterThanOrEqual(2);
  expect(recoveries[0].distance).toBeLessThan(0); expect(recoveries[0].penalty).toBeUndefined();
  expect(recoveries[1].distance).toBeGreaterThan(0); expect(recoveries[1].penalty).toBeGreaterThan(0);
});
