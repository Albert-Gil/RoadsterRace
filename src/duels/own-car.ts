import { sampleRoute } from '../core/route';
import type { CompiledRoute, TrackDefinition } from '../core/types';
import type { CarView } from './protocol';

/** Your own car is shown at most this far ahead of the newest server frame. */
export const OWN_AHEAD_CAP_MS = 200;
/** How far behind / ahead of the last known route distance the car may be found (one section of the line). */
export const SEARCH_BEHIND = 30, SEARCH_AHEAD = 60;
export interface OwnPose { x: number; z: number; y: number; heading: number }

/**
 * Route distance of the point nearest `p`, projected onto a segment. With `near`, only segments within
 * [near - SEARCH_BEHIND, near + SEARCH_AHEAD] (wrapping at the lap) are considered, so a neighbouring part
 * of the line (a parallel deck, a hairpin's other side) can never be picked.
 */
export function routeDistanceNear(route: CompiledRoute, p: { x: number; z: number }, near?: number) {
  let best = near ?? 0, gap = Infinity;
  for (let i = 0; i < route.points.length - 1; i++) {
    const a = route.points[i], b = route.points[i + 1];
    if (near !== undefined) {
      let rel = (a.distance - near) % route.length; if (rel < -route.length / 2) rel += route.length; if (rel > route.length / 2) rel -= route.length;
      if (rel < -SEARCH_BEHIND - (b.distance - a.distance) || rel > SEARCH_AHEAD) continue;
    }
    const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz || 1;
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / length2));
    const x = a.x + dx * t, z = a.z + dz * t, d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < gap) { gap = d; best = a.distance + (b.distance - a.distance) * t; }
  }
  return best;
}

/** Route distances of every takeoff lip on this line: the end of an automatic ramp, or a manual Hop gap's edge. */
export function lipDistances(route: CompiledRoute, track: TrackDefinition) {
  return (route.crossings ?? []).map(c => c.entryDistance + (track.jumps?.find(j => j.id === c.id)?.rampLength ?? 0)).sort((a, b) => a - b);
}

/**
 * The lead pose: the server pose moved `aheadMs` along your own line at its current speed, keeping its offset
 * from the line, but never past the next takeoff lip (only the room decides a takeoff). Null in flight, during
 * a recovery, after the finish or with no lead.
 */
export function ownCarAhead(route: CompiledRoute, car: CarView, aheadMs: number, height?: (p: { x: number; z: number }) => number | undefined,
  near?: number, lips: readonly number[] = []): OwnPose | null {
  const ahead = Math.min(OWN_AHEAD_CAP_MS, aheadMs);
  if (!(ahead > 0) || car.finished || car.movement !== 'grounded' || car.recoveryWaiting || car.time < car.recoveringUntil) return null;
  const d0 = routeDistanceNear(route, car.position, near);
  let d1 = d0 + car.speed * ahead / 1000;
  // At or just past a lip while still grounded, the room has not confirmed a takeoff yet: hold the car there.
  for (const lip of lips) for (const at of [lip, lip + route.length]) if (at > d0 - 2 && at < d1) d1 = Math.max(d0, at);
  const from = sampleRoute(route, d0), to = sampleRoute(route, d1);
  const x = to.x + car.position.x - from.x, z = to.z + car.position.z - from.z;
  let turn = to.heading - from.heading; turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  return { x, z, y: height?.({ x, z }) ?? car.elevation, heading: car.heading + turn };
}

type Mode = 'lead' | 'flight' | 'buffer';
/**
 * Where your own car is drawn online, frame by frame. Grounded: the lead pose (stopping at lips). In flight:
 * the newest authoritative pose (the room has confirmed the takeoff). Recovery or finish: the 100 ms buffer.
 * Switching between them shrinks the gap over at least 1.5x the time needed to cover it, and the car is never
 * stepped backwards along the line; a recovery resets everything (the car is moved by the room).
 */
export class OwnCarDisplay {
  private serverDistance?: number;
  private recoveries = -1;
  private shown?: { pose: OwnPose; distance: number; mode: Mode };
  private handoff?: { offset: { x: number; z: number; y: number }; start: number; duration: number };
  private readonly lips: number[];
  constructor(readonly route: CompiledRoute, readonly track: TrackDefinition) { this.lips = lipDistances(route, track); }

  update(now: number, car: CarView, leadMs: number, buffered: OwnPose | undefined, height?: (p: { x: number; z: number }) => number | undefined): OwnPose {
    if (car.recoveryCount !== this.recoveries) { this.recoveries = car.recoveryCount; this.serverDistance = undefined; this.shown = undefined; this.handoff = undefined; }
    this.serverDistance = routeDistanceNear(this.route, car.position, this.serverDistance);
    const lead = ownCarAhead(this.route, car, leadMs, height, this.serverDistance, this.lips);
    const latest: OwnPose = { x: car.position.x, z: car.position.z, y: car.elevation, heading: car.heading };
    const mode: Mode = lead ? 'lead' : car.movement === 'airborne' && !car.finished ? 'flight' : 'buffer';
    const target = lead ?? (mode === 'flight' ? latest : buffered ?? latest);
    if (this.shown && this.shown.mode !== mode) {
      const offset = { x: this.shown.pose.x - target.x, z: this.shown.pose.z - target.z, y: this.shown.pose.y - target.y };
      this.handoff = { offset, start: now, duration: Math.max(200, 1500 * Math.hypot(offset.x, offset.z) / Math.max(5, car.speed)) };
    }
    if (this.handoff && now - this.handoff.start >= this.handoff.duration) this.handoff = undefined;
    const k = this.handoff ? 1 - (now - this.handoff.start) / this.handoff.duration : 0;
    const pose: OwnPose = this.handoff ? { x: target.x + this.handoff.offset.x * k, z: target.z + this.handoff.offset.z * k, y: target.y + this.handoff.offset.y * k, heading: target.heading } : target;
    const distance = routeDistanceNear(this.route, pose, this.shown?.distance ?? this.serverDistance);
    if (this.shown) {
      let back = this.shown.distance - distance; if (back > this.route.length / 2) back -= this.route.length;
      if (back > 0 && back < 25) { this.shown = { ...this.shown, mode }; return this.shown.pose; }
    }
    this.shown = { pose, distance, mode };
    return pose;
  }
}
