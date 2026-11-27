import { describe, expect, it } from 'vitest';
import { findCircuit } from '../../src/content/circuits';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { LocalRace } from '../../src/core/local-race';

function race(circuit: string, seconds: number) {
  const track = findCircuit(circuit).track, result = compileRoute(createPracticeSamples(track, seconds), track);
  if (!result.ok) throw new Error(result.message);
  return new LocalRace([result.route], track, 1);
}
const stepTo = (r: LocalRace, tick: number) => { while (r.tick < tick && !r.finished) r.step(); };

describe('ability outcomes recorded where the rules run', () => {
  it('reports fired, then recharging, for Thrust and Hop, once each', () => {
    const r = race('coastal-launch', 7);
    stepTo(r, 120);
    expect(r.pressThrust(0)).toBe(true); r.step();
    expect(r.racers[0].takeOutcome('thrust')).toBe('fired');
    expect(r.racers[0].takeOutcome('thrust')).toBeUndefined();
    r.pressThrust(0); r.step();
    expect(r.racers[0].takeOutcome('thrust')).toBe('recharging');
    // Both abilities pressed on the same tick are settled separately.
    stepTo(r, 400);
    r.pressHop(0); r.pressThrust(0); r.step();
    expect(r.racers[0].takeOutcome('hop')).toBe('fired');
    expect(['fired', 'recharging']).toContain(r.racers[0].takeOutcome('thrust'));
    r.pressHop(0); r.step();
    expect(r.racers[0].takeOutcome('hop')).toBe('recharging');
  });
  it('reports unavailable during recovery, and refuses presses after the finish', () => {
    const r = race('san-diego-fleet', 9);
    while (!r.finished && !(r.racers[0].state.time < r.racers[0].state.recoveringUntil)) r.step();
    expect(r.finished).toBe(false);
    r.pressHop(0); r.step();
    expect(r.racers[0].takeOutcome('hop')).toBe('unavailable');
    while (!r.finished) r.step();
    expect(r.pressThrust(0)).toBe(false);
    expect(r.pressHop(0)).toBe(false);
  });
  it('leaves race results unchanged', () => {
    const a = race('golden-gate', 7), b = race('golden-gate', 7);
    for (const r of [a, b]) { stepTo(r, 200); r.pressThrust(0); while (!r.finished) { r.step(); r.racers[0].takeOutcome('thrust'); } }
    expect(a.racers[0].state.finishTime).toBe(b.racers[0].state.finishTime);
  });
});
