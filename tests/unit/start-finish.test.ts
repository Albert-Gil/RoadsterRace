import { describe, expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { cityBuildings, buildingFootprint, onCityLand } from '../../src/content/golden-city';
import { goldenGateTrack as golden } from '../../src/core/tracks/golden-gate';
import { compileRoute, createPracticeSamples, COMPILER_VERSION } from '../../src/core/route';
import { GATE_RULES, canStartDrawing, drawingStartBounds, gateCoordinates, gatePoint, startGate, trimDrawing } from '../../src/core/start-finish';
import { blockedRouteSection, insideBarrier, sweepVehicle, barrierContact } from '../../src/core/barriers';
import { distance, projectToPolyline } from '../../src/core/geometry';
import { RaceSimulation } from '../../src/core/simulation';
import type { DrawSample, TrackDefinition } from '../../src/core/types';
import { edgeDistance } from '../../src/presentation/landscape/mesh';

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
  test('the larger visible start rectangle agrees with acceptance and ignores the complete approach', () => {
    const bounds = drawingStartBounds(track);
    expect((bounds.to - bounds.from) * bounds.halfWidth * 2).toBeGreaterThanOrEqual(3 * 16 * 24);
    for (const p of bounds.corners) expect(canStartDrawing(p, track)).toBe(true);
    const lap = planned(track), reference = success(lap, track);
    const prefix = [-GATE_RULES.leadIn, -20, -8, -2].map((along, i) => ({ ...gatePoint(track, 0, along), time: i * 5000 }));
    const input = [...prefix, ...lap.map(p => ({ ...p, time: p.time + 20000 }))];
    const result = success(input, track);
    expect(result.route.points.map(p => [p.x, p.z, p.y])).toEqual(reference.route.points.map(p => [p.x, p.z, p.y]));
    expect(result.route.drawingDuration).toBeCloseTo(reference.route.drawingDuration, 9);
    expect(Math.max(...result.route.points.map((p, i) => Math.abs(p.desiredSpeed - reference.route.points[i].desiredSpeed)))).toBeLessThan(1e-9);
    expect(result.drawing!.leadIn.length).toBeGreaterThan(4);
  });
  test.each([-1, 0, 1])('start and finish at lateral edge %i', side => {
    const edge = side * track.roadWidth / 2;
    expect(canStartDrawing(gatePoint(track, edge), track)).toBe(true);
    const result = success(planned(track, edge), track);
    expect(result.route.version).toBe(COMPILER_VERSION);
    expect(distance(result.route.points[0], gatePoint(track, edge))).toBeLessThan(0.02);
  });
  test('generous start tolerances are projected to the gate; touchdown far from it is rejected', () => {
    const lateral = track.roadWidth / 2 + GATE_RULES.lateralTolerance;
    expect(canStartDrawing(gatePoint(track, lateral, -GATE_RULES.leadIn), track)).toBe(true);
    expect(canStartDrawing(gatePoint(track, 0, GATE_RULES.startBeyond), track)).toBe(true);
    expect(canStartDrawing(gatePoint(track, 0, -GATE_RULES.leadIn - 0.01), track)).toBe(false);
    expect(canStartDrawing(gatePoint(track, lateral + 0.01), track)).toBe(false);
    expect(canStartDrawing(gatePoint(track, 0, GATE_RULES.startBeyond + 0.01), track)).toBe(false);
    for (const start of [gatePoint(track, track.roadWidth / 2 + 3, 0.6), gatePoint(track, 0, 3)]) {
      const input = planned(track); input[0] = { ...start, time: 0 };
      const trim = trimDrawing(input, track); expect(trim.ok).toBe(true);
      if (trim.ok) { const at = gateCoordinates(trim.samples[0], track); expect(Math.abs(at.across)).toBeLessThanOrEqual(track.roadWidth / 2 + 1e-8); expect(Math.abs(at.along)).toBeLessThan(1e-8); }
    }
  });
  test('lifting shortly before the line, or finishing on the runoff beside it, still completes the lap', () => {
    const lap = planned(track), early = lap.filter((_, i) => track.length - track.distances[i] > 15);
    const closed = success(early, track);
    expect(distance(closed.route.points.at(-1)!, closed.route.points[0])).toBeLessThan(1e-6);
    const beside = trimDrawing([...lap.slice(0, -1), { ...gatePoint(track, track.roadWidth / 2 + 15, -3), time: lap.at(-1)!.time - 50 }, { ...gatePoint(track, track.roadWidth / 2 + 15, 3), time: lap.at(-1)!.time + 50 }], track);
    expect(beside.ok).toBe(true);
    const farAway = lap.filter((_, i) => track.distances[i] < track.length * 0.6);
    expect(compileRoute(farAway, track).ok).toBe(false);
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

test('a lap connection through a solid is accepted as a barrier hazard the car is reset past', () => {
  const footprint = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([across, along]) => gatePoint(golden, across, along));
  const blocked = { ...golden, barriers: [...golden.barriers, { id: 'seam-obstacle', height: 1, footprint }] };
  const raw = planned(blocked, -5, 5);
  expect(blockedRouteSection(raw, blocked)).toBeNull();
  const result = success(raw, blocked), hazards = result.route.hazards ?? [];
  expect(hazards.some(h => h.kind === 'barrier' && (h.from < 10 || h.to > result.route.length - 10))).toBe(true);
  const sim = new RaceSimulation(result.route, blocked, 2);
  for (let i = 0; i < 60 * 240 && !sim.state.finished; i++) sim.step();
  expect(sim.state.finished).toBe(true); expect(sim.state.lapTimes).toHaveLength(2);
});

describe('authored Golden Gate city and narrow bridge', () => {
  test('all building footprints have land and protected foundations', () => {
    for (const b of cityBuildings) for (const point of buildingFootprint(b)) {
      expect(onCityLand(point), b.id).toBe(true);
      expect(golden.barriers.some(w => (w.kind === 'infield' || w.kind === 'building') && (insideBarrier(point, w) || edgeDistance(point, w.footprint) < 1e-6)), b.id).toBe(true);
    }
  });
  test('the widened city course has an 88 m by 16 m deck and 15.3 m between straight rails', () => {
    expect(golden.version).toBe(7); expect(golden.length).toBeGreaterThan(430); expect(golden.length).toBeLessThan(520);
    const b = golden.bridges![0]; expect(distance(b.from, b.to)).toBe(88); expect(b.width).toBe(16);
    const straightRails = golden.barriers.filter(b => b.id.endsWith('-3') && b.kind === 'bridge-rail');
    expect(straightRails).toHaveLength(2);
    const edges = straightRails.map(r => r.footprint.map(p => p.z)).sort((a, b) => Math.min(...a) - Math.min(...b));
    expect(Math.min(...edges[1]) - Math.max(...edges[0])).toBeCloseTo(15.3, 5);
    const area = golden.centerline.slice(1).reduce((sum, p, i) => sum + golden.centerline[i].x * p.z - p.x * golden.centerline[i].z, 0);
    expect(area).toBeLessThan(0);
  });
  test('v4 park boulders stand on land, 12-14 m beyond the road edge, outside every city block', () => {
    const boulders = golden.barriers.filter(b => b.kind === 'rock');
    expect(boulders.map(b => b.id)).toEqual(['park-boulders-northwest', 'park-boulders-northeast', 'park-boulders-southwest', 'park-boulders-east']);
    const loop = [...golden.centerline, golden.centerline[0]], distances = [...golden.distances, golden.length];
    for (const b of boulders) {
      expect(b.height).toBeGreaterThan(1.5); expect(b.height).toBeLessThan(2);
      for (const p of b.footprint) expect(onCityLand(p), b.id).toBe(true);
      const edge = Math.min(...b.footprint.map(p => projectToPolyline(p, loop, distances).distance)) - golden.roadWidth / 2;
      expect(edge, b.id).toBeGreaterThan(12); expect(edge, b.id).toBeLessThan(14.5);
      expect(golden.barriers.some(w => w.kind === 'infield' && b.footprint.some(p => insideBarrier(p, w))), b.id).toBe(false);
    }
  });
  test('a bridge excursion is accepted as drawn; the car hits the rail, is reset past it and finishes slower', () => {
    const clean = success(planned(golden), golden), route = planned(golden).map(p => ({ ...p, z: p.x > -30 && p.x < 30 && p.z > 40 ? p.z + 8 : p.z }));
    const result = success(route, golden);
    expect(result.route.hazards?.some(h => h.kind === 'barrier')).toBe(true);
    expect(blockedRouteSection([{ x: 0, z: 42 }, { x: 0, z: 60 }], golden)).not.toBeNull();
    const race = (r: typeof clean) => { const sim = new RaceSimulation(r.route, golden, 1); for (let i = 0; i < 60 * 240 && !sim.state.finished; i++) sim.step(); return sim.state; };
    const crashed = race(result), reference = race(clean);
    expect(crashed.finished).toBe(true); expect(crashed.collisionCount + crashed.recoveryCount).toBeGreaterThan(0);
    expect(crashed.finishTime!).toBeGreaterThan(reference.finishTime!);
  });
  test.each([0, 0.2, 1.4])('high speed rail contact with angle %i cannot tunnel, and glancing motion survives', angle => {
    const heading = -Math.PI / 2 + angle;
    const r = sweepVehicle({ x: 0, z: 42 }, { x: -8, z: 51 }, heading, heading, { x: -42, z: 30 }, golden);
    expect(r.collided).toBe(true); expect(r.position.z).toBeLessThan(49.65);
    expect(barrierContact(r.position, heading, golden)?.depth ?? 0).toBeLessThan(0.01);
    expect(r.velocity.x).toBeLessThan(-20);
  });
});
