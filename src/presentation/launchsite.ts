import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Point, TrackBarrier, TrackDefinition } from '../core/types';
import { runLandscape, stopwatch } from './landscape/runtime';
import { buildTerrain, courseDistance, distanceField, polygonField, type Extent } from './landscape/terrain';
import { fbm2, noise2, random, ridged2, smoothstep } from './landscape/noise';
import { centroid, hex, mix, rayToEdge, scale, type Rgb } from './landscape/mesh';
import type { FormationSpec, LooseRock, RockPalette } from './landscape/rocks';
import type { Plant, PlantKind, PlantPalette } from './landscape/plants';
import { offsetPath, smoothPath } from './landscape/paths';

/**
 * Launchsite's desert (presentation only): a heightfield that stays flat across the whole
 * planning corridor and rises into dunes and bajadas beyond it, painted ground (run-off wear,
 * slide marks, gravel traps, graded roads, dry washes, pebbles), the solid rock formations of the
 * track's 'rock' barriers, loose rocks and desert plants. Loose rocks and plants keep beyond the
 * planning corridor (CORRIDOR m from the course), like all of the venue's visual-only scenery.
 */
export const LAUNCHSITE = {
  extent: { minX: -250, maxX: 230, minZ: -210, maxZ: 160 } satisfies Extent,
  /** Ground the cameras can see (union of phone, tablet and desktop fits), with a margin. */
  visible: { minX: -182, maxX: 160, minZ: -160, maxZ: 106 } satisfies Extent,
  corridor: 24, terrainCell: 3, flatUntil: 26,
  /** The launch complex keeps level ground around it. */
  pad: { minX: 80, maxX: 117, minZ: 0, maxZ: 41, fade: 16 },
  formations: {
    'launchsite-s-outcrop': { style: 'boulders' },
    'launchsite-west-boulders': { style: 'boulders' },
    'launchsite-north-rocks': { style: 'boulders' },
    'launchsite-east-rocks': { style: 'tor', relief: { key: 'scan-namaqualand-cliff-01', heading: 2.6, scale: 0.6 } },
    'launchsite-west-tor': { style: 'tor', relief: { key: 'scan-namaqualand-cliff-01', heading: 2.2, scale: 1.05 } },
    'launchsite-south-rocks': { style: 'ledge', relief: { key: 'scan-rock-face-01', heading: Math.PI, scale: 0.72 } },
    'launchsite-southeast-rocks': { style: 'ledge' },
    'launchsite-west-butte': { style: 'butte', tiers: 2 },
    'launchsite-east-butte': { style: 'butte' },
    'launchsite-south-mesa': { style: 'mesa', spire: true },
    'launchsite-north-butte': { style: 'mesa', tiers: 2 },
    'launchsite-northeast-butte': { style: 'butte' },
    'launchsite-southwest-butte': { style: 'butte', tiers: 2 },
  } as Record<string, Pick<FormationSpec, 'style' | 'tiers' | 'spire' | 'relief'>>,
  /** Dry washes (control points; smoothed). */
  washes: [
    [{ x: -130, z: -215 }, { x: -127, z: -160 }, { x: -119, z: -110 }, { x: -124, z: -62 }, { x: -123, z: -30 }, { x: -121, z: 0 }, { x: -113, z: 34 }, { x: -97, z: 60 }, { x: -98, z: 96 }, { x: -86, z: 126 }, { x: -70, z: 165 }],
    [{ x: 160, z: -215 }, { x: 166, z: -150 }, { x: 172, z: -90 }, { x: 173, z: -45 }, { x: 166, z: -6 }, { x: 148, z: 30 }, { x: 137, z: 62 }, { x: 142, z: 100 }, { x: 130, z: 165 }],
  ],
  /** Graded service roads and a fading two-track (control points; smoothed). */
  roads: [
    { width: 5.5, points: [{ x: 111, z: 28 }, { x: 126, z: 35 }, { x: 150, z: 45 }, { x: 186, z: 51 }, { x: 236, z: 49 }] },
    { width: 5, points: [{ x: 109, z: 7 }, { x: 115, z: -6 }, { x: 115, z: -42 }, { x: 109, z: -76 }, { x: 101, z: -110 }, { x: 97, z: -150 }, { x: 93, z: -216 }] },
    { width: 2.6, track: true, points: [{ x: -60, z: -216 }, { x: -98, z: -166 }, { x: -114, z: -131 }, { x: -104, z: -84 }, { x: -101, z: -64 }] },
  ],
  rock: {
    strata: ['#bf8862', '#d6b089', '#a96a4b', '#dfc6a3', '#93604a', '#c9a07a', '#b48a6a', '#d4ba98'].map(hex),
    stratum: 1.7, talus: hex('#93705c'), cap: hex('#d9c4a5'), varnish: hex('#5a4033'),
    granite: [hex('#a88366'), hex('#c8aa8b'), hex('#7a5d4a')], lichen: hex('#b8a052'), dust: hex('#d2bd9c'),
  } satisfies RockPalette,
  plants: {
    creosote: [hex('#47552f'), hex('#7b8843')], bursage: hex('#a3a68b'), grass: [hex('#9a9e62'), hex('#d0bd86')],
    cholla: hex('#d8cb92'), joshuaLeaf: hex('#56693a'), joshuaTrunk: hex('#66554a'), dry: hex('#8c7b64'),
  } satisfies PlantPalette,
};

const inExtent = (p: Point, e: Extent, margin = 0) => p.x >= e.minX + margin && p.x <= e.maxX - margin && p.z >= e.minZ + margin && p.z <= e.maxZ - margin;

/** The deterministic layout (no rendering): heights, tints, formations, loose rocks and plants. */
export function launchsiteLayout(track: TrackDefinition) {
  const L = LAUNCHSITE, extent = L.extent, D = courseDistance(track, extent, 3);
  const rocks = track.barriers.filter(b => b.kind === 'rock'), solids = track.barriers;
  const formations: FormationSpec[] = rocks.map((b, i) => ({ id: b.id, footprint: b.footprint, height: b.height, seed: 101 + i * 37, ...(L.formations[b.id] ?? { style: b.height >= 10 ? 'butte' : 'boulders' }) }));
  const washes = L.washes.map(w => smoothPath(w, 2)), roads = L.roads.map(r => ({ ...r, path: smoothPath(r.points, 2) }));
  const W = distanceField(washes, extent, 3), R = distanceField(roads.map(r => r.path), extent, 3);
  const big = rocks.filter(b => b.height >= 10), rockField = polygonField(rocks.map(b => b.footprint), extent, 3), bigField = polygonField(big.map(b => b.footprint), extent, 3);
  let solidField: ReturnType<typeof polygonField> | null = null; // Only placement needs it (built on first use).
  const pad = (x: number, z: number) => { const p = L.pad, dx = Math.max(p.minX - x, 0, x - p.maxX), dz = Math.max(p.minZ - z, 0, z - p.maxZ); return smoothstep(p.fade, 0, Math.hypot(dx, dz)); };
  const edge = (x: number, z: number) => smoothstep(0, 45, Math.min(x - extent.minX, extent.maxX - x, z - extent.minZ, extent.maxZ - z));
  const rise = (d: number) => smoothstep(L.flatUntil, 80, d);
  // Dune ridges lie across a west-south-westerly wind, bent by a slow warp so they never read as stripes.
  const dune = (x: number, z: number) => { const wx = x + 16 * fbm2(x / 70, z / 70, 2, 51), wz = z + 16 * fbm2(x / 70 + 9, z / 70, 2, 52); return ridged2((wx * 0.8 + wz * 0.6) / 44, (-wx * 0.6 + wz * 0.8) / 90, 2, 9); };
  const nearestRock = (p: Point): { distance: number; barrier: TrackBarrier | null } => { const i = rockField.nearest(p.x, p.z); return { distance: rockField(p.x, p.z), barrier: i >= 0 ? rocks[i] : null }; };
  const height = (x: number, z: number) => {
    const d = D(x, z), r = rise(d), gate = smoothstep(L.flatUntil - 2, 42, d);
    if (gate <= 0) return 0;
    let h = r * (2.9 * (0.5 + 0.5 * fbm2(x / 62, z / 62, 4, 3)) + 1.3 * dune(x, z) ** 1.5);
    // Bajadas: the ground swells gently toward the big formations (their own talus meets it at the footprint).
    const nearBig = bigField.nearest(x, z);
    if (nearBig >= 0) { const sd = bigField(x, z), b = big[nearBig]; h += gate * 0.07 * b.height * Math.exp(-Math.max(0, sd) / (0.5 * b.height + 8)) * smoothstep(-1, 6, sd); }
    const dw = W(x, z); h += gate * (-0.95 * Math.exp(-((dw / 4.2) ** 2)) + 0.28 * Math.exp(-(((dw - 7.5) / 3) ** 2)));
    const dr = R(x, z); h *= 1 - 0.55 * Math.exp(-((dr / 5) ** 2));
    return h * (1 - pad(x, z)) * edge(x, z);
  };
  const tint = (x: number, z: number, h: number, slope: number): Rgb => {
    const d = D(x, z), r = rise(d), n1 = fbm2(x / 38, z / 38, 3, 21), n2 = fbm2(x / 8, z / 8, 2, 33);
    // Neutral is a little warmer than white: the dawn sky lighting the venue leans cool.
    let c: Rgb = [1.15, 1.05, 1.05];
    c = mix(c, n1 > 0 ? [1.22, 1.11, 1.08] : [1.0, 0.92, 0.92], Math.min(1, Math.abs(n1) * 1.7) * 0.6);
    c = mix(c, [1.06, 1.0, 1.0], smoothstep(L.flatUntil, 12, d) * 0.45);
    c = mix(c, [1.22, 1.13, 1.1], r * smoothstep(0.5, 0.85, dune(x, z)) * 0.55);
    const pavement = smoothstep(0.12, 0.42, fbm2(x / 24, z / 24, 3, 41)) * smoothstep(30, 52, d) * (1 - smoothstep(0.05, 0.2, slope));
    c = mix(c, [0.9, 0.78, 0.74], pavement * 0.65);
    const near = nearestRock({ x, z });
    if (near.barrier) c = mix(c, [1.04, 0.88, 0.76], Math.exp(-Math.max(0, near.distance) / (0.3 * near.barrier.height + 5)) * 0.55);
    const dw = W(x, z); c = mix(c, [1.22, 1.16, 1.14], Math.exp(-((dw / 4) ** 2)) * smoothstep(28, 40, d) * 0.65);
    c = mix(c, [1.02, 0.92, 0.85], smoothstep(0.1, 0.35, slope) * 0.18);
    return scale(c, 1 + 0.035 * n2 + 0.02 * h / 6);
  };
  /** Clear of the course corridor, every barrier, the launch pad and the roads. */
  const open = (p: Point, clearance = 0.8, roadClearance = 4) => {
    const d = D(p.x, p.z);
    if (d < L.corridor - 2 || (d < L.corridor + 2 && D.exact(p.x, p.z) < L.corridor) || pad(p.x, p.z) > 0.05 || !inExtent(p, L.visible)) return false;
    solidField ??= polygonField(solids.map(b => b.footprint), extent, 2);
    if (solidField(p.x, p.z) < clearance + 2.5 && solidField.exact(p.x, p.z).distance < clearance) return false;
    return R(p.x, p.z) > 2.8 + roadClearance;
  };

  /** Loose rocks, plants and the course's corners: placed on first request (after the first frame). */
  let scattered: { loose: LooseRock[]; plants: Plant[]; corners: { from: number; to: number; side: number; sharpness: number }[] } | null = null;
  const scatter = () => {
    if (scattered) return scattered;
    // ---- Loose rocks: scree below the formations, cobbles along the washes, a sparse scatter.
    const rand = random(4242), loose: LooseRock[] = [];
    const addRock = (p: Point, size: number, kind: LooseRock['kind']) => { if (!open(p, 0.6, 2)) return false; loose.push({ x: p.x, y: height(p.x, p.z), z: p.z, size, heading: rand() * Math.PI * 2, seed: loose.length * 13 + 7, kind }); return true; };
    for (const [i, b] of rocks.entries()) {
      const c = centroid(b.footprint), sandstone = ['butte', 'mesa', 'ledge'].includes(formations[i].style), n = Math.round(b.height >= 10 ? 26 + b.height * 1.2 : 10 + b.height * 3);
      for (let k = 0, placed = 0; k < n * 4 && placed < n; k++) {
        const a = rand() * Math.PI * 2, reach = rayToEdge(c, a, b.footprint), out = 0.8 + (-Math.log(1 - rand() * 0.97)) * (0.12 * b.height + 2.5);
        const size = 0.25 + rand() ** 2.2 * (b.height >= 10 ? 2.3 : 1.2), p = { x: c.x + Math.cos(a) * (reach + out), z: c.z + Math.sin(a) * (reach + out) };
        if (addRock(p, size, size > 1 ? 'boulder' : sandstone && rand() < 0.45 ? 'slab' : 'pebble')) placed++;
      }
    }
    for (const wash of washes) {
      const banks = [-1, 1].map(side => offsetPath(wash, i => side * (1 + 5.5 * (0.5 + 0.5 * noise2(i * 0.31, side, 5)))));
      for (let i = 0; i < wash.length; i += 3) if (rand() < 0.55) addRock(banks[rand() < 0.5 ? 0 : 1][i], 0.2 + rand() ** 2 * 0.7, rand() < 0.15 ? 'boulder' : 'pebble');
    }
    for (let k = 0; k < 900 && loose.length < 1100; k++) {
      const v = L.visible, p = { x: v.minX + rand() * (v.maxX - v.minX), z: v.minZ + rand() * (v.maxZ - v.minZ) };
      if (rand() < 0.75 + 0.25 * fbm2(p.x / 30, p.z / 30, 2, 77)) addRock(p, 0.2 + rand() ** 3 * 0.9, rand() < 0.1 ? 'boulder' : 'pebble');
    }

    // Boulder clusters out on the flats.
    for (let k = 0, clusters = 0; k < 600 && clusters < 22; k++) {
      const v = L.visible, c = { x: v.minX + rand() * (v.maxX - v.minX), z: v.minZ + rand() * (v.maxZ - v.minZ) };
      if (D(c.x, c.z) < 32 || !open(c, 4, 5)) continue;
      for (let j = 0, n = 3 + Math.floor(rand() * 5); j < n; j++) { const a = rand() * Math.PI * 2, r = rand() * 2.8, size = 0.4 + rand() ** 1.5 * 1.3; addRock({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }, size, size > 0.85 ? 'boulder' : 'pebble'); }
      clusters++;
    }

    // ---- Plants: sparse across the flats, gathered along washes and at the feet of rocks.
    const plants: Plant[] = [], prand = random(9001);
    for (let x = L.visible.minX; x < L.visible.maxX; x += 3.1) for (let z = L.visible.minZ; z < L.visible.maxZ; z += 3.1) {
      const p = { x: x + (prand() - 0.5) * 2.8, z: z + (prand() - 0.5) * 2.8 };
      const d = D(p.x, p.z); if (d < L.corridor) continue;
      const dw = W(p.x, p.z), wash = Math.exp(-((dw / 6) ** 2)) * smoothstep(L.corridor, 34, d), near = nearestRock(p), foot = near.barrier ? Math.exp(-Math.max(0, near.distance - 1) / 9) : 0;
      const density = 0.042 + 0.6 * wash + 0.32 * foot + 0.07 * rise(d) + 0.06 * Math.max(0, fbm2(p.x / 20, p.z / 20, 2, 5));
      if (prand() > density || !open(p, 1.2, 2.5)) continue;
      const roll = prand(), dry = Math.max(0, Math.min(1, 0.25 + 0.6 * fbm2(p.x / 15, p.z / 15, 2, 61) - wash * 0.4));
      const kind: PlantKind = wash > 0.3 ? (roll < 0.45 ? 'creosote' : roll < 0.8 ? 'grass' : roll < 0.93 ? 'bursage' : 'cholla')
        : roll < 0.38 ? 'creosote' : roll < 0.72 ? 'bursage' : roll < 0.92 ? 'grass' : roll < 0.97 ? 'cholla' : 'deadwood';
      const size = kind === 'creosote' ? 1.1 + prand() * 1.5 : kind === 'bursage' ? 0.55 + prand() * 0.45 : kind === 'grass' ? 0.5 + prand() * 0.4 : kind === 'cholla' ? 0.7 + prand() * 0.5 : 1.2 + prand() * 1.2;
      plants.push({ kind, x: p.x, y: height(p.x, p.z), z: p.z, size, heading: prand() * Math.PI * 2, seed: plants.length * 31 + 3, dryness: kind === 'deadwood' ? 1 : dry });
    }
    // Joshua trees: tall landmarks, spaced out, well beyond the corridor so they never hide the road.
    const trees: Point[] = [];
    for (let k = 0; k < 2500 && trees.length < 26; k++) {
      const v = L.visible, p = { x: v.minX + prand() * (v.maxX - v.minX), z: v.minZ + prand() * (v.maxZ - v.minZ) };
      if (D(p.x, p.z) < 36 || !open(p, 3, 4) || trees.some(t => Math.hypot(t.x - p.x, t.z - p.z) < 15)) continue;
      if (prand() > 0.35 + 0.65 * rise(D(p.x, p.z))) continue;
      trees.push(p); plants.push({ kind: 'joshua', x: p.x, y: height(p.x, p.z), z: p.z, size: 4.5 + prand() * 2.5, heading: prand() * Math.PI * 2, seed: 7000 + trees.length * 17 });
    }

    // ---- Corners: where cars run wide (outside of each bend, toward its exit).
    const line = track.centerline, n = line.length, corners: { from: number; to: number; side: number; sharpness: number }[] = [];
    const turn = (i: number) => { const a = line[(i - 3 + n) % n], b = line[i], c = line[(i + 3) % n]; const h1 = Math.atan2(b.x - a.x, b.z - a.z), h2 = Math.atan2(c.x - b.x, c.z - b.z); let d = h2 - h1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    for (let i = 0; i < n;) {
      if (Math.abs(turn(i)) < 0.12) { i++; continue; }
      const side = Math.sign(turn(i)); let j = i, total = 0;
      while (j < i + n && Math.abs(turn(j % n)) >= 0.06 && Math.sign(turn(j % n)) === side) { total += turn(j % n); j++; }
      corners.push({ from: i, to: j, side, sharpness: Math.abs(total) }); i = j + 1;
    }
    scattered = { loose, plants, corners }; return scattered;
  };
  return { extent, D, W, R, washes, roads, height, tint, formations, scatter, rocks, pad };
}
export type LaunchsiteLayout = ReturnType<typeof launchsiteLayout>;

/**
 * Builds the landscape into the venue: terrain (with the painted map) on the 'terrain' material,
 * plants on one shared plant material, and the rock (procedural formations, scans, loose rocks)
 * as one late mesh once the scanned rocks have loaded. Returns the late shadow casters.
 */
export function buildLaunchsiteLandscape(scene: Scene, track: TrackDefinition, materials: Map<string, StandardMaterial>) {
  const { timings, timed } = stopwatch(), L = LAUNCHSITE, layout = timed('layout', () => launchsiteLayout(track)), terrainMaterial = materials.get('terrain')!;
  const terrain = timed('terrain', () => buildTerrain('launchsite-terrain', scene, { extent: L.extent, cell: L.terrainCell, height: (x, z) => layout.height(x, z) - 0.035, color: (x, z, h, slope) => layout.tint(x, z, h, slope) }, terrainMaterial));
  // Painted ground, rock and plants follow after the first frame; their generators load as a chunk.
  const { shadowCasters } = runLandscape(scene, materials, { name: 'launchsite', props: 'launchsite', timings, load: async () => {
    const detail = await import('./launchsite-detail'), { loose, plants } = timed('scatter', () => layout.scatter());
    return { generators: detail, paint: detail.paintInto(scene, track, layout, terrainMaterial), formations: layout.formations, rock: L.rock, loose, plants, plantPalette: L.plants, topPlants: ['bursage', 'grass', 'creosote'] };
  } });
  return { terrain: terrain.mesh, heightAt: terrain.heightAt, shadowCasters };
}
