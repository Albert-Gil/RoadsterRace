import { describe, expect, test } from 'vitest';
import { grandCanyonTrack } from '../../src/core/tracks/grand-canyon';
import { laNightsTrack } from '../../src/core/tracks/la-nights';
import { orbitalTrack } from '../../src/core/tracks/orbital';
import { shortcutProjection } from '../../src/core/hop-shortcuts';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { cumulative, distance, samplePolyline } from '../../src/core/geometry';
import { RaceSimulation } from '../../src/core/simulation';
import { rng } from '../support/strokes';
import type { DrawSample, RaceState, TrackDefinition } from '../../src/core/types';

// A hand-drawn Hop-lane lap: the practice line through the lane with slow wander of up to
// `wander` metres, cut bends and finger jitter. Wander of 4–6 m leaves the lane's gates and
// edges, which the strict gate-to-gate reading (compiler v14) rejected, leaving the obstacle solid.
function handDrawnHopLap(track: TrackDefinition, laneId: string, wander: number, cut: number, jitter: number, seed: number): DrawSample[] {
  // A clean shorter Canyon line needs a quicker gesture to clear its mandatory crest
  // with the full enlarged car. Wandering strokes already travel farther in the same time.
  const duration = track.id === 'grand-canyon' && wander === 0 ? 6500 : 7000;
  const base = createPracticeSamples(track, duration / 1000, laneId), ds = cumulative(base), length = ds.at(-1)!, random = rng(seed);
  const at = (s: number) => samplePolyline(base, ds, Math.max(0, Math.min(length, s)));
  const phase = [random() * 6.28, random() * 6.28], samples: DrawSample[] = [];
  for (let s = 0; s <= length; s += 1.2) {
    const a = at(s - 3), b = at(s), c = at(s + 3), d = distance(a, c) || 1, normal = { x: -(c.z - a.z) / d, z: (c.x - a.x) / d };
    const turn = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x), curvature = 2 * turn / Math.max(1e-6, distance(a, b) * distance(b, c) * d);
    const offset = wander * (Math.sin(s / 37 + phase[0]) * 0.7 + Math.sin(s / 13 + phase[1]) * 0.3) + Math.sign(curvature) * Math.min(cut * 6, cut * Math.abs(curvature) * 120);
    samples.push({ x: b.x + normal.x * offset + (random() - 0.5) * 2 * jitter, z: b.z + normal.z * offset + (random() - 0.5) * 2 * jitter, time: s / length * duration });
  }
  return samples;
}

describe.each([laNightsTrack, orbitalTrack, grandCanyonTrack] as TrackDefinition[])('$id Hop lane accepts a hand-drawn line', track => {
  const lane = track.hopShortcuts![0], obstacle = track.barriers.find(b => b.id === lane.obstacleId)!;
  const center = { x: obstacle.footprint.reduce((v, p) => v + p.x, 0) / obstacle.footprint.length, z: obstacle.footprint.reduce((v, p) => v + p.z, 0) / obstacle.footprint.length };
  const obstacleAt = shortcutProjection(center, lane).progress;
  // A player pressing Hop shortly before the obstacle while driving up the lane.
  const approaching = (s: RaceState) => {
    const q = shortcutProjection(s.position, lane), ahead = obstacleAt - q.progress, heading = Math.atan2(s.velocity.x, s.velocity.z);
    return q.distance < lane.width / 2 && ahead > 0 && ahead < Math.max(6, s.speed * 0.42) && Math.cos(heading - q.heading) > 0.5;
  };
  const race = (samples: DrawSample[], hop: boolean) => {
    const result = compileRoute(samples, track); if (!result.ok) throw new Error(result.message);
    const sim = new RaceSimulation(result.route, track, 1); let recoveries = 0;
    for (let i = 0; i < 9000 && !sim.state.finished; i++) {
      if (hop && approaching(sim.state)) sim.pressHop();
      sim.step(); for (const e of sim.drainEvents()) if (e.type === 'recovery') recoveries++;
    }
    return { route: result.route, state: sim.state, recoveries };
  };

  test.each([[0, 0, 0, 1], [4, 1, 0.5, 1], [4, 1, 0.5, 2], [6, 1, 0.6, 3]])('wander %s m, cut %s, jitter %s m (seed %s): recognised and cleared with Hop', (wander, cut, jitter, seed) => {
    const { route, state, recoveries } = race(handDrawnHopLap(track, lane.id, wander, cut, jitter, seed), true);
    expect(route.hopShortcuts?.map(t => t.id)).toEqual([lane.id]);
    expect(state.finished).toBe(true); expect(state.hopCount).toBeGreaterThanOrEqual(1); expect(recoveries).toBe(0);
  }, 60000);

  test('the obstacle still stops a car that does not Hop', () => {
    const { route, state, recoveries } = race(handDrawnHopLap(track, lane.id, 4, 1, 0.5, 1), false);
    expect(route.hopShortcuts?.map(t => t.id)).toEqual([lane.id]);
    expect(state.finished).toBe(true); expect(recoveries).toBeGreaterThanOrEqual(1);
  }, 60000);
});
