import { angleDelta, clamp, cumulative, distance, lerp, mix, modulo, projectToPolyline } from './geometry';
import { blockedRouteSection } from './barriers';
import type { CompiledRoute, HopShortcut, HopTraversal, Point, RaceState, TrackDefinition } from './types';

export const SHORTCUT_RULES = Object.freeze({ clearance: 0.15, sampleSpacing: 0.35, backwardTolerance: 0.5 });
const distances = new WeakMap<HopShortcut, number[]>();
export function shortcutProjection(p: Point, shortcut: HopShortcut) {
  let ds = distances.get(shortcut); if (!ds) { ds = cumulative(shortcut.branch); distances.set(shortcut, ds); }
  const projection = projectToPolyline(p, shortcut.branch, ds);
  let i = 0; while (i < ds.length - 2 && ds[i + 1] < projection.progress) i++;
  const a = shortcut.branch[i], b = shortcut.branch[i + 1];
  return { ...projection, length: ds.at(-1)!, heading: Math.atan2(b.x - a.x, b.z - a.z) };
}
function gate(shortcut: HopShortcut, exit: boolean) {
  const p = shortcut.branch, a = exit ? p[p.length - 2] : p[0], b = exit ? p.at(-1)! : p[1], d = distance(a, b);
  return { center: exit ? b : a, forward: { x: (b.x - a.x) / d, z: (b.z - a.z) / d } };
}
function crossing(a: Point, b: Point, shortcut: HopShortcut, exit: boolean) {
  const g = gate(shortcut, exit), along = (p: Point) => (p.x - g.center.x) * g.forward.x + (p.z - g.center.z) * g.forward.z;
  const aa = along(a), bb = along(b); if (aa > 1e-6 || bb < -1e-6 || bb - aa <= 1e-8) return null;
  const t = clamp(-aa / (bb - aa), 0, 1), p = mix(a, b, t);
  const across = Math.abs((p.x - g.center.x) * g.forward.z - (p.z - g.center.z) * g.forward.x);
  return across <= shortcut.width / 2 ? { point: p, t } : null;
}
function insideCorridor(p: Point, heading: number, shortcut: HopShortcut, track: TrackDefinition) {
  const q = shortcutProjection(p, shortcut);
  const radius = track.carWidth / 2 + (track.carLength - track.carWidth) / 2 * Math.abs(Math.sin(angleDelta(heading, q.heading))) + SHORTCUT_RULES.clearance;
  return q.distance + radius <= shortcut.width / 2 + 1e-6;
}

function meetsObstacle(points: Point[], track: TrackDefinition, obstacle: TrackDefinition['barriers'][number]) {
  const margin = track.carLength / 2 + track.carWidth / 2 + SHORTCUT_RULES.clearance;
  const minX = Math.min(...obstacle.footprint.map(p => p.x)) - margin;
  const maxX = Math.max(...obstacle.footprint.map(p => p.x)) + margin;
  const minZ = Math.min(...obstacle.footprint.map(p => p.z)) - margin;
  const maxZ = Math.max(...obstacle.footprint.map(p => p.z)) + margin;
  const physical = { ...track, barriers: [obstacle] };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (Math.max(a.x, b.x) < minX || Math.min(a.x, b.x) > maxX || Math.max(a.z, b.z) < minZ || Math.min(a.z, b.z) > maxZ) continue;
    if (blockedRouteSection([a, b], physical)) return true;
  }
  return false;
}

/** Recognition precedes obstacle exemptions. Both retained and smoothed routes must pass. */
export function validateHopShortcuts(points: Point[], track: TrackDefinition): { ok: true; traversals: HopTraversal[]; obstacles: string[] } | { ok: false; point: Point; message: string } {
  const traversals: HopTraversal[] = [], obstacles: string[] = [];
  if (!track.hopShortcuts?.length || points.length < 2) return { ok: true, traversals, obstacles };
  const ds = cumulative(points);
  for (const shortcut of track.hopShortcuts) {
    const obstacle = track.barriers.find(b => b.id === shortcut.obstacleId);
    if (!obstacle) return { ok:false, point:shortcut.branch[0], message:'This hop lane has no physical obstacle.' };
    const center = { x: obstacle.footprint.reduce((v,p)=>v+p.x,0)/obstacle.footprint.length, z:obstacle.footprint.reduce((v,p)=>v+p.z,0)/obstacle.footprint.length };
    const obstacleAt = shortcutProjection(center,shortcut).progress;
    // A nearby sand cut is an ordinary line unless its full vehicle footprint
    // actually meets this named obstacle. Proximity to the optional lane alone
    // must not force the player to follow the entire authored branch.
    if (!meetsObstacle(points, track, obstacle)) continue;
    const failure = (point: Point) => ({ ok: false as const, point, message: 'The line cuts outside the service lane. Follow it through and leave room for the car.' });
    let entry: { index: number; point: Point; at: number } | undefined, exit: typeof entry;
    for (let i = 1; i < points.length; i++) {
      if (!entry) { const hit = crossing(points[i - 1], points[i], shortcut, false); if (hit) entry = { index: i, point: hit.point, at: lerp(ds[i - 1], ds[i], hit.t) }; }
      else { const hit = crossing(points[i - 1], points[i], shortcut, true); if (hit) { exit = { index: i, point: hit.point, at: lerp(ds[i - 1], ds[i], hit.t) }; break; } }
    }
    if (!entry || !exit) return failure(shortcut.branch[Math.floor(shortcut.branch.length / 2)]);
    const path = [entry.point, ...points.slice(entry.index, exit.index), exit.point];
    let furthest = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], heading = Math.atan2(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(distance(a, b) / SHORTCUT_RULES.sampleSpacing));
      for (let j = 0; j <= n; j++) {
        const p = mix(a, b, j / n), q = shortcutProjection(p, shortcut);
        if (!insideCorridor(p, heading, shortcut, track) || q.progress < furthest - SHORTCUT_RULES.backwardTolerance) return failure(p);
        furthest = Math.max(furthest, q.progress);
      }
    }
    // Returning through the bypass or omitting the obstacle is not a shortcut traversal.
    if (obstacleAt <= 0 || obstacleAt >= furthest) return failure(center);
    traversals.push({ id: shortcut.id, entryDistance: entry.at, exitDistance: exit.at }); obstacles.push(shortcut.obstacleId);
  }
  return { ok: true, traversals, obstacles };
}

/** Permission is local to a recorded traversal, actual corridor, forward momentum and manual flight. */
export function permittedHopBarriers(state: RaceState, route: CompiledRoute, track: TrackDefinition, to = state.position): string[] {
  if (state.movement !== 'airborne' || state.flightOrigin !== 'hop') return [];
  const progress = modulo(state.distance, route.length);
  return (route.hopShortcuts ?? []).flatMap(traversal => {
    const shortcut = track.hopShortcuts?.find(s => s.id === traversal.id);
    if (!shortcut || progress < traversal.entryDistance - track.carLength || progress > traversal.exitDistance + track.carLength) return [];
    const heading = state.speed > 0.05 ? Math.atan2(state.velocity.x, state.velocity.z) : state.heading;
    const q = shortcutProjection(state.position, shortcut);
    return Math.cos(angleDelta(heading, q.heading)) > 0 && insideCorridor(state.position, heading, shortcut, track)
      && insideCorridor(to, heading, shortcut, track) ? [shortcut.obstacleId] : [];
  });
}
