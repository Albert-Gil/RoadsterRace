import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Point } from '../../core/types';

/** RGB in 0..1; used as a multiplier of a white (or neutral) material. */
export type Rgb = [number, number, number];

/**
 * Growable vertex-coloured geometry for procedural landscape. Front faces are clockwise seen from
 * outside (Babylon's default), i.e. for triangle (a, b, c) the outward normal is (c - a) x (b - a).
 */
export class Geometry {
  positions: number[] = []; colors: number[] = []; indices: number[] = [];
  /** Optional explicit normals (one per vertex); computed smooth when absent. */
  normals: number[] | null = null;
  get vertexCount() { return this.positions.length / 3; }
  get triangleCount() { return this.indices.length / 3; }
  vertex(x: number, y: number, z: number, c: Rgb) { this.positions.push(x, y, z); this.colors.push(c[0], c[1], c[2], 1); return this.vertexCount - 1; }
  triangle(a: number, b: number, c: number) { this.indices.push(a, b, c); }
  /** Computes smooth normals once (shared vertices only), for use as an instancing template. */
  withNormals() { if (!this.normals || this.normals.length !== this.positions.length) this.normals = computeNormals(this.positions, this.indices); return this; }
  /** Adds another geometry (normals are computed per part, so seams between parts stay crisp). */
  append(part: Geometry) {
    const base = this.vertexCount, normals = part.withNormals().normals!;
    if (!this.normals || this.normals.length !== this.positions.length) this.normals = this.vertexCount ? computeNormals(this.positions, this.indices) : [];
    for (let i = 0; i < part.positions.length; i++) { this.positions.push(part.positions[i]); this.normals.push(normals[i]); }
    for (let i = 0; i < part.colors.length; i++) this.colors.push(part.colors[i]);
    for (let i = 0; i < part.indices.length; i++) this.indices.push(part.indices[i] + base);
  }
  /** Adds a transformed copy of a template; `tint` may recolour each vertex (template colour, vertex index, world y). */
  instance(template: Geometry, t: Transform, tint?: (c: Rgb, index: number, y: number) => Rgb) {
    const normals = template.withNormals().normals!, base = this.vertexCount, apply = transformer(t), out: [number, number, number] = [0, 0, 0];
    if (!this.normals || this.normals.length !== this.positions.length) this.normals = this.vertexCount ? computeNormals(this.positions, this.indices) : [];
    for (let i = 0; i < template.vertexCount; i++) {
      apply(template.positions[i * 3], template.positions[i * 3 + 1], template.positions[i * 3 + 2], false, out); this.positions.push(out[0], out[1], out[2]);
      const y = out[1];
      apply(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2], true, out); const l = Math.hypot(out[0], out[1], out[2]) || 1; this.normals.push(out[0] / l, out[1] / l, out[2] / l);
      if (tint) { const c = tint([template.colors[i * 4], template.colors[i * 4 + 1], template.colors[i * 4 + 2]], i, y); this.colors.push(c[0], c[1], c[2], 1); }
      else this.colors.push(template.colors[i * 4], template.colors[i * 4 + 1], template.colors[i * 4 + 2], 1);
    }
    for (let i = 0; i < template.indices.length; i++) this.indices.push(template.indices[i] + base);
  }
  toVertexData() {
    const data = new VertexData();
    data.positions = new Float32Array(this.positions); data.colors = new Float32Array(this.colors);
    data.indices = this.vertexCount > 65535 ? new Uint32Array(this.indices) : new Uint16Array(this.indices);
    data.normals = new Float32Array(this.normals && this.normals.length === this.positions.length ? this.normals : computeNormals(this.positions, this.indices));
    return data;
  }
}

export function computeNormals(positions: number[], indices: number[]) {
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  return normals;
}

/** A placement transform: scale (per axis), roll about local z, heading about y (0 = +z), then translate. */
export interface Transform { x: number; y: number; z: number; heading?: number; scale?: number | [number, number, number]; tilt?: [number, number] }
/** A reusable form of transformPoint that writes into `out` (no allocation per vertex). */
export function transformer(t: Transform) {
  const s = typeof t.scale === 'number' ? [t.scale, t.scale, t.scale] : t.scale ?? [1, 1, 1], h = t.heading ?? 0, ch = Math.cos(h), sh = Math.sin(h);
  const [ax, az] = t.tilt ?? [0, 0], cx = Math.cos(ax), sx = Math.sin(ax), cz = Math.cos(az), sz = Math.sin(az), tilted = !!t.tilt;
  return (px: number, py: number, pz: number, normal: boolean, out: [number, number, number]) => {
    let x = normal ? px / s[0] : px * s[0], y = normal ? py / s[1] : py * s[1], z = normal ? pz / s[2] : pz * s[2];
    if (tilted) { const ty = y * cx - z * sx, tz = y * sx + z * cx; y = ty; z = tz; const tx = x * cz - y * sz, uy = x * sz + y * cz; x = tx; y = uy; }
    const wx = x * ch + z * sh, wz = -x * sh + z * ch;
    if (normal) { out[0] = wx; out[1] = y; out[2] = wz; } else { out[0] = wx + t.x; out[1] = y + t.y; out[2] = wz + t.z; }
  };
}
export function transformPoint(px: number, py: number, pz: number, t: Transform, normal = false): [number, number, number] {
  const s = typeof t.scale === 'number' ? [t.scale, t.scale, t.scale] : t.scale ?? [1, 1, 1];
  let x = px * (normal ? 1 / s[0] : s[0]), y = py * (normal ? 1 / s[1] : s[1]), z = pz * (normal ? 1 / s[2] : s[2]);
  if (t.tilt) { // Small tilts about x then z, for rocks resting at an angle.
    const [ax, az] = t.tilt, cy = y * Math.cos(ax) - z * Math.sin(ax), cz = y * Math.sin(ax) + z * Math.cos(ax); y = cy; z = cz;
    const dx = x * Math.cos(az) - y * Math.sin(az), dy = x * Math.sin(az) + y * Math.cos(az); x = dx; y = dy;
  }
  const h = t.heading ?? 0, wx = x * Math.cos(h) + z * Math.sin(h), wz = -x * Math.sin(h) + z * Math.cos(h);
  return normal ? [wx, y, wz] : [wx + t.x, y + t.y, wz + t.z];
}

// ---- Polygon helpers (footprints are x/z polygons in either winding).

export function insidePolygon(p: Point, polygon: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
/** Distance from a point to the polygon outline. */
export function edgeDistance(p: Point, polygon: readonly Point[]) {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i], dx = b.x - a.x, dz = b.z - a.z, len = dx * dx + dz * dz;
    const t = len > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len)) : 0;
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t));
  }
  return best;
}
/** Signed distance: negative inside the polygon. */
export function signedDistance(p: Point, polygon: readonly Point[]) { const d = edgeDistance(p, polygon); return insidePolygon(p, polygon) ? -d : d; }
/** Distance from `from` (inside) along direction `angle` (0 = +x, counter-clockwise toward +z) to the first edge crossing. */
export function rayToEdge(from: Point, angle: number, polygon: readonly Point[]) {
  const dx = Math.cos(angle), dz = Math.sin(angle); let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i], ex = b.x - a.x, ez = b.z - a.z, den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((a.x - from.x) * ez - (a.z - from.z) * ex) / den, u = ((a.x - from.x) * dz - (a.z - from.z) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
  }
  return best;
}
export function centroid(polygon: readonly Point[]) {
  let a = 0, x = 0, z = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const p = polygon[j], q = polygon[i], cross = p.x * q.z - q.x * p.z; a += cross; x += (p.x + q.x) * cross; z += (p.z + q.z) * cross;
  }
  return Math.abs(a) < 1e-9 ? { x: polygon.reduce((s, p) => s + p.x, 0) / polygon.length, z: polygon.reduce((s, p) => s + p.z, 0) / polygon.length } : { x: x / (3 * a), z: z / (3 * a) };
}

export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const scale = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
export const hex = (value: string): Rgb => [parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255];
