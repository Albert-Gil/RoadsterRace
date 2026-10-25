import { angleDelta, clamp, cumulative, distance, lerp, mix, modulo, projectToPolyline } from './geometry';
import { blockedRouteSection } from './barriers';
import type { CompiledRoute, HopShortcut, HopTraversal, Point, RaceState, TrackDefinition } from './types';

export const SHORTCUT_RULES = Object.freeze({ clearance: 0.15, sampleSpacing: 0.35, backwardTolerance: 0.5, commitAlignment: 0.5 });
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

/** Where the line's full vehicle footprint first meets a barrier: the segment index and contact point. */
function obstacleMeeting(points: Point[], track: TrackDefinition, obstacle: TrackDefinition['barriers'][number]) {
  const margin = track.carLength / 2 + track.carWidth / 2 + SHORTCUT_RULES.clearance;
  const minX = Math.min(...obstacle.footprint.map(p => p.x)) - margin;
  const maxX = Math.max(...obstacle.footprint.map(p => p.x)) + margin;
  const minZ = Math.min(...obstacle.footprint.map(p => p.z)) - margin;
  const maxZ = Math.max(...obstacle.footprint.map(p => p.z)) + margin;
  const physical = { ...track, barriers: [obstacle] };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (Math.max(a.x, b.x) < minX || Math.min(a.x, b.x) > maxX || Math.max(a.z, b.z) < minZ || Math.min(a.z, b.z) > maxZ) continue;
    const hit = blockedRouteSection([a, b], physical);
    if (hit) return { index: i, point: hit.point };
  }
  return null;
}

/** A complete gate-to-gate pass that keeps the whole car inside the lane, moving forward. */
function strictTraversal(points: Point[], ds: number[], shortcut: HopShortcut, track: TrackDefinition, obstacleAt: number): HopTraversal | null {
  let entry: { index: number; point: Point; at: number } | undefined, exit: typeof entry;
  for (let i = 1; i < points.length; i++) {
    if (!entry) { const hit = crossing(points[i - 1], points[i], shortcut, false); if (hit) entry = { index: i, point: hit.point, at: lerp(ds[i - 1], ds[i], hit.t) }; }
    else { const hit = crossing(points[i - 1], points[i], shortcut, true); if (hit) { exit = { index: i, point: hit.point, at: lerp(ds[i - 1], ds[i], hit.t) }; break; } }
  }
  if (!entry || !exit) return null;
  const path = [entry.point, ...points.slice(entry.index, exit.index), exit.point];
  let furthest = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], heading = Math.atan2(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(distance(a, b) / SHORTCUT_RULES.sampleSpacing));
    for (let j = 0; j <= n; j++) {
      const p = mix(a, b, j / n), q = shortcutProjection(p, shortcut);
      if (!insideCorridor(p, heading, shortcut, track) || q.progress < furthest - SHORTCUT_RULES.backwardTolerance) return null;
      furthest = Math.max(furthest, q.progress);
    }
  }
  // Returning through the bypass or omitting the obstacle is not a shortcut traversal.
  return obstacleAt > 0 && obstacleAt < furthest ? { id: shortcut.id, entryDistance: entry.at, exitDistance: exit.at } : null;
}

/**
 * The forgiving reading of a hand-drawn line (compiler v15), like jump approval. Where the line
 * meets the lane's named obstacle heading forward along the lane (within 60°) and keeps the whole
 * car inside the lane for a car length either side of it (what the race requires before a Hop may
 * clear it), it commits to the lane. The traversal is the stretch of line around that crossing whose
 * centre stays inside the lane: the line may join or leave the lane anywhere, wander and cut its
 * corners. Walls beside the lane, including its protected end wings, stay solid.
 */
function committedTraversal(points: Point[], ds: number[], shortcut: HopShortcut, track: TrackDefinition, meeting: { index: number; point: Point }, obstacleAt: number): HopTraversal | null {
  const a = points[meeting.index - 1], b = points[meeting.index], q = shortcutProjection(meeting.point, shortcut);
  if (q.distance > shortcut.width / 2 || Math.cos(angleDelta(Math.atan2(b.x - a.x, b.z - a.z), q.heading)) < SHORTCUT_RULES.commitAlignment) return null;
  const inLane = (p: Point) => shortcutProjection(p, shortcut).distance <= shortcut.width / 2;
  let first = meeting.index - 1, last = meeting.index;
  while (first > 0 && inLane(points[first - 1])) first--;
  while (last < points.length - 1 && inLane(points[last + 1])) last++;
  // Passing the obstacle at the lane's edge, half over a protected wing, is not a traversal.
  for (let i = first + 1; i <= last; i++) {
    const from = points[i - 1], to = points[i], heading = Math.atan2(to.x - from.x, to.z - from.z), n = Math.max(1, Math.ceil(distance(from, to) / SHORTCUT_RULES.sampleSpacing));
    for (let j = 0; j <= n; j++) {
      const p = mix(from, to, j / n);
      if (Math.abs(shortcutProjection(p, shortcut).progress - obstacleAt) <= track.carLength && !insideCorridor(p, heading, shortcut, track)) return null;
    }
  }
  return { id: shortcut.id, entryDistance: ds[first], exitDistance: ds[last] };
}

/**
 * Manual-Hop lane traversals. Only a line whose vehicle footprint actually meets a lane's named
 * obstacle can commit to that lane, so ordinary lines on the main road are never captured.
 * A complete gate-to-gate pass is recorded exactly; a looser line that crosses the obstacle with
 * the whole car inside the lane, moving forward, is recorded around that crossing (forgiving lines).
 * Other lines that meet the obstacle are still accepted; that obstacle simply stays solid for them.
 */
export function assessHopShortcuts(points: Point[], track: TrackDefinition): { traversals: HopTraversal[]; obstacles: string[] } {
  const traversals: HopTraversal[] = [], obstacles: string[] = [];
  if (!track.hopShortcuts?.length || points.length < 2) return { traversals, obstacles };
  const ds = cumulative(points);
  for (const shortcut of track.hopShortcuts) {
    const obstacle = track.barriers.find(b => b.id === shortcut.obstacleId);
    if (!obstacle) continue;
    const meeting = obstacleMeeting(points, track, obstacle);
    if (!meeting) continue;
    const center = { x: obstacle.footprint.reduce((v, p) => v + p.x, 0) / obstacle.footprint.length, z: obstacle.footprint.reduce((v, p) => v + p.z, 0) / obstacle.footprint.length };
    const obstacleAt = shortcutProjection(center, shortcut).progress;
    const traversal = strictTraversal(points, ds, shortcut, track, obstacleAt) ?? committedTraversal(points, ds, shortcut, track, meeting, obstacleAt);
    if (traversal) { traversals.push(traversal); obstacles.push(shortcut.obstacleId); }
  }
  return { traversals, obstacles };
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
