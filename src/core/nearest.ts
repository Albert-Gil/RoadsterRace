import { clamp, distance, lerp, mix } from './geometry';
import type { Point } from './types';

/**
 * Exact nearest-segment search without scanning a whole course. Segments are listed in every cell
 * of a uniform x/z grid their bounding box overlaps. Rings of cells are searched outward until the
 * best distance found is below the ring radius: any segment not yet listed lies wholly outside the
 * searched block, at least that far away. Callers then score the candidates in their original order,
 * so the choice (ties included) is exactly the full scan's.
 */
const CELL = 16;
export interface SegmentGrid { minX: number; minZ: number; cols: number; rows: number; cells: number[][]; stamp: Int32Array; visit: number; ends: (index: number) => [Point, Point] }

export function segmentGrid(count: number, ends: (index: number) => [Point, Point]): SegmentGrid {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) for (const p of ends(i)) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  if (!count) minX = minZ = maxX = maxZ = 0;
  const cols = Math.floor((maxX - minX) / CELL) + 1, rows = Math.floor((maxZ - minZ) / CELL) + 1, cells = Array.from({ length: cols * rows }, () => [] as number[]);
  for (let i = 0; i < count; i++) {
    const [a, b] = ends(i), x0 = Math.floor((Math.min(a.x, b.x) - minX) / CELL), x1 = Math.floor((Math.max(a.x, b.x) - minX) / CELL);
    const z0 = Math.floor((Math.min(a.z, b.z) - minZ) / CELL), z1 = Math.floor((Math.max(a.z, b.z) - minZ) / CELL);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) cells[z * cols + x].push(i);
  }
  return { minX, minZ, cols, rows, cells, stamp: new Int32Array(count), visit: 0, ends };
}

/** Indices (ascending) of every segment that could be nearest to p. */
export function nearbySegments(p: Point, g: SegmentGrid): number[] {
  const ix = Math.floor((p.x - g.minX) / CELL), iz = Math.floor((p.z - g.minZ) / CELL), found: number[] = [], visit = ++g.visit;
  let best = Infinity;
  for (let r = 0; ; r++) {
    for (let z = iz - r; z <= iz + r; z++) {
      if (z < 0 || z >= g.rows) continue;
      const step = z === iz - r || z === iz + r ? 1 : 2 * r || 1;
      for (let x = ix - r; x <= ix + r; x += step) {
        if (x < 0 || x >= g.cols) continue;
        for (const index of g.cells[z * g.cols + x]) {
          if (g.stamp[index] === visit) continue;
          g.stamp[index] = visit; found.push(index);
          const [a, b] = g.ends(index), dx = b.x - a.x, dz = b.z - a.z, t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
          best = Math.min(best, Math.hypot(p.x - lerp(a.x, b.x, t), p.z - lerp(a.z, b.z, t)));
        }
      }
    }
    if (best < r * CELL - 1e-6 || (ix - r <= 0 && iz - r <= 0 && ix + r >= g.cols - 1 && iz + r >= g.rows - 1)) break;
    // Far from the course the rings grow faster than the course: score every segment instead.
    if ((2 * r + 3) ** 2 > g.stamp.length) return Array.from(g.stamp, (_, index) => index);
  }
  return found.sort((a, b) => a - b);
}

const polylineGrids = new WeakMap<Point[], SegmentGrid>();
/** Same result as projectToPolyline(point, points, distances), searching only nearby segments. */
export function projectToPolylineNear(point: Point, points: Point[], distances: number[]) {
  let grid = polylineGrids.get(points);
  if (!grid) { grid = segmentGrid(Math.max(0, points.length - 1), i => [points[i], points[i + 1]]); polylineGrids.set(points, grid); }
  let best = { distance: Infinity, progress: 0, point: points[0] };
  for (const i of nearbySegments(point, grid)) {
    const a = points[i], b = points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const candidate = mix(a, b, t), gap = distance(point, candidate);
    if (gap < best.distance) best = { distance: gap, progress: lerp(distances[i], distances[i + 1], t), point: candidate };
  }
  return best;
}
