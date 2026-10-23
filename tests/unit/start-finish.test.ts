import { describe, expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { cityBuildings, buildingFootprint, onCityLand } from '../../src/content/golden-city';
import { goldenGateTrack as golden } from '../../src/core/tracks/golden-gate';
import { compileRoute, createPracticeSamples, COMPILER_VERSION } from '../../src/core/route';
import { canStartDrawing, gateCoordinates, gatePoint, startGate, trimDrawing } from '../../src/core/start-finish';
import { blockedRouteSection, insideBarrier, sweepVehicle, barrierContact } from '../../src/core/barriers';
import { distance } from '../../src/core/geometry';
import { RaceSimulation } from '../../src/core/simulation';
import type { DrawSample, TrackDefinition } from '../../src/core/types';

function planned(track: TrackDefinition, first = 0, last = first) {
  return createPracticeSamples(track, 7).map((p, i, all) => {
    const ds = track.distances[i], remaining = track.length - ds;
    const across = ds < 24 ? first * (1 - ds / 24) : remaining < 24 ? last * (1 - remaining / 24) : 0;
    const g = startGate(track);
    return { ...p, x: p.x + g.forward.z * across, z: p.z - g.forward.x * across };
  });
}
function success(samples: DrawSample[], track: TrackDefinition) {
  const result = compileRoute(samples, track); if (!result.ok) throw new Error(result.message); return result;
}
for (const { track } of circuits) describe(`${track.id} full-width drawing`, () => {
  test.each([-1, 0, 1])('start and finish at lateral edge %i', side => {
    const edge = side * track.roadWidth / 2;
    expect(canStartDrawing(gatePoint(track, edge), track)).toBe(true);
    const result = success(planned(track, edge), track);
    expect(result.route.version).toBe(COMPILER_VERSION);
    expect(distance(result.route.points[0], gatePoint(track, edge))).toBeLessThan(0.02);
  });
  test('tolerances are projected to the gate; touchdown beyond the approach is rejected', () => {
    expect(canStartDrawing(gatePoint(track, track.roadWidth / 2 + 0.5, -12), track)).toBe(true);
    expect(canStartDrawing(gatePoint(track, 0, -12.01), track)).toBe(false);
    expect(canStartDrawing(gatePoint(track, track.roadWidth / 2 + 0.51), track)).toBe(false);
    expect(canStartDrawing(gatePoint(track, 0, 1.01), track)).toBe(false);
    const input = planned(track); input[0] = { ...gatePoint(track, track.roadWidth / 2 + 0.4, 0.6), time: 0 };
    const trim = trimDrawing(input, track); expect(trim.ok).toBe(true);
    if (trim.ok) expect(Math.abs(gateCoordinates(trim.samples[0], track).across)).toBeCloseTo(track.roadWidth / 2, 8);
  });
  test('12 m slow lead-in, pause and backward correction contribute no geometry, pace or duration', () => {
    const lap = planned(track), reference = success(lap, track);
    const prefix = [-12, -5, -8, -2].map((along, i) => ({ ...gatePoint(track, 0, along), time: i * 7000 }));
    const withLead = success([...prefix, ...lap.map(p => ({ ...p, time: p.time + 28000 }))], track);
    expect(withLead.route.length).toBe(reference.route.length);
    expect(withLead.route.drawingDuration).toBe(reference.route.drawingDuration);
    expect(withLead.route.points.map(p => [p.x, p.z])).toEqual(reference.route.points.map(p => [p.x, p.z]));
    expect(Math.max(...withLead.route.points.map((p, i) => Math.abs(p.desiredSpeed - reference.route.points[i].desiredSpeed)))).toBeLessThan(1e-9); expect(withLead.drawing!.leadIn.length).toBeGreaterThan(3);
  });
  test('sparse crossings interpolate position and timestamp without a false braking section', () => {
    const base = planned(track), first = base[1];
    const along = gateCoordinates(first, track).along;
    const samples = [{ ...gatePoint(track, 0, -along), time: 0 }, ...base.slice(1).map(p => ({ ...p, time: p.time + first.time }))];
    const trim = trimDrawing(samples, track); expect(trim.ok).toBe(true);
    if (trim.ok) { expect(distance(trim.samples[0], track.start)).toBeLessThan(0.01); expect(trim.samples[1].time).toBeCloseTo(first.time); }
  });
  test('opposite-side endpoints join forward at the shared anchor and race six laps', () => {
    const result = success(planned(track, -track.roadWidth / 2 + 0.2, track.roadWidth / 2 - 0.2), track), points = result.route.points;
    expect(result.drawing!.joined).toBe(true); expect(distance(points[0], points.at(-1)!)).toBeLessThan(1e-6);
    const accepted = trimDrawing(planned(track, -track.roadWidth / 2 + 0.2, track.roadWidth / 2 - 0.2), track);
    if (!accepted.ok) throw new Error(accepted.message);
    const midpoint = (gateCoordinates(accepted.samples[0], track).across + gateCoordinates(accepted.samples.at(-1)!, track).across) / 2;
    expect(gateCoordinates(points[0], track).across).toBeCloseTo(midpoint, 8);
    const before = gateCoordinates(points.at(-2)!, track), after = gateCoordinates(points[1], track);
    expect(before.along).toBeLessThan(0); expect(after.along).toBeGreaterThan(0);
    expect(Math.abs(before.across - midpoint)).toBeLessThan(1e-5); expect(Math.abs(after.across - midpoint)).toBeLessThan(1e-5);
    expect(blockedRouteSection(points, track)).toBeNull();
    const sim = new RaceSimulation(result.route, track, 6);
    for (let i = 0; i < 24000 && !sim.state.finished; i++) sim.step();
    expect(sim.state.finished).toBe(true); expect(sim.state.lapTimes).toHaveLength(6);
  });
  test('first finish crossing discards arbitrary later movement, pauses, reversals and extra laps', () => {
    const lap = planned(track), end = lap.at(-1)!;
    const short = success([...lap, { ...gatePoint(track, 0, 3.9), time: end.time + 100 }], track);
    expect(short.route).toEqual(success(lap, track).route); expect(short.drawing!.tail.length).toBeGreaterThan(1);
    const reference = success(lap, track).route;
    const tails = [
      [{ ...gatePoint(track, 0, 60), time: end.time + 100 }],
      [{ x: 1000, z: -1000, time: end.time + 30000 }, { ...gatePoint(track, 0, -30), time: end.time + 31000 }],
      lap.slice(1).map(p => ({ ...p, time: p.time + end.time })),
    ];
    for (const tail of tails) {
      const result = success([...lap, ...tail], track);
      expect(result.route).toEqual(reference);
      expect(result.drawing!.tail.length).toBeGreaterThan(1);
    }
    expect(compileRoute([...lap].reverse().map((p, i) => ({ ...p, time: i * 30 })), track).ok).toBe(false);
  });
  test('sparse finish crossing trims interpolated time before an unrestricted tail', () => {
    const lap = planned(track), end = lap.at(-1)!, before = { ...gatePoint(track, 0, -2), time: end.time - 100 };
    const prefix = lap.filter(p => p.time < before.time);
    const short = success([...prefix, before, { ...gatePoint(track, 0, 2), time: end.time + 100 }], track);
    const long = success([...prefix, before, { ...gatePoint(track, 0, 18), time: end.time + 900 }, { x: 1000, z: 1000, time: end.time + 10000 }], track);
    expect(long.route).toEqual(short.route);
    expect(long.route.drawingDuration).toBeCloseTo(end.time / 1000, 8);
  });
});

test('an otherwise valid retained line is rejected when its lap connection would cross a solid', () => {
  const footprint = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([across, along]) => gatePoint(golden, across, along));
  const blocked = { ...golden, barriers: [...golden.barriers, { id: 'seam-obstacle', height: 1, footprint }] };
  const raw = planned(blocked, -5, 5);
  expect(blockedRouteSection(raw, blocked)).toBeNull();
  const result = compileRoute(raw, blocked); expect(result.ok).toBe(false);
  if (!result.ok) expect(result.message).toContain('barrier');
});

describe('authored Golden Gate city and narrow bridge', () => {
  test('all building footprints have land and protected foundations', () => {
    for (const b of cityBuildings) for (const point of buildingFootprint(b)) {
      expect(onCityLand(point), b.id).toBe(true);
      expect(golden.barriers.some(w => w.kind === 'infield' && insideBarrier(point, w)), b.id).toBe(true);
    }
  });
  test('the widened city course has an 88 m by 16 m deck and 15.3 m between straight rails', () => {
    expect(golden.version).toBe(3); expect(golden.length).toBeGreaterThan(430); expect(golden.length).toBeLessThan(520);
    const b = golden.bridges![0]; expect(distance(b.from, b.to)).toBe(88); expect(b.width).toBe(16);
    const straightRails = golden.barriers.filter(b => b.id.endsWith('-3') && b.kind === 'bridge-rail');
    expect(straightRails).toHaveLength(2);
    const edges = straightRails.map(r => r.footprint.map(p => p.z)).sort((a, b) => Math.min(...a) - Math.min(...b));
    expect(Math.min(...edges[1]) - Math.max(...edges[0])).toBeCloseTo(15.3, 5);
    const area = golden.centerline.slice(1).reduce((sum, p, i) => sum + golden.centerline[i].x * p.z - p.x * golden.centerline[i].z, 0);
    expect(area).toBeLessThan(0);
  });
  test('bridge excursions fail vehicle-clearance validation before and after smoothing', () => {
    const route = planned(golden).map(p => ({ ...p, z: p.x > -30 && p.x < 30 && p.z > 40 ? p.z + 8 : p.z }));
    const result = compileRoute(route, golden); expect(result.ok).toBe(false);
    if (!result.ok) { expect(result.message).toContain('barrier'); expect(result.section).toBeDefined(); }
    expect(blockedRouteSection([{ x: 0, z: 42 }, { x: 0, z: 60 }], golden)).not.toBeNull();
  });
  test.each([0, 0.2, 1.4])('high speed rail contact with angle %i cannot tunnel, and glancing motion survives', angle => {
    const heading = -Math.PI / 2 + angle;
    const r = sweepVehicle({ x: 0, z: 42 }, { x: -8, z: 51 }, heading, heading, { x: -42, z: 30 }, golden);
    expect(r.collided).toBe(true); expect(r.position.z).toBeLessThan(49.65);
    expect(barrierContact(r.position, heading, golden)?.depth ?? 0).toBeLessThan(0.01);
    expect(r.velocity.x).toBeLessThan(-20);
  });
});
