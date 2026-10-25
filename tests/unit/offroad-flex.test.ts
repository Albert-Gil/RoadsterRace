import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { cumulative, distance, projectToPolyline, samplePolyline } from '../../src/core/geometry';
import { compileRoute } from '../../src/core/route';
import { roadEdges } from '../../src/core/road-geometry';
import { RaceSimulation } from '../../src/core/simulation';
import type { TrackDefinition } from '../../src/core/types';

function excursion(track: TrackDefinition, start: number, side: number, reach: number) {
  const points = track.centerline.map((point, i) => {
    const before = track.centerline[Math.max(0, i - 1)];
    const after = track.centerline[Math.min(track.centerline.length - 1, i + 1)];
    const tangent = distance(before, after) || 1;
    const phase = (track.distances[i] - start) / 70;
    const offset = phase > 0 && phase < 1 ? Math.sin(Math.PI * phase) ** 2 * reach * side : 0;
    return { x: point.x + (after.z - before.z) / tangent * offset,
      z: point.z - (after.x - before.x) / tangent * offset };
  });
  const ds = cumulative(points);
  return points.map((point, i) => ({ ...point, time: ds[i] / ds.at(-1)! * 7000 }));
}

test.each(circuits)('$id accepts a substantially wider off-road racing line and completes a race', ({ track }) => {
  const canyon = track.id === 'grand-canyon';
  const minimum = canyon ? 14 : 26;
  let chosen: ReturnType<typeof compileRoute> | undefined;
  const rejected: Record<string, number> = {};
  let farthestAccepted = 0;
  for (let start = 35; start < track.length - 85 && !chosen; start += 38) for (const side of [-1, 1]) {
    const result = compileRoute(excursion(track, start, side, canyon ? 15.5 : 28), track);
    if (!result.ok) { rejected[result.message] = (rejected[result.message] ?? 0) + 1; continue; }
    const farthest = Math.max(...result.route.points.map(point => projectToPolyline(point, track.centerline, track.distances).distance));
    farthestAccepted = Math.max(farthestAccepted, farthest);
    if (farthest > minimum) { chosen = result; break; }
  }
  expect(chosen?.ok, `${track.id}: no safe wide off-road route compiled; farthest accepted ${farthestAccepted.toFixed(1)} m; rejected ${JSON.stringify(rejected)}`).toBe(true);
  if (!chosen?.ok) return;
  const race = new RaceSimulation(chosen.route, track, 1);
  for (let i = 0; i < 18000 && !race.state.finished; i++) race.step();
  expect(race.state.finished).toBe(true);
  expect(race.state.lapTimes).toHaveLength(1);
}, 120000);

test('a line far off the circuit is accepted as drawn and the car drives it through the sand', () => {
  const track = circuits[0].track;
  const drawn = excursion(track, 35, -1, 40), result = compileRoute(drawn, track);
  if (!result.ok) throw new Error(result.message);
  // The compiled line keeps the excursion: every drawn sample stays on it.
  const line = result.route.points, along = cumulative(line);
  expect(Math.max(...drawn.map(p => projectToPolyline(p, line, along).distance))).toBeLessThan(2);
  const race = new RaceSimulation(result.route, track, 1); let sand = 0;
  for (let i = 0; i < 60 * 240 && !race.state.finished; i++) { race.step(); sand += race.state.sandAmount / 60; }
  expect(race.state.finished).toBe(true); expect(sand).toBeGreaterThan(2);
});

test('widened canyon shoulders do not fold inward around bends', () => {
  const track = circuits.find(c => c.id === 'grand-canyon')!.track;
  const orientedArea = (a: {x:number;z:number}, b: {x:number;z:number}, c: {x:number;z:number}) =>
    (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  for (const section of track.sections!.filter(s => !s.flight)) {
    const path = [samplePolyline(track.centerline, track.distances, section.from),
      ...track.centerline.filter((_, i) => track.distances[i] > section.from + 1e-5 && track.distances[i] < section.to - 1e-5),
      samplePolyline(track.centerline, track.distances, section.to)];
    const [left, right] = roadEdges(path, section.supportWidth, false);
    for (let i = 0; i < path.length - 1; i++) {
      expect(orientedArea(left[i], right[i], left[i + 1]), `${section.id} left edge at ${i}`).toBeLessThan(0.01);
      expect(orientedArea(left[i], right[i], right[i + 1]), `${section.id} right edge at ${i}`).toBeLessThan(0.01);
    }
  }
});
