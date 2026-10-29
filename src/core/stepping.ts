import { RULES } from './rules';
import { contactImpulse, vehicleContact, sweptContact, separateBody, CONTACT_RULES, type ContactBody } from './vehicle-contact';
import type { RaceSimulation } from './simulation';
import type { RaceEvent, TrackDefinition } from './types';

/** Car-to-car contact bookkeeping that persists across ticks of one race. */
export interface ContactLog {
  events: (RaceEvent & { player: number })[];
  lastImpact: Map<string, number>;
  lastScrape: Map<string, number>;
  count: number;
}
export const createContactLog = (): ContactLog => ({ events: [], lastImpact: new Map(), lastScrape: new Map(), count: 0 });

/**
 * The only fixed-step implementation: advances one 60 Hz tick as two shared substeps.
 * Used by LocalRace for every race and by RaceSimulation.step for single-car tests/tools,
 * so they cannot diverge. All cars integrate, contacts resolve together, and only then is
 * progress credited. `time` is the race clock at the start of the tick.
 */
export function stepRacers(racers: readonly RaceSimulation[], track: TrackDefinition, time: number, log: ContactLog) {
  const active = racers.map(r => !r.state.finished), dt = RULES.dt / 2;
  for (let sub = 0; sub < 2; sub++) {
    const now = time + sub * dt;
    const contactsEnabled = racers.length === 1 || now >= CONTACT_RULES.ghostStartSeconds;
    const enabled = racers.map(r => !r.state.finished && now >= r.state.recoveringUntil);
    // A recovering car remains absent until its last safe position is unoccupied.
    racers.forEach((r, i) => {
      if (contactsEnabled && r.state.recoveringUntil >= 0 && now >= r.state.recoveringUntil && (r.state.recoveryWaiting || now < r.state.recoveringUntil + dt * 1.1)) {
        r.state.recoveryWaiting = racers.some((other, j) => j !== i && enabled[j] && vehicleContact(r.state, other.state, track));
        if (r.state.recoveryWaiting) { r.state.recoveringUntil = now + dt; enabled[i] = false; }
      }
    });
    const before = racers.map(r => ({ position: { ...r.state.position }, velocity: { ...r.state.velocity }, heading: r.state.heading, elevation: r.state.elevation, movement:r.state.movement }));
    const old = racers.map(r => r.integrate(dt, now));
    // A water failure can enter recovery during integration. Remove that car
    // from this very contact pass, not only from the following substep.
    racers.forEach((r, i) => { if (now < r.state.recoveringUntil || r.state.recoveryWaiting) enabled[i] = false; });
    const budgets = racers.map((r, i) => Math.hypot(r.state.position.x - before[i].position.x, r.state.position.z - before[i].position.z));
    for (let pass = 0; contactsEnabled && pass < CONTACT_RULES.passes; pass++) {
      // Jacobi corrections: all pair impulses read the same snapshot, then apply together.
      const bodies: ContactBody[] = racers.map(r => ({ position: { ...r.state.position }, velocity: { ...r.state.velocity }, heading: r.state.heading, elevation: r.state.elevation, movement:r.state.movement }));
      const deltas = bodies.map(() => ({ position: { x: 0, z: 0 }, velocity: { x: 0, z: 0 } }));
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        if (!enabled[i] || !enabled[j]) continue;
        const a = { ...bodies[i], position: { ...bodies[i].position }, velocity: { ...bodies[i].velocity } }, b = { ...bodies[j], position: { ...bodies[j].position }, velocity: { ...bodies[j].velocity } };
        const sweep = pass === 0 ? sweptContact(before[i], a, before[j], b, track) : null;
        let contact = vehicleContact(a, b, track);
        if (!contact && sweep && sweep.t > 0) { a.position = sweep.a; b.position = sweep.b; contact = sweep; }
        if (!contact) continue;
        const impact = contactImpulse(a, b, contact.normal), depth = Math.min(contact.depth + 0.002, track.carWidth) / 2;
        a.position.x -= contact.normal.x * depth; a.position.z -= contact.normal.z * depth;
        b.position.x += contact.normal.x * depth; b.position.z += contact.normal.z * depth;
        for (const [index, body] of [[i, a], [j, b]] as const) {
          deltas[index].position.x += body.position.x - bodies[index].position.x; deltas[index].position.z += body.position.z - bodies[index].position.z;
          deltas[index].velocity.x += body.velocity.x - bodies[index].velocity.x; deltas[index].velocity.z += body.velocity.z - bodies[index].velocity.z;
          racers[index].markContact(now);
        }
        const key = `${i}:${j}`;
        if (impact > 1.5 && now - (log.lastImpact.get(key) ?? -Infinity) >= 0.12) {
          log.lastImpact.set(key, now); log.count++; racers[i].state.collisionCount++; racers[j].state.collisionCount++;
          log.events.push({ type: 'car-impact', player: i, otherPlayer: j, time: now, point: contact.point, intensity: impact });
        } else if (Math.hypot(a.velocity.x - b.velocity.x, a.velocity.z - b.velocity.z) > 2 && now - (log.lastScrape.get(key) ?? -Infinity) >= 0.25) {
          log.lastScrape.set(key, now); log.events.push({ type: 'scrape', player: i, otherPlayer: j, time: now, intensity: 0.25 });
        }
      }
      racers.forEach((r, i) => {
        if (!enabled[i]) return;
        r.state.velocity.x += deltas[i].velocity.x; r.state.velocity.z += deltas[i].velocity.z;
        separateBody(r.state, deltas[i].position, track, r.allowedHopBarriers({ x: r.state.position.x + deltas[i].position.x, z: r.state.position.z + deltas[i].position.z }));
        const speed = Math.hypot(r.state.velocity.x, r.state.velocity.z);
        if (speed > RULES.maxSpeed) { r.state.velocity.x *= RULES.maxSpeed / speed; r.state.velocity.z *= RULES.maxSpeed / speed; }
        r.state.speed = Math.hypot(r.state.velocity.x, r.state.velocity.z);
      });
    }
    racers.forEach((r, i) => { if (old[i]) r.commitMotion(old[i]!, dt, now, budgets[i]); });
  }
  racers.forEach((r, i) => { if (active[i]) r.finishTick(); });
}
