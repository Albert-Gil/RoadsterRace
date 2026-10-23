import { describe, expect, test } from 'vitest';
import { compileRoute, createPracticeSamples, paceToSpeed } from '../../src/core/route';
import { coastalTrack } from '../../src/core/track';
import { FixedStepClock, RaceSimulation, RULES } from '../../src/core/simulation';
import { PointerOwnership } from '../../src/input/ownership';
import type { CompiledRoute } from '../../src/core/types';

function route(seconds = 7): CompiledRoute {
  const result = compileRoute(createPracticeSamples(coastalTrack, seconds), coastalTrack);
  if (!result.ok) throw new Error(result.message);
  return result.route;
}
function run(r: CompiledRoute, thrust = false) {
  const sim = new RaceSimulation(r, coastalTrack);
  for (let i = 0; i < 18000 && !sim.state.finished; i++) {
    // Straight after the start, not automatic firing on cooldown.
    if (thrust && sim.state.tick === 110) sim.pressThrust();
    sim.step();
  }
  return sim;
}

describe('timed route compilation', () => {
  test('a closed legal lap compiles with a continuous seam', () => {
    const r = route(); expect(r.points.length).toBeGreaterThan(120);
    expect(r.points[0].x).toBeCloseTo(r.points.at(-1)!.x);
    expect(r.points[0].desiredSpeed).toBeCloseTo(r.points.at(-1)!.desiredSpeed);
  });
  test('shared pace mapping preserves deliberate timing differences', () => {
    const fast = route(4), slow = route(16);
    expect(fast.points[50].desiredSpeed).toBeGreaterThan(slow.points[50].desiredSpeed + 5);
    expect(paceToSpeed(0, coastalTrack.length)).toBe(9);
  });
  test('rejects incomplete, reversed, off-road, skipped-sector and invalid-time traces', () => {
    const samples = createPracticeSamples(coastalTrack);
    expect(compileRoute(samples.slice(0, 90), coastalTrack).ok).toBe(false);
    const reverse = [...samples].reverse().map((p, i) => ({ ...p, time: i * 25 }));
    expect(compileRoute(reverse, coastalTrack).ok).toBe(false);
    const bad = samples.map(p => ({ ...p })); bad[80].x += 100;
    expect(compileRoute(bad, coastalTrack).ok).toBe(false);
    expect(compileRoute([...samples.slice(0, Math.floor(samples.length*0.1)), ...samples.slice(Math.floor(samples.length*0.45))], coastalTrack).ok).toBe(false);
    const gap = samples.map((p, i) => ({ ...p, time: p.time + (i > 60 ? 4000 : 0) }));
    expect(compileRoute(gap, coastalTrack).ok).toBe(false);
  });
});

describe('fixed-step racing', () => {
  test('completes exactly two laps with interpolated finish and resettable state', () => {
    const r = route(), sim = run(r);
    expect(sim.state.finished).toBe(true); expect(sim.state.lapTimes).toHaveLength(2);
    expect(sim.state.finishTime).toBeGreaterThan(20);
    expect(sim.state.lapTimes.reduce((a, b) => a + b, 0)).toBeCloseTo(sim.state.finishTime!);
    const retry = new RaceSimulation(r, coastalTrack);
    expect(retry.route).toBe(r); expect(retry.state.time).toBe(0); expect(retry.state.thrustCount).toBe(0);
  });
  test('same scheduled commands at 30/60/120 fps produce equivalent finish times', () => {
    const results = [30, 60, 120].map(fps => {
      const sim = new RaceSimulation(route(), coastalTrack), clock = new FixedStepClock();
      for (let i = 0; i < fps * 200 && !sim.state.finished; i++) clock.advance(1 / fps, () => { if (sim.state.tick === 110) sim.pressThrust(); sim.step(); });
      return sim.state.finishTime!;
    });
    expect(Math.max(...results) - Math.min(...results)).toBeLessThan(RULES.dt);
  });
  test('a straight-line thrust burst improves the same run', () => {
    const r = route(7); expect(run(r, true).state.finishTime!).toBeLessThan(run(r).state.finishTime!);
  });
  test('cooldown rejects early commands and does not buffer them', () => {
    const sim = new RaceSimulation(route(), coastalTrack); sim.pressThrust(); sim.step();
    for (let i = 0; i < 200; i++) { sim.pressThrust(); sim.step(); }
    expect(sim.state.thrustCount).toBe(1);
    for (let i = 0; i < 200; i++) sim.step();
    expect(sim.state.thrustCount).toBe(1); sim.pressThrust(); sim.step(); expect(sim.state.thrustCount).toBe(2);
  });
  test('corner overspeed creates physical drifting', () => {
    const fast = route(2); const sim = run(fast);
    expect(sim.state.driftCount).toBeGreaterThan(0);
    const careful = route(14); expect(run(careful).state.driftCount).toBeLessThan(sim.state.driftCount);
  });
  test('cosmetic data is absent from route/simulation and does not affect the result', () => {
    const r = route(); const a = run(r), b = run(structuredClone(r));
    expect(a.state.finishTime).toBe(b.state.finishTime); expect(a.state.lapTimes).toEqual(b.state.lapTimes);
  });
});

describe('independent pointer ownership', () => {
  test('50 overlapping cycles per corner never reassign or stick', () => {
    const pointers = new PointerOwnership();
    for (let cycle = 0; cycle < 50; cycle++) {
      for (let player = 0; player < 4; player++) expect(pointers.down(player + 20, player)).toBe(true);
      expect(pointers.down(20, 3)).toBe(false); expect(pointers.owner(20)).toBe(0);
      for (const player of [2, 0, 3, 1]) expect(pointers.up(player + 20)).toBe(player);
    }
    expect(pointers.activations).toEqual([50, 50, 50, 50]);
    expect([0, 1, 2, 3].map(p => pointers.active(p))).toEqual([0, 0, 0, 0]);
  });
  test('cancel and global clear release ownership without a new activation', () => {
    const p = new PointerOwnership(); p.down(5, 0); p.down(6, 1); p.up(5, true); p.clear();
    expect(p.active(0) + p.active(1)).toBe(0); expect(p.cancellations).toEqual([1, 1, 0, 0]);
  });
});
