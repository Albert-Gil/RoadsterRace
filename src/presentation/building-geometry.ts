import type { Point } from '../core/types';
import { Geometry } from './landscape/mesh';

const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);

/** Exact solid body for an authored, possibly concave, building footprint. */
export function buildingGeometry(footprint: readonly Point[], height: number, base = 0) {
  const area = footprint.reduce((s, a, i) => { const b = footprint[(i + 1) % footprint.length]; return s + a.x * b.z - b.x * a.z; }, 0);
  const points = area > 0 ? [...footprint] : [...footprint].reverse();
  const g = new Geometry(), color: [number, number, number] = [1, 1, 1];
  const top = points.map(p => g.vertex(p.x, base + height, p.z, color));
  const remaining = points.map((_, i) => i);
  // Ear clipping retains the narrow neck of a concave utility building; a centre
  // fan would invent a roof/body over the neighbouring drivable road.
  while (remaining.length > 3) {
    let removed = false;
    for (let i = 0; i < remaining.length; i++) {
      const ai = remaining[(i + remaining.length - 1) % remaining.length], bi = remaining[i], ci = remaining[(i + 1) % remaining.length];
      const a = points[ai], b = points[bi], c = points[ci];
      if (cross(a, b, c) <= 1e-8) continue;
      if (remaining.some(k => k !== ai && k !== bi && k !== ci && cross(a, b, points[k]) >= -1e-8 && cross(b, c, points[k]) >= -1e-8 && cross(c, a, points[k]) >= -1e-8)) continue;
      g.triangle(top[ai], top[bi], top[ci]); remaining.splice(i, 1); removed = true; break;
    }
    if (!removed) throw Error('Invalid building footprint');
  }
  g.triangle(top[remaining[0]], top[remaining[1]], top[remaining[2]]);
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const q = [g.vertex(a.x, base, a.z, color), g.vertex(b.x, base, b.z, color),
      g.vertex(b.x, base + height, b.z, color), g.vertex(a.x, base + height, a.z, color)];
    g.triangle(q[0], q[1], q[2]); g.triangle(q[0], q[2], q[3]);
  }
  return g;
}
