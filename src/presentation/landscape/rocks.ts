import type { Point } from '../../core/types';
import type { PropLibrary, PropModel } from '../props';
import { fbm3, noise3, random, smoothstep } from './noise';
import { Geometry, centroid, edgeDistance, insidePolygon, mix, rayToEdge, scale, transformPoint, type Rgb, type Transform } from './mesh';

/**
 * Procedural rock for the land around circuits (presentation only): layered sandstone buttes and
 * mesas, weathered granite tors and boulder fields, single boulders and pebbles. Every solid
 * formation is generated inside its collision footprint (a TrackBarrier of kind 'rock'), so what a
 * player sees is what a line can hit. Colours are baked into vertices for one shared material.
 */

// ---------------------------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------------------------

export interface RockPalette {
  /** Sandstone strata from the bottom up; repeated with height. */
  strata: Rgb[];
  /** Typical stratum thickness (m). */
  stratum: number;
  talus: Rgb; cap: Rgb; varnish: Rgb;
  /** Granite/boulder tones: base, light, dark. */
  granite: [Rgb, Rgb, Rgb];
  lichen: Rgb;
  /** Ground (sand) colour, for dusting the feet of rocks. */
  dust: Rgb;
  /** How far scanned rock is pulled toward granite[0] (0..1); desert venues keep the scans' own colour. */
  scanTint?: number;
}

/** One global stratigraphy: the same layer sits at the same height in every butte of a venue. */
export function stratumColour(palette: RockPalette, y: number) {
  const band = Math.floor(y / palette.stratum + 0.35 * Math.sin(y * 0.37)), n = palette.strata.length;
  return palette.strata[((band % n) + n) % n];
}

// ---------------------------------------------------------------------------------------------
// Columns: rings of vertices extruded inside a footprint
// ---------------------------------------------------------------------------------------------

export type RingKind = 'base' | 'talus' | 'hard' | 'soft' | 'cap' | 'mound' | 'top';
export interface Ring {
  y: number; /** Fraction of the distance to the footprint edge. */ s: number; kind: RingKind;
  /** A ledge or recess (fraction of the radius) that comes and goes around the wall. */
  ledge?: number;
  /** A hard edge: faces above and below do not share normals (ledges, rims). */
  crease?: boolean;
}
export interface ColumnOptions {
  centre: Point; footprint: readonly Point[];
  /** Clear distance kept inside the footprint (m). */
  margin: number;
  /** Optional further limit on the radius per direction (a cut, or a spire's own size). */
  limit?: (angle: number) => number;
  rings: Ring[]; segments: number; seed: number;
  /** Soft vertical gullies and general roughness, as fractions of the radius. */
  gully: number; jitter: number;
  /** Jointed plan: straight wall runs between corners about this many metres apart. */
  facet?: number;
  /** Sharp alcoves and slots cut into the walls, per 10 m of perimeter. */
  notches?: number;
  /** Layer dip (m of rise per m along x and z). */
  dip?: [number, number];
  cap?: { dome: number; roughness: number };
  colour(x: number, y: number, z: number, ring: Ring, angle: number): Rgb;
}
export interface Column {
  geometry: Geometry;
  /** Height of the column's outer surface at a point inside it (null outside). */
  heightAt(p: Point): number | null;
}

const ringWeight = (kind: RingKind) => kind === 'base' ? 0 : kind === 'talus' || kind === 'mound' ? 0.45 : kind === 'cap' || kind === 'top' ? 0.6 : 1;

export function column(o: ColumnOptions): Column {
  const g = new Geometry(), N = o.segments, limits: number[] = [], rand = random(o.seed * 31 + 5), angleOf = (i: number) => i / N * Math.PI * 2;
  for (let i = 0; i < N; i++) limits.push(Math.max(0.3, Math.min(rayToEdge(o.centre, angleOf(i), o.footprint) - o.margin, o.limit?.(angleOf(i)) ?? Infinity)));
  // A gentle circular blur keeps polygon corners from reading as creases up the whole wall.
  let R = limits.map((_, i) => Math.min(limits[i], (limits[(i + N - 1) % N] + 2 * limits[i] + limits[(i + 1) % N]) / 4));
  const meanR = R.reduce((s, r) => s + r, 0) / N, perimeter = meanR * Math.PI * 2, k = Math.max(1.5, meanR / 4.5);
  if (o.facet) {
    // Joints: corners at irregular spacing, straight walls between them (never outside the limits).
    const corners: number[] = [], m = Math.max(5, Math.round(perimeter / o.facet));
    for (let c = 0; c < m; c++) corners.push(Math.round((c + (rand() - 0.5) * 0.6) * N / m + N) % N);
    corners.splice(0, corners.length, ...[...new Set(corners)].sort((a, b) => a - b));
    const cr = corners.map(i => R[i] * (1 - rand() * 0.13)), next: number[] = R.slice();
    for (let c = 0; c < corners.length; c++) {
      const ia = corners[c], ib = corners[(c + 1) % corners.length], span = (ib - ia + N) % N || N;
      const ax = Math.cos(angleOf(ia)) * cr[c], az = Math.sin(angleOf(ia)) * cr[c], bx = Math.cos(angleOf(ib)) * cr[(c + 1) % corners.length], bz = Math.sin(angleOf(ib)) * cr[(c + 1) % corners.length];
      for (let j = 0; j <= span; j++) {
        const i = (ia + j) % N, dx = Math.cos(angleOf(i)), dz = Math.sin(angleOf(i)), ex = bx - ax, ez = bz - az, den = dx * ez - dz * ex;
        const r = Math.abs(den) > 1e-9 ? (ax * ez - az * ex) / den : R[i];
        next[i] = Math.min(limits[i], r > 0 ? r : R[i]);
      }
    }
    R = next;
  }
  // Alcoves and slots: flat-bottomed notches running up the walls.
  const notch = new Float32Array(N);
  for (let n = 0, count = Math.round(perimeter / 10 * (o.notches ?? 0)); n < count; n++) {
    const at = rand() * N, half = (0.7 + rand() * 2) / meanR / (Math.PI * 2) * N, depth = 0.05 + rand() * 0.12;
    for (let i = 0; i < N; i++) { const d = Math.abs(((i - at + N * 1.5) % N) - N / 2) / half; if (d < 1) notch[i] = Math.max(notch[i], depth * (1 - smoothstep(0.55, 1, d))); }
  }
  const dipAt = (x: number, z: number) => o.dip ? o.dip[0] * (x - o.centre.x) + o.dip[1] * (z - o.centre.z) : 0;
  const rows: { below: number[]; above: number[] }[] = [];
  for (const [index, ring] of o.rings.entries()) {
    const row: number[] = [], w = ringWeight(ring.kind);
    for (let i = 0; i < N; i++) {
      const a = angleOf(i), ca = Math.cos(a), sa = Math.sin(a);
      const gully = Math.max(0, fbm3(ca * k, ring.y * 0.03, sa * k, 3, o.seed)) ** 1.4;
      const rough = 0.5 + 0.5 * fbm3(ca * k * 2.6, ring.y * 0.2, sa * k * 2.6, 2, o.seed + 7);
      const e = Math.max(0.55, 1 - o.gully * 1.6 * gully * w - notch[i] * w - o.jitter * rough * (0.35 + 0.65 * w));
      const ledge = ring.ledge ? ring.ledge * smoothstep(-0.2, 0.45, noise3(ca * k * 1.3, ring.y * 0.11, sa * k * 1.3, o.seed + 19)) : 0;
      const r = R[i] * (ring.s + ledge) * e, x = o.centre.x + ca * r, z = o.centre.z + sa * r;
      const y = ring.y + dipAt(x, z) + (w ? 0.08 * w * noise3(ca * k * 3, ring.y * 0.4, sa * k * 3, o.seed + 3) : 0);
      row.push(g.vertex(x, y, z, o.colour(x, y, z, ring, a)));
    }
    const crease = (ring.crease || (o.cap && index === o.rings.length - 1)) && index > 0;
    rows.push({ below: row, above: crease ? row.map(v => g.vertex(g.positions[v * 3], g.positions[v * 3 + 1], g.positions[v * 3 + 2], [g.colors[v * 4], g.colors[v * 4 + 1], g.colors[v * 4 + 2]])) : row });
  }
  const band = (lower: number[], upper: number[]) => { for (let i = 0; i < N; i++) { const a = lower[i], b = lower[(i + 1) % N], c = upper[i], d = upper[(i + 1) % N]; g.triangle(a, b, c); g.triangle(b, d, c); } };
  for (let r = 0; r < rows.length - 1; r++) band(rows[r].above, rows[r + 1].below);
  const top = o.rings.at(-1)!;
  if (o.cap) {
    // The top: three inner rings (a low dome with rough patches) and a centre vertex.
    let outer = rows.at(-1)!.above;
    for (const f of [0.9, 0.76, 0.58, 0.36, 0.16]) {
      const inner: number[] = [];
      for (let i = 0; i < N; i++) {
        const p = rows.at(-1)!.below[i], x = o.centre.x + (g.positions[p * 3] - o.centre.x) * f, z = o.centre.z + (g.positions[p * 3 + 2] - o.centre.z) * f;
        const y = top.y + dipAt(x, z) + o.cap.dome * (1 - f * f) + o.cap.roughness * noise3(x * 0.3, top.y, z * 0.3, o.seed + 11) * (1 - f * 0.5);
        inner.push(g.vertex(x, y, z, o.colour(x, y, z, { ...top, kind: 'top', s: top.s * f }, angleOf(i))));
      }
      band(outer, inner); outer = inner;
    }
    const cy = top.y + o.cap.dome, centre = g.vertex(o.centre.x, cy, o.centre.z, o.colour(o.centre.x, cy, o.centre.z, { ...top, kind: 'top', s: 0 }, 0));
    for (let i = 0; i < N; i++) g.triangle(outer[i], outer[(i + 1) % N], centre);
  }
  const heightAt = (p: Point) => {
    const dx = p.x - o.centre.x, dz = p.z - o.centre.z, a = (Math.atan2(dz, dx) + Math.PI * 2) % (Math.PI * 2), f = a / (Math.PI * 2) * N, i = Math.floor(f) % N;
    const radius = R[i] + (R[(i + 1) % N] - R[i]) * (f - Math.floor(f)), rho = Math.hypot(dx, dz) / radius;
    if (rho > o.rings[0].s) return null;
    if (rho <= top.s) return top.y + dipAt(p.x, p.z) + (o.cap ? o.cap.dome * (1 - (rho / top.s) ** 2) : 0);
    // Outer rings shrink as they rise: find the pair that brackets this radius.
    for (let r = o.rings.length - 1; r > 0; r--) {
      const lo = o.rings[r - 1], hi = o.rings[r];
      if (rho <= lo.s && rho >= hi.s) return lo.y + (hi.y - lo.y) * (lo.s - rho) / Math.max(1e-6, lo.s - hi.s) + dipAt(p.x, p.z);
    }
    return o.rings[0].y;
  };
  return { geometry: g, heightAt };
}

// ---------------------------------------------------------------------------------------------
// Boulders
// ---------------------------------------------------------------------------------------------

const spheres = new Map<number, { positions: number[]; indices: number[] }>();
/** Unit icosphere (0: 20 triangles, 1: 80, 2: 320), wound for clockwise front faces. */
function icosphere(level: number) {
  const cached = spheres.get(level); if (cached) return cached;
  const t = (1 + Math.sqrt(5)) / 2, positions: number[] = [];
  for (const [x, y, z] of [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]) { const l = Math.hypot(x, y, z); positions.push(x / l, y / l, z / l); }
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let l = 0; l < level; l++) {
    const mid = new Map<string, number>(), half = (a: number, b: number) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`; let m = mid.get(key);
      if (m === undefined) { const x = positions[a * 3] + positions[b * 3], y = positions[a * 3 + 1] + positions[b * 3 + 1], z = positions[a * 3 + 2] + positions[b * 3 + 2], n = Math.hypot(x, y, z); m = positions.length / 3; positions.push(x / n, y / n, z / n); mid.set(key, m); }
      return m;
    };
    faces = faces.flatMap(([a, b, c]) => { const ab = half(a, b), bc = half(b, c), ca = half(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
  }
  // The classic table is counter-clockwise from outside; swap to Babylon's clockwise front faces.
  const result = { positions, indices: faces.flatMap(([a, b, c]) => [a, c, b]) };
  spheres.set(level, result); return result;
}

export interface BoulderOptions {
  /** Width (x), height (y) and depth (z) in metres. */
  size: [number, number, number];
  seed: number;
  /** Superquadric exponent: 2 is round, 3-5 a weathered block. */
  roundness?: number;
  /** Icosphere subdivision (0..2). */
  detail?: number;
  /** Surface displacement as a fraction of the smallest size. */
  roughness?: number;
  /** Fraction of the height below which the underside is flattened. */
  flatten?: number;
  colour(x: number, y: number, z: number, up: number, height: number): Rgb;
}
/** A boulder standing on y = 0 (origin at its base centre). */
export function boulder(o: BoulderOptions): Geometry {
  const { positions, indices } = icosphere(o.detail ?? 1), n = o.roundness ?? 2.4, [w, h, d] = o.size, min = Math.min(w, h, d);
  const rough = (o.roughness ?? 0.12) * min, flatten = o.flatten ?? 0.7, g = new Geometry(), pts: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const vx = positions[i], vy = positions[i + 1], vz = positions[i + 2];
    const r = (Math.abs(vx) ** n + Math.abs(vy) ** n + Math.abs(vz) ** n) ** (-1 / n);
    const bump = rough * (fbm3(vx * 1.3 + o.seed * 0.37, vy * 1.3, vz * 1.3 - o.seed * 0.21, 3, o.seed) + 0.35 * noise3(vx * 4, vy * 4, vz * 4, o.seed + 5));
    let x = vx * r * w / 2 + vx * bump, y = vy * r * h / 2 + vy * bump;
    const z = vz * r * d / 2 + vz * bump;
    const floor = -h / 2 * flatten; if (y < floor) y = floor + (y - floor) * 0.15;
    x *= 1 + 0.06 * (y / h);
    pts.push(x, y, z);
  }
  let lowest = Infinity; for (let i = 1; i < pts.length; i += 3) lowest = Math.min(lowest, pts[i]);
  const height = Math.max(...pts.filter((_, i) => i % 3 === 1)) - lowest;
  for (let i = 0; i < pts.length; i += 3) {
    const y = pts[i + 1] - lowest, up = positions[i + 1];
    g.vertex(pts[i], y, pts[i + 2], o.colour(pts[i], y, pts[i + 2], up, height));
  }
  for (const i of indices) g.indices.push(i);
  return g;
}

/** Weathered granite: warm mottling, bleached tops, darker undersides and sand-dusted feet, lichen on the biggest. */
export function graniteColour(palette: RockPalette, seed: number, lichen = 0) {
  const rand = random(seed * 7919 + 13), [base, light, dark] = palette.granite;
  const tone = mix(base, rand() < 0.5 ? light : dark, rand() * 0.45);
  return (x: number, y: number, z: number, up: number, height: number): Rgb => {
    const m = fbm3(x * 0.9 + seed, y * 0.9, z * 0.9, 3, seed);
    let c = mix(tone, m > 0 ? light : dark, Math.min(1, Math.abs(m) * 1.4) * 0.55);
    c = scale(c, (0.86 + 0.16 * smoothstep(-0.2, 0.8, up)) * (0.72 + 0.28 * smoothstep(0, Math.min(0.6, height * 0.35), y)));
    if (lichen && up > 0.2 && fbm3(x * 1.7, y * 1.7, z * 1.7, 2, seed + 41) > 0.32 - lichen * 0.1) c = mix(c, palette.lichen, 0.55);
    if (y < 0.18) c = mix(c, palette.dust, 0.35 * (1 - y / 0.18));
    return c;
  };
}

// ---------------------------------------------------------------------------------------------
// Scanned models (Poly Haven, baked by tools/bake-props.mjs)
// ---------------------------------------------------------------------------------------------

const modelTemplates = new WeakMap<PropModel, Geometry>();
/** A baked model as an instancing template (positions, normals and colours shared, converted once). */
function modelTemplate(model: PropModel) {
  let g = modelTemplates.get(model);
  if (!g) {
    g = new Geometry(); g.positions = Array.from(model.positions); g.normals = Array.from(model.normals); g.colors = Array.from(model.colors); g.indices = Array.from(model.indices);
    modelTemplates.set(model, g);
  }
  return g;
}
/** Appends a baked model with a transform; `tint` may recolour each vertex (colour, world y). */
export function appendModel(g: Geometry, model: PropModel, t: Transform, tint?: (c: Rgb, y: number) => Rgb) {
  g.instance(modelTemplate(model), t, tint ? (c, _i, y) => tint(c, y) : undefined);
}
/** True when every (sampled) vertex of the model, placed by t, lies inside the polygon by `inset` metres. */
export function modelFits(positions: ArrayLike<number>, t: Transform, polygon: readonly Point[], inset: number, stride = 3) {
  for (let i = 0; i < positions.length / 3; i += stride) {
    const [x, , z] = transformPoint(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], t), p = { x, z };
    if (!insidePolygon(p, polygon) || edgeDistance(p, polygon) < inset) return false;
  }
  return true;
}
export function placeGeometry(g: Geometry, part: Geometry, t: Transform) { g.instance(part, t); }

// ---------------------------------------------------------------------------------------------
// Formations
// ---------------------------------------------------------------------------------------------

/** 'riprap': quarried blocks heaped over a low core (a groyne or breakwater). */
export type FormationStyle = 'butte' | 'mesa' | 'tor' | 'boulders' | 'boulder-row' | 'ledge' | 'riprap';
export interface FormationSpec {
  id: string; footprint: readonly Point[]; height: number; style: FormationStyle; seed: number;
  /** Ground level the formation stands on (m); its height counts from here. */
  base?: number;
  /** Level of detail: 1 near, 2 far (coarser walls and thicker beds). */
  lod?: number;
  /** Buttes: a second, narrower tier above a bench. */
  tiers?: 1 | 2;
  /** Mesas: a detached hoodoo spire at the +long-axis end. */
  spire?: boolean;
  /** Tors: a scanned relief (prop key) set into the face that looks along `reliefHeading`. */
  relief?: { key: string; heading: number; scale: number };
}
export interface Formation {
  geometry: Geometry;
  /** Points on flat rock tops where small plants may grow, with their height. */
  ledges: { x: number; y: number; z: number }[];
}

const segmentsFor = (footprint: readonly Point[], spacing: number) => {
  let perimeter = 0; for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) perimeter += Math.hypot(footprint[i].x - footprint[j].x, footprint[i].z - footprint[j].z);
  return Math.max(28, Math.min(132, Math.round(perimeter / spacing)));
};

/** Ring stack of a layered sandstone butte (talus apron, near-vertical beds with ledges that come and go, a caprock rim). */
function butteRings(h: number, rand: () => number, tiers: 1 | 2, wall: number, lod = 1): Ring[] {
  const rings: Ring[] = [{ y: -1.8, s: 1, kind: 'base' }];
  const talusTop = h * (0.22 + 0.07 * rand());
  for (let k = 0; k <= 5; k++) { const t = k / 5; rings.push({ y: talusTop * t ** 0.85, s: wall + 0.025 + (0.985 - wall - 0.025) * (1 - t) ** 1.8, kind: 'talus', crease: k === 5 }); }
  const bench = tiers === 2 ? h * (0.5 + 0.1 * rand()) : Infinity, upper = wall * (0.76 + 0.08 * rand()), capBase = h - (0.9 + 0.9 * rand());
  const base = (yy: number) => (yy > bench ? upper : wall) * (1 - 0.03 * (yy - talusTop) / (h - talusTop));
  let y = talusTop, hard = rand() < 0.5, benchDone = false;
  while (y < capBase - 0.4) {
    if (!benchDone && y >= bench) {
      // A narrow bench, then a short talus against the upper tier.
      const s0 = rings.at(-1)!.s;
      rings.push({ y: y + 0.06, s: s0, kind: 'top', crease: true }, { y: y + 0.16, s: upper + 0.08, kind: 'top' }, { y: y + 0.5, s: upper + 0.04, kind: 'talus' }, { y: y + 1.2, s: upper + 0.012, kind: 'talus', crease: true });
      y += 1.2; benchDone = true; continue;
    }
    const massive = hard && rand() < 0.4, thick = lod * (massive ? 2.4 + rand() * 2.6 : hard ? 0.7 + rand() * 1.2 : 1.2 + rand() * 2.4);
    const top = Math.min(capBase, y + thick, !benchDone && bench < Infinity ? Math.max(bench, y + 0.5) : Infinity);
    const s = base(y), kind: RingKind = hard ? 'hard' : 'soft', ledge = massive ? 0.03 : hard ? 0.016 : -0.014;
    rings.push({ y: y + 0.05, s, kind, crease: true, ledge }, { y: top, s, kind, crease: true, ledge });
    y = top + 0.04; hard = rand() < (hard ? 0.85 : 0.7) ? !hard : hard;
  }
  const cap = base(capBase) + 0.022;
  rings.push({ y: capBase + 0.06, s: cap, kind: 'cap', crease: true }, { y: h - 0.18, s: cap, kind: 'cap' }, { y: h, s: cap - 0.01, kind: 'cap' });
  return rings;
}

function sandstoneColour(palette: RockPalette, seed: number, top: number) {
  const talus = (x: number, y: number, z: number) => {
    const m = fbm3(x * 0.6, y * 0.6, z * 0.6, 3, seed + 3);
    const c = mix(mix(palette.talus, stratumColour(palette, top * 0.6 + m * 4), 0.3), palette.varnish, smoothstep(0.05, 0.5, fbm3(x * 1.1, y * 1.1, z * 1.1, 2, seed + 5)) * 0.3);
    return mix(c, palette.dust, smoothstep(1.2, 0, y) * 0.45 + 0.08 * m);
  };
  return (x: number, y: number, z: number, ring: Ring, angle: number): Rgb => {
    if (ring.kind === 'base' || ring.kind === 'talus') return talus(x, y, z);
    if (ring.kind === 'top') {
      // Flat rock: pale caprock with dark crusted patches and pockets of blown sand.
      const m = fbm3(x * 0.14, 0, z * 0.14, 3, seed + 31), d = fbm3(x * 0.7, 1, z * 0.7, 2, seed + 37);
      let c = mix(palette.cap, stratumColour(palette, y - 0.6), 0.3);
      c = mix(c, palette.varnish, smoothstep(0.08, 0.5, m) * 0.32);
      c = mix(c, palette.dust, smoothstep(0.15, 0.55, -m) * 0.45);
      return scale(c, 0.95 + 0.1 * d);
    }
    const m = fbm3(x * 0.25, y * 0.5, z * 0.25, 3, seed + 9);
    let c = stratumColour(palette, y + 0.3 * m);
    if (ring.kind === 'cap') c = mix(c, palette.cap, 0.3);
    // Desert varnish: dark streaks hanging from the rim, strongest in gullies.
    const streak = smoothstep(0.2, 0.7, fbm3(Math.cos(angle) * 11, y * 0.012, Math.sin(angle) * 11, 3, seed + 21)) * smoothstep(top * 0.2, top * 0.95, y);
    c = mix(c, palette.varnish, streak * 0.6);
    return scale(c, (ring.kind === 'soft' ? 0.88 : 1.02) * (1 + 0.07 * m));
  };
}

/** Fallen sandstone: one bed's colour, lighter on top, dusty at the foot. */
export function slabColour(palette: RockPalette, seed: number, height: number) {
  const band = stratumColour(palette, random(seed)() * height);
  return (x: number, y: number, z: number, up: number): Rgb => mix(mix(scale(band, (0.74 + 0.16 * smoothstep(-0.3, 0.8, up)) * (1 + 0.08 * fbm3(x, y, z, 2, seed))), palette.varnish, 0.12 * smoothstep(0.2, -0.6, up)), palette.dust, smoothstep(0.25, 0, y) * 0.4);
}

/** A low sandstone block: a short talus, two or three stepped beds and a flat top. */
function ledgeRings(h: number, rand: () => number): Ring[] {
  const rings: Ring[] = [{ y: -0.6, s: 1, kind: 'base' }, { y: 0, s: 0.97, kind: 'talus' }, { y: h * 0.16, s: 0.9, kind: 'talus', crease: true }];
  let y = h * 0.16, hard = true, s = 0.86;
  while (y < h - 0.5) {
    const top = Math.min(h - 0.28, y + 0.5 + rand() * 0.7), bed = s + (hard ? 0.02 : -0.025), kind: RingKind = hard ? 'hard' : 'soft';
    rings.push({ y: y + 0.04, s: bed, kind, crease: true }, { y: top, s: bed, kind, crease: true });
    y = top + 0.04; hard = !hard; s -= 0.02 + rand() * 0.03;
  }
  rings.push({ y: h - 0.24, s: s + 0.01, kind: 'cap', crease: true }, { y: h, s, kind: 'cap' });
  return rings;
}

/** Granite whaleback that fills a footprint under its boulders. */
function moundRings(h: number): Ring[] {
  return [{ y: -0.5, s: 1, kind: 'base' }, { y: 0, s: 0.975, kind: 'mound' }, { y: h * 0.2, s: 0.93, kind: 'mound' }, { y: h * 0.42, s: 0.84, kind: 'mound' }, { y: h * 0.62, s: 0.72, kind: 'mound' }, { y: h * 0.82, s: 0.57, kind: 'mound' }, { y: h, s: 0.4, kind: 'mound' }];
}

/** A formation standing on its base level (spec.base, default 0). */
export function buildFormation(spec: FormationSpec, palette: RockPalette, library: PropLibrary | null): Formation {
  const base = spec.base ?? 0, formation = formationAtGround(spec, palette, library);
  if (base) { const p = formation.geometry.positions; for (let i = 1; i < p.length; i += 3) p[i] += base; for (const ledge of formation.ledges) ledge.y += base; }
  return formation;
}
function formationAtGround(spec: FormationSpec, palette: RockPalette, library: PropLibrary | null): Formation {
  const rand = random(spec.seed * 104729 + 7), g = new Geometry(), ledges: Formation['ledges'] = [];
  const c = centroid(spec.footprint), h = spec.height;
  const add = (col: Column) => { g.append(col.geometry); return col; };
  // Long axis of the footprint (for mesas and spires).
  let axis = 0, best = 0;
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI, len = rayToEdge(c, a, spec.footprint) + rayToEdge(c, a + Math.PI, spec.footprint); if (len > best) { best = len; axis = a; } }
  const granite = (seed: number, lichen = 0) => graniteColour(palette, seed, lichen);
  const fitBoulder = (size: [number, number, number], seed: number, at: Point, y: number, inset: number, roundness = 2.6, detail = 1, colour?: BoulderOptions['colour']) => {
    const part = boulder({ size, seed, roundness, detail, roughness: 0.14, colour: colour ?? granite(seed, size[1] > 1.5 ? 1 : 0) });
    const t: Transform = { x: at.x, y, z: at.z, heading: rand() * Math.PI * 2 };
    if (!modelFits(part.positions, t, spec.footprint, inset, 1)) return false;
    placeGeometry(g, part, t); return true;
  };
  const scanKeys = library ? [...library.keys()].filter(k => /^scan-namaqualand-boulder-0[2-5]$/.test(k)) : [];
  let scans = 0; // Hero scans per formation are capped; procedural boulders fill in beyond.
  const fitScan = (target: number, at: Point, y: number, inset: number, maxHeight: number) => {
    if (!scanKeys.length || scans >= 8) return false;
    const key = scanKeys[Math.floor(rand() * scanKeys.length)], model = library!.get(key)!;
    const extent = Math.max(model.max[0] - model.min[0], model.max[2] - model.min[2]), height = model.max[1] - model.min[1];
    const s = Math.min(target / extent, maxHeight / height), t: Transform = { x: at.x, y: y - 0.06 * s, z: at.z, heading: rand() * Math.PI * 2, scale: s };
    if (!modelFits(model.positions, t, spec.footprint, inset, 2)) return false;
    appendModel(g, model, t, col => mix(col, palette.granite[0], palette.scanTint ?? 0.18)); scans++; return true;
  };
  const inside = (radius: number, from = c) => { for (let i = 0; i < 30; i++) { const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius, p = { x: from.x + Math.cos(a) * r, z: from.z + Math.sin(a) * r }; if (insidePolygon(p, spec.footprint)) return p; } return from; };
  const meanRadius = Array.from({ length: 12 }, (_, i) => rayToEdge(c, i / 12 * Math.PI * 2, spec.footprint)).reduce((s, r) => s + r, 0) / 12;

  if (spec.relief && library?.has(spec.relief.key)) {
    // A scanned face set into the formation: its open back sinks into the rock behind it.
    const model = library.get(spec.relief.key)!, hd = spec.relief.heading, depth = (model.max[2] - model.min[2]) * spec.relief.scale, sandstone = spec.style !== 'tor' && spec.style !== 'boulders';
    const tint = (col: Rgb, y: number) => {
      if (!sandstone) return mix(col, palette.granite[0], palette.scanTint ?? 0.25);
      const lum = (0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2]) / 0.45;
      return mix(scale(stratumColour(palette, y), Math.min(1.25, lum)), col, 0.25);
    };
    // The largest scale (down to 55 %) and the shallowest setting that keep it inside the footprint.
    const reach = rayToEdge(c, Math.atan2(Math.cos(hd), Math.sin(hd)), spec.footprint);
    search: for (let k = 1; k >= 0.55; k -= 0.05) for (let back = 0.1; back <= 1.6; back += 0.1) {
      const off = reach - depth * k * (0.5 + back), t: Transform = { x: c.x + Math.sin(hd) * off, y: -0.4, z: c.z + Math.cos(hd) * off, heading: hd, scale: spec.relief.scale * k };
      if (modelFits(model.positions, t, spec.footprint, 0.2, 2)) { appendModel(g, model, t, tint); break search; }
    }
  }

  if (spec.style === 'butte' || spec.style === 'mesa') {
    const wall = spec.style === 'mesa' ? 0.72 + 0.05 * rand() : 0.66 + 0.06 * rand();
    let limit: ((a: number) => number) | undefined, centre = c;
    if (spec.spire) {
      // The main body stops short of the far end of the long axis; a hoodoo stands beyond the gap.
      const reach = rayToEdge(c, axis, spec.footprint), cut = reach * 0.38, ax = Math.cos(axis), az = Math.sin(axis);
      centre = { x: c.x - ax * reach * 0.12, z: c.z - az * reach * 0.12 };
      limit = a => { const d = Math.cos(a) * ax + Math.sin(a) * az; return d > 0.05 ? (cut + reach * 0.12) / d : Infinity; };
      const spireAt = { x: c.x + ax * reach * 0.72, z: c.z + az * reach * 0.72 }, sr = Math.min(3.2, rayToEdge(spireAt, axis + Math.PI / 2, spec.footprint), rayToEdge(spireAt, axis - Math.PI / 2, spec.footprint));
      const sh = h * 0.86, spire: Ring[] = [{ y: -1.2, s: 1, kind: 'base' }, { y: 0, s: 0.95, kind: 'talus' }, { y: sh * 0.18, s: 0.62, kind: 'talus' }, { y: sh * 0.24, s: 0.5, kind: 'soft' }];
      for (let y = sh * 0.24, hard = true; y < sh * 0.8; hard = !hard) { const top = Math.min(sh * 0.8, y + 0.7 + rand() * 1.2), s = 0.4 + 0.08 * Math.sin(y * 0.9) + (hard ? 0.04 : -0.03); spire.push({ y: y + 0.05, s, kind: hard ? 'hard' : 'soft' }, { y: top, s, kind: hard ? 'hard' : 'soft' }); y = top + 0.05; }
      spire.push({ y: sh * 0.8 + 0.1, s: 0.3, kind: 'soft' }, { y: sh * 0.84, s: 0.62, kind: 'cap' }, { y: sh, s: 0.58, kind: 'cap' });
      add(column({ centre: spireAt, footprint: spec.footprint, margin: 0.3, limit: () => sr * 1.25, rings: spire, segments: 40, seed: spec.seed + 17, gully: 0.05, jitter: 0.07, cap: { dome: 0.3, roughness: 0.15 }, colour: sandstoneColour(palette, spec.seed + 2, sh) }));
      // A low rubble saddle joins the two at ground level.
      for (let i = 0; i < 9; i++) { const t = 0.25 + i / 9 * 0.45, p = { x: c.x + ax * reach * t + (rand() - 0.5) * 2, z: c.z + az * reach * t + (rand() - 0.5) * 2 }; fitBoulder([1.4 + rand() * 1.6, 0.9 + rand() * 1.2, 1.3 + rand() * 1.4], spec.seed * 31 + i, p, -0.15, 0.25, 2.2, 1); }
    }
    const lod = spec.lod ?? 1, rings = butteRings(h, rand, spec.tiers ?? 1, wall, lod);
    const body = add(column({ centre, footprint: spec.footprint, margin: 0.35, limit, rings, segments: segmentsFor(spec.footprint, 1.3 * lod), seed: spec.seed, gully: 0.03, jitter: 0.035, facet: 7, notches: 1.8, dip: [(rand() - 0.5) * 0.03, (rand() - 0.5) * 0.03], cap: { dome: 0.04, roughness: 0.025 }, colour: sandstoneColour(palette, spec.seed, h) }));
    // Fallen blocks on the talus apron, and seed points for plants on the top.
    for (let i = 0, placed = 0; i < 400 && placed < Math.round(meanRadius * 3.5 / lod); i++) {
      const a = rand() * Math.PI * 2, edge = rayToEdge(centre, a, spec.footprint), f = 0.74 + rand() * 0.22, p = { x: centre.x + Math.cos(a) * edge * f, z: centre.z + Math.sin(a) * edge * f };
      const y = body.heightAt(p); if (y === null) continue;
      const s = 0.6 + rand() * rand() * 2.8;
      if (fitBoulder([s * (1 + rand() * 0.6), s * (0.45 + rand() * 0.4), s], spec.seed * 53 + i, p, y - 0.25 * s, 0.25, 3.2 + rand() * 1.6, s > 1.6 ? 1 : 0, slabColour(palette, spec.seed * 53 + i, h))) placed++;
    }
    for (let i = 0; i < 18; i++) { const p = inside(meanRadius * 0.4, centre), y = body.heightAt(p); if (y !== null && y > h * 0.8) ledges.push({ x: p.x, y, z: p.z }); }
    return { geometry: g, ledges };
  }

  if (spec.style === 'ledge') {
    // Broken sandstone: a low jointed bench carrying blocky slabs, the biggest near the middle, some stacked.
    const benchHeight = Math.min(h * 0.4, 1.3);
    const bench = add(column({ centre: c, footprint: spec.footprint, margin: 0.25, rings: ledgeRings(benchHeight, rand), segments: segmentsFor(spec.footprint, 0.7), seed: spec.seed, gully: 0.03, jitter: 0.05, facet: 2.6, notches: 1.6, dip: [(rand() - 0.5) * 0.05, (rand() - 0.5) * 0.05], cap: { dome: 0.05, roughness: 0.06 }, colour: sandstoneColour(palette, spec.seed, h) }));
    const blocks: { x: number; z: number; r: number; top: number }[] = [], target = Math.round(4 + meanRadius * 1.6);
    for (let i = 0, n = 0; i < target * 10 && n < target; i++) {
      const big = n < 3, p = inside(meanRadius * (big ? 0.45 : 0.8)), w = (big ? 0.55 : 0.25 + rand() * 0.25) * meanRadius * (0.8 + rand() * 0.5), d = w * (0.5 + rand() * 0.4);
      const under = Math.max(bench.heightAt(p) ?? 0, ...blocks.filter(q => Math.hypot(q.x - p.x, q.z - p.z) < q.r * 0.8).map(q => q.top));
      const thick = Math.min(h - under, (big ? 0.9 : 0.45 + rand() * 0.6) * Math.max(0.7, h * 0.4));
      if (thick < 0.35) continue;
      const slab = boulder({ size: [w, thick, d], seed: spec.seed * 23 + i, roundness: 6, detail: w > 2.2 ? 2 : 1, roughness: 0.05, flatten: 0.95, colour: slabColour(palette, spec.seed * 23 + i, h) });
      const t: Transform = { x: p.x, y: under - 0.12, z: p.z, heading: rand() * Math.PI, tilt: [(rand() - 0.5) * 0.28, (rand() - 0.5) * 0.28] };
      if (!modelFits(slab.positions, t, spec.footprint, 0.15, 1)) continue;
      placeGeometry(g, slab, t); blocks.push({ x: p.x, z: p.z, r: Math.min(w, d) / 2, top: under + thick * 0.9 }); n++;
    }
    for (let i = 0, placed = 0; i < 60 && placed < 9; i++) {
      const a = rand() * Math.PI * 2, edge = rayToEdge(c, a, spec.footprint), p = { x: c.x + Math.cos(a) * edge * (0.7 + rand() * 0.2), z: c.z + Math.sin(a) * edge * (0.7 + rand() * 0.2) }, s = 0.5 + rand() * 0.9;
      const slab = boulder({ size: [s * 1.6, s * 0.5, s * 1.2], seed: spec.seed * 17 + i, roundness: 5, detail: 1, roughness: 0.08, colour: slabColour(palette, spec.seed * 17 + i, h) });
      const t: Transform = { x: p.x, y: -0.08, z: p.z, heading: rand() * Math.PI, tilt: [(rand() - 0.5) * 0.35, (rand() - 0.5) * 0.35] };
      if (modelFits(slab.positions, t, spec.footprint, 0.15, 1)) { placeGeometry(g, slab, t); placed++; }
    }
    return { geometry: g, ledges };
  }

  if (spec.style === 'riprap') {
    // A low core under angular blocks packed over the whole footprint, the crest reaching its height.
    const coreHeight = h * 0.42, core = add(column({ centre: c, footprint: spec.footprint, margin: 0.45, rings: moundRings(coreHeight), segments: segmentsFor(spec.footprint, 0.6), seed: spec.seed, gully: 0.06, jitter: 0.22, notches: 0, cap: { dome: 0.35, roughness: 0.2 }, colour: (x, y, z) => mix(granite(spec.seed + 5)(x, y, z, 0.8, coreHeight), palette.dust, smoothstep(0.4, 0.0, y) * 0.4) }));
    const xs = spec.footprint.map(p => p.x), zs = spec.footprint.map(p => p.z);
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1.15) for (let z = Math.min(...zs); z <= Math.max(...zs); z += 1.15) {
      const p = { x: x + (rand() - 0.5) * 0.7, z: z + (rand() - 0.5) * 0.7 }; if (!insidePolygon(p, spec.footprint)) continue;
      const ground = core.heightAt(p) ?? 0, s = Math.min((h - ground + 0.1) / 0.6, 1.2 + rand() * 0.9); if (s < 0.4) continue;
      fitBoulder([s * (1.15 + rand() * 0.35), s * (0.62 + rand() * 0.15), s], spec.seed * 131 + Math.round(x * 7 + z * 13), p, ground - s * 0.14, 0.08, 3.2 + rand() * 1.2, 0);
    }
    return { geometry: g, ledges };
  }

  if (spec.style === 'boulder-row') {
    // An unmarked natural obstruction: overlapping weathered blocks, with staggered tops
    // and a low rubble bed. Clip every stone to the authored outline, never to the road.
    add(column({ centre: c, footprint: spec.footprint, margin: 0.02,
      rings: [{ y: 0, s: 1, kind: 'base' }, { y: h * 0.12, s: 0.98, kind: 'talus' }, { y: h * 0.3, s: 0.86, kind: 'mound' }],
      segments: segmentsFor(spec.footprint, 0.45), seed: spec.seed, gully: 0.12, jitter: 0.04,
      cap: { dome: 0.05, roughness: 0.05 }, colour: (x, y, z) => slabColour(palette, spec.seed, h)(x, y, z, 0.7) }));
    const lo = -rayToEdge(c, axis + Math.PI, spec.footprint), hi = rayToEdge(c, axis, spec.footprint);
    const count = Math.max(2, Math.ceil((hi - lo) / 2.1));
    for (let i = 0; i < count; i++) {
      const u = lo + (hi - lo) * (i + 0.5) / count, stagger = (rand() - 0.5) * 0.9;
      const at = { x: c.x + Math.cos(axis) * u - Math.sin(axis) * stagger, z: c.z + Math.sin(axis) * u + Math.cos(axis) * stagger };
      if (!insidePolygon(at, spec.footprint)) continue;
      const height = h * (i === Math.floor(count / 2) ? 1 : 0.78 + rand() * 0.22);
      const part = boulder({ size: [(hi - lo) / count * 1.35, height, 3.5], seed: spec.seed * 17 + i,
        roundness: 3.2 + rand(), detail: 2, roughness: 0.18, flatten: 0.9, colour: slabColour(palette, spec.seed + i, h) });
      const maxY = Math.max(...part.positions.filter((_, j) => j % 3 === 1));
      for (let j = 1; j < part.positions.length; j += 3) part.positions[j] *= height / maxY;
      const block = new Geometry(); block.instance(part, { x: at.x, y: 0, z: at.z, heading: -axis + (rand() - 0.5) * 0.2 });
      for (let j = 0; j < block.positions.length; j += 3) {
        const p = { x: block.positions[j], z: block.positions[j + 2] };
        if (insidePolygon(p, spec.footprint) && edgeDistance(p, spec.footprint) >= 0.02) continue;
        const angle = Math.atan2(p.z - at.z, p.x - at.x), r = Math.max(0, rayToEdge(at, angle, spec.footprint) - 0.025);
        block.positions[j] = at.x + Math.cos(angle) * r; block.positions[j + 2] = at.z + Math.sin(angle) * r;
      }
      block.normals = null; g.append(block);
    }
    return { geometry: g, ledges };
  }

  // Granite: a whaleback mound carrying boulders (and, for tors, stacked blocks and a scanned face).
  // Small footprints (rim piles) are mostly mound, so they still fill their whole height.
  const small = meanRadius < 3.5, moundHeight = spec.style === 'tor' ? Math.min(h * 0.22, 1.5) : small ? h * 0.4 : Math.min(h * 0.38, 1.3);
  const mound = add(column({ centre: c, footprint: spec.footprint, margin: 0.25, rings: moundRings(moundHeight), segments: segmentsFor(spec.footprint, 0.6), seed: spec.seed, gully: 0.12, jitter: 0.18, notches: 1, cap: { dome: 0.2, roughness: 0.18 }, colour: (x, y, z) => { const col = granite(spec.seed + 5)(x, y, z, 0.8, moundHeight); return mix(col, palette.dust, smoothstep(0.5, 0.05, y) * 0.35); } }));
  const surface = (p: Point) => mound.heightAt(p) ?? 0;
  const tiers = spec.style === 'tor' ? [{ count: 6, size: [0.42, 0.62] as const }, { count: 3, size: [0.32, 0.45] as const }, { count: 1, size: [0.26, 0.32] as const }] : [];
  let level = 0;
  for (const [ti, tier] of tiers.entries()) {
    // Woolsack blocks stack into a tor; each tier sits on the one below.
    const top = h - level, room = Math.max(1.2, top);
    let rise = 0;
    for (let i = 0, placed = 0; i < 40 && placed < tier.count; i++) {
      const p = inside(meanRadius * (0.55 - ti * 0.15)), base = ti === 0 ? surface(p) - 0.3 : moundHeight + level - 0.35;
      const s = Math.min(room * 0.95, h * (tier.size[0] + rand() * (tier.size[1] - tier.size[0]))), size: [number, number, number] = [s * (1.1 + rand() * 0.5), s, s * (0.9 + rand() * 0.4)];
      if (base + s > h + 0.1) continue;
      // Scanned granite where it fits (it carries the real weathering), procedural woolsacks otherwise.
      if ((rand() < 0.75 && fitScan(s * 1.5, p, base + 0.1, 0.2, s)) || fitBoulder(size, spec.seed * 97 + ti * 13 + i, p, base, 0.2, 3.6, s > 2.4 ? 2 : 1)) { placed++; rise = Math.max(rise, s * 0.82); }
    }
    level += rise;
  }
  if (small) {
    // A small pile: boulders stacked on the mound until they reach the footprint's height.
    let top = moundHeight - 0.25;
    for (let i = 0; i < 40 && top < h - 0.6; i++) {
      const p = inside(meanRadius * 0.35), size = Math.min(h - top + 0.3, meanRadius * (0.9 + rand() * 0.4));
      if (fitScan(size * 1.5, p, top - 0.15, 0.05, size) || fitBoulder([size * 1.2, size, size], spec.seed * 61 + i, p, top - 0.2, 0.05, 2.6, 1)) top += size * 0.62;
    }
  }
  // Boulders over the mound: big first, near the middle; scans for the larger ones.
  const count = Math.round(4 + meanRadius * (spec.style === 'tor' ? 1.4 : 2.2));
  for (let i = 0, placed = 0; i < count * 6 && placed < count; i++) {
    const big = placed < count * 0.3, p = inside(meanRadius * (big ? 0.6 : 0.95)), base = surface(p);
    const size = big ? Math.min(h - base, h * (0.55 + rand() * 0.35)) : 0.5 + rand() * rand() * Math.min(2.2, h * 0.5);
    if (size < 0.35) continue;
    const ok = big && rand() < 0.7 ? fitScan(size * 1.6, p, base, 0.15, h - base + 0.05) : fitBoulder([size * (1 + rand() * 0.5), size, size * (0.8 + rand() * 0.5)], spec.seed * 211 + i, p, base - size * 0.18, 0.15, 2.3 + rand(), size > 1.8 ? 2 : 1);
    if (ok) placed++;
  }
  return { geometry: g, ledges };
}

// ---------------------------------------------------------------------------------------------
// Loose rocks (visual only, beyond the planning corridor)
// ---------------------------------------------------------------------------------------------

/** 'block': an angular, low-poly quarried block (riprap). */
export interface LooseRock { x: number; y: number; z: number; size: number; heading: number; seed: number; kind: 'pebble' | 'boulder' | 'slab' | 'block' }
const looseTemplates = new WeakMap<RockPalette, { pebbles: Geometry[]; cobbles: Geometry[]; slabs: Geometry[]; blocks: Geometry[] }>();
/** Unit-size loose rock templates, made once per palette. */
function looseTemplatesFor(palette: RockPalette) {
  let t = looseTemplates.get(palette);
  if (!t) {
    const make = (n: number, f: (i: number) => Geometry) => Array.from({ length: n }, (_, i) => f(i).withNormals());
    t = {
      pebbles: make(14, i => boulder({ size: [1 + (i % 3) * 0.2, 0.6 + (i % 4) * 0.1, 1], seed: 900 + i, roundness: 2.2 + (i % 5) * 0.3, detail: 0, roughness: 0.16, colour: graniteColour(palette, 900 + i) })),
      cobbles: make(8, i => boulder({ size: [1.2, 0.7 + (i % 3) * 0.12, 1], seed: 950 + i, roundness: 2.4 + (i % 4) * 0.35, detail: 1, roughness: 0.16, colour: graniteColour(palette, 950 + i) })),
      slabs: make(10, i => boulder({ size: [1.5, 0.4, 1], seed: 990 + i, roundness: 4.5, detail: i % 2, roughness: 0.12, colour: slabColour(palette, 990 + i, 12) })),
      blocks: make(10, i => boulder({ size: [1.3 + (i % 3) * 0.15, 0.62 + (i % 4) * 0.08, 1], seed: 1030 + i, roundness: 3.4 + (i % 3) * 0.5, detail: 0, roughness: 0.2, colour: graniteColour(palette, 1030 + i) })),
    };
    looseTemplates.set(palette, t);
  }
  return t;
}
/** Merges scattered rocks: small ones from procedural templates, larger ones from the low-detail scans when present. */
export function looseRocks(rocks: readonly LooseRock[], palette: RockPalette, library: PropLibrary | null): Geometry {
  const g = new Geometry(), scans = library ? [...library.keys()].filter(k => /^scan-.*-lo$/.test(k)) : [], templates = looseTemplatesFor(palette);
  const tall = scans.filter(k => { const m = library!.get(k)!; return (m.max[1] - m.min[1]) / Math.max(m.max[0] - m.min[0], m.max[2] - m.min[2]) >= 0.3; }), bulky = tall.length ? tall : scans;
  for (const r of rocks) {
    const rand = random(r.seed * 7 + 3);
    if (r.kind === 'boulder' && r.size > 1.1 && scans.length) {
      // Big boulders skip the flattest scans, which read as shards at that size.
      const pool = r.size > 1.6 ? bulky : scans, model = library!.get(pool[r.seed % pool.length])!, extent = Math.max(model.max[0] - model.min[0], model.max[1] - model.min[1], model.max[2] - model.min[2]);
      appendModel(g, model, { x: r.x, y: r.y - 0.08 * r.size, z: r.z, heading: r.heading, scale: r.size / extent }, c => mix(c, palette.granite[0], palette.scanTint ?? 0.2));
      continue;
    }
    const list = r.kind === 'block' ? templates.blocks : r.kind === 'slab' ? templates.slabs : r.size > 0.9 ? templates.cobbles : templates.pebbles, s = r.size;
    g.instance(list[r.seed % list.length], { x: r.x, y: r.y - 0.12 * s, z: r.z, heading: r.heading, scale: [s * (0.85 + rand() * 0.3), s * (0.8 + rand() * 0.4), s * (0.85 + rand() * 0.3)], tilt: [(rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4] });
  }
  return g;
}
