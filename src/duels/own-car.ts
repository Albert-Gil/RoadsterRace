import { sampleRoute } from '../core/route';
import type { CompiledRoute } from '../core/types';
import type { CarView } from './protocol';

/** Your own car is shown at most this far ahead of the newest server frame. */
export const OWN_AHEAD_CAP_MS = 200;
export interface OwnPose { x: number; z: number; y: number; heading: number }

/** Route distance of the point nearest `p` (projected onto the nearest segment). */
export function routeDistanceNear(route: CompiledRoute, p: { x: number; z: number }) {
  let best = 0, gap = Infinity;
  for (let i = 0; i < route.points.length - 1; i++) {
    const a = route.points[i], b = route.points[i + 1], dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz || 1;
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / length2));
    const x = a.x + dx * t, z = a.z + dz * t, d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < gap) { gap = d; best = a.distance + (b.distance - a.distance) * t; }
  }
  return best;
}

/**
 * Online, your own car is drawn where it will be when a press sent now reaches the room: the newest server
 * pose moved `aheadMs` along your own compiled line at its current speed, keeping its offset from the line.
 * Never across a flight, a recovery or the finish (null: show the buffered pose instead).
 */
export function ownCarAhead(route: CompiledRoute, car: CarView, aheadMs: number, height?: (p: { x: number; z: number }) => number | undefined): OwnPose | null {
  const ahead = Math.min(OWN_AHEAD_CAP_MS, aheadMs);
  if (!(ahead > 0) || car.finished || car.movement !== 'grounded' || car.recoveryWaiting || car.time < car.recoveringUntil) return null;
  const d0 = routeDistanceNear(route, car.position), from = sampleRoute(route, d0), to = sampleRoute(route, d0 + car.speed * ahead / 1000);
  const x = to.x + car.position.x - from.x, z = to.z + car.position.z - from.z;
  let turn = to.heading - from.heading; turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  return { x, z, y: height?.({ x, z }) ?? car.elevation, heading: car.heading + turn };
}
