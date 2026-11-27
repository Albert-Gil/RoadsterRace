import { compileRoute, createPracticeSamples } from './route';
import { RaceSimulation } from './simulation';
import { groundHeight, jumpCoordinates, jumpPoint } from './support';
import { distance } from './geometry';
import type { CompiledRoute, TrackDefinition, TrackJump } from './types';

/**
 * Offline measurement for drawing guidance (tools/ramp-clearing.mjs, tests): the slowest
 * takeoff speed at which a ramp still lands, found with the real simulation. Automatic ramps
 * start at their lip; a manual Hop gap (rampLength 0) counts as landable at a speed when Hop pressed
 * at any of HOP_LEADS before its lip lands. Never used to drive physics; the game reads the table.
 */
/** Hop is pressed this many metres before a manual gap's lip; any one of them landing counts (the player picks the moment). */
export const HOP_LEADS = Array.from({ length: 29 }, (_, i) => 1 + i * 0.5);
const routes = new Map<string, CompiledRoute>();
function shortcutRoute(track: TrackDefinition, jump: TrackJump) {
  const branch = track.hopShortcuts?.find(h => h.crossings?.includes(jump.id)), key = track.id + ':' + track.version + ':' + (branch?.id ?? 'main');
  let route = routes.get(key);
  if (!route) {
    const compiled = compileRoute(createPracticeSamples(track, 7, branch?.id ?? false), track);
    if (!compiled.ok) throw new Error(compiled.message);
    routes.set(key, route = compiled.route);
  }
  return route;
}
function attempt(track: TrackDefinition, jump: TrackJump, route: CompiledRoute, speed: number, along: number, hop: boolean) {
  const sim = new RaceSimulation(route, track, 1);
  const p = jumpPoint(jump, along), heading = Math.atan2(jump.forward.x, jump.forward.z);
  const near = route.points.reduce((a, b) => distance(a, p) < distance(b, p) ? a : b);
  Object.assign(sim.state, { position: p, elevation: groundHeight(p, track), heading, speed, desiredSpeed: speed,
    velocity: { x: jump.forward.x * speed, z: jump.forward.z * speed }, distance: near.distance });
  if (hop) sim.pressHop();
  for (let tick = 0; tick < 600; tick++) {
    sim.step();
    for (const event of sim.drainEvents()) {
      if (event.type === 'landing') return true;
      if (event.type === 'splash' || event.type === 'recovery' || event.type === 'collision') return false;
    }
  }
  return false;
}
export function landsAt(track: TrackDefinition, jump: TrackJump, speed: number): boolean {
  const route = shortcutRoute(track, jump);
  if (jump.activation === 'hop') return HOP_LEADS.some(lead => attempt(track, jump, route, speed, -lead, true));
  return attempt(track, jump, route, speed, jump.rampLength - 0.1, false);
}

/** Slowest drawn pace (m/s) in the RAMP_APPROACH metres before a crossing's entry, as the warning reads it. */
export function approachPace(route: CompiledRoute, entryDistance: number, approach = 6) {
  let pace = Infinity;
  for (const p of route.points) if (p.distance >= entryDistance - approach && p.distance <= entryDistance) pace = Math.min(pace, p.desiredSpeed);
  return pace;
}
/**
 * A shortcut Hop measured on real drawn lines, because the car's approach (the turn onto the shortcut, the
 * slowing at the deck edge) decides the takeoff more than a straight run-up does. Practice lines drawn in
 * 5–10 s are raced with Hop pressed at every tick of the last 16 m before the lip; a line clears when any
 * press lands without a splash or recovery. Returns the slowest approach pace from which every faster
 * measured line also clears.
 */
export function minimumShortcutPace(track: TrackDefinition, jump: TrackJump): number {
  const branch = track.hopShortcuts?.find(h => h.crossings?.includes(jump.id));
  if (!branch) return Infinity;
  const results: { pace: number; clears: boolean }[] = [];
  for (let seconds = 5; seconds <= 10 + 1e-9; seconds += 0.25) {
    const compiled = compileRoute(createPracticeSamples(track, seconds, branch.id), track);
    if (!compiled.ok) continue;
    const route = compiled.route, crossing = route.crossings?.find(c => c.id === jump.id);
    if (!crossing) continue;
    // One pass without Hop finds the ticks spent in the last 16 m before the lip.
    const probe = new RaceSimulation(route, track, 1), window: number[] = [];
    while (!probe.state.finished && probe.state.tick < 9000) {
      probe.step();
      const c = jumpCoordinates(probe.state.position, jump);
      if (c.along > -16 && c.along < 0 && Math.abs(c.across) < jump.width / 2) window.push(probe.state.tick);
      if (window.length && (c.along > 2 || probe.state.recoveryCount > 0)) break;
    }
    const clears = window.some(press => {
      const sim = new RaceSimulation(route, track, 1);
      while (sim.state.tick < press) { sim.step(); sim.drainEvents(); }
      sim.pressHop();
      for (let tick = 0; tick < 240; tick++) {
        sim.step();
        for (const event of sim.drainEvents()) {
          if (event.type === 'splash' || event.type === 'recovery') return false;
          if (event.type === 'landing' && sim.state.supportSurfaceId === jump.landingSurfaceId) return true;
        }
      }
      return false;
    });
    results.push({ pace: approachPace(route, crossing.entryDistance), clears });
  }
  results.sort((a, b) => b.pace - a.pace);
  let lowest = Infinity;
  for (const r of results) { if (!r.clears) break; lowest = r.pace; }
  return Math.round(lowest * 4) / 4;
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
/** Manual Hop gaps on drawn shortcuts (support ships): the takeoff needs speed too. */
export const hopGaps = (track: TrackDefinition) => (track.jumps ?? []).filter(j => j.activation === 'hop' && (track.hopShortcuts ?? []).some(h => h.crossings?.includes(j.id)));
