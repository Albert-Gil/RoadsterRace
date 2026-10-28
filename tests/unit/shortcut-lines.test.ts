import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { cumulative, distance, lerp, projectToPolyline, samplePolyline } from '../../src/core/geometry';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
import type { TrackDefinition } from '../../src/core/types';

/** Replace one centerline bend with a continuously sampled, hand-drawable sand chord. */
function insideCut(track: TrackDefinition, start: number, skip: number) {
  const end = start + skip;
  const a = samplePolyline(track.centerline, track.distances, start), b = samplePolyline(track.centerline, track.distances, end);
  const points = [...track.centerline.filter((_, i) => track.distances[i] < start), a,
    ...Array.from({ length: 50 }, (_, i) => ({ x: lerp(a.x, b.x, (i + 1) / 51), z: lerp(a.z, b.z, (i + 1) / 51) })), b,
    ...track.centerline.filter((_, i) => track.distances[i] > end)];
  const ds = cumulative(points);
  return points.map((point, i) => ({ ...point, time: ds[i] / ds.at(-1)! * 6000 }));
}

const cuts: [string, number, number, number][] = [
  ['coastal-launch', 32, 85, 15],
  ['orbital-launchyard', 157, 85, 14],
  ['golden-gate', 32, 105, 14],
  ['santa-monica', 457, 105, 16],
  ['grand-canyon', 0, 62, 10], // positioned relative to the descent below
  ['la-nights', 32, 85, 14],
];

test.each(cuts)('%s accepts a supported inside cut that skips a turn', (id, start, skip, minimumDeviation) => {
  const track = circuits.find(c => c.id === id)!.track;
  const from = id === 'grand-canyon' ? track.sections!.find(s => s.id === 'descent')!.from + 11 : start;
  const result = compileRoute(insideCut(track, from, skip), track);
  expect(result.ok, result.ok ? undefined : result.message).toBe(true);
  if (!result.ok) return;
  const reference = compileRoute(createPracticeSamples(track), track);
  if (!reference.ok) throw Error(reference.message);
  const deviation = Math.max(...result.route.points.map(p => projectToPolyline(p, track.centerline, track.distances).distance));
  expect(deviation).toBeGreaterThan(minimumDeviation);
  expect(result.route.length).toBeLessThan(reference.route.length - 3);
  expect(distance(result.route.points[0], result.route.points.at(-1)!)).toBeLessThan(0.01);
  const race = new RaceSimulation(result.route, track, 1);
  for (let i = 0; i < 18000 && !race.state.finished; i++) race.step();
  expect(race.state.finished, JSON.stringify({ id, time: race.state.time, distance: race.state.distance, speed: race.state.speed, recovery: race.state.recoveryCount, collisions: race.state.collisionCount, position: race.state.position })).toBe(true);
  expect(race.state.lapTimes).toHaveLength(1);
}, 30000);

test('manual Hop remains usable on an unmarked open-sand cut', () => {
  const track = circuits.find(c => c.id === 'coastal-launch')!.track;
  const result = compileRoute(insideCut(track, 32, 85), track);
  if (!result.ok) throw Error(result.message);
  expect(result.route.hopShortcuts).toBeUndefined();
  const race = new RaceSimulation(result.route, track, 1);
  let hopped = false;
  for (let i = 0; i < 18000 && !race.state.finished; i++) {
    if (!hopped && race.state.sandAmount > 0.5 && race.state.movement === 'grounded') {
      race.pressHop(); hopped = true;
    }
    race.step();
  }
  expect(hopped).toBe(true);
  expect(race.state.hopCount).toBe(1);
  expect(race.state.finished).toBe(true);
}, 30000);
