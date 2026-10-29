import { expect, test } from 'vitest';
import { santaMonicaTrack as track } from '../../src/core/tracks/santa-monica';
import { compileRoute, createPracticeSamples, sampleRoute } from '../../src/core/route';
import { FixedStepClock, RaceSimulation, RULES } from '../../src/core/simulation';
import { LocalRace } from '../../src/core/local-race';
import { vehicleContact, sweptContact } from '../../src/core/vehicle-contact';
import { sweepVehicle } from '../../src/core/barriers';
import { parseTournament } from '../../src/presentation/tournament-storage';
import { createTournament, finalizeRound } from '../../src/core/tournament';
import { circuits } from '../../src/content/circuits';
import { defaultPreferences } from '../../src/presentation/race-settings';
import { distance } from '../../src/core/geometry';
import { jumpPoint, assessSupports, vehicleSupported, supported, inFootprint } from '../../src/core/support';
import { santaMonicaBuildings } from '../../src/content/santa-monica-art';

const jumpSamples = (seconds = 7) => createPracticeSamples(track, seconds, true);
test('Santa Monica has a complete bypass and a shorter valid jump branch', () => {
  expect(track.centerline.slice(1).reduce((sum, p, i) => sum + track.centerline[i].x * p.z - p.x * track.centerline[i].z, 0)).toBeLessThan(0);
  expect(track.length).toBeGreaterThanOrEqual(520); expect(track.length).toBeLessThanOrEqual(700);
  const bypass = compileRoute(createPracticeSamples(track), track), jump = compileRoute(jumpSamples(), track);
  expect(bypass, JSON.stringify(bypass)).toMatchObject({ ok: true });
  expect(jump, JSON.stringify(jump)).toMatchObject({ ok: true });
  if (!bypass.ok || !jump.ok) return;
  expect(jump.route.jumps).toEqual(['pacific-hop']); expect(bypass.route.jumps).toBeUndefined();
  expect(bypass.route.length - jump.route.length).toBeGreaterThan(24);
});
test.each([20, 30, 42])('aligned %i m/s takeoff lands on the physical receiving deck', speed => {
  const r = compileRoute(jumpSamples(), track); if (!r.ok) throw new Error(r.message);
  const sim = new RaceSimulation(r.route, track, 1), s = sim.state, j = track.jumps![0];
  s.position = jumpPoint(j, 7.9); s.elevation = 1.185; s.heading = Math.PI / 2; s.speed = speed; s.velocity = { x: speed, z: 0 };
  s.distance = r.route.points.reduce((best, p) => distance(p, s.position) < distance(sampleRoute(r.route, best), s.position) ? p.distance : best, 0);
  let flew = false, landed = false;
  for (let i = 0; i < 240; i++) { sim.step(); for (const event of sim.drainEvents()) { flew ||= event.type === 'takeoff'; landed ||= event.type === 'landing'; } if (landed) break; }
  expect(flew).toBe(true); expect(landed).toBe(true); expect(s.recoveryCount).toBe(0); expect(vehicleSupported(s.position, s.heading, track)).toBe(true);
});
test('unauthorized water crossings are marked unsupported, never authorized as a jump', () => {
  const across = Array.from({ length: 31 }, (_, i) => ({ x: 40 + i, z: -30 }));
  const assessed = assessSupports(across, track);
  expect(assessed.jumps).toEqual([]); expect(assessed.unsupported.some(Boolean)).toBe(true);
});
test('every building and amusement foundation has authored support', () => {
  for (const b of santaMonicaBuildings) for (const side of [-1, 1]) for (const end of [-1, 1]) {
    expect(inFootprint({ x: b.x + side * b.width / 2, z: b.z + end * b.depth / 2 }, track.supports![0].footprint), b.kind).toBe(true);
  }
  for (const p of [{ x: 77, z: -24 }, { x: 114, z: -38 }, { x: 85, z: -31 }, { x: 113, z: -35 }]) expect(supported(p, track)).toBe(true);
});
test('sideways departures and simultaneous missed jumps recover without appearing inside another car', () => {
  const r = compileRoute(jumpSamples(), track); if (!r.ok) throw new Error(r.message);
  const sideways = new RaceSimulation(r.route, track);
  Object.assign(sideways.state, { position: jumpPoint(track.jumps![0], 7.9), elevation: 1.185, heading: Math.PI / 2, speed: 30, velocity: { x: 9, z: 28.62 } });
  for (let i = 0; i < 240 && !sideways.state.recoveryCount; i++) sideways.step();
  expect(sideways.state.recoveryCount).toBe(1); expect(sideways.state.activeJump).toBeNull();
  const race = new LocalRace([r.route, r.route], track); race.tick = 400;
  for (const sim of race.racers) Object.assign(sim.state, { tick: 400, time: race.time, position: jumpPoint(track.jumps![0],13), elevation: -2.1, verticalVelocity: -8, movement: 'airborne', velocity: { x: 0, z: 0 } });
  let waited = false;
  for (let i = 0; i < 240; i++) {
    race.step(); waited ||= race.racers.some(r => r.state.recoveryWaiting);
    const visible = race.racers.filter(r => r.state.time >= r.state.recoveringUntil && !r.state.recoveryWaiting);
    if (visible.length === 2) expect(vehicleContact(visible[0].state, visible[1].state, track)).toBeNull();
  }
  expect(waited).toBe(true); expect(race.racers.every(r => r.state.recoveryCount === 1)).toBe(true);
});
test.each([false, true])('six-lap complete physical race (jump=%s)', jump => {
  // The shorter jump branch needs a faster gesture to retain a 20+ m/s approach
  // with the enlarged capsule's rear fully clearing the receiving edge.
  const r = compileRoute(createPracticeSamples(track, jump ? 6.5 : 7, jump), track); if (!r.ok) throw new Error(r.message);
  const race = new RaceSimulation(r.route, track, 6); let flights = 0, landings = 0;
  for (let tick = 0; tick < 24000 && !race.state.finished; tick++) {
    race.step(); for (const e of race.drainEvents()) { if (e.type === 'takeoff') flights++; if (e.type === 'landing') landings++; }
  }
  expect(race.state.finished, JSON.stringify(race.state)).toBe(true); expect(race.state.lapTimes).toHaveLength(6);
  if (jump) { expect(flights).toBeGreaterThanOrEqual(6); expect(landings).toBeGreaterThanOrEqual(6); }
}, 15000);
test('slow takeoff splashes, restores safe progress, clears commands and preserves the clock/recharge', () => {
  const r = compileRoute(jumpSamples(24), track); if (!r.ok) throw new Error(r.message);
  const sim = new RaceSimulation(r.route, track, 1), s = sim.state, events: string[] = [];
  for (let tick = 0; tick < 7000 && !events.includes('splash'); tick++) { sim.step(); events.push(...sim.drainEvents().map(e => e.type)); }
  expect(events).toContain('takeoff'); expect(events).toContain('splash'); expect(events).toContain('recovery');
  expect(s.position.x).toBeLessThan(track.jumps![0].branch[0].x+1); expect(s.elevation).toBe(0); expect(s.movement).toBe('grounded'); expect(s.speed).toBe(0);
  expect(s.distance).toBeLessThan(track.jumps![0].entryProgress); expect(s.checkpoint).toBeLessThanOrEqual(Math.floor(s.distance / (r.route.length / 8)) + 1);
  const time = s.time; sim.pressThrust(); for (let i = 0; i < 65; i++) sim.step();
  expect(s.time).toBeGreaterThan(time + 1); expect(s.thrustCount).toBe(0);
});
test('midair thrust changes horizontal momentum without tire steering, braking or sand drag', () => {
  const r = compileRoute(jumpSamples(), track); if (!r.ok) throw new Error(r.message);
  const a = new RaceSimulation(r.route, track), b = new RaceSimulation(r.route, track);
  for (const sim of [a, b]) Object.assign(sim.state, { position: jumpPoint(track.jumps![0],11), velocity: { x: 22, z: 0 }, speed: 22, heading: Math.PI / 2, elevation: 1.6, verticalVelocity: 1, movement: 'airborne' });
  a.pressThrust(); a.step(); b.step();
  expect(a.state.velocity.x).toBeGreaterThan(b.state.velocity.x); expect(b.state.velocity.x).toBe(22); expect(b.state.heading).toBe(Math.PI / 2);
  expect(a.state.verticalVelocity).toBe(b.state.verticalVelocity); expect(a.state.thrustCount).toBe(1); expect(a.state.drifting).toBe(false);
});
test('height-aware swept car contacts and landing-edge collisions do not snap cars onto the deck', () => {
  const body = (x: number, elevation: number) => ({ position: { x, z: -12 }, velocity: { x: 30, z: 0 }, heading: Math.PI / 2, elevation });
  expect(vehicleContact(body(70, 2), body(70, 0), track)).toBeNull(); expect(vehicleContact(body(70, 0.6), body(70, 0), track)).not.toBeNull();
  expect(sweptContact(body(65, 2), body(75, 2), body(70, 0), body(70, 0), track)).toBeNull();
  expect(sweptContact(body(65, 2), body(75, 0), body(70, 0), body(70, 0), track)).not.toBeNull();
  const wall = sweepVehicle(jumpPoint(track.jumps![0],13), jumpPoint(track.jumps![0],23), Math.PI / 2, Math.PI / 2, { x: 42, z: 0 }, track, -0.4);
  expect(wall.collided).toBe(true); expect(wall.position.x).toBeLessThan(track.jumps![0].from.x+18); expect(wall.velocity.x).toBeLessThan(1);
});
test('jump commands retain identical results across 30/60/120 Hz rendering and fresh rematches', () => {
  const r = compileRoute(jumpSamples(), track); if (!r.ok) throw new Error(r.message);
  const results = [30, 60, 120].map(fps => {
    const sim = new RaceSimulation(r.route, track, 1), clock = new FixedStepClock();
    for (let i = 0; i < fps * 180 && !sim.state.finished; i++) clock.advance(1 / fps, () => { if (sim.state.tick % 300 === 0) sim.pressThrust(); sim.step(); });
    expect(sim.state.finished).toBe(true); return sim.state.finishTime!;
  });
  expect(Math.max(...results) - Math.min(...results)).toBeLessThan(RULES.dt);
  const rematch = new LocalRace([r.route, r.route], track); expect(rematch.ghostStartRemaining).toBe(5); expect(rematch.racers.every(r => r.state.elevation === 0 && r.state.movement === 'grounded')).toBe(true);
});
test('obsolete track/rules tournaments cannot migrate after widening; current schedules still resume',()=>{
 const rounds=circuits.map(c=>({circuitId:c.id,trackVersion:c.track.version})),state=createTournament(rounds,2,6),drivers=defaultPreferences().drivers.slice(0,2);
 const saved={state,drivers};expect(parseTournament(JSON.stringify(saved))?.state).toEqual(state);
 expect(parseTournament(JSON.stringify({...saved,state:{...state,compilerVersion:8}}))).toBeNull();
 expect(parseTournament(JSON.stringify({...saved,state:{...state,rounds:rounds.map(r=>({...r,trackVersion:r.trackVersion-1}))}}))).toBeNull();
});
