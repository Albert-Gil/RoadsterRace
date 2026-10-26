import type { Point, TrackBarrier, TrackDefinition } from '../../core/types';
import type { Extent } from './terrain';
import { polygonField } from './terrain';
import { centroid, rayToEdge } from './mesh';
import { fbm2, noise2, random } from './noise';
import { offsetPath } from './paths';
import type { LooseRock } from './rocks';
import type { Plant, PlantKind } from './plants';

/**
 * Shared placement for a venue's loose rocks and plants (presentation only). Everything keeps the
 * venue's corridor distance from the course and clears every barrier footprint; a venue may block
 * more ground (pads, roads, water, buildings) with its own test.
 */
export interface ScatterGround {
  visible: Extent; corridor: number;
  /** Course distance: gridded (fast) and exact. */
  D: ((x: number, z: number) => number) & { exact(x: number, z: number): number };
  height(x: number, z: number): number;
  barriers: readonly TrackBarrier[];
  /** Further ground the venue keeps clear (true = blocked). */
  blocked?(p: Point, clearance: number): boolean;
}
export function scatterTools(ground: ScatterGround, extent: Extent, seed: number) {
  const rand = random(seed), solids = polygonField(ground.barriers.map(b => b.footprint), extent, 2);
  const inside = (p: Point, e: Extent) => p.x >= e.minX && p.x <= e.maxX && p.z >= e.minZ && p.z <= e.maxZ;
  /** Clear of the corridor (checked exactly near its edge), every barrier and the venue's own blocks. */
  const open = (p: Point, clearance = 0.8, minD = ground.corridor) => {
    const d = ground.D(p.x, p.z);
    if (d < minD - 2 || (d < minD + 2 && ground.D.exact(p.x, p.z) < minD) || !inside(p, ground.visible)) return false;
    if (solids(p.x, p.z) < clearance + 2.5 && solids.exact(p.x, p.z).distance < clearance) return false;
    return !ground.blocked?.(p, clearance);
  };
  const anywhere = () => ({ x: ground.visible.minX + rand() * (ground.visible.maxX - ground.visible.minX), z: ground.visible.minZ + rand() * (ground.visible.maxZ - ground.visible.minZ) });
  const loose: LooseRock[] = [], plants: Plant[] = [];
  const addRock = (p: Point, size: number, kind: LooseRock['kind'], minD?: number) => { if (!open(p, 0.6, minD)) return false; loose.push({ x: p.x, y: ground.height(p.x, p.z), z: p.z, size, heading: rand() * Math.PI * 2, seed: loose.length * 13 + 7, kind }); return true; };
  const addPlant = (p: Point, kind: PlantKind, size: number, dryness = 0) => plants.push({ kind, x: p.x, y: ground.height(p.x, p.z), z: p.z, size, heading: rand() * Math.PI * 2, seed: plants.length * 31 + 3, dryness });
  return {
    rand, open, anywhere, loose, plants, addRock, addPlant, solids,
    /** Scree fanning out below rock footprints (count grows with height). */
    scree(rocks: readonly TrackBarrier[], sandstone: (b: TrackBarrier) => boolean, density = 1) {
      for (const b of rocks) {
        const c = centroid(b.footprint), n = Math.round((b.height >= 10 ? 26 + b.height * 1.2 : 10 + b.height * 3) * density);
        for (let k = 0, placed = 0; k < n * 4 && placed < n; k++) {
          const a = rand() * Math.PI * 2, reach = rayToEdge(c, a, b.footprint), out = 0.8 + (-Math.log(1 - rand() * 0.97)) * (0.12 * b.height + 2.5);
          const size = 0.25 + rand() ** 2.2 * (b.height >= 10 ? 2.3 : 1.2), p = { x: c.x + Math.cos(a) * (reach + out), z: c.z + Math.sin(a) * (reach + out) };
          if (addRock(p, size, size > 1 ? 'boulder' : sandstone(b) && rand() < 0.45 ? 'slab' : 'pebble')) placed++;
        }
      }
    },
    /** Cobbles on the banks of washes. */
    cobbles(washes: readonly (readonly Point[])[]) {
      for (const wash of washes) {
        const banks = [-1, 1].map(side => offsetPath(wash, i => side * (1 + 5.5 * (0.5 + 0.5 * noise2(i * 0.31, side, 5)))));
        for (let i = 0; i < wash.length; i += 3) if (rand() < 0.55) addRock(banks[rand() < 0.5 ? 0 : 1][i], 0.2 + rand() ** 2 * 0.7, rand() < 0.15 ? 'boulder' : 'pebble');
      }
    },
    /** A sparse, patchy scatter of small stones, and boulder clusters further out. */
    stones(count: number, clusters: number, clusterMinD = ground.corridor + 8) {
      for (let k = 0, placed = 0; k < count * 1.4 && placed < count; k++) { const p = anywhere(); if (rand() < 0.75 + 0.25 * fbm2(p.x / 30, p.z / 30, 2, 77) && addRock(p, 0.2 + rand() ** 3 * 0.9, rand() < 0.1 ? 'boulder' : 'pebble')) placed++; }
      for (let k = 0, made = 0; k < clusters * 30 && made < clusters; k++) {
        const c = anywhere(); if (!open(c, 4, clusterMinD)) continue;
        for (let j = 0, n = 3 + Math.floor(rand() * 5); j < n; j++) { const a = rand() * Math.PI * 2, r = rand() * 2.8, size = 0.4 + rand() ** 1.5 * 1.3; addRock({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }, size, size > 0.85 ? 'boulder' : 'pebble', clusterMinD); }
        made++;
      }
    },
    /** Plants on a jittered grid; `pick` returns null to leave a cell empty. */
    field(spacing: number, pick: (p: Point, d: number, roll: number) => { kind: PlantKind; size: number; dryness?: number } | null, clearance = 1.2) {
      const v = ground.visible;
      for (let x = v.minX; x < v.maxX; x += spacing) for (let z = v.minZ; z < v.maxZ; z += spacing) {
        const p = { x: x + (rand() - 0.5) * spacing * 0.9, z: z + (rand() - 0.5) * spacing * 0.9 }, d = ground.D(p.x, p.z);
        if (d < ground.corridor) continue;
        const choice = pick(p, d, rand()); if (!choice || !open(p, clearance)) continue;
        addPlant(p, choice.kind, choice.size, choice.dryness ?? 0);
      }
    },
    /** Spaced landmark trees, well beyond the corridor (a tree of height h hides about 1.1 h of ground). */
    trees(count: number, kind: PlantKind, size: () => number, minSpacing: number, accept: (p: Point, d: number) => boolean = () => true) {
      const placed: Point[] = [];
      for (let k = 0; k < count * 100 && placed.length < count; k++) {
        const p = anywhere(), h = size(), d = ground.D(p.x, p.z);
        if (d < Math.max(ground.corridor + 6, 8 + 1.5 * h) || !open(p, 3) || placed.some(t => Math.hypot(t.x - p.x, t.z - p.z) < minSpacing) || !accept(p, d)) continue;
        placed.push(p); addPlant(p, kind, h, 0);
      }
    },
  };
}

/** The course's corners: where cars run wide (outside of each bend, toward its exit). */
export function courseCorners(track: TrackDefinition) {
  const line = track.centerline, n = line.length, corners: { from: number; to: number; side: number; sharpness: number }[] = [];
  const turn = (i: number) => { const a = line[(i - 3 + n) % n], b = line[i], c = line[(i + 3) % n]; const h1 = Math.atan2(b.x - a.x, b.z - a.z), h2 = Math.atan2(c.x - b.x, c.z - b.z); let d = h2 - h1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  for (let i = 0; i < n;) {
    if (Math.abs(turn(i)) < 0.12) { i++; continue; }
    const side = Math.sign(turn(i)); let j = i, total = 0;
    while (j < i + n && Math.abs(turn(j % n)) >= 0.06 && Math.sign(turn(j % n)) === side) { total += turn(j % n); j++; }
    corners.push({ from: i, to: j, side, sharpness: Math.abs(total) }); i = j + 1;
  }
  return corners;
}
