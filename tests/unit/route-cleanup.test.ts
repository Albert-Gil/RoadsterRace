import { describe, expect, test } from 'vitest';
import { cumulative, distance, projectToPolyline } from '../../src/core/geometry';
import { cleanDrawnRoute, DRAWING_RULES, projectCourse } from '../../src/core/route-cleanup';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
import { coastalTrack as track } from '../../src/core/track';
import { gatePoint } from '../../src/core/start-finish';
import type { DrawSample, Point } from '../../src/core/types';

function timed(points: Point[], pace = track.length / 7): DrawSample[] {
  const distances = cumulative(points);
  return points.map((p, i) => ({ ...p, time: distances[i] / pace * 1000 }));
}
function compile(points: DrawSample[]) {
  const result = compileRoute(points, track);
  if (!result.ok) throw new Error(result.message);
  return result.route;
}
function wideLine(start: number, end: number, width = 12) {
  return timed(track.centerline.map((point, i) => {
    const a = track.centerline[Math.max(0, i - 1)], b = track.centerline[Math.min(track.centerline.length - 1, i + 1)];
    const length = distance(a, b) || 1, fraction = (track.distances[i] - start) / (end - start);
    const offset = fraction > 0 && fraction < 1 ? Math.sin(fraction * Math.PI) ** 2 * width : 0;
    return { x: point.x + (b.z - a.z) / length * offset, z: point.z - (b.x - a.x) / length * offset };
  }));
}

describe('forgiving forward-line cleanup', () => {
  test('a clean lap retains its exact samples and timing', () => {
    const samples = createPracticeSamples(track, 7), cleaned = cleanDrawnRoute(samples, track);
    expect(cleaned.samples).toEqual(samples); expect(cleaned.removedPoints).toBe(0);
    expect(compile(samples).cleanup).toBeUndefined();
  });
  test('backtracking is erased with the outward hook and its time, preserving later pace', () => {
    const base = track.centerline;
    const messy = timed([...base.slice(0, 31), ...base.slice(14, 30).reverse(), ...base.slice(15, 31), ...base.slice(31)]);
    const corrected = compile(messy), reference = compile(createPracticeSamples(track, 7));
    expect(corrected.cleanup!.removedPoints).toBeGreaterThan(20); expect(corrected.cleanup!.removedSeconds).toBeGreaterThan(0.2);
    // Uniform metre resampling can shift a retained bend by a few millimetres.
    expect(Math.abs(corrected.length-reference.length)).toBeLessThan(.01);
    expect(corrected.drawingDuration).toBeGreaterThan(reference.drawingDuration);
    expect(Math.max(...corrected.points.map((p, i) => Math.abs(p.desiredSpeed - reference.points[i].desiredSpeed)))).toBeLessThan(0.1);
    let previous = { point: corrected.points[0], progress: 0 };
    for (const point of corrected.points.slice(1)) {
      const projected = projectCourse(point, track, previous);
      expect(projected.progress - previous.progress).toBeGreaterThan(-0.1);
      previous = { point, progress: projected.progress };
    }
  });
  test('a radial out-and-back spur is removed even without longitudinal reversal', () => {
    const base = track.centerline, anchor = base[15];
    const spur = [-2, -4, -6, -8, -6, -4, -2, 0].map(z => ({ x: anchor.x, z: anchor.z + z }));
    const result = compile(timed([...base.slice(0, 16), ...spur, ...base.slice(16)]));
    expect(result.cleanup!.removedPoints).toBeGreaterThan(5);
    expect(Math.abs(result.length - compile(createPracticeSamples(track)).length)).toBeLessThan(0.5);
  });
  test('a local self-crossing loop is removed between recorded points', () => {
    const base = track.centerline, anchor = base[15];
    const loop = [{ x: anchor.x + 2, z: anchor.z - 4 }, { x: anchor.x + 4, z: anchor.z - 4 }, { x: anchor.x + 1, z: anchor.z - 1 }, { x: anchor.x + 4, z: anchor.z }];
    const result = compile(timed([...base.slice(0, 16), ...loop, ...base.slice(16)]));
    expect(result.cleanup).toBeDefined(); expect(result.length).toBeLessThan(compile(createPracticeSamples(track)).length + 4);
  });
  test('an accidental initial reversal and an overshoot past finish do not erase a valid lap', () => {
    const base = track.centerline;
    const initial = [...base.slice(-9, -1).reverse(), base[0]];
    const finish = [gatePoint(track, 0, 2)];
    const result = compile(timed([base[0], ...initial, ...base.slice(1), ...finish]));
    expect(result.cleanup).toBeDefined(); expect(Math.abs(result.length-compile(createPracticeSamples(track)).length)).toBeLessThan(.01);
    expect(distance(result.points[0], result.points.at(-1)!)).toBeLessThan(0.001);
  });
  test('wrong-way and incomplete laps fail; another lap after the first finish is ignored', () => {
    const base = track.centerline;
    expect(compileRoute(timed([...base].reverse()), track).ok).toBe(false);
    expect(compileRoute(timed([...base.slice(0, 40), base[0]]), track).ok).toBe(false);
    expect(compileRoute(timed([...base, ...base.slice(1)]), track).ok).toBe(true);
  });
  test.each([true, false])('lifting beyond the finish clips the closing reversal (exact crossing recorded: %s)', exact => {
    const base = track.centerline, samples = timed([...(exact ? base : base.slice(0, -1)), gatePoint(track, 0, 2)]);
    const compiled = compileRoute(samples, track);
    if (!compiled.ok) throw new Error(compiled.message);
    const result = compiled.route;
    expect(compiled.drawing!.tail.length).toBeGreaterThan(1);
    expect(distance(compiled.drawing!.tail[0], base[0])).toBeLessThan(0.1);
    expect(Math.abs(result.length - compile(createPracticeSamples(track)).length)).toBeLessThan(0.1);
    let previous = { point: result.points[0], progress: 0 };
    for (const point of result.points.slice(1)) {
      const projection = projectCourse(point, track, previous);
      expect(projection.progress - previous.progress).toBeGreaterThan(-0.1); previous = { point, progress: projection.progress };
    }
  });
  test('bad timestamps cannot be hidden inside a removed correction', () => {
    const base = track.centerline;
    const samples = timed([...base.slice(0, 31), ...base.slice(14, 30).reverse(), ...base.slice(15, 31), ...base.slice(31)]);
    samples[34].time = samples[33].time - 100;
    expect(compileRoute(samples, track).ok).toBe(false);
  });
});

describe('expanded drawing corridor', () => {
  test.each([[8, 80], [205, 275]])('a wide sand line through %i–%i metres keeps its intended shape', (start, end) => {
    const result = compile(wideLine(start, end));
    const maximum = Math.max(...result.points.map(p => projectToPolyline(p, track.centerline, track.distances).distance));
    expect(maximum).toBeGreaterThan(11);
    expect(maximum).toBeLessThan(12.5);
    expect(result.cleanup).toBeUndefined();
  });
  test('the wider planned line still uses real sand drag and completes both laps', () => {
    const result = compile(wideLine(8, 80)), sim = new RaceSimulation(result, track); let sandTime = 0;
    for (let i = 0; i < 18000 && !sim.state.finished; i++) { sim.step(); sandTime += sim.state.sandAmount / 60; }
    expect(sim.state.finished).toBe(true); expect(sim.state.lapTimes).toHaveLength(2); expect(sandTime).toBeGreaterThan(5);
  });
  test.each([6, 9, 12])('a %i-metre-wide excursion near the hairpin keeps a valid forward lap', width => {
    const result = compile(wideLine(85, 170, width));
    expect(result.length).toBeGreaterThan(track.length * 0.75);
    expect(distance(result.points[0], result.points.at(-1)!)).toBeLessThan(0.001);
  });
  test('distant excursions are kept as drawn; large missing sectors are rejected with a usable explanation', () => {
    const distant = compileRoute(wideLine(8, 80, 65), track);
    if (!distant.ok) throw new Error(distant.message);
    expect(Math.max(...distant.route.points.map(p => projectToPolyline(p, track.centerline, track.distances).distance))).toBeGreaterThan(55);
    const base = track.centerline;
    expect(compileRoute(timed([...base.slice(0, 30), ...base.slice(120)]), track).ok).toBe(false);
  });
});
