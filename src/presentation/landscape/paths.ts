import type { Point } from '../../core/types';

/** Points along a polyline offset sideways (positive to the left of travel, seen from above with +z up). */
export function offsetPath(points: readonly Point[], offset: number | ((i: number) => number)) {
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, o = typeof offset === 'number' ? offset : offset(i);
    return { x: p.x - dz / l * o, z: p.z + dx / l * o };
  });
}
/** Catmull-Rom smoothing of a hand-authored path, about `step` metres between points. */
export function smoothPath(points: readonly Point[], step = 2): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  out.push(points.at(-1)!);
  return out;
}
