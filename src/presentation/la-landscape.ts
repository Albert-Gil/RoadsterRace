import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Point, TrackDefinition } from '../core/types';
import { courseDistance, type Extent } from './landscape/terrain';
import { random } from './landscape/noise';
import { hex } from './landscape/mesh';
import type { Plant, PlantPalette } from './landscape/plants';
import type { RockPalette } from './landscape/rocks';
import { runLandscape, stopwatch } from './landscape/runtime';

/**
 * LA nights' streets beyond the course (presentation only). The city ground gets a painted map:
 * avenues with lane markings and crosswalks, sidewalks, parking lots and their stalls, beyond the
 * planning corridor so the circuit stays the clearest road on screen. Tall fan palms line the
 * avenues and cars stand in the lots and along the curbs. Nothing here glows: night bloom stays
 * with the batched emissive architecture.
 */
const P = (x: number, z: number): Point => ({ x, z });
export interface Street { from: Point; to: Point; width: number }
export interface Lot { minX: number; maxX: number; minZ: number; maxZ: number; rows: 'x' | 'z' }
export const LA = {
  /** The painted map over the city ground (land patches take world UVs over it). */
  map: { minX: -264, maxX: 236, minZ: -164, maxZ: 228 } satisfies Extent,
  extent: { minX: -270, maxX: 240, minZ: -170, maxZ: 232 } satisfies Extent,
  /** Each fit's visible ground (phone landscape and portrait, desktop, tablet portrait and landscape), 4 m margins. */
  views: [{ minX: -196, maxX: 236, minZ: -84, maxZ: 116 }, { minX: -200, maxX: 192, minZ: -88, maxZ: 96 }, { minX: -264, maxX: 188, minZ: -164, maxZ: 224 }, { minX: -260, maxX: 176, minZ: -144, maxZ: 108 }, { minX: -264, maxX: 188, minZ: -160, maxZ: 224 }] satisfies Extent[],
  level: -0.035, corridor: 24,
  /** Avenues (16 m, two lanes each way) and side streets (11 m), all beyond the corridor. */
  streets: [
    { from: P(-270, -104), to: P(240, -104), width: 16 },
    { from: P(-176, -170), to: P(-176, 232), width: 16 },
    { from: P(204, -170), to: P(204, 232), width: 16 },
    { from: P(-270, 146), to: P(240, 146), width: 16 },
    { from: P(-60, -170), to: P(-60, -112), width: 11 },
    { from: P(40, -170), to: P(40, -112), width: 11 },
    { from: P(124, -170), to: P(124, -112), width: 11 },
    { from: P(-270, 20), to: P(-184, 20), width: 11 },
    { from: P(-40, 154), to: P(-40, 232), width: 11 },
    { from: P(90, 154), to: P(90, 232), width: 11 },
  ] satisfies Street[],
  lots: [
    { minX: -250, maxX: -190, minZ: -160, maxZ: -118, rows: 'x' },
    { minX: 136, maxX: 192, minZ: -160, maxZ: -118, rows: 'x' },
    { minX: -36, maxX: 28, minZ: -160, maxZ: -118, rows: 'x' },
    { minX: -250, maxX: -192, minZ: 40, maxZ: 90, rows: 'z' },
  ] satisfies Lot[],
  plants: { dry: hex('#6f6a50'), bark: hex('#5a4a40'), palm: [hex('#2e4a32'), hex('#5e7a4a')] } satisfies PlantPalette,
  /** No rock grows here; the runtime still takes a palette. */
  rock: { strata: [hex('#777777')], stratum: 3, talus: hex('#777777'), cap: hex('#777777'), varnish: hex('#555555'), granite: [hex('#777777'), hex('#999999'), hex('#555555')], lichen: hex('#777777'), dust: hex('#777777') } satisfies RockPalette,
  carColours: ['#c8ccd2', '#3a3f48', '#a33a3a', '#2f5a8a', '#e0dcd0', '#5a5f66'],
};

/** The deterministic layout (no rendering): palms along the avenues and cars in lots and at curbs. */
export function laLayout(track: TrackDefinition) {
  const L = LA, D = courseDistance(track, L.extent, 2.5);
  const visible = (p: Point) => L.views.some(v => p.x >= v.minX && p.x <= v.maxX && p.z >= v.minZ && p.z <= v.maxZ);
  const clear = (p: Point, minD: number) => (D(p.x, p.z) >= minD + 2 || D.exact(p.x, p.z) >= minD) && !track.barriers.some(b => { const xs = b.footprint.map(q => q.x), zs = b.footprint.map(q => q.z); return p.x > Math.min(...xs) - 3 && p.x < Math.max(...xs) + 3 && p.z > Math.min(...zs) - 3 && p.z < Math.max(...zs) + 3; });
  const along = (s: Street, t: number, offset: number) => { const len = Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z), ux = (s.to.x - s.from.x) / len, uz = (s.to.z - s.from.z) / len; return P(s.from.x + ux * t - uz * offset, s.from.z + uz * t + ux * offset); };
  /** Whether p lies on street s (with a margin around its carriageway and ends). */
  const onStreet = (s: Street, p: Point, margin = 0) => { const len = Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z), ux = (s.to.x - s.from.x) / len, uz = (s.to.z - s.from.z) / len, t = (p.x - s.from.x) * ux + (p.z - s.from.z) * uz, o = -(p.x - s.from.x) * uz + (p.z - s.from.z) * ux; return t > -margin && t < len + margin && Math.abs(o) < s.width / 2 + margin; };
  const inStreet = (p: Point, margin = 0) => L.streets.some(s => onStreet(s, p, margin));
  let scattered: { plants: Plant[]; cars: { x: number; z: number; heading: number; colour: number }[] } | null = null;
  const scatter = () => scattered ??= (() => {
    const rand = random(6262), plants: Plant[] = [], cars: { x: number; z: number; heading: number; colour: number }[] = [];
    // Fan palms on both sidewalks of the avenues (not the side streets), clear of intersections.
    for (const s of L.streets.filter(s => s.width >= 16)) {
      const len = Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z);
      for (let t = 6; t < len; t += 16) for (const side of [-1, 1]) {
        const p = along(s, t + (rand() - 0.5) * 1.5, side * (s.width / 2 + 1.6)), h = 14 + rand() * 5;
        if (!visible(p) || !clear(p, Math.max(L.corridor + 6, 8 + 1.5 * h)) || L.streets.some(o => o !== s && onStreet(o, p, 5))) continue;
        plants.push({ kind: 'palm', x: p.x, y: L.level, z: p.z, size: h, heading: rand() * 6.28, seed: plants.length * 31 + 3, dryness: 0.1 });
      }
    }
    // Cars: in the lots' stalls (some empty) and parked along the avenues' curbs.
    for (const lot of L.lots) {
      const longX = lot.rows === 'x', span = longX ? lot.maxX - lot.minX : lot.maxZ - lot.minZ, depth = longX ? lot.maxZ - lot.minZ : lot.maxX - lot.minX;
      for (let row = 0; row * 14 + 11 <= depth; row++) for (const half of [0, 1]) for (let k = 0; (k + 1) * 2.7 <= span - 2; k++) {
        if (rand() < 0.42) continue;
        const across = row * 14 + 2.75 + half * 5.5, a = (longX ? lot.minX : lot.minZ) + 1 + (k + 0.5) * 2.7, b = (longX ? lot.minZ : lot.minX) + across;
        const p = longX ? P(a, b) : P(b, a); if (!visible(p) || !clear(p, L.corridor + 4)) continue;
        cars.push({ x: p.x, z: p.z, heading: (longX ? 0 : Math.PI / 2) + (half ? Math.PI : 0), colour: Math.floor(rand() * 6) });
      }
    }
    for (const s of L.streets.filter(s => s.width >= 16)) {
      const len = Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z), heading = Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z);
      for (let t = 10; t < len; t += 6.5) for (const side of [-1, 1]) {
        if (rand() < 0.6) continue;
        const p = along(s, t, side * (s.width / 2 - 1.2));
        if (visible(p) && clear(p, L.corridor + 4) && !L.streets.some(o => o !== s && onStreet(o, p, 9))) cars.push({ x: p.x, z: p.z, heading: heading + (side > 0 ? Math.PI : 0), colour: Math.floor(rand() * 6) });
      }
    }
    return { plants, cars };
  })();
  return { D, visible, clear, along, onStreet, inStreet, scatter };
}
export type LALayout = ReturnType<typeof laLayout>;

/** Paints the streets and plants the palms after the first frame (lazy chunk). */
export function buildLALandscape(scene: Scene, track: TrackDefinition, materials: Map<string, StandardMaterial>, ground: StandardMaterial, base: string, layout = laLayout(track)) {
  const { timings } = stopwatch();
  const { shadowCasters } = runLandscape(scene, materials, { name: 'la-nights', props: null, timings, load: async () => {
    const detail = await import('./la-detail');
    return { generators: detail, paint: detail.paintInto(scene, track, layout, ground, base), formations: [], rock: LA.rock, loose: [], plants: layout.scatter().plants, plantPalette: LA.plants };
  } });
  return { shadowCasters };
}
