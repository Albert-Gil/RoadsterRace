import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { angleDelta, cumulative, distance, samplePolyline } from '../../src/core/geometry';
import { COMPILER_VERSION, compileRoute, createPracticeSamples, sampleRoute } from '../../src/core/route';
import { FixedStepClock, RaceSimulation, RULES } from '../../src/core/simulation';
import { LocalRace } from '../../src/core/local-race';
import { shouldComputerHop, stepComputers } from '../../src/core/computer';
import { jumpPoint, vehicleSupported } from '../../src/core/support';
import { vehicleContact } from '../../src/core/vehicle-contact';
import { LapRecorder, lapRecordKey, replayPose } from '../../src/core/lap-replay';
import { PointerOwnership } from '../../src/input/ownership';
import type { CompiledRoute, TrackDefinition } from '../../src/core/types';

const centerline = [{ x: 0, z: 0 }, { x: 0, z: 200 }, { x: 200, z: 200 }, { x: 200, z: 0 }, { x: 0, z: 0 }];
const distances = cumulative(centerline);
const flat: TrackDefinition = { id: 'hop-test', version: 1, name: 'Hop fixture', centerline, distances, length: 800, roadWidth: 16, carWidth: 2.2, carLength: 5.2, start: centerline[0], checkpoints: [], barriers: [] };
const line: CompiledRoute = { trackId: flat.id, trackVersion: flat.version, version: COMPILER_VERSION, length: 800, drawingDuration: 7,
  points: Array.from({ length: 801 }, (_, d) => ({ ...samplePolyline(centerline, distances, d), distance: d, desiredSpeed: 30, curvature: 0 })) };
function moving(sim: RaceSimulation, speed: number, heading = 0) {
  Object.assign(sim.state, { speed, velocity: { x: Math.sin(heading) * speed, z: Math.cos(heading) * speed }, heading });
}
test.each(circuits)('$id supports an independent manual hop without new support metadata', ({ track }) => {
  const r = compileRoute(createPracticeSamples(track, 7), track); if (!r.ok) throw Error(r.message);
  const sim = new RaceSimulation(r.route, track), events: string[] = []; sim.pressHop();
  let peak = 0, airtime = 0;
  for (let tick = 0; tick < 80; tick++) { sim.step(); peak = Math.max(peak, sim.state.elevation); events.push(...sim.drainEvents().map(e => e.type)); if (events.includes('landing')) { airtime = sim.state.time; break; } }
  expect(events).toContain('hop'); expect(events).toContain('landing'); expect(airtime).toBeCloseTo(0.95, 1);
  expect(peak).toBeCloseTo(4.014, 2); expect(sim.state.hopReadyAt).toBe(7); expect(sim.state.hopCount).toBe(1); expect(sim.state.thrustCount).toBe(0);
});
test('moving hops preserve speed in flight, suppress tire forces and keep thrust independent', () => {
  const sim = new RaceSimulation(line, flat); moving(sim, 20); sim.pressHop();
  for (let i = 0; i < 30; i++) sim.step();
  expect(sim.state.speed).toBeCloseTo(20, 10); expect(sim.state.acceleration).toBe(0); expect(sim.state.drifting).toBe(false);
  sim.pressThrust(); sim.step(); expect(sim.state.speed).toBeGreaterThan(20); expect(sim.state.thrustCount).toBe(1); expect(sim.state.hopCount).toBe(1);
  const together = new RaceSimulation(line, flat); together.pressHop(); together.pressThrust(); together.step();
  expect(together.state.hopCount).toBe(1); expect(together.state.thrustCount).toBe(1);
});
test('hop commands never buffer through flight/cooldown/recovery/finish and clear independently', () => {
  const sim = new RaceSimulation(line, flat); sim.pressHop(); sim.step();
  for (let i = 0; i < 200; i++) { sim.pressHop(); sim.step(); }
  for (let i = 0; i < 230; i++) sim.step();
  expect(sim.state.hopCount).toBe(1); sim.pressHop(); sim.step(); expect(sim.state.hopCount).toBe(2);
  const reset = new RaceSimulation(line, flat); reset.pressHop(); reset.pressThrust(); reset.clearCommands(); reset.step();
  expect(reset.state.hopCount + reset.state.thrustCount).toBe(0);
  reset.state.recoveringUntil = 1; reset.pressHop(); reset.step();
  for (let i = 0; i < 70; i++) reset.step(); expect(reset.state.hopCount).toBe(0);
  reset.state.finished = true; reset.pressHop(); reset.step(); expect(reset.state.hopCount).toBe(0);
});
test('guidance ignores body yaw, preserves momentum magnitude, and never rescues reverse travel', () => {
  const a = new RaceSimulation(line, flat), b = new RaceSimulation(line, flat);
  for (const sim of [a, b]) moving(sim, 25, 0.2);
  a.state.heading = -0.35; b.state.heading = 0.35; a.pressHop(); b.pressHop(); a.step(); b.step();
  expect(a.state.position).toEqual(b.state.position); expect(a.state.velocity).toEqual(b.state.velocity); expect(a.state.speed).toBeCloseTo(25, 10);
  const reverse = new RaceSimulation(line, flat); moving(reverse, 20, Math.PI); reverse.pressHop(); reverse.step();
  expect(reverse.state.velocity.z).toBeLessThan(-19);
});
test('hop cannot pass above a protected low wall, even at the apex', () => {
  const track = { ...flat, barriers: [{ id: 'protected', height: 0.2, footprint: [{ x: -10, z: 10 }, { x: 10, z: 10 }, { x: 10, z: 11 }, { x: -10, z: 11 }] }] };
  const sim = new RaceSimulation(line, track); moving(sim, 20); sim.pressHop();
  for (let i = 0; i < 50; i++) sim.step();
  expect(sim.state.position.z).toBeLessThan(10 - flat.carLength / 2); expect(sim.state.collisionCount).toBeGreaterThan(0);
});
test('an unauthorized water hop recovers without awarding course progress or queuing abilities', () => {
  const rect = (a: number, b: number) => [{ x: -10, z: a }, { x: 10, z: a }, { x: 10, z: b }, { x: -10, z: b }];
  const track = { ...flat, supports: [{ id: 'land', footprint: rect(-100, 250) }], waterOpenings: [{ id: 'gap', footprint: rect(9, 20) }] };
  const sim = new RaceSimulation(line, track); moving(sim, 20); sim.pressHop(); sim.pressThrust();
  for (let i = 0; i < 110 && sim.state.recoveryCount === 0; i++) sim.step();
  expect(sim.state.recoveryCount).toBe(1); expect(sim.state.distance).toBe(0); expect(sim.state.checkpoint).toBe(1);
  expect(sim.state.hopReadyAt).toBe(7); expect(sim.state.thrustReadyAt).toBe(5); expect(sim.state.time).toBeGreaterThanOrEqual(0.9); expect(sim.state.speed).toBe(0);
});
test.each([20, 30, 42].flatMap(speed => [-20, 0, 20].map(yaw => ({ speed, yaw }))))('ramp guidance lands at $speed m/s with body yaw $yaw degrees and sideways drift', ({ speed, yaw }) => {
  const track = circuits[3].track, jump = track.jumps![0], r = compileRoute(createPracticeSamples(track, 7, true), track); if (!r.ok) throw Error(r.message);
  const sim = new RaceSimulation(r.route, track), s = sim.state;
  s.position = jumpPoint(jump, 7.9); s.elevation = 1.185; moving(sim, speed, Math.PI / 2 + 0.15); s.heading = Math.PI / 2 + yaw * Math.PI / 180;
  s.distance = r.route.points.reduce((best, p) => distance(p, s.position) < distance(sampleRoute(r.route, best), s.position) ? p.distance : best, 0);
  let landed = false;
  for (let i = 0; i < 240 && !landed; i++) { sim.step(); landed = sim.drainEvents().some(e => e.type === 'landing'); }
  expect(landed).toBe(true); expect(s.recoveryCount).toBe(0); expect(vehicleSupported(s.position, s.heading, track)).toBe(true);
});
test('hop on a ramp uses local height and cannot stack a second lip impulse', () => {
  const track = circuits[3].track, jump = track.jumps![0], r = compileRoute(createPracticeSamples(track, 7, true), track); if (!r.ok) throw Error(r.message);
  const sim = new RaceSimulation(r.route, track); sim.state.position = jumpPoint(jump, 7); moving(sim, 30, Math.PI / 2); sim.pressHop();
  sim.step(); expect(sim.state.elevation).toBeGreaterThan(1.05); expect(sim.state.verticalVelocity).toBeLessThan(17);
  const events = sim.drainEvents().map(e => e.type);
  for (let i = 0; i < 100 && !events.includes('landing'); i++) { sim.step(); events.push(...sim.drainEvents().map(e => e.type)); }
  expect(events).toContain('landing'); expect(events).not.toContain('takeoff'); expect(sim.state.recoveryCount).toBe(0);
});
test('CPU hops require traffic, a clear straight and landing, readiness, and an ended ghost start', () => {
  const race = new LocalRace([line, line], flat), a = race.racers[0], b = race.racers[1];
  a.gridPending = b.gridPending = false; a.state.position = { x: 0, z: 56 }; b.state.position = { x: 0, z: 50 };
  a.state.distance = 56; b.state.distance = 50; moving(a, 10); moving(b, 30);
  expect(shouldComputerHop(race, 1)).toBe(false);
  race.tick = 240; a.state.tick = b.state.tick = 240; a.state.time = b.state.time = 4;
  expect(shouldComputerHop(race, 1)).toBe(true); stepComputers(race, 'normal'); race.step(); expect(b.state.hopCount).toBe(1);
  expect(shouldComputerHop(race, 1)).toBe(false);
  b.state.movement = 'grounded'; b.state.hopReadyAt = 0; a.state.position.x = 10; expect(shouldComputerHop(race, 1)).toBe(false);
});
test('height-separated cars have no contact; landing-height envelopes still collide', () => {
  const body = (y: number) => ({ position: { x: 0, z: 0 }, heading: 0, velocity: { x: 0, z: 20 }, elevation: y });
  expect(vehicleContact(body(1.2), body(0), flat)).toBeNull(); expect(vehicleContact(body(0.9), body(0), flat)).not.toBeNull();
});
test('simultaneous recoveries sharing a safe point admit one car, then release the waiting car', () => {
  const race = new LocalRace([line, line], flat); race.tick = 240;
  for (const sim of race.racers) {
    sim.gridPending = false;
    Object.assign(sim.state, { position: { x: 0, z: 0 }, velocity: { x: 0, z: 0 }, heading: 0, speed: 0, time: 4, tick: 240,
      recoveringUntil: 4, recoveryWaiting: true, recoveryCount: 1, hopReadyAt: 10, thrustReadyAt: 8 });
  }
  race.step(); expect(race.racers.filter(r => !r.state.recoveryWaiting)).toHaveLength(1);
  expect(race.racers.every(r => r.state.distance < 0.01 && r.state.hopReadyAt === 10 && r.state.thrustReadyAt === 8)).toBe(true);
  for (let i = 0; i < 180; i++) {
    race.step(); const [a, b] = race.racers.map(r => r.state);
    if (!a.recoveryWaiting && !b.recoveryWaiting) expect(vehicleContact(a, b, flat)?.depth ?? 0).toBeLessThan(0.01);
  }
  expect(race.racers.every(r => !r.state.recoveryWaiting)).toBe(true);
});
test('50 overlapping cycles per corner preserve both ability owners and cancellation', () => {
  const owners = new PointerOwnership();
  for (let cycle = 0; cycle < 50; cycle++) {
    for (let p = 0; p < 4; p++) { owners.down(p * 2, p, 'thrust'); owners.down(p * 2 + 1, p, 'hop'); }
    for (let p = 0; p < 4; p++) { expect(owners.active(p, 'thrust')).toBe(1); expect(owners.active(p, 'hop')).toBe(1); expect(owners.ability(p * 2 + 1)).toBe('hop'); }
    owners.up(1, true); expect(owners.active(0, 'thrust')).toBe(1); owners.clear();
    expect([0, 1, 2, 3].map(p => owners.active(p))).toEqual([0, 0, 0, 0]);
  }
});
test('recorded hop/thrust commands produce identical motion at 30/60/120 rendering Hz', () => {
  const results = [30, 60, 120].map(fps => {
    const sim = new RaceSimulation(line, flat), clock = new FixedStepClock();
    for (let frame = 0; frame < fps * 5; frame++) clock.advance(1 / fps, () => { if (sim.state.tick === 60) { sim.pressHop(); sim.pressThrust(); } sim.step(); });
    return sim.state;
  });
  expect(results[0]).toEqual(results[1]); expect(results[1]).toEqual(results[2]);
});
test('the cosmetic replay records real hop elevation without changing simulation', () => {
  const sim = new RaceSimulation(line, flat), recorder = new LapRecorder(lapRecordKey(flat)); recorder.sample(sim.state);
  sim.pressHop(); for (let i = 0; i < 80; i++) { sim.step(); recorder.sample(sim.state); }
  sim.state.lapTimes = [sim.state.time]; sim.state.finished = true; const record = recorder.sample(sim.state)!;
  expect(Math.max(...record.frames.map(f => f.y))).toBeGreaterThan(1.2);
  const before = structuredClone(sim.state); expect(replayPose(record, 0.5)!.y).toBeGreaterThan(1.2); expect(sim.state).toEqual(before);
});
