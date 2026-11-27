import { compileRoute, createPracticeSamples } from './route';
import { RaceSimulation } from './simulation';
import { groundHeight, jumpPoint } from './support';
import { distance } from './geometry';
import type { TrackDefinition, TrackJump } from './types';

/**
 * Offline measurement for drawing guidance (tools/ramp-clearing.mjs, tests): the slowest
 * takeoff speed at which an automatic ramp still lands, found with the real simulation.
 * Never used to drive physics; the game reads the generated table in src/content.
 */
export function landsAt(track: TrackDefinition, jump: TrackJump, speed: number): boolean {
  const branch = track.hopShortcuts?.find(h => h.crossings?.includes(jump.id));
  const compiled = compileRoute(createPracticeSamples(track, 7, branch?.id ?? false), track);
  if (!compiled.ok) throw new Error(compiled.message);
  const route = compiled.route, sim = new RaceSimulation(route, track, 1);
  const p = jumpPoint(jump, jump.rampLength - 0.1), heading = Math.atan2(jump.forward.x, jump.forward.z);
  const near = route.points.reduce((a, b) => distance(a, p) < distance(b, p) ? a : b);
  Object.assign(sim.state, { position: p, elevation: groundHeight(p, track), heading, speed, desiredSpeed: speed,
    velocity: { x: jump.forward.x * speed, z: jump.forward.z * speed }, distance: near.distance });
  for (let tick = 0; tick < 600; tick++) {
    sim.step();
    for (const event of sim.drainEvents()) {
      if (event.type === 'landing') return true;
      if (event.type === 'splash' || event.type === 'recovery' || event.type === 'collision') return false;
    }
  }
  return false;
}

/** Slowest speed (m/s, to `step`) from which every faster takeoff up to `max` also lands. */
export function minimumClearingSpeed(track: TrackDefinition, jump: TrackJump, min = 8, max = 26, step = 0.25): number {
  let lowest = Infinity;
  for (let speed = max; speed >= min - 1e-9; speed -= step) {
    if (!landsAt(track, jump, speed)) break;
    lowest = speed;
  }
  return lowest;
}

export const automaticJumps = (track: TrackDefinition) => (track.jumps ?? []).filter(j => j.activation !== 'hop' && j.rampLength > 0);
