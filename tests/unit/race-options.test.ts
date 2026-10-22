import { describe, expect, test } from 'vitest';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { coastalTrack } from '../../src/core/track';
import { FixedStepClock, RaceSimulation, RULES } from '../../src/core/simulation';
import { LocalRace } from '../../src/core/local-race';
import { cleanDriverName, defaultPreferences, escapeHtml, parsePreferences } from '../../src/presentation/race-settings';

function route() {
  const result = compileRoute(createPracticeSamples(coastalTrack, 7), coastalTrack);
  if (!result.ok) throw new Error(result.message);
  return result.route;
}
describe('configurable race distance', () => {
  test.each([1, 2, 3, 4, 5, 6])('%i laps finish at the correct boundary with all split times', laps => {
    const line = route(), race = new LocalRace([line, line], coastalTrack, laps);
    for (let tick = 0; tick < 18000 && !race.finished; tick++) race.step();
    expect(race.finished).toBe(true);
    for (const driver of race.racers) {
      expect(driver.state.lapTimes).toHaveLength(laps); expect(driver.state.lap).toBe(laps);
      expect(driver.state.distance).toBe(line.length * laps);
      expect(driver.state.lapTimes.reduce((a, b) => a + b, 0)).toBeCloseTo(driver.state.finishTime!);
    }
    expect(race.standings().every(s => s.progress === coastalTrack.length * laps)).toBe(true);
    expect(race.standings().every(s => s.rank >= 1 && s.rank <= 2)).toBe(true);
  });
  test.each([0, 7, 1.5, NaN, Infinity])('invalid distance %s is rejected at both entry points', laps => {
    const line = route();
    expect(() => new RaceSimulation(line, coastalTrack, laps)).toThrow('one and six');
    expect(() => new LocalRace([line], coastalTrack, laps)).toThrow('one and six');
  });
  test('six-lap commands remain deterministic at 30/60/120 render updates', () => {
    const line = route();
    const finishes = [30, 60, 120].map(fps => {
      const race = new RaceSimulation(line, coastalTrack, 6), clock = new FixedStepClock();
      for (let frame = 0; frame < fps * 200 && !race.state.finished; frame++) clock.advance(1 / fps, () => {
        if ([110, 1200, 2400].includes(race.state.tick)) race.pressThrust(); race.step();
      });
      expect(race.state.finished).toBe(true); return race.state.finishTime!;
    });
    expect(Math.max(...finishes) - Math.min(...finishes)).toBeLessThan(RULES.dt);
  });
});

describe('driver preferences', () => {
  test('a saved grid round-trips without changing names, colors or race length', () => {
    const settings = defaultPreferences(); settings.laps = 6; settings.drivers[0] = { name: 'Alex & Jo', paint: 'ultraviolet' };
    expect(parsePreferences(JSON.stringify(settings))).toEqual(settings);
  });
  test('missing/corrupt/old data, invalid paints and out-of-range laps have useful defaults', () => {
    for (const data of [null, '{', '{"version":9}']) expect(parsePreferences(data)).toEqual(defaultPreferences());
    const saved = parsePreferences(JSON.stringify({ version: 1, laps: 99, drivers: [{ name: '   ', paint: 'unknown' }] }));
    expect(saved).toEqual(defaultPreferences());
  });
  test('names preserve ordinary punctuation, trim control text and never become markup', () => {
    expect(cleanDriverName('  Alex   T  ', 0)).toBe('Alex T');
    expect(cleanDriverName('\u0000\u202e', 2)).toBe('Player 3');
    expect(Array.from(cleanDriverName('🏁'.repeat(30), 0))).toHaveLength(18);
    expect(escapeHtml('Alex <b> & "Jo"')).toBe('Alex &lt;b&gt; &amp; &quot;Jo&quot;');
  });
  test('old preferences migrate to Coastal and unknown course IDs cannot select arbitrary content', () => {
    const older = parsePreferences(JSON.stringify({ version: 1, laps: 3, drivers: [{ name: 'Avery', paint: 'cobalt' }] }));
    expect(older.circuitId).toBe('coastal-launch'); expect(older.laps).toBe(3); expect(older.drivers[0].name).toBe('Avery');
    const saved = { ...defaultPreferences(), circuitId: 'orbital-launchyard' };
    expect(parsePreferences(JSON.stringify(saved)).circuitId).toBe('orbital-launchyard');
    expect(parsePreferences(JSON.stringify({ ...saved, circuitId: 'constructor' })).circuitId).toBe('coastal-launch');
  });
});
