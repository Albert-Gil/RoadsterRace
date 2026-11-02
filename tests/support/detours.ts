// Shortest car-width-clear paths between course stations, for shortcut audits: free space is
// anything at least half a car width (plus 0.15 m) from every barrier footprint, road or sand.
import { insideBarrier } from '../../src/core/barriers';
import { projectToPolyline, samplePolyline } from '../../src/core/geometry';
import type { Point, TrackDefinition } from '../../src/core/types';

function segDist(p: Point, a: Point, b: Point) { const dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l)); return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t); }
export function barrierDistance(p: Point, footprint: Point[]) { let d = Infinity; for (let i = 0; i < footprint.length; i++) d = Math.min(d, segDist(p, footprint[i], footprint[(i + 1) % footprint.length])); return d; }

/**
 * For every pair of stations, the free-space path length and the road distance between them.
 * `corridor` keeps the search within that distance of the centreline (on-road and runoff lines).
 */
export function detours(track: TrackDefinition, box: { minX: number; maxX: number; minZ: number; maxZ: number }, from: number[], to: number[], opts: { cell?: number; corridor?: number; ignore?: string[] } = {}) {
  const cell = opts.cell ?? 0.5, cols = Math.ceil((box.maxX - box.minX) / cell), rows = Math.ceil((box.maxZ - box.minZ) / cell), clear = track.carWidth / 2 + 0.15;
  const barriers = track.barriers.filter(b => !(opts.ignore ?? []).includes(b.id));
  const free = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const p = { x: box.minX + (c + .5) * cell, z: box.minZ + (r + .5) * cell };
    if (opts.corridor !== undefined && projectToPolyline(p, track.centerline, track.distances).distance > opts.corridor) continue;
    free[r * cols + c] = barriers.every(b => !insideBarrier(p, b) && barrierDistance(p, b.footprint) >= clear) ? 1 : 0;
  }
  const idx = (p: Point) => Math.floor((p.z - box.minZ) / cell) * cols + Math.floor((p.x - box.minX) / cell);
  const results: { from: number; to: number; road: number; path: number; saving: number; route?: Point[] }[] = [];
  const steps = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2], [2, 1, Math.sqrt(5)], [1, 2, Math.sqrt(5)], [-2, 1, Math.sqrt(5)], [-1, 2, Math.sqrt(5)], [2, -1, Math.sqrt(5)], [1, -2, Math.sqrt(5)], [-2, -1, Math.sqrt(5)], [-1, -2, Math.sqrt(5)]];
  for (const s of from) {
    const prev = new Int32Array(cols * rows).fill(-1), dist = new Float64Array(cols * rows).fill(Infinity), start = idx(samplePolyline(track.centerline, track.distances, s));
    // binary heap
    const heap: number[] = [], key = (i: number) => dist[heap[i]];
    const push = (v: number) => { heap.push(v); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (key(p) <= key(i)) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && key(l) < key(m)) m = l; if (r < heap.length && key(r) < key(m)) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    dist[start] = 0; push(start);
    while (heap.length) {
      const u = pop(), uc = u % cols, ur = (u - uc) / cols;
      for (const [dc, dr, w] of steps) {
        const c = uc + dc, r = ur + dr; if (c < 0 || r < 0 || c >= cols || r >= rows) continue; const v = r * cols + c; if (!free[v]) continue;
        if (Math.abs(dc) + Math.abs(dr) > 1 && (!free[ur * cols + c] || !free[r * cols + uc])) continue;
        const nd = dist[u] + w * cell; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; push(v); }
      }
    }
    for (const t of to) { const d = dist[idx(samplePolyline(track.centerline, track.distances, t))]; const route: Point[] = []; for (let v = idx(samplePolyline(track.centerline, track.distances, t)), k = 0; v >= 0 && k < 100000; v = prev[v], k++) if (k % 8 === 0) route.push({ x: +(box.minX + (v % cols + .5) * cell).toFixed(1), z: +(box.minZ + (Math.floor(v / cols) + .5) * cell).toFixed(1) }); results.push({ from: s, to: t, road: t - s, path: d, saving: t - s - d, route: route.reverse() }); }
  }
  return results;
}
