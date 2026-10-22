import { describe, expect, test } from 'vitest';
import { LocalRace } from '../../src/core/local-race';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { FixedStepClock, RULES } from '../../src/core/simulation';
import { coastalTrack } from '../../src/core/track';

function route(seconds = 7) {
  const result = compileRoute(createPracticeSamples(coastalTrack, seconds), coastalTrack);
  if (!result.ok) throw new Error(result.message);
  return result.route;
}

describe('shared local race', () => {
  test.each([2, 3, 4])('%i players start on a physical grid and complete both laps', count => {
    const session = new LocalRace(Array.from({ length: count }, () => route()), coastalTrack);
    for (let i = 0; i < 18000 && !session.finished; i++) session.step();
    expect(session.finished).toBe(true);
    expect(session.racers.every(racer => racer.state.lapTimes.length === 2)).toBe(true);
    expect(session.standings().every(s => s.rank >= 1 && s.rank <= count)).toBe(true);
    expect(session.standings().every(s => s.progress === coastalTrack.length * RULES.laps)).toBe(true);
  });
  test('independent simultaneous commands and cooldowns never activate a different player', () => {
    const session = new LocalRace([route(), route(), route(), route()], coastalTrack);
    session.pressThrust(2); session.step();
    expect(session.racers.map(r => r.state.thrustCount)).toEqual([0, 0, 1, 0]);
    session.pressThrust(0); session.pressThrust(1); session.pressThrust(2); session.pressThrust(3); session.step();
    expect(session.racers.map(r => r.state.thrustCount)).toEqual([1, 1, 1, 1]);
    for (let i = 0; i < 310; i++) session.step();
    expect(session.racers.map(r => r.state.thrustCount)).toEqual([1, 1, 1, 1]);
    session.pressThrust(1); session.step();
    expect(session.racers.map(r => r.state.thrustCount)).toEqual([1, 2, 1, 1]);
  });
  test('clearing pending input discards every player command', () => {
    const session = new LocalRace([route(), route()], coastalTrack);
    session.pressThrust(0); session.pressThrust(1); session.clearCommands(); session.step();
    expect(session.racers.map(r => r.state.thrustCount)).toEqual([0, 0]);
  });
  test('the first finish does not end the race or advance the finished car', () => {
    const session = new LocalRace([route(7), route(24)], coastalTrack);
    for (let i = 0; i < 18000 && !session.racers.some(r => r.state.finished); i++) session.step();
    expect(session.finished).toBe(false);
    const finished = session.racers.find(r => r.state.finished)!, tick = finished.state.tick;
    expect(session.standings()[0].finished).toBe(true);
    for (let i = 0; i < 18000 && !session.finished; i++) session.step();
    expect(session.finished).toBe(true); expect(finished.state.tick).toBe(tick);
    expect(session.standings().map(s => s.rank)).toEqual([1, 2]);
    expect(session.standings()[0].finishTime!).toBeLessThan(session.standings()[1].finishTime!);
  });
  test('course position uses a shared circuit measure, even when line distances differ', () => {
    const original = route(), longer = structuredClone(original);
    // Identical course positions with a different distance parameterization.
    longer.length *= 2; longer.points.forEach(point => { point.distance *= 2; });
    const session = new LocalRace([original, longer], coastalTrack);
    session.racers[0].state.distance = original.length * 0.4;
    session.racers[1].state.distance = longer.length * 0.4;
    expect(session.courseProgress(0)).toBeCloseTo(session.courseProgress(1), 5);
    expect(session.standings().map(s => s.rank)).toEqual([1, 1]);
    session.racers[0].state.distance = original.length * 1.1;
    expect(session.standings()[0].player).toBe(0);
  });
  test('shared simulation remains deterministic at different render rates; rematch starts fresh', () => {
    const routes = [route(7), route(12), route(9)];
    const results = [30, 60, 120].map(fps => {
      const session = new LocalRace(routes, coastalTrack), clock = new FixedStepClock();
      for (let frame = 0; frame < fps * 200 && !session.finished; frame++) clock.advance(1 / fps, () => {
        if (session.tick === 110) { session.pressThrust(0); session.pressThrust(2); }
        session.step();
      });
      return session.racers.map(r => r.state.finishTime);
    });
    expect(results[0]).toEqual(results[1]); expect(results[1]).toEqual(results[2]);
    const fresh = new LocalRace(routes, coastalTrack);
    expect(fresh.tick).toBe(0); expect(fresh.racers.every(r => r.state.thrustCount === 0 && r.state.distance === 0)).toBe(true);
  });
  test('invalid player counts and mismatched circuits are rejected', () => {
    expect(() => new LocalRace([], coastalTrack)).toThrow();
    expect(() => new LocalRace(Array(5).fill(route()), coastalTrack)).toThrow();
    expect(() => new LocalRace([{ ...route(), trackId: 'different' }], coastalTrack)).toThrow();
  });
  test('physical races still share victories at displayed hundredths', () => {
    const session = new LocalRace([route(), route(), route()], coastalTrack);
    session.racers.forEach((r, i) => { r.state.finished = true; r.state.finishTime = i < 2 ? 30.001 + i * 0.003 : 31; });
    expect(session.standings().map(r => r.rank)).toEqual([1, 1, 3]);
  });
});
