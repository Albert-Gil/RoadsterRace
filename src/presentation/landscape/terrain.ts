import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { Point, TrackDefinition } from '../../core/types';

export interface Extent { minX: number; maxX: number; minZ: number; maxZ: number }

/**
 * Distance (m) from any point to the drawn course: the centerline plus authored jump and Hop
 * branches. Precomputed on a coarse grid and sampled bilinearly, so landscape code can ask it
 * for tens of thousands of points cheaply.
 */
export function courseDistance(track: TrackDefinition, extent: Extent, cell = 3) {
  return distanceField([[...track.centerline, track.centerline[0]], ...(track.hopShortcuts ?? []).map(s => s.branch), ...(track.jumps ?? []).map(j => j.branch)], extent, cell);
}
/** Bilinear sampling of a scalar grid over an extent (clamped at the edges). */
function gridSampler(grid: Float32Array, cols: number, rows: number, extent: Extent, cell: number) {
  return (x: number, z: number) => {
    const fx = Math.min(cols - 1.001, Math.max(0, (x - extent.minX) / cell)), fz = Math.min(rows - 1.001, Math.max(0, (z - extent.minZ) / cell));
    const c = Math.floor(fx), r = Math.floor(fz), tx = fx - c, tz = fz - r, i = r * cols + c;
    const top = grid[i] + (grid[i + 1] - grid[i]) * tx, bottom = grid[i + cols] + (grid[i + cols + 1] - grid[i + cols]) * tx;
    return top + (bottom - top) * tz;
  };
}

/** Squared distance from a point to segment s of a flat (ax, az, bx, bz) list. */
function segmentDistance2(segments: ArrayLike<number>, s: number, x: number, z: number) {
  const ax = segments[s], az = segments[s + 1], dx = segments[s + 2] - ax, dz = segments[s + 3] - az, len = dx * dx + dz * dz;
  const t = len > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / len)) : 0, ex = x - ax - dx * t, ez = z - az - dz * t;
  return ex * ex + ez * ez;
}
/**
 * Distance from every grid node to the nearest segment: exact near the segments, then the nearest
 * segment is passed across the grid in two raster sweeps (a feature transform), so the cost is
 * linear in the grid size rather than grid x segments.
 */
function segmentGrid(segments: number[], extent: Extent, cell: number) {
  const cols = Math.ceil((extent.maxX - extent.minX) / cell) + 1, rows = Math.ceil((extent.maxZ - extent.minZ) / cell) + 1;
  const dist = new Float32Array(cols * rows).fill(Infinity), nearest = new Int32Array(cols * rows).fill(-1);
  const X = (c: number) => Math.min(extent.maxX, extent.minX + c * cell), Z = (r: number) => Math.min(extent.maxZ, extent.minZ + r * cell);
  const offer = (c: number, r: number, s: number) => { const i = r * cols + c, d = segmentDistance2(segments, s, X(c), Z(r)); if (d < dist[i]) { dist[i] = d; nearest[i] = s; } };
  for (let s = 0; s < segments.length; s += 4) {
    const c0 = Math.max(0, Math.floor((Math.min(segments[s], segments[s + 2]) - extent.minX) / cell) - 1), c1 = Math.min(cols - 1, Math.ceil((Math.max(segments[s], segments[s + 2]) - extent.minX) / cell) + 1);
    const r0 = Math.max(0, Math.floor((Math.min(segments[s + 1], segments[s + 3]) - extent.minZ) / cell) - 1), r1 = Math.min(rows - 1, Math.ceil((Math.max(segments[s + 1], segments[s + 3]) - extent.minZ) / cell) + 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) offer(c, r, s);
  }
  const pull = (c: number, r: number, nc: number, nr: number) => { if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return; const s = nearest[nr * cols + nc]; if (s >= 0) offer(c, r, s); };
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) { pull(c, r, c - 1, r); pull(c, r, c - 1, r - 1); pull(c, r, c, r - 1); pull(c, r, c + 1, r - 1); }
      for (let c = cols - 1; c >= 0; c--) pull(c, r, c + 1, r);
    }
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = cols - 1; c >= 0; c--) { pull(c, r, c + 1, r); pull(c, r, c + 1, r + 1); pull(c, r, c, r + 1); pull(c, r, c - 1, r + 1); }
      for (let c = 0; c < cols; c++) pull(c, r, c - 1, r);
    }
  }
  for (let i = 0; i < dist.length; i++) dist[i] = Math.sqrt(dist[i]);
  return { cols, rows, dist, nearest };
}

/** Distance (m) to the nearest of some polylines, gridded like courseDistance; `.exact` skips the grid. */
export function distanceField(paths: readonly (readonly Point[])[], extent: Extent, cell = 3) {
  const segments: number[] = [];
  for (const path of paths) for (let i = 1; i < path.length; i++) segments.push(path[i - 1].x, path[i - 1].z, path[i].x, path[i].z);
  const exact = (x: number, z: number) => { let best = Infinity; for (let s = 0; s < segments.length; s += 4) best = Math.min(best, segmentDistance2(segments, s, x, z)); return Math.sqrt(best); };
  const { cols, rows, dist } = segmentGrid(segments, extent, cell);
  return Object.assign(gridSampler(dist, cols, rows, extent, cell), { exact });
}

/**
 * Signed distance (m, negative inside) to the nearest of some polygons, gridded and sampled
 * bilinearly; `nearest` names the polygon (by index) closest to a point, or containing it.
 */
export function polygonField(polygons: readonly (readonly Point[])[], extent: Extent, cell = 3) {
  const segments: number[] = [], owners: number[] = [];
  polygons.forEach((p, k) => { for (let i = 0, j = p.length - 1; i < p.length; j = i++) { segments.push(p[j].x, p[j].z, p[i].x, p[i].z); owners.push(k); } });
  const inside = (x: number, z: number, polygon: readonly Point[]) => {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const a = polygon[i], b = polygon[j]; if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) result = !result; }
    return result;
  };
  const exact = (x: number, z: number) => {
    let best = Infinity, owner = -1;
    for (let s = 0; s < segments.length; s += 4) { const d = segmentDistance2(segments, s, x, z); if (d < best) { best = d; owner = owners[s / 4]; } }
    const within = polygons.findIndex(p => inside(x, z, p));
    return within >= 0 ? { distance: -Math.sqrt(best), index: within } : { distance: Math.sqrt(best), index: owner };
  };
  const { cols, rows, dist, nearest } = segmentGrid(segments, extent, cell), owner = new Int16Array(cols * rows);
  for (let i = 0; i < dist.length; i++) owner[i] = nearest[i] >= 0 ? owners[nearest[i] / 4] : -1;
  // Inside cells, by scanline: each polygon's crossings along every grid row.
  polygons.forEach((p, k) => {
    const minZ = Math.min(...p.map(q => q.z)), maxZ = Math.max(...p.map(q => q.z));
    for (let r = Math.max(0, Math.ceil((minZ - extent.minZ) / cell)); r < rows && extent.minZ + r * cell <= maxZ; r++) {
      const z = extent.minZ + r * cell, xs: number[] = [];
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a.z > z) !== (b.z > z)) xs.push((b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x); }
      xs.sort((a, b) => a - b);
      for (let q = 0; q + 1 < xs.length; q += 2) for (let c = Math.max(0, Math.ceil((xs[q] - extent.minX) / cell)); c < cols && extent.minX + c * cell < xs[q + 1]; c++) { dist[r * cols + c] = -Math.abs(dist[r * cols + c]); owner[r * cols + c] = k; }
    }
  });
  const nearestPolygon = (x: number, z: number) => owner[Math.min(rows - 1, Math.max(0, Math.round((z - extent.minZ) / cell))) * cols + Math.min(cols - 1, Math.max(0, Math.round((x - extent.minX) / cell)))];
  return Object.assign(gridSampler(dist, cols, rows, extent, cell), { exact, nearest: nearestPolygon });
}

export interface TerrainSpec {
  extent: Extent;
  /** Vertex spacing in metres. */
  cell: number;
  height(x: number, z: number): number;
  /** Vertex tint (0..1 RGB, multiplied with the material); slope is 0 (flat) .. 1 (vertical). */
  color(x: number, z: number, height: number, slope: number): [number, number, number];
}

/**
 * One heightfield mesh for the land around a circuit. UVs span the extent once (0..1), for a
 * painted ground map; colours come from the spec. Normals follow the actual heights. A flat skirt
 * carries the ground from the extent's edge out to `skirt` metres, so no view ever runs out of land.
 */
export function buildTerrain(name: string, scene: Scene, spec: TerrainSpec, material: StandardMaterial, skirt = 1200) {
  const { extent: e, cell } = spec, cols = Math.ceil((e.maxX - e.minX) / cell) + 1, rows = Math.ceil((e.maxZ - e.minZ) / cell) + 1;
  const heights = new Float32Array(cols * rows), positions = new Float32Array(cols * rows * 3), normals = new Float32Array(cols * rows * 3);
  const colors = new Float32Array(cols * rows * 4), uvs = new Float32Array(cols * rows * 2), indices = new Uint32Array((cols - 1) * (rows - 1) * 6);
  const xAt = (c: number) => Math.min(e.maxX, e.minX + c * cell), zAt = (r: number) => Math.min(e.maxZ, e.minZ + r * cell);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) heights[r * cols + c] = spec.height(xAt(c), zAt(r));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, x = xAt(c), z = zAt(r), h = heights[i];
    const hx = heights[r * cols + Math.min(cols - 1, c + 1)] - heights[r * cols + Math.max(0, c - 1)], hz = heights[Math.min(rows - 1, r + 1) * cols + c] - heights[Math.max(0, r - 1) * cols + c];
    const span = 2 * cell, nx = -hx / span, nz = -hz / span, len = Math.hypot(nx, 1, nz);
    positions.set([x, h, z], i * 3); normals.set([nx / len, 1 / len, nz / len], i * 3);
    uvs.set([(x - e.minX) / (e.maxX - e.minX), (z - e.minZ) / (e.maxZ - e.minZ)], i * 2);
    colors.set([...spec.color(x, z, h, 1 - 1 / len), 1], i * 4);
  }
  let k = 0;
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + 1, d = a + cols, f = d + 1;
    indices[k++] = a; indices[k++] = b; indices[k++] = d; indices[k++] = b; indices[k++] = f; indices[k++] = d;
  }
  // Skirt: the border loop of the grid joined to the same loop pushed far out, at the edge's level.
  const border: number[] = [];
  for (let c = 0; c < cols; c++) border.push(c);
  for (let r = 1; r < rows; r++) border.push(r * cols + cols - 1);
  for (let c = cols - 2; c >= 0; c--) border.push((rows - 1) * cols + c);
  for (let r = rows - 2; r > 0; r--) border.push(r * cols);
  const mx = (e.minX + e.maxX) / 2, mz = (e.minZ + e.maxZ) / 2, far = skirt / Math.min(e.maxX - mx, e.maxZ - mz), base = cols * rows;
  const P = Array.from(positions), N = Array.from(normals), C = Array.from(colors), U = Array.from(uvs), I = Array.from(indices);
  for (const i of border) {
    P.push(mx + (positions[i * 3] - mx) * far, positions[i * 3 + 1] - 0.02, mz + (positions[i * 3 + 2] - mz) * far); N.push(0, 1, 0);
    C.push(colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2], 1); U.push(uvs[i * 2], uvs[i * 2 + 1]);
  }
  for (let k = 0; k < border.length; k++) {
    // The border runs counter-clockwise seen from above (x, then z increasing): (inner, outer, next inner) faces up.
    const a = border[k], b = border[(k + 1) % border.length], fa = base + k, fb = base + (k + 1) % border.length;
    I.push(a, fa, b, b, fa, fb);
  }
  const data = new VertexData(); data.positions = P; data.normals = N; data.colors = C; data.uvs = U; data.indices = I;
  const mesh = new Mesh(name, scene); data.applyToMesh(mesh); mesh.material = material; mesh.isPickable = false; mesh.receiveShadows = true;
  return { mesh, heightAt: (x: number, z: number) => {
    const fx = Math.min(cols - 1.001, Math.max(0, (x - e.minX) / cell)), fz = Math.min(rows - 1.001, Math.max(0, (z - e.minZ) / cell));
    const c = Math.floor(fx), r = Math.floor(fz), tx = fx - c, tz = fz - r, i = r * cols + c;
    const top = heights[i] + (heights[i + 1] - heights[i]) * tx, bottom = heights[i + cols] + (heights[i + cols + 1] - heights[i + cols]) * tx;
    return top + (bottom - top) * tz;
  } };
}
