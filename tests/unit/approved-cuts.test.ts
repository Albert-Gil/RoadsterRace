import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { barrierContact, sweepVehicle } from '../../src/core/barriers';
import { cumulative, lerp, samplePolyline } from '../../src/core/geometry';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
import { RULES } from '../../src/core/rules';
import { flightGravity } from '../../src/core/support';
import type { TrackDefinition } from '../../src/core/types';

// Numbering matches the user's 2026-10-27 review maps, independently per venue.
const choices = [
  { id: 'coastal-launch', label: 1, from: 42, skip: 72, blocker: 'apex-rocks' },
  { id: 'orbital-launchyard', label: 1, from: 222, skip: 114, blocker: 'utility-storage-tower' },
  { id: 'orbital-launchyard', label: 2, from: 174, skip: 78 },
  { id: 'golden-gate', label: 1, from: 54, skip: 102, blocker: 'market-annex' },
  { id: 'golden-gate', label: 2, from: 120, skip: 84, blocker: 'median-arcade' },
  { id: 'golden-gate', label: 3, from: 174, skip: 72 },
  { id: 'la-nights', label: 1, from: 48, skip: 78 },
] as const;

function cut(track: TrackDefinition, from: number, skip: number) {
  const to = from + skip;
  const a = samplePolyline(track.centerline, track.distances, from), b = samplePolyline(track.centerline, track.distances, to);
  const chord = Array.from({ length: 101 }, (_, i) => ({ x: lerp(a.x, b.x, i / 100), z: lerp(a.z, b.z, i / 100) }));
  const points = [...track.centerline.filter((_, i) => track.distances[i] < from), ...chord,
    ...track.centerline.filter((_, i) => track.distances[i] > to)];
  const ds = cumulative(points);
  return { chord, a, b, heading: Math.atan2(b.x - a.x, b.z - a.z),
    samples: points.map((p, i) => ({ ...p, time: ds[i] / ds.at(-1)! * 12000 })) };
}

const hopPeak = RULES.hopLaunchSpeed ** 2 / (2 * flightGravity('hop'));

for (const choice of choices) {
  const track = circuits.find(c => c.id === choice.id)!.track;
  test(`${track.name} review cut ${choice.label}: ${'blocker' in choice ? 'physical blocker' : 'kept open'}`, () => {
    const path = cut(track, choice.from, choice.skip), result = compileRoute(path.samples, track);
    expect(result.ok, result.ok ? undefined : result.message).toBe(true);
    if (!result.ok) return;
    if ('blocker' in choice) {
      const barrier = track.barriers.find(b => b.id === choice.blocker)!;
      expect(barrier.height).toBeGreaterThan(1);
      // Landscaped/service parcels use the established protected-infield rule.
      // Low visible boundaries replace the oversized solids without opening Hop cuts.
      const physical = { ...track, barriers: [barrier] };
      expect(path.chord.some(p => barrierContact(p, path.heading, physical, 0, hopPeak, true))).toBe(true);
      for (const height of [0, hopPeak]) {
        const impact = sweepVehicle(path.a, path.b, path.heading, path.heading,
          { x: Math.sin(path.heading) * 42, z: Math.cos(path.heading) * 42 }, physical, height, height, true);
        expect(impact.collided).toBe(true);
      }
      expect(result.route.hazards?.some(h => h.kind === 'barrier')).toBe(true);
    } else {
      expect(path.chord.some(p => barrierContact(p, path.heading, track))).toBe(false);
      expect(result.route.hazards ?? []).toHaveLength(0);
      const race = new RaceSimulation(result.route, track, 1);
      for (let i = 0; i < 18000 && !race.state.finished; i++) race.step();
      expect(race.state.finished).toBe(true);
      expect(race.state.recoveryCount).toBe(0);
    }
  }, 30000);
}

test('LA turn-2 cross-city cut meets a real building, while the channel jump and backlot remain intact', () => {
  const track = circuits.find(c => c.id === 'la-nights')!.track;
  const barrier = track.barriers.find(b => b.id === 'studio-connector')!;
  const physical = { ...track, barriers: [barrier] };
  expect(sweepVehicle({ x: 24, z: -12 }, { x: 24, z: 60 }, 0, 0, { x: 0, z: 42 }, physical, hopPeak, hopPeak, false).collided).toBe(true);
  for (const branch of [true, 'backlot-alley'] as const) {
    const result = compileRoute(createPracticeSamples(track, 7, branch), track);
    expect(result.ok, result.ok ? undefined : result.message).toBe(true);
    if (result.ok) expect(result.route.hazards ?? []).toHaveLength(0);
  }
});

test('normal plans and Launchsite’s original Hop lane remain free of the new blockers', () => {
  for (const track of circuits.map(c => c.track)) {
    const result = compileRoute(createPracticeSamples(track), track);
    expect(result.ok, result.ok ? undefined : `${track.name}: ${result.message}`).toBe(true);
    if (result.ok) expect(result.route.hazards ?? [], track.name).toHaveLength(0);
  }
  const track = circuits.find(c => c.id === 'orbital-launchyard')!.track;
  const result = compileRoute(createPracticeSamples(track, 7, 'service-hop'), track);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.route.hazards ?? []).toHaveLength(0);
});
