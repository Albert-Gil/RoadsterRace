import { describe, expect, test } from 'vitest';
import { orbitalTrack as track } from '../../src/core/tracks/orbital';
import { launchsiteRocketStages, launchsiteYardTank } from '../../src/core/tracks/venue-parcels';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
import { computerRoute } from '../../src/core/computer';
import { assessHopShortcuts, permittedHopBarriers } from '../../src/core/hop-shortcuts';
import { barrierContact, insideBarrier, sweepVehicle } from '../../src/core/barriers';
import { roadEdges } from '../../src/core/road-geometry';
import { RULES } from '../../src/core/rules';
import { flightGravity } from '../../src/core/support';
import { detours } from '../support/detours';

// Owner requests 2026-11-01 (track v10): close the cut from the S across the sand to the hairpin
// with a rocket yard whose height decides what a Hop can clear (a tall row toward the launch
// complex, a low tip near the corner apex), and let a manual Hop clear the low wing between the
// hairpin legs.
const hopPeak = RULES.hopLaunchSpeed ** 2 / (2 * flightGravity('hop'));

describe('rocket yard', () => {
  const yard = track.barriers.find(b => b.id === 'rocket-yard')!;
  const only = (...ids: string[]) => ({ ...track, barriers: track.barriers.filter(b => ids.includes(b.id)) });
  // The reported diagonal, the slot inside the S, both ends of the yard and a line through the stages.
  const cuts = [
    [[60, 5], [46, 17], [34, 29], [22, 41]],
    [[22, 9], [19, 19], [15, 30]],
    [[14, 12], [9, 22], [12, 31]],
    [[72, 2], [84, 18], [70, 38], [30, 44]],
    [[40, 12], [60, 40]],
  ];
  test.each(cuts)('a line from the straight to the hairpin meets the yard (%j)', (...coordinates) => {
    const points = coordinates.map(([x, z]) => ({ x, z })), physical = only('rocket-yard', 'rocket-yard-tip-hop-barrier', 'launch-complex');
    for (const height of [0, hopPeak]) {
      let hit = false;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], h = Math.atan2(b.x - a.x, b.z - a.z);
        hit ||= sweepVehicle(a, b, h, h, { x: Math.sin(h) * 42, z: Math.cos(h) * 42 }, physical, height, height, true).collided;
      }
      expect(hit).toBe(true);
    }
  });
  test('no off-road path between the straight and the hairpin beats the road by more than its own runoff lines', () => {
    const box = { minX: -60, maxX: 125, minZ: -50, maxZ: 95 }, from = [120, 140, 160, 180, 200], to = [240, 260, 280, 300, 330];
    const open = detours(track, box, from, to, { cell: 0.75 }), road = detours(track, box, from, to, { cell: 0.75, corridor: track.roadWidth / 2 + 2 });
    // Before v10 the diagonal across the sand saved about 25 m more than any on-road line.
    for (const [i, r] of open.entries()) expect(r.saving - road[i].saving, `${r.from} → ${r.to}`).toBeLessThan(2.5);
  }, 60000);
  test('a continuous row taller than a Hop stands across the yard, low enough not to hide the straight', () => {
    const tank = track.barriers.find(b => b.id === launchsiteYardTank.id)!;
    const row = [tank, ...launchsiteRocketStages.map(s => track.barriers.find(b => b.id === s.id)!)]
      .map(b => ({ b, x0: Math.min(...b.footprint.map(p => p.x)), x1: Math.max(...b.footprint.map(p => p.x)), z0: Math.min(...b.footprint.map(p => p.z)) }))
      .sort((a, b) => a.x0 - b.x0);
    const tip = track.barriers.find(b => b.id === 'rocket-yard-tip-hop-barrier')!;
    expect(row[0].x0 - Math.max(...tip.footprint.map(p => p.x))).toBeLessThan(track.carWidth / 2);
    expect(row.at(-1)!.x1).toBeGreaterThanOrEqual(86); // up to the launch complex (x = 87)
    for (const [i, { b, x0, z0 }] of row.entries()) {
      expect(b.footprint.every(p => insideBarrier(p, yard))).toBe(true);
      const top = (b.baseHeight ?? 0) + b.height;
      // Taller than a manual Hop reaches (8.03 m) by a clear margin.
      expect(top, b.id).toBeGreaterThan(hopPeak + 1);
      // The fixed camera looks down at 42°: ground up to 1.11 × height behind each solid is hidden;
      // the straight's road edge is at z = 16.
      expect(z0 - top / Math.tan(42 * Math.PI / 180), b.id).toBeGreaterThan(16);
      if (i) expect(x0 - row[i - 1].x1, `gap before ${b.id}`).toBeLessThan(track.carWidth);
    }
  });
  test('the tip near the corner apex is low enough to Hop over', () => {
    const tip = track.barriers.find(b => b.id === 'rocket-yard-tip-hop-barrier')!;
    expect(tip.height).toBeLessThanOrEqual(1.5); expect(tip.kind).toBe('service-barrier');
    expect(track.hopShortcuts!.find(h => h.obstacleId === tip.id)?.id).toBe('rocket-yard-tip-hop');
  });
});

// Each lane: where a player presses Hop on the practice line, and a point inside its obstacle.
const lanes = [
  { id: 'utility-wing-hop', press: (s: RaceSimulation['state']) => Math.abs(s.position.x + 2) < 6 && s.position.z > 31 && s.position.z < 36 && s.velocity.z > 5, rearm: (s: RaceSimulation['state']) => s.position.z < 25 && s.position.x < 6, over: { x: -2, z: 42 }, beside: { x: -13, z: 41 }, besideId: 'utility-storage-tower' },
  { id: 'rocket-yard-tip-hop', press: (s: RaceSimulation['state']) => s.position.x > 10 && s.position.x < 30 && s.position.z > 11 && s.position.z < 15 && s.velocity.z > 3, rearm: (s: RaceSimulation['state']) => s.position.z < 0, over: { x: 18, z: 22.4 }, beside: { x: 30, z: 23 }, besideId: 'rocket-yard' },
];

describe.each(lanes)('Hop lane $id', ({ id, press, rearm, over, beside, besideId }) => {
  const lane = track.hopShortcuts!.find(h => h.id === id)!;
  const plan = (branch: string | false = lane.id) => {
    const r = compileRoute(createPracticeSamples(track, 7, branch), track); if (!r.ok) throw Error(r.message); return r.route;
  };
  test('the lane compiles without hazards and saves 25–40 metres', () => {
    const main = plan(false), hop = plan();
    expect(hop.hopShortcuts?.map(t => t.id)).toEqual([lane.id]); expect(hop.hazards ?? []).toHaveLength(0);
    expect(main.length - hop.length).toBeGreaterThanOrEqual(25); expect(main.length - hop.length).toBeLessThanOrEqual(40);
  });
  test('a Hop clears the obstacle; without one the car meets it', () => {
    for (const hop of [true, false]) {
      const sim = new RaceSimulation(plan(), track, 1);
      for (let i = 0; i < 18000 && !sim.state.finished; i++) { if (hop && !sim.state.hopCount && press(sim.state)) sim.pressHop(); sim.step(); }
      expect(sim.state.finished).toBe(true);
      if (hop) { expect(sim.state.hopCount).toBe(1); expect(sim.state.collisionCount).toBe(0); expect(sim.state.recoveryCount).toBe(0); }
      else expect(sim.state.collisionCount).toBeGreaterThan(0);
    }
  });
  test('six laps with one Hop each finish cleanly', () => {
    const sim = new RaceSimulation(plan(), track, 6); let armed = true;
    for (let i = 0; i < 24000 && !sim.state.finished; i++) {
      const s = sim.state; if (rearm(s)) armed = true;
      if (armed && press(s)) { sim.pressHop(); armed = false; }
      sim.step();
    }
    expect(sim.state.finished).toBe(true); expect(sim.state.hopCount).toBe(6);
    expect(sim.state.collisionCount).toBe(0); expect(sim.state.recoveryCount).toBe(0);
  }, 60000);
  test('only a compiled traversal in manual flight, moving forward inside the lane, makes the obstacle passable', () => {
    const route = plan(), sim = new RaceSimulation(route, track), s = sim.state, t = route.hopShortcuts![0];
    Object.assign(s, { position: over, distance: (t.entryDistance + t.exitDistance) / 2, heading: 0, speed: 22, velocity: { x: 0, z: 22 }, movement: 'airborne', flightOrigin: 'hop' });
    expect(permittedHopBarriers(s, route, track)).toEqual([lane.obstacleId]);
    expect(permittedHopBarriers({ ...s, flightOrigin: 'ramp' }, route, track)).toEqual([]);
    expect(permittedHopBarriers({ ...s, velocity: { x: 0, z: -22 } }, route, track)).toEqual([]);
    expect(permittedHopBarriers(s, plan(false), track)).toEqual([]);
    const permit = [lane.obstacleId];
    expect(barrierContact(over, 0, track, 0, hopPeak, true, permit)).toBeNull();
    expect(barrierContact(over, 0, track, 0, hopPeak, true)?.barrier.id).toBe(lane.obstacleId);
    // The protected parcel beside the lane stays solid, even in an approved flight.
    expect(barrierContact(beside, 0, track, 0, hopPeak, true, permit)?.barrier.id).toBe(besideId);
  });
  test('ordinary lines, reversed lines and lines past the obstacle ends never commit to the lane', () => {
    for (const offset of [-6, -4, 4, 6]) {
      const raw = createPracticeSamples(track), edge = roadEdges(track.centerline, Math.abs(offset) * 2)[offset < 0 ? 0 : 1];
      const result = compileRoute(raw.map((p, i) => ({ ...p, ...edge[i] })), track);
      expect(result.ok).toBe(true); if (result.ok) expect(result.route.hopShortcuts).toBeUndefined();
    }
    expect(assessHopShortcuts([...lane.branch].reverse(), track).obstacles).toEqual([]);
    expect(assessHopShortcuts(lane.branch.map(p => ({ x: p.x - 9, z: p.z })), track).obstacles).toEqual([]);
    expect(assessHopShortcuts(lane.branch, track).obstacles).toEqual([lane.obstacleId]);
  });
});

test.each(['easy', 'normal', 'hard'] as const)('%s CPUs keep the course at Launchsite', difficulty => {
  for (let i = 0; i < 3; i++) expect(computerRoute(track, difficulty, i, 42).hopShortcuts).toBeUndefined();
});
