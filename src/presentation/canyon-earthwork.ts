import type { Point, RoadSection, TrackDefinition } from '../core/types';
import { distance, lerp, samplePolyline } from '../core/geometry';
import { roadHeight, roadSupportWidth } from '../core/elevation';
import { roadEdges } from '../core/road-geometry';
import { canyonIntegration as art } from './themes';
import { Geometry, hex, mix, scale, type Rgb } from './landscape/mesh';
import { fbm2, noise2, smoothstep } from './landscape/noise';

export interface CanyonTrail { id: string; path: Point[]; width: number; widths?: number[]; section?: RoadSection; tip?: { at: 'start' | 'end'; advance: Point; toeWidth: number } }

/** Exact section boundaries matter at the open crossing and at changes of support width. */
export function canyonTrails(track: TrackDefinition): CanyonTrail[] {
  const at = (s: number): Point => ({ ...samplePolyline(track.centerline, track.distances, s), courseProgress: s, y: roadHeight(track, s) });
  const trails = (track.sections ?? []).filter(s => !s.flight).map(section => ({
    id: section.id, section, width: section.supportWidth,
    path: [at(section.from), ...track.centerline.filter(p => p.courseProgress! > section.from + 1e-5 && p.courseProgress! < section.to - 1e-5), at(section.to)],
  }));
  return [...trails.map(t => {
    const face = track.barriers.find(b => b.sectionId === t.id && b.slopedFace)?.slopedFace;
    return { ...t, widths: t.path.map(p => roadSupportWidth(track, p.courseProgress!, t.section)),
      ...(face ? { tip: { at: t.id === 'upper-approach' ? 'end' as const : 'start' as const, advance: { x: face.toe.x - face.lip.x, z: face.toe.z - face.lip.z }, toeWidth: face.toeWidth } } : {}) };
  }), ...(track.hopShortcuts ?? []).map(h => ({ id: h.id, width: h.width + 2, path: h.branch }))];
}

const beds = art.strata.map(hex), cap = hex(art.cap), shadow = hex(art.shade);
/** Shared horizontal beds, mineral staining and vertical erosion channels, not stretched ribbon UVs. */
export function trailRockColor(x: number, y: number, z: number, top: number): Rgb {
  const bed = y / art.bedHeight + noise2(x / 24, z / 24, 67) * 0.18;
  const index = ((Math.floor(bed) % beds.length) + beds.length) % beds.length;
  let c = beds[index];
  const grain = 0.94 + 0.08 * noise2(x * 1.3 + y * 0.7, z * 1.3, 74);
  const channel = Math.max(0, noise2(x * 0.34, z * 0.34, 17)) ** 2;
  const seam = Math.exp(-(((bed - Math.floor(bed) - 0.08) / 0.07) ** 2));
  c = mix(c, shadow, 0.2 * seam + channel * 0.42);
  c = mix(c, cap, smoothstep(top - 0.7, top + 0.02, y) * 0.7);
  c = mix(c, hex(art.dust), (1 - smoothstep(art.floor, art.floor + 1.1, y)) * 0.35);
  const mineralWash=.96+.055*fbm2(x/17+y*.025,z/17,3,621);
  return scale(c, grain*mineralWash);
}

/** Rough visual rims over the authored supports; narrow landing edges stay inside support. */
export function canyonTrailEdges(trail: CanyonTrail, width?: number, roughness = art.rimRoughness): [Point[], Point[]] {
  return roadEdges(trail.path, 2, false).map(edge => edge.map((normal, i) => {
    const c = trail.path[i], actualWidth = width ?? trail.widths?.[i] ?? trail.width;
    const p = { x: c.x + (normal.x - c.x) * actualWidth / 2, z: c.z + (normal.z - c.z) * actualWidth / 2 };
    const d = distance(p, c) || 1;
    const fade = smoothstep(0, 4, Math.min(distance(c, trail.path[0]), distance(c, trail.path.at(-1)!)));
    const noise = noise2(p.x * 0.33, p.z * 0.33, 527) * 0.65 + noise2(p.x * 1.1, p.z * 1.1, 137) * 0.35;
    const shift = ((trail.widths?.[i] ?? trail.width) <= actualWidth + 0.1 ? -Math.abs(noise) : noise) * roughness * fade;
    return { x: p.x + (p.x - c.x) / d * shift, z: p.z + (p.z - c.z) / d * shift };
  })) as [Point[], Point[]];
}

/** Keep a broad talus toe from folding over itself on the inside of a hairpin. */
function innerRoom(trail: CanyonTrail, index: number, side: number) {
  let room = Infinity;
  for (let i = Math.max(1, index - 9); i < Math.min(trail.path.length - 1, index + 10); i++) {
    const a = trail.path[i - 1], b = trail.path[i], c = trail.path[i + 1];
    const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
    if (Math.abs(cross) < 1e-7 || (cross > 0 ? 1 : 0) !== side) continue;
    const radius = distance(a, b) * distance(b, c) * distance(a, c) / (2 * Math.abs(cross));
    room = Math.min(room, Math.max(0, radius - (trail.widths?.[i] ?? trail.width) / 2 - art.rimRoughness - 0.8));
  }
  return room;
}

function bankRim(trail: CanyonTrail, side: number): BankPoint[] {
  return canyonTrailEdges(trail)[side].map((p, i) => {
    const c = trail.path[i], span = distance(p, c) || 1, depth = Math.max(0, c.y! - art.floor);
    const weathering = 0.88 + 0.24 * noise2(p.x * 0.085, p.z * 0.085, 305) + 0.10 * noise2(p.x * 0.3, p.z * 0.3, 919);
    const spread = Math.min(innerRoom(trail, i, side), (1 + depth * art.baseSpread) * weathering);
    const tip = trail.tip, end = trail.path[tip?.at === 'start' ? 0 : trail.path.length - 1];
    const w = tip ? 1 - smoothstep(0, 18, distance(c, end)) : 0;
    const radius = lerp(span + spread, tip?.toeWidth ? tip.toeWidth / 2 : span + spread, w);
    return { ...p, y: c.y! + 0.03, erosion: lerp(0.20, art.cliffErosion, w), foot: { x: c.x + (p.x - c.x) / span * radius + (tip?.advance.x ?? 0) * w,
      z: c.z + (p.z - c.z) / span * radius + (tip?.advance.z ?? 0) * w } };
  });
}

/** The wide foot of each hillside, also used by sediment/contact painting. */
export function canyonBankToes(trail: CanyonTrail): [Point[], Point[]] {
  return [0, 1].map(side => bankRim(trail, side).map(p => ({ ...p.foot }))) as [Point[], Point[]];
}

/** Sloping hillsides and authored cliff toes, clear of the lower crossing. */
export function canyonBankGeometry(trails: readonly CanyonTrail[]) {
  const result = new Geometry();
  const face = (path: BankPoint[], outward: boolean) => {
    if (path.length < 2) return;
    const rows: number[][] = [], part = new Geometry();
    for (let level = 0; level <= art.bankLayers; level++) {
      const f = level / art.bankLayers, row: number[] = [];
      for (const p of path) {
        const top = p.y!, y = lerp(art.floor, top, f);
        const erosion = 0.5 + 0.5 * noise2(p.x * 0.24, p.z * 0.24, 93);
        const shelf = 0.5 + 0.5 * Math.sin(y * Math.PI / art.bedHeight * 2);
        // Every face narrows uphill, including the jump heads. Their toe is authored outside
        // the lower road; the same slope data is queried by physical barrier contacts.
        const taper = (1 - f) ** 0.85;
        const profile = taper * (1 - p.erosion * erosion * Math.sin(Math.PI * f)) + Math.sin(Math.PI * f) * 0.012 * shelf;
        const x = lerp(p.x, p.foot.x, profile), z = lerp(p.z, p.foot.z, profile);
        // A grounded foot and lighter weathered crown tie hillsides into the canyon floor.
        row.push(part.vertex(x, y, z, scale(trailRockColor(x, y, z, top),.88+.12*f)));
      }
      rows.push(row);
    }
    for (let r = 0; r < rows.length - 1; r++) for (let i = 0; i < path.length - 1; i++) {
      const a = rows[r][i], b = rows[r][i + 1], c = rows[r + 1][i], d = rows[r + 1][i + 1];
      if (outward) { part.triangle(a, b, c); part.triangle(b, d, c); }
      else { part.triangle(a, c, b); part.triangle(b, c, d); }
    }
    // Keep normals from one cliff separate from those on its neighbouring ledge.
    result.append(part);
  };
  for (const trail of trails) {
    const edges = canyonTrailEdges(trail);
    for (const side of [0, 1]) face(bankRim(trail, side), side === 0);
    // Only the true unsupported takeoff and receiving faces need end caps. Connected trails
    // meet without double walls; in particular the lower crossing stays open from above.
    if (trail.id === 'upper-approach' || trail.id === 'receiving-ledge') {
      const end = trail.id === 'upper-approach', index = end ? trail.path.length - 1 : 0;
      const a = edges[0][index], b = edges[1][index], center = trail.path[index];
      const toes = canyonBankToes(trail), ta = toes[0][index], tb = toes[1][index];
      const n = Math.ceil((trail.widths?.[index] ?? trail.width) / 1.2);
      face(Array.from({ length: n + 1 }, (_, i) => ({ x: lerp(a.x, b.x, i / n), z: lerp(a.z, b.z, i / n), y: center.y! + 0.03, erosion: art.cliffErosion,
        foot: { x: lerp(ta.x, tb.x, i / n), z: lerp(ta.z, tb.z, i / n) } })), end);
    }
  }
  // Close the exposed rock at changes of shoulder width. These collars prevent small
  // open ends where the broad approach and the narrow receiving ledge join a bend.
  const sections = trails.filter(t => t.section);
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1], b = sections[i];
    if (distance(a.path.at(-1)!, b.path[0]) > 0.001 || (a.widths?.at(-1) ?? a.width) === (b.widths?.[0] ?? b.width)) continue;
    const wide = a.width > b.width ? a : b, narrow = wide === a ? b : a, atEnd = wide === a;
    const index = atEnd ? wide.path.length - 1 : 0;
    for (const side of [0, 1]) {
      const p = bankRim(wide, side)[index], q = bankRim(narrow, side)[atEnd ? 0 : narrow.path.length - 1];
      face([p, q], side === 0);
    }
  }
  return result;
}
interface BankPoint extends Point { y: number; foot: Point; erosion: number }

/** A multi-row top surface: gentle colour breakup instead of one uninterrupted pale ribbon. */
export function canyonShoulderGeometry(trails: readonly CanyonTrail[]) {
  const result = new Geometry(), columns = 12;
  for (const trail of trails) {
    const part = new Geometry(), edges = canyonTrailEdges(trail), rows: number[][] = [];
    for (let i = 0; i < trail.path.length; i++) {
      const a = edges[0][i], b = edges[1][i], row: number[] = [];
      for (let j = 0; j <= columns; j++) {
        const f = j / columns, x = lerp(a.x, b.x, f), z = lerp(a.z, b.z, f);
        const rim = smoothstep(0.28, 0.5, Math.abs(f - 0.5));
        const mottling = fbm2(x / 6, z / 6, 3, 412), c = scale(mix([1.05, 1.0, 0.94], [0.91, 0.82, 0.73], rim * 0.5), 1 + 0.12 * mottling);
        row.push(part.vertex(x, trail.path[i].y! + (trail.section ? 0.03 : 0.045), z, c));
      }
      rows.push(row);
    }
    for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < columns; j++) {
      const a = rows[i][j], b = rows[i + 1][j], c = rows[i][j + 1], d = rows[i + 1][j + 1];
      part.triangle(a, b, c); part.triangle(b, d, c);
    }
    part.normals = Array.from({ length: part.vertexCount }, () => [0, 1, 0]).flat();
    result.append(part);
  }
  return result;
}

/** Ragged compacted dirt with a wide, uneven colour transition into the sandy shoulder. */
export function canyonRoadGeometry(trails: readonly CanyonTrail[], roadWidth: number, roadColor: string, shoulderColor: string) {
  const result = new Geometry(), road = hex(roadColor), shoulder = hex(shoulderColor), columns = 16;
  for (const trail of trails) {
    const edges = canyonTrailEdges(trail, roadWidth, art.roadRoughness), part = new Geometry(), rows: number[][] = [];
    for (let i = 0; i < trail.path.length; i++) {
      const row: number[] = [];
      for (let j = 0; j <= columns; j++) {
        const f = j / columns, x = lerp(edges[0][i].x, edges[1][i].x, f), z = lerp(edges[0][i].z, edges[1][i].z, f);
        const fromEdge = Math.min(f, 1 - f) * roadWidth;
        const feather = 1 - smoothstep(0, art.roadFeather * (1 + 0.25 * noise2(x, z, 61)), fromEdge);
        const c = mix([1, 1, 1], shoulder.map((v, k) => v / Math.max(0.01, road[k])) as Rgb, feather * 0.83);
        // Separate the branch overlay by a few centimetres at its two shared junctions.
        // Coplanar feathered borders would shimmer against the main dirt mesh.
        row.push(part.vertex(x, trail.path[i].y! + (trail.section ? 0.10 : 0.13), z, scale(c, 1 + 0.055 * noise2(x * 0.6, z * 0.6, 32))));
      }
      rows.push(row);
    }
    for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < columns; j++) {
      const a = rows[i][j], b = rows[i + 1][j], c = rows[i][j + 1], d = rows[i + 1][j + 1];
      part.triangle(a, b, c); part.triangle(b, d, c);
    }
    result.append(part);
  }
  return result;
}
