import type { Point } from './types';

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t) });
export const modulo = (v: number, n: number) => ((v % n) + n) % n;
export const angleDelta = (from: number, to: number) => modulo(to - from + Math.PI, Math.PI * 2) - Math.PI;

export function cumulative(points: Point[]): number[] {
  const values = [0];
  for (let i = 1; i < points.length; i++) values.push(values[i - 1] + distance(points[i - 1], points[i]));
  return values;
}

export function samplePolyline(points: Point[], distances: number[], s: number): Point {
  const length = distances[distances.length - 1];
  const value = clamp(s, 0, length);
  let lo = 0, hi = distances.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (distances[mid] <= value) lo = mid; else hi = mid; }
  return mix(points[lo], points[hi], (value - distances[lo]) / Math.max(1e-9, distances[hi] - distances[lo]));
}

export function projectToPolyline(point: Point, points: Point[], distances: number[]) {
  let best = { distance: Infinity, progress: 0, point: points[0] };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const candidate = mix(a, b, t), gap = distance(point, candidate);
    if (gap < best.distance) best = { distance: gap, progress: lerp(distances[i], distances[i + 1], t), point: candidate };
  }
  return best;
}

export function closedSpline(controls: Point[], subdivisions = 18): Point[] {
  const result: Point[] = [], n = controls.length;
  for (let i = 0; i < n; i++) {
    const a = controls[modulo(i - 1, n)], b = controls[i], c = controls[(i + 1) % n], d = controls[(i + 2) % n];
    for (let j = 0; j < subdivisions; j++) {
      const t = j / subdivisions, t2 = t * t, t3 = t2 * t;
      const axis = (key: 'x' | 'z') => 0.5 * (2 * b[key] + (-a[key] + c[key]) * t + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t2 + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t3);
      result.push({ x: axis('x'), z: axis('z') });
    }
  }
  result.push({ ...result[0] });
  return result;
}
