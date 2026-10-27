import type { Point, RoadSection, TrackDefinition } from '../core/types';
import { distance, lerp, samplePolyline } from '../core/geometry';
import { roadHeight } from '../core/elevation';
import { roadEdges } from '../core/road-geometry';
import { canyonIntegration as art } from './themes';
import { Geometry, hex, mix, scale, type Rgb } from './landscape/mesh';
import { fbm2, noise2, smoothstep } from './landscape/noise';

export interface CanyonTrail { id: string; path: Point[]; width: number; section?: RoadSection }

/** Exact section boundaries matter at the open crossing and at changes of support width. */
export function canyonTrails(track: TrackDefinition): CanyonTrail[] {
  const at = (s: number): Point => ({ ...samplePolyline(track.centerline, track.distances, s), courseProgress: s, y: roadHeight(track, s) });
  const trails = (track.sections ?? []).filter(s => !s.flight).map(section => ({
    id: section.id, section, width: section.supportWidth,
    path: [at(section.from), ...track.centerline.filter(p => p.courseProgress! > section.from + 1e-5 && p.courseProgress! < section.to - 1e-5), at(section.to)],
  }));
  return [...trails, ...(track.hopShortcuts ?? []).map(h => ({ id: h.id, width: h.width + 2, path: h.branch }))];
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
  return scale(c, grain);
}

/**
 * Eroded load-bearing rock entirely below and inside an authored support. Its rim is exact;
 * recesses, ledges and talus only retreat under it. No decorative rock fills the flight opening
 * or the lower road, and the function has no simulation or collision side effects.
 */
export function canyonBankGeometry(trails: readonly CanyonTrail[]) {
  const result = new Geometry();
  const face = (path: BankPoint[], outward: boolean) => {
    if (path.length < 2) return;
    const rows: number[][] = [], part = new Geometry();
    for (let level = 0; level <= art.bankLayers; level++) {
      const f = level / art.bankLayers, row: number[] = [];
      for (const p of path) {
        const top = p.y!, depth = Math.max(0, top - art.floor), y = lerp(art.floor, top, f);
        const erosion = 0.6 + 0.4 * noise2(p.x * 0.14, p.z * 0.14, 93);
        const shelf = 0.5 + 0.5 * Math.sin(y * Math.PI / art.bedHeight * 2);
        const inset = Math.sin(Math.PI * f) ** 0.8 * Math.min(art.maxUndercut, depth * 0.3) * (erosion + shelf * 0.18);
        // The edge's inward direction is carried separately from the world support coordinate.
        const x = p.x + p.inward.x * inset, z = p.z + p.inward.z * inset;
        row.push(part.vertex(x, y, z, trailRockColor(x, y, z, top)));
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
    const edges = roadEdges(trail.path, trail.width, false);
    for (const side of [0, 1]) face(edges[side].map((p, i) => {
      const center = trail.path[i], span = distance(p, center) || 1;
      return { ...p, y: center.y! + 0.03, inward: { x: (center.x - p.x) / span, z: (center.z - p.z) / span } };
    }), side === 0);
    // Only the true unsupported takeoff and receiving faces need end caps. Connected trails
    // meet without double walls; in particular the lower crossing stays open from above.
    if (trail.id === 'upper-approach' || trail.id === 'receiving-ledge') {
      const end = trail.id === 'upper-approach', index = end ? trail.path.length - 1 : 0;
      const a = edges[0][index], b = edges[1][index], center = trail.path[index];
      const n = Math.ceil(trail.width / 1.2), neighbour = trail.path[end ? index - 1 : 1], d = distance(center, neighbour) || 1;
      face(Array.from({ length: n + 1 }, (_, i) => ({ x: lerp(a.x, b.x, i / n), z: lerp(a.z, b.z, i / n), y: center.y! + 0.03,
        inward: { x: (neighbour.x - center.x) / d, z: (neighbour.z - center.z) / d } })), end);
    }
  }
  // Close the exposed rock at changes of shoulder width. These collars prevent small
  // open ends where the broad approach and the narrow receiving ledge join a bend.
  const sections = trails.filter(t => t.section);
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1], b = sections[i];
    if (distance(a.path.at(-1)!, b.path[0]) > 0.001 || a.width === b.width) continue;
    const wide = a.width > b.width ? a : b, narrow = wide === a ? b : a, atEnd = wide === a;
    const index = atEnd ? wide.path.length - 1 : 0, center = wide.path[index];
    const wideEdges = roadEdges(wide.path, wide.width, false), narrowEdges = roadEdges(narrow.path, narrow.width, false);
    const other = wide.path[atEnd ? index - 1 : 1], span = distance(center, other) || 1;
    for (const side of [0, 1]) {
      const p = wideEdges[side][index], q = narrowEdges[side][atEnd ? 0 : narrow.path.length - 1];
      face([p, q].map(point => ({ ...point, y: center.y! + 0.03, inward: { x: (other.x - center.x) / span, z: (other.z - center.z) / span } })), side === 0);
    }
  }
  return result;
}
interface BankPoint extends Point { y: number; inward: Point }

/** A multi-row top surface: gentle colour breakup instead of one uninterrupted pale ribbon. */
export function canyonShoulderGeometry(trails: readonly CanyonTrail[]) {
  const result = new Geometry(), columns = 12;
  for (const trail of trails) {
    const part = new Geometry(), edges = roadEdges(trail.path, trail.width, false), rows: number[][] = [];
    for (let i = 0; i < trail.path.length; i++) {
      const a = edges[0][i], b = edges[1][i], row: number[] = [];
      for (let j = 0; j <= columns; j++) {
        const f = j / columns, x = lerp(a.x, b.x, f), z = lerp(a.z, b.z, f);
        const rim = smoothstep(0.28, 0.5, Math.abs(f - 0.5));
        const mottling = fbm2(x / 6, z / 6, 3, 412), c = scale(mix([1.05, 1.0, 0.94], [0.91, 0.82, 0.73], rim * 0.5), 1 + 0.12 * mottling);
        row.push(part.vertex(x, trail.path[i].y! + 0.03, z, c));
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
