import { describe, expect, test } from 'vitest';
import { barrierContact, blockedRouteSection, sweepVehicle } from '../../src/core/barriers';
import { compileRoute, createPracticeSamples, gestureSpeeds } from '../../src/core/route';
import { coastalTrack } from '../../src/core/track';
import { RaceSimulation, RULES } from '../../src/core/simulation';
import { cumulative, distance, mix, projectToPolyline } from '../../src/core/geometry';
import { buildRoadsterGeometry } from '../../src/presentation/roadster-geometry.js';
import type { TrackDefinition } from '../../src/core/types';

const wallTrack: TrackDefinition = { ...coastalTrack, barriers: [{ id: 'test-wall', height: 1, footprint: [{ x: 5, z: -10 }, { x: 5.5, z: -10 }, { x: 5.5, z: 10 }, { x: 5, z: 10 }] }] };
describe('solid track boundaries', () => {
  test.each([36, 42])('a swept full car cannot tunnel through a thin wall at %i m/s', speed => {
    const result = sweepVehicle({ x: 0, z: 0 }, { x: 12, z: 0 }, Math.PI / 2, Math.PI / 2, { x: speed, z: 0 }, wallTrack);
    expect(result.collided).toBe(true); expect(result.position.x).toBeLessThanOrEqual(2.401);
    expect(result.velocity.x).toBeCloseTo(0); expect(result.impact).toBe(speed);
    expect(barrierContact(result.position, Math.PI / 2, wallTrack)).toBeNull();
  });
  test('glancing contact keeps tangent motion and repeated impacts remain finite', () => {
    let p = { x: 2, z: -3 };
    for (let i = 0; i < 30; i++) {
      const result = sweepVehicle(p, { x: p.x + 0.4, z: p.z + 0.1 }, Math.PI / 2, Math.PI / 2, { x: 24, z: 6 }, wallTrack);
      p = result.position; expect(Number.isFinite(p.x + p.z)).toBe(true); expect(p.x).toBeLessThan(2.41); expect(result.velocity.z).toBeGreaterThan(0);
      expect(barrierContact(p, Math.PI / 2, wallTrack)).toBeNull();
    }
    expect(p.z).toBeGreaterThan(-1);
  });
  test('clearance checks include the nose, long segments, and wall endpoints', () => {
    expect(barrierContact({ x: 3, z: 0 }, Math.PI / 2, wallTrack)).not.toBeNull();
    expect(blockedRouteSection([{ x: -20, z: 0 }, { x: 20, z: 0 }], wallTrack)).not.toBeNull();
    expect(blockedRouteSection([{ x: -20, z: 15 }, { x: 20, z: 15 }], wallTrack)).toBeNull();
    const r = sweepVehicle({ x: 3, z: 12 }, { x: 6, z: 9 }, Math.PI / 2, Math.PI / 2, { x: 30, z: -30 }, wallTrack);
    expect(r.collided).toBe(true); expect(barrierContact(r.position, Math.PI / 2, wallTrack)?.depth ?? 0).toBeLessThan(0.01);
  });
  test('inner islands preserve at least five metres of runoff', () => {
    for (const barrier of coastalTrack.barriers) {
      let min = Infinity;
      for (let i = 0; i < barrier.footprint.length; i++) for (let j = 0; j <= 20; j++) {
        const p = mix(barrier.footprint[i], barrier.footprint[(i + 1) % barrier.footprint.length], j / 20);
        min = Math.min(min, projectToPolyline(p, coastalTrack.centerline, coastalTrack.distances).distance - coastalTrack.roadWidth / 2);
      }
      expect(min, `${barrier.id} runoff: ${min.toFixed(2)}m`).toBeGreaterThanOrEqual(barrier.runoffException === 'cut-protection' ? 2 : 5);
    }
  });
  test('a line through a solid is accepted; the car crashes, is reset just past it with a penalty and finishes', () => {
    const normal = createPracticeSamples(coastalTrack), clean = compileRoute(normal, coastalTrack); if (!clean.ok) throw new Error(clean.message);
    expect(clean.route.hazards).toBeUndefined();
    const blockedTrack = { ...coastalTrack, barriers: [{ id: 'blocking-fixture', height: 1, footprint: [{ x: -5, z: -40 }, { x: 0, z: -40 }, { x: 0, z: -20 }, { x: -5, z: -20 }] }] };
    const result = compileRoute(normal, blockedTrack); if (!result.ok) throw new Error(result.message);
    const [hazard] = result.route.hazards ?? [];
    expect(hazard?.kind).toBe('barrier'); expect(hazard.to).toBeGreaterThan(hazard.from);
    const sim = new RaceSimulation(result.route, blockedTrack, 1), events: { type: string; penalty?: number }[] = [];
    let resetAt = -1;
    for (let i = 0; i < 60 * 240 && !sim.state.finished; i++) { sim.step(); for (const e of sim.drainEvents()) { events.push(e); if (e.type === 'recovery' && resetAt < 0) resetAt = sim.state.distance; } }
    expect(sim.state.finished).toBe(true);
    const recovery = events.find(e => e.type === 'recovery');
    expect(recovery?.penalty).toBeCloseTo(hazard.course / RULES.hazardPenaltySpeed, 6);
    expect(resetAt).toBeCloseTo(hazard.to, 6);
    const reference = new RaceSimulation(clean.route, coastalTrack, 1); for (let i = 0; i < 60 * 240 && !reference.state.finished; i++) reference.step();
    expect(sim.state.finishTime!).toBeGreaterThan(reference.state.finishTime!);
  });
  test('track versions prevent accidentally racing obsolete geometry', () => {
    const r = compileRoute(createPracticeSamples(coastalTrack), coastalTrack); if (!r.ok) throw new Error(r.message);
    expect(() => new RaceSimulation({ ...r.route, trackVersion: 1 }, coastalTrack)).toThrow('older circuit');
  });
  test('blocked cars recover without gaining progress or refilling thrust', () => {
    const recoveryTrack={...coastalTrack,barriers:[{id:'recovery-fixture',height:1,footprint:[{x:-25,z:-15.5},{x:-10,z:-15.5},{x:-10,z:-10},{x:-25,z:-10}]}]};
    const r = compileRoute(createPracticeSamples(coastalTrack), coastalTrack); if (!r.ok) throw new Error(r.message);
    const sim = new RaceSimulation(r.route, recoveryTrack);
    const state = sim.state; state.position = { x: -18, z: -18.11 }; state.heading = 0; state.speed = 0;
    state.thrustReadyAt = 50;
    // Hold the body into a wall to reproduce an otherwise unrecoverable impact.
    for (let i = 0; i < 180 && !state.recoveryCount; i++) { state.position = { x: -18, z: -18.11 }; state.heading = 0; state.velocity = { x: 0, z: 10 }; state.speed = 10; sim.step(); }
    expect(state.recoveryCount).toBe(1); expect(state.distance).toBe(0); expect(state.thrustReadyAt).toBe(50);
    const at = state.time; sim.pressThrust(); sim.step(); expect(state.time).toBeGreaterThan(at); expect(state.speed).toBe(0); expect(state.thrustCount).toBe(0);
    expect(distance(state.position, coastalTrack.start)).toBeLessThan(0.1);
  });
});
test('live pace uses shared timing and keeps faster strokes faster', () => {
  const slow = gestureSpeeds(createPracticeSamples(coastalTrack, 20), coastalTrack.length), fast = gestureSpeeds(createPracticeSamples(coastalTrack, 2), coastalTrack.length);
  expect(fast[50]).toBeGreaterThan(slow[50] + 10);
});
test('the racing Roadster fits the physical envelope and its detail budget', () => {
  const g = buildRoadsterGeometry('race'), parts = [...Object.values(g.body), ...g.wheels.flatMap(w => [...Object.values(w.spin), ...Object.values(w.fixed), ...Object.values(w.spin), ...Object.values(w.fixed)])];
  expect(parts.reduce((n, p) => n + p.p.length / 9, 0)).toBeLessThanOrEqual(10000);
  expect(parts.every(p => p.p.every(Number.isFinite) && p.n.every(Number.isFinite))).toBe(true);
  const body = Object.values(g.body).flatMap(p => p.p), scale = 2.2 / 2.0201642066907674;
  expect((Math.max(...body.filter((_, i) => i % 3 === 0)) - Math.min(...body.filter((_, i) => i % 3 === 0))) * scale).toBeLessThanOrEqual(5.2);
});
