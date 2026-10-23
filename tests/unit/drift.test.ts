import { describe, expect, test } from 'vitest';
import { angleDelta, cumulative, distance } from '../../src/core/geometry';
import type { CompiledRoute, TrackDefinition } from '../../src/core/types';
import { compileRoute, createPracticeSamples, COMPILER_VERSION, gestureSpeeds, paceToSpeed, PACE_RANGE } from '../../src/core/route';
import { RaceSimulation, RULES, sampleSurface } from '../../src/core/simulation';
import fixtures from '../fixtures/handling-v8.json';
const coastalTrack=fixtures[0].track as TrackDefinition;

function route(seconds: number) {
  const result = compileRoute(createPracticeSamples(coastalTrack, seconds), coastalTrack);
  if (!result.ok) throw new Error(result.message);
  return result.route;
}
function measure(seconds: number) {
  const simulation = new RaceSimulation(route(seconds), coastalTrack);
  let maxError = 0, sandTime = 0, maxAsphaltSpeedLoss = 0, maxSandSpeedLoss = 0, recovered = false, leftRoad = false;
  for (let i = 0; i < 18000 && !simulation.state.finished; i++) {
    const previous = simulation.state.speed;
    simulation.step(); const s = simulation.state;
    maxError = Math.max(maxError, s.lineError); sandTime += s.sandAmount * RULES.dt;
    if (s.sandAmount > 0.5) { leftRoad = true; maxSandSpeedLoss = Math.max(maxSandSpeedLoss, previous - s.speed); }
    else if (s.sandAmount === 0) maxAsphaltSpeedLoss = Math.max(maxAsphaltSpeedLoss, previous - s.speed);
    if (leftRoad && s.sandAmount === 0 && s.lineError < 1 && !s.drifting) recovered = true;
    expect(Number.isFinite(s.position.x + s.position.z + s.speed + s.heading)).toBe(true);
  }
  return { simulation, maxError, sandTime, maxAsphaltSpeedLoss, maxSandSpeedLoss, recovered };
}

describe('momentum, steering recovery and real surfaces', () => {
  test('a fast plan can exceed the former 28 m/s cruising speed without thrust', () => {
    expect(PACE_RANGE.max).toBe(30);
    const sim = new RaceSimulation(route(2), coastalTrack);
    sim.state.speed = 28;
    sim.state.velocity = { x: Math.sin(sim.state.heading) * 28, z: Math.cos(sim.state.heading) * 28 };
    for (let i = 0; i < 60; i++) sim.step();
    expect(sim.state.speed).toBeGreaterThan(29);
    expect(sim.state.thrustCount).toBe(0);
  });
  test('excess corner speed leaves the line, reaches sand and recovers without teleporting', () => {
    const fast = measure(2), careful = measure(14);
    expect(fast.maxError).toBeGreaterThan(7); expect(fast.sandTime).toBeGreaterThan(1);
    expect(fast.recovered).toBe(true); expect(fast.simulation.state.finished).toBe(true);
    expect(careful.maxError).toBeLessThan(1.2); expect(careful.sandTime).toBe(0);
    expect(careful.simulation.state.driftCount).toBe(0);
    // Tire saturation never invokes a one-frame speed multiplier or a delayed speed cap.
    expect(fast.maxAsphaltSpeedLoss).toBeLessThanOrEqual(RULES.braking * RULES.dt + 1e-8);
    expect(fast.maxSandSpeedLoss).toBeGreaterThan(fast.maxAsphaltSpeedLoss);
  });
  test('sand has lower grip/response and actual-position drag reduces speed immediately', () => {
    const r = route(7), road = new RaceSimulation(r, coastalTrack), sand = new RaceSimulation(r, coastalTrack);
    for (const sim of [road, sand]) { sim.state.speed = 20; sim.state.velocity = { x: 20, z: 0 }; sim.state.heading = Math.PI / 2; sim.state.desiredSpeed = 20; }
    sand.state.position.z -= 9;
    const asphaltSurface = sampleSurface(road.state.position, coastalTrack), sandSurface = sampleSurface(sand.state.position, coastalTrack);
    expect(asphaltSurface.sandAmount).toBe(0); expect(sandSurface.sandAmount).toBe(1);
    expect(sandSurface.grip).toBeLessThan(asphaltSurface.grip); expect(sandSurface.response).toBeLessThan(asphaltSurface.response);
    road.step(); sand.step(); expect(sand.state.speed).toBeLessThan(road.state.speed - 0.2);
    // Returning to asphalt has no lingering sand timer or debuff.
    const recovered = new RaceSimulation(r, coastalTrack);
    Object.assign(recovered.state, structuredClone(sand.state)); recovered.state.position = { ...road.state.position };
    const twin = new RaceSimulation(r, coastalTrack); Object.assign(twin.state, structuredClone(recovered.state));
    recovered.state.sandAmount = 1; recovered.state.surface = 'sand'; twin.state.sandAmount = 0; twin.state.surface = 'asphalt';
    recovered.step(); twin.step(); expect(recovered.state.speed).toBe(twin.state.speed); expect(recovered.state.sandAmount).toBe(0);
  });
  test('steering direction and momentum diverge during a drift; the car does not snap to the line', () => {
    const sim = new RaceSimulation(route(2), coastalTrack); let observed = false;
    for (let i = 0; i < 12000 && !sim.state.finished; i++) {
      const previous = { ...sim.state.position }; sim.step(); const s = sim.state;
      expect(distance(previous, s.position)).toBeLessThanOrEqual(RULES.maxSpeed * RULES.dt + 1e-8);
      if (s.drifting && s.lineError > 3) {
        expect(Math.abs(angleDelta(Math.atan2(s.velocity.x, s.velocity.z), s.heading))).toBeGreaterThan(RULES.driftEndAngle);
        observed = true;
      }
    }
    expect(observed).toBe(true);
  });
  test('drifting on asphalt preserves constant requested speed with no grip penalty', () => {
    const points = Array.from({ length: 181 }, (_, i) => ({ x: Math.sin(i / 180 * Math.PI * 2) * 9, z: Math.cos(i / 180 * Math.PI * 2) * 9 }));
    const distances = cumulative(points), length = distances.at(-1)!;
    const track: TrackDefinition = { id: 'wide-circle', version: 1, name: 'Tire test', centerline: points, distances, length, roadWidth: 100, carWidth: 2.2, carLength: 5.2, barriers: [], start: points[0], checkpoints: [] };
    const r: CompiledRoute = { version: COMPILER_VERSION, trackId: track.id, trackVersion: track.version, length, drawingDuration: 2, points: points.map((p, i) => ({ ...p, distance: distances[i], desiredSpeed: 25, curvature: 1 / 9 })) };
    const sim = new RaceSimulation(r, track); sim.state.speed = 25; sim.state.velocity = { x: 25, z: 0 };
    let driftSeen = false;
    for (let i = 0; i < 300 && !sim.state.finished; i++) {
      sim.step(); driftSeen ||= sim.state.drifting;
      expect(sim.state.sandAmount).toBe(0); expect(sim.state.speed).toBeCloseTo(25, 6); expect(sim.state.desiredSpeed).toBe(25);
    }
    expect(driftSeen).toBe(true);
  });
  test('the same sideways momentum aligns more slowly on sand', () => {
    const r = route(7), road = new RaceSimulation(r, coastalTrack), sand = new RaceSimulation(r, coastalTrack);
    for (const sim of [road, sand]) { sim.state.speed = 20; sim.state.velocity = { x: 20, z: 0 }; sim.state.heading = Math.PI / 2 + 0.5; sim.state.desiredSpeed = 20; }
    sand.state.position.z -= 9; road.step(); sand.step();
    const roadTurn = Math.abs(angleDelta(Math.PI / 2, Math.atan2(road.state.velocity.x, road.state.velocity.z)));
    const sandTurn = Math.abs(angleDelta(Math.PI / 2, Math.atan2(sand.state.velocity.x, sand.state.velocity.z)));
    expect(roadTurn).toBeGreaterThan(sandTurn * 2); expect(Math.abs(sand.state.slipAngle)).toBeGreaterThan(Math.abs(road.state.slipAngle));
  });
  test('route progress cannot award laps while the physical car is stranded far away', () => {
    const sim = new RaceSimulation(route(2), coastalTrack);
    for (let i = 0; i < 6000; i++) { sim.state.position = { x: 250, z: 250 }; sim.state.velocity = { x: 0, z: 0 }; sim.state.speed = 0; sim.step(); }
    expect(sim.state.finished).toBe(false); expect(sim.state.lapTimes).toHaveLength(0); expect(sim.state.checkpoint).toBe(1);
  });
  test('drawn pace produces smooth acceleration and braking with bounded jerk', () => {
    const r = route(7); r.points.forEach((point, i) => { point.desiredSpeed = i < r.points.length / 4 ? 25 : 9; });
    const sim = new RaceSimulation(r, coastalTrack); let minimum = 0, maximum = 0;
    for (let i = 0; i < 6000 && !sim.state.finished; i++) {
      const previous = sim.state.acceleration; sim.step(); const acceleration = sim.state.acceleration;
      expect(Math.abs(acceleration - previous)).toBeLessThanOrEqual(RULES.accelerationJerk * RULES.dt + 1e-8);
      minimum = Math.min(minimum, acceleration); maximum = Math.max(maximum, acceleration);
    }
    expect(minimum).toBeLessThan(-1); expect(maximum).toBeGreaterThan(1);
  });
});

test('slightly wider shared gesture filter reduces brief pace oscillations and preserves a steady gesture', () => {
  let time = 0;
  const samples = Array.from({ length: 401 }, (_, i) => {
    if (i) time += 30 + 12 * Math.sin(i * 0.55);
    return { x: i * 0.5, z: 0, time };
  });
  const ds = cumulative(samples);
  const old = samples.map((p, i) => {
    let a = i, b = i;
    while (a > 0 && ds[a] > ds[i] - 4) a--;
    while (b < samples.length - 1 && ds[b] < ds[i] + 4) b++;
    return paceToSpeed((ds[b] - ds[a]) / Math.max(0.016, (samples[b].time - samples[a].time) / 1000), 100);
  });
  const variation = (values: number[]) => {
    const interior = values.slice(25, -25), mean = interior.reduce((a, b) => a + b, 0) / interior.length;
    return interior.reduce((sum, p) => sum + (p - mean) ** 2, 0) / interior.length;
  };
  expect(variation(gestureSpeeds(samples, 100))).toBeLessThan(variation(old));
  const steady = gestureSpeeds(samples.map((p, i) => ({ ...p, time: i * 30 })), 100);
  for (const speed of steady) expect(speed).toBeCloseTo(paceToSpeed(0.5 / 0.03, 100), 8);
});

test('small geometric and timestamp jitter is filtered without erasing deliberate pace', () => {
  const samples = createPracticeSamples(coastalTrack, 7);
  const noisy = samples.map((point, i) => i === 0 || i === samples.length - 1 ? point : ({
    x: point.x + Math.sin(i * 2.2) * 0.3, z: point.z + Math.cos(i * 2.2) * 0.3,
    time: point.time + Math.sin(i * 2.2) * Math.min(point.time - samples[i - 1].time, samples[i + 1].time - point.time) * 0.25,
  }));
  const baseline = route(7), result = compileRoute(noisy, coastalTrack);
  if (!result.ok) throw new Error(result.message);
  const maxPaceStep = Math.max(...result.route.points.slice(1).map((point, i) => Math.abs(point.desiredSpeed - result.route.points[i].desiredSpeed)));
  expect(maxPaceStep).toBeLessThan(0.5);
  const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  expect(Math.abs(average(result.route.points.map(p => p.desiredSpeed)) - average(baseline.points.map(p => p.desiredSpeed)))).toBeLessThan(1.5);
  expect(route(14).points[30].desiredSpeed).toBeLessThan(result.route.points[30].desiredSpeed - 3);
});
