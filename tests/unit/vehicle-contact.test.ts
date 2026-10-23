import { describe, expect, test } from 'vitest';
import { LocalRace, gridPose } from '../../src/core/local-race';
import { vehicleContact, sweptContact, contactImpulse, CONTACT_RULES } from '../../src/core/vehicle-contact';
import { barrierContact } from '../../src/core/barriers';
import { circuits } from '../../src/content/circuits';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { coastalTrack } from '../../src/core/track';
import { RULES, RaceSimulation, sampleSurface } from '../../src/core/simulation';
const track = { ...coastalTrack, barriers: [], roadWidth: 500 };
const body = (x: number, z: number, vx = 0, vz = 0, heading = Math.PI / 2) => ({ position: { x, z }, velocity: { x: vx, z: vz }, heading });
function race() {
  const r = compileRoute(createPracticeSamples(coastalTrack), coastalTrack); if (!r.ok) throw new Error(r.message);
  const session = new LocalRace([r.route, r.route], track, 1);
  // Contact-response fixtures begin after the opening ghost period.
  session.tick = Math.round(CONTACT_RULES.ghostStartSeconds / RULES.dt);
  session.racers.forEach(sim => { sim.state.tick = session.tick; sim.state.time = session.time; });
  return session;
}
describe('physical multiplayer contact', () => {
  test.each([2, 3, 4])('%i cars move independently through overlaps for the first three seconds', count => {
    const reference = race(), route = reference.routes[0], session = new LocalRace(Array(count).fill(route), track, 1);
    const solos = session.racers.map((sim, i) => {
      sim.state.position = { ...track.start }; sim.gridPending = false;
      sim.state.speed = 10 + i * 2; sim.state.velocity = { x: Math.sin(sim.state.heading) * sim.state.speed, z: Math.cos(sim.state.heading) * sim.state.speed };
      const solo = new RaceSimulation(route, track, 1); Object.assign(solo.state, structuredClone(sim.state)); return solo;
    });
    expect(session.ghostStartRemaining).toBe(3);
    for (let i = 0; i < Math.round(3 / RULES.dt); i++) { session.step(); solos.forEach(sim => sim.step()); }
    expect(session.ghostStartRemaining).toBe(0);
    session.racers.forEach((sim, i) => expect(sim.state).toEqual(solos[i].state));
    expect(session.contactCount).toBe(0);
    expect(session.drainEvents().filter(e => e.type === 'car-impact' || e.type === 'scrape')).toEqual([]);
  });
  test('car contacts activate at exactly three seconds and resolve existing overlaps without awarding progress', () => {
    const session = race(); session.tick--;
    const setOverlap = () => session.racers.forEach((sim, i) => {
      Object.assign(sim.state, body(i ? 2.4 : -2.4, 0, i ? -30 : 30, 0, i ? -Math.PI / 2 : Math.PI / 2), { speed: 30, acceleration: 0 }); sim.gridPending = false;
    });
    setOverlap(); session.step(); expect(session.contactCount).toBe(0);
    expect(session.ghostStartRemaining).toBe(0);
    setOverlap(); const progress = session.racers.map(r => r.state.distance);
    session.step(); expect(session.contactCount).toBe(1);
    expect(session.drainEvents().some(e => e.type === 'car-impact' && e.time === 3)).toBe(true);
    session.racers.forEach((sim, i) => {
      expect(Number.isFinite(sim.state.position.x + sim.state.position.z + sim.state.speed)).toBe(true);
      expect(sim.state.distance - progress[i]).toBeLessThanOrEqual(30 * RULES.dt + 1e-6);
    });
    expect(vehicleContact(session.racers[0].state, session.racers[1].state, track)?.depth ?? 0).toBeLessThan(0.01);
    const rematch = new LocalRace(session.routes, track, 1);
    expect(rematch.ghostStartRemaining).toBe(3);
    expect(new LocalRace([session.routes[0]], track, 1).ghostStartRemaining).toBe(0);
  });
  test('the opening ghost period still collides with physical barriers', () => {
    const collisionTrack={...coastalTrack,barriers:[{id:'recovery-fixture',height:1,footprint:[{x:-25,z:-15.5},{x:-10,z:-15.5},{x:-10,z:-10},{x:-25,z:-10}]}]};
    const result = compileRoute(createPracticeSamples(coastalTrack), coastalTrack); if (!result.ok) throw new Error(result.message);
    const session = new LocalRace([result.route, result.route], collisionTrack, 1);
    const sim = session.racers[0]; sim.gridPending = false;
    sim.state.position = { x: -18, z: -18.11 }; sim.state.heading = 0;
    sim.state.velocity = { x: 0, z: 42 }; sim.state.speed = 42;
    session.step();
    expect(session.ghostStartRemaining).toBeGreaterThan(0);
    expect(session.drainEvents().some(e => e.type === 'collision')).toBe(true);
    expect(barrierContact(sim.state.position, sim.state.heading, collisionTrack)?.depth ?? 0).toBeLessThan(0.01);
  });
  test('head-on and rear impacts exchange momentum; glancing contact preserves tangential travel', () => {
    const a = body(-2.5, 0, 30), b = body(2.5, 0, -30), contact = vehicleContact(a, b, track)!;
    expect(contact).not.toBeNull(); expect(contactImpulse(a, b, contact.normal)).toBe(60);
    expect(a.velocity.x).toBeLessThan(0); expect(b.velocity.x).toBeGreaterThan(0);
    const c = body(0, 0, 30), d = body(5, 0, 10); contactImpulse(c, d, { x: 1, z: 0 });
    expect(c.velocity.x).toBeLessThan(30); expect(d.velocity.x).toBeGreaterThan(10);
    const e = body(0, 0, 30, 2), f = body(0, 2, 28, -2); contactImpulse(e, f, { x: 0, z: 1 }); expect(e.velocity.x).toBeGreaterThan(29);
  });
  test('swept capsules catch a high-speed crossing even with separated endpoints', () => {
    const c = sweptContact(body(-10, 0, 42), body(10, 0, 42), body(10, 0, -42), body(-10, 0, -42), track);
    expect(c).not.toBeNull(); expect(c!.t).toBeGreaterThan(0); expect(c!.t).toBeLessThan(1);
  });
  test('shared substeps prevent tunneling and create one pair event', () => {
    const r = race();
    r.racers.forEach((sim, i) => { Object.assign(sim.state, body(i ? 2.8 : -2.8, 0, i ? -42 : 42, 0, i ? -Math.PI / 2 : Math.PI / 2), { speed: 42 }); sim.gridPending = false; });
    r.step(); expect(r.racers[0].state.position.x).toBeLessThan(r.racers[1].state.position.x);
    expect(r.drainEvents().filter(e => e.type === 'car-impact')).toHaveLength(1);
    expect(r.racers[0].state.speed).toBeLessThan(42); expect(r.contactCount).toBe(1);
  });
  test('swapping internal driver order does not change a two-body response', () => {
    const states = [body(-2.7, 0, 30), body(2.7, 0, -20)];
    const results = [false, true].map(reverse => { const r = race(); const setup = reverse ? [...states].reverse() : states; r.racers.forEach((sim, i) => { Object.assign(sim.state, structuredClone(setup[i]), { speed: Math.hypot(setup[i].velocity.x, setup[i].velocity.z) }); sim.gridPending = false; }); r.step(); return r.racers.map(sim => sim.state).sort((a, b) => a.position.x - b.position.x); });
    for (let i = 0; i < 2; i++) { expect(results[0][i].position.x).toBeCloseTo(results[1][i].position.x, 10); expect(results[0][i].velocity.x).toBeCloseTo(results[1][i].velocity.x, 10); }
  });
  test('all authored grids are clear, on-road and non-overlapping', () => {
    for (const c of circuits) {
      const poses = Array.from({ length: 4 }, (_, i) => ({ position: gridPose(c.track, i), heading: gridPose(c.track, i).heading, velocity: { x: 0, z: 0 } }));
      for (let i = 0; i < 4; i++) { expect(barrierContact(poses[i].position, poses[i].heading, c.track)).toBeNull(); expect(sampleSurface(poses[i].position, c.track).sandAmount).toBeLessThan(0.1); for (let j = i + 1; j < 4; j++) expect(vehicleContact(poses[i], poses[j], c.track)).toBeNull(); }
    }
  });
  test('finished cars are removed from contact and overlap correction cannot award distance', () => {
    const r = race(); r.racers.forEach(sim => { Object.assign(sim.state, body(-18, -30), { speed: 0, acceleration: 0 }); sim.gridPending = false; });
    r.step(); expect(r.racers.every(sim => sim.state.distance < 0.01)).toBe(true);
    r.racers[0].state.finished = true; const old = structuredClone(r.racers[0].state); for (let i = 0; i < 10; i++) r.step(); expect(r.racers[0].state).toEqual(old);
  });
  test('car-to-car shunts against a wall and repeated pileups stay outside solid geometry', () => {
    const wallTrack = { ...track, barriers: [{ id: 'contact-wall', height: 1, footprint: [{ x: 5, z: -50 }, { x: 6, z: -50 }, { x: 6, z: 50 }, { x: 5, z: 50 }] }] };
    const result = compileRoute(createPracticeSamples(coastalTrack), coastalTrack); if (!result.ok) throw new Error(result.message);
    const raceWithWall = new LocalRace([result.route, result.route], wallTrack, 1);
    raceWithWall.tick = Math.round(CONTACT_RULES.ghostStartSeconds / RULES.dt);
    raceWithWall.racers.forEach(sim => { sim.state.tick = raceWithWall.tick; sim.state.time = raceWithWall.time; });
    raceWithWall.racers.forEach((sim, i) => { Object.assign(sim.state, body(i ? 0 : 3.5, 0, i ? 42 : 0, 0, 0), { speed: i ? 42 : 0 }); sim.gridPending = false; });
    for (let i = 0; i < 180; i++) {
      raceWithWall.step();
      for (const sim of raceWithWall.racers) { expect(Number.isFinite(sim.state.position.x + sim.state.position.z + sim.state.speed)).toBe(true); expect(barrierContact(sim.state.position, sim.state.heading, wallTrack)?.depth ?? 0).toBeLessThan(0.01); expect(sim.state.speed).toBeLessThanOrEqual(42.000001); }
    }
  });
  test('stronger thrust exceeds the previous cap while off-road drag retains more momentum', () => {
    const result = compileRoute(createPracticeSamples(coastalTrack, 2), coastalTrack); if (!result.ok) throw new Error(result.message);
    const measured = [false, true].map(boost => {
      const sim = new RaceSimulation(result.route, track); sim.state.speed = 28; sim.state.desiredSpeed = 28; sim.state.velocity = { x: Math.sin(sim.state.heading) * 28, z: Math.cos(sim.state.heading) * 28 };
      if (boost) sim.pressThrust(); let maximum = 0;
      for (let i = 0; i < 42; i++) { sim.step(); maximum = Math.max(maximum, sim.state.speed); }
      return maximum;
    });
    expect(measured[1]).toBeGreaterThan(38.5); expect(measured[1] - measured[0]).toBeGreaterThan(8); expect(measured[1]).toBeLessThanOrEqual(42.000001);
    const sim = new RaceSimulation(result.route, coastalTrack); sim.state.position.z -= 10; sim.state.speed = 20; sim.state.velocity = { x: 20, z: 0 }; sim.state.desiredSpeed = 20; sim.step();
    expect(sim.state.sandAmount).toBe(1); expect(sim.state.speed / 20).toBeGreaterThan(Math.exp(-1.25 / 60)); expect(sim.state.speed).toBeLessThan(20);
  });
  test('repeated contact remains finite and a recovery waits for its occupied safe position', () => {
    const r = race();
    for (let i = 0; i < 260; i++) {
      const stuck = r.racers[0], blocker = r.racers[1];
      if (!stuck.state.recoveryCount) { stuck.state.position = { x: 250, z: 250 }; stuck.state.speed = 0; stuck.state.velocity = { x: 0, z: 0 }; stuck.gridPending = false; stuck.markContact(r.time); }
      blocker.state.position = { ...track.start }; blocker.state.speed = 0; blocker.state.velocity = { x: 0, z: 0 };
      r.step();
      expect(r.racers.every(sim => Number.isFinite(sim.state.position.x + sim.state.position.z + sim.state.speed))).toBe(true);
    }
    const recovered = r.racers[0].state;
    expect(recovered.recoveryCount).toBe(1); expect(recovered.distance).toBeLessThan(0.01); expect(recovered.checkpoint).toBe(1);
    expect(recovered.recoveringUntil).toBeGreaterThanOrEqual(r.time - RULES.dt);
    r.racers[1].state.position = { x: 100, z: 100 }; r.step(); r.step();
    expect(r.racers[0].state.recoveringUntil).toBeLessThan(r.time);
  });
});
