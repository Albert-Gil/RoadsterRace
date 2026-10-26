import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Point, TrackDefinition } from '../core/types';
import { courseDistance, type Extent } from './landscape/terrain';
import { fbm2, random } from './landscape/noise';
import { edgeDistance, hex, insidePolygon } from './landscape/mesh';
import type { LooseRock, RockPalette } from './landscape/rocks';
import type { Plant, PlantPalette } from './landscape/plants';
import { runLandscape, stopwatch } from './landscape/runtime';

/**
 * Newport's island beach (presentation only; the course, its version and its footprints are
 * unchanged). The island's sand gets a painted map (its UVs already span NEWPORT.map), granite
 * boulder groups replace the old rounded shore stones, a short rock jetty runs out on the
 * grandstand side, and ice plant and dune grass grow along the beach beyond the corridor.
 */
export const NEWPORT = {
  /** The island mesh's UV extent (u = x / 180 + 0.5, v = z / 135 + 0.5). */
  map: { minX: -90, maxX: 90, minZ: -67.5, maxZ: 67.5 } satisfies Extent,
  extent: { minX: -150, maxX: 150, minZ: -120, maxZ: 120 } satisfies Extent,
  island: { x: 85, z: 62 }, water: -0.46, level: -0.035, corridor: 24,
  /** Shore boulder groups at the old shore stones' angles; a jetty on the grandstand side, where no boats moor. */
  shoreGroups: 20, jetty: { angle: 1.42, from: 0.99, to: 1.22 },
  rock: {
    strata: ['#a29a8c', '#b2a898'].map(hex), stratum: 3,
    talus: hex('#8f877a'), cap: hex('#c2b8a6'), varnish: hex('#5a524a'),
    granite: [hex('#9b958b'), hex('#c4beb2'), hex('#67615a')], lichen: hex('#b4a46c'), dust: hex('#e2cfa6'), scanTint: 0.65,
  } satisfies RockPalette,
  plants: {
    dry: hex('#b9a47c'), dunegrass: [hex('#8c9a5e'), hex('#dcc890')], iceplant: [hex('#5f8a42'), hex('#e0609c')],
  } satisfies PlantPalette,
};

/** Island-relative ring (1 = the shore) and a point on it. */
const ring = (p: Point) => Math.hypot(p.x / NEWPORT.island.x, p.z / NEWPORT.island.z);
const onRing = (angle: number, r: number) => ({ x: Math.cos(angle) * NEWPORT.island.x * r, z: Math.sin(angle) * NEWPORT.island.z * r });

/** The deterministic layout (no rendering): shore rocks, the jetty and beach plants. */
export function newportLandscapeLayout(track: TrackDefinition, pierAngles: readonly number[]) {
  const N = NEWPORT, D = courseDistance(track, N.extent, 2);
  const clear = (p: Point, minD = N.corridor) => (D(p.x, p.z) >= minD + 2 || D.exact(p.x, p.z) >= minD) && !track.barriers.some(b => insidePolygon(p, b.footprint) || edgeDistance(p, b.footprint) < 3);
  const nearPier = (angle: number, margin: number) => pierAngles.some(a => Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < margin);
  let scattered: { loose: LooseRock[]; plants: Plant[] } | null = null;
  const scatter = () => scattered ??= (() => {
    const rand = random(4545), loose: LooseRock[] = [], plants: Plant[] = [];
    const rock = (p: Point, size: number, y: number, kind: LooseRock['kind']) => { if (clear(p)) loose.push({ x: p.x, y, z: p.z, size, heading: rand() * Math.PI * 2, seed: loose.length * 13 + 7, kind }); };
    // Granite groups at the shore: one big boulder half in the water, smaller blocks around it.
    for (let i = 0; i < N.shoreGroups; i++) {
      // On the wet rim (the shelf above the water is translucent, so the stones stand clear of it).
      const a = i / N.shoreGroups * Math.PI * 2 + 0.12 + Math.sin(i * 7) * 0.08, r = 0.975 + (i % 3) * 0.01;
      if (nearPier(a, 0.12)) continue;
      const c = onRing(a, r); if (!clear(c)) continue;
      rock(c, 3 + (i % 4) * 0.4, -0.45, 'boulder');
      for (let k = 0, n = 3 + (i % 3); k < n; k++) { const b = a + (rand() - 0.5) * 0.1, p = onRing(b, r + (rand() - 0.4) * 0.045); rock(p, 1.1 + rand() * 0.9, -0.55 - rand() * 0.15, rand() < 0.6 ? 'block' : 'boulder'); }
    }
    // The jetty: a crest of blocks with lower flanks, stepping down to the sea.
    const { angle, from, to } = N.jetty, start = onRing(angle, from), end = onRing(angle, to), len = Math.hypot(end.x - start.x, end.z - start.z);
    const ux = (end.x - start.x) / len, uz = (end.z - start.z) / len;
    for (let s = 0; s < len; s += 1.05) for (const side of [-2, -1, 0, 1, 2]) {
      if (Math.abs(side) === 2 && rand() < 0.3) continue;
      const t = s / len, p = { x: start.x + ux * s - uz * (side + (rand() - 0.5) * 0.7), z: start.z + uz * s + ux * (side + (rand() - 0.5) * 0.7) };
      rock(p, 1.9 - Math.abs(side) * 0.25 + rand() * 0.5, -0.6 - Math.abs(side) * 0.25 - t * 0.3, rand() < 0.2 && !side ? 'boulder' : 'block');
    }
    // Ice plant and dune grass on the upper beach, beyond the corridor and clear of the shore stones.
    for (let x = N.map.minX; x < N.map.maxX; x += 2) for (let z = N.map.minZ; z < N.map.maxZ; z += 2) {
      const p = { x: x + (rand() - 0.5) * 1.8, z: z + (rand() - 0.5) * 1.8 }, r = ring(p);
      if (r > 0.93 || r < 0.55 || !clear(p, N.corridor) || rand() > 0.8 * Math.max(0, fbm2(p.x / 18, p.z / 18, 2, 61) + 0.55)) continue;
      if (loose.some(l => Math.hypot(l.x - p.x, l.z - p.z) < l.size)) continue;
      const kind = rand() < 0.55 ? 'dunegrass' : 'iceplant';
      plants.push({ kind, x: p.x, y: N.level, z: p.z, size: kind === 'dunegrass' ? 0.8 + rand() * 0.6 : 1.3 + rand() * 0.9, heading: rand() * 6.28, seed: plants.length * 31 + 3, dryness: kind === 'dunegrass' ? 0.2 + rand() * 0.3 : 0 });
    }
    return { loose, plants };
  })();
  return { D, ring, onRing, clear, scatter };
}
export type NewportLandscapeLayout = ReturnType<typeof newportLandscapeLayout>;

/** Paints the island and adds its rocks and plants after the first frame (lazy chunk). */
export function buildNewportLandscape(scene: Scene, track: TrackDefinition, materials: Map<string, StandardMaterial>, pierAngles: readonly number[]) {
  const { timings, timed } = stopwatch(), N = NEWPORT, layout = timed('layout', () => newportLandscapeLayout(track, pierAngles)), sand = materials.get('terrain')!;
  const { shadowCasters } = runLandscape(scene, materials, { name: 'newport', props: 'launchsite', timings, load: async () => {
    const detail = await import('./newport-detail'), { loose, plants } = timed('scatter', () => layout.scatter());
    return { generators: detail, paint: detail.paintInto(scene, track, layout, sand), formations: [], rock: N.rock, loose, plants, plantPalette: N.plants };
  } });
  return { shadowCasters };
}
