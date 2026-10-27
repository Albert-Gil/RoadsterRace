import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TrackBarrier, TrackDefinition } from '../core/types';
import { buildTerrain, courseDistance, distanceField, polygonField, type Extent } from './landscape/terrain';
import { fbm2, ridged2, smoothstep } from './landscape/noise';
import { hex, mix, scale, type Rgb } from './landscape/mesh';
import type { FormationSpec, RockPalette } from './landscape/rocks';
import type { PlantKind, PlantPalette } from './landscape/plants';
import { smoothPath } from './landscape/paths';
import { scatterTools } from './landscape/scatter';
import { runLandscape, stopwatch } from './landscape/runtime';

/**
 * Grand Canyon's floor and walls (presentation only). The trails stand on earthen supports above
 * a canyon floor at -2.6 m; the floor becomes a heightfield (level beside the supports, swelling
 * toward the walls, cut by dry washes) with a painted map. The track's 'rock' barriers become
 * layered Supai-red buttes, mesas, ledges and walls, its infield mesas are re-dressed the same way,
 * and junipers, sage, agave and yucca grow beyond the corridor.
 */
export const CANYON = {
  extent: { minX: -280, maxX: 280, minZ: -250, maxZ: 220 } satisfies Extent,
  /** Ground the cameras can see (union of phone, tablet and desktop fits), with a margin. */
  visible: { minX: -228, maxX: 186, minZ: -228, maxZ: 136 } satisfies Extent,
  floor: -2.6, corridor: 24, terrainCell: 3, flatUntil: 24,
  formations: {
    'canyon-west-butte': { style: 'butte' }, 'canyon-south-mesa': { style: 'mesa' }, 'canyon-east-butte': { style: 'butte', tiers: 2 },
    'canyon-north-mesa': { style: 'mesa' }, 'canyon-west-spire': { style: 'butte' },
    'canyon-west-mesa': { style: 'mesa', tiers: 2 }, 'canyon-east-mesa': { style: 'butte' }, 'canyon-northeast-mesa': { style: 'mesa', spire: true },
    'canyon-rim-1': { style: 'boulders' }, 'canyon-rim-2': { style: 'boulders' }, 'canyon-rim-3': { style: 'boulders' },
    'western-mesa-rocks': { style: 'mesa' }, 'eastern-mesa-rocks': { style: 'mesa' },
  } as Record<string, Pick<FormationSpec, 'style' | 'tiers' | 'spire' | 'lod'>>,
  washes: [
    [{ x: -285, z: 112 }, { x: -222, z: 74 }, { x: -212, z: 30 }, { x: -214, z: -15 }, { x: -196, z: -55 }, { x: -206, z: -95 }, { x: -232, z: -140 }, { x: -285, z: -172 }],
    [{ x: 24, z: -78 }, { x: 44, z: -58 }, { x: 78, z: -50 }, { x: 108, z: -38 }, { x: 140, z: -52 }, { x: 176, z: -74 }, { x: 214, z: -82 }, { x: 285, z: -76 }],
  ],
  /** Grand Canyon beds from the floor up: Tapeats, Bright Angel, Redwall, Supai, Hermit, Coconino, Kaibab. */
  rock: {
    strata: ['#8f6a52', '#a29b84', '#c97c58', '#bd6548', '#d68d63', '#b35a40', '#c26d4f', '#ead2a8', '#e0cbab', '#d8ccb5'].map(hex),
    stratum: 3.2, talus: hex('#8b5a45'), cap: hex('#d2bd9f'), varnish: hex('#4a3027'),
    granite: [hex('#9c6a50'), hex('#c08a68'), hex('#6f4a3a')], lichen: hex('#a89a5a'), dust: hex('#c8976f'),
  } satisfies RockPalette,
  plants: {
    dry: hex('#8a7058'), bark: hex('#5e4a3c'), juniper: [hex('#3c4f35'), hex('#6c7d52')], sage: hex('#9aa38a'),
    agave: [hex('#6a8573'), hex('#b8b88a')], grass: [hex('#9a9a5e'), hex('#cdb27a')],
  } satisfies PlantPalette,
};

const style = (b: TrackBarrier) => CANYON.formations[b.id] ?? (b.id.includes('ledge') ? { style: 'mesa' as const } : b.id.includes('far') ? { style: 'mesa' as const, tiers: 2 as const, lod: 2 } : b.id.includes('wall') ? { style: (b.id.endsWith('2') || b.id.endsWith('4') ? 'butte' : 'mesa') as 'butte' | 'mesa', tiers: (b.height >= 24 ? 2 : 1) as 1 | 2, lod: 1.5 } : { style: 'mesa' as const });

/** The deterministic layout (no rendering): heights, tints, formations, loose rocks and plants. */
export function canyonLayout(track: TrackDefinition) {
  const C = CANYON, extent = C.extent, D = courseDistance(track, extent, 3);
  const rocks = track.barriers.filter(b => b.kind === 'rock' || b.kind === 'infield');
  // Ground the inner mesas without changing their collision top or outline.
  const formations: FormationSpec[] = rocks.map((b, i) => {
    const originalBase = b.baseHeight ?? 0, base = Math.min(C.floor, originalBase);
    return { id: b.id, footprint: b.footprint, height: b.height + originalBase - base, base, seed: 301 + i * 41, ...style(b) };
  });
  const washes = C.washes.map(w => smoothPath(w, 2)), W = distanceField(washes, extent, 3);
  const tall = rocks.filter(b => b.kind === 'rock' && b.height >= 12), tallField = polygonField(tall.map(b => b.footprint), extent, 3), rockField = polygonField(rocks.map(b => b.footprint), extent, 3);
  const rise = (d: number) => smoothstep(C.flatUntil, 70, d);
  const edge = (x: number, z: number) => smoothstep(0, 45, Math.min(x - extent.minX, extent.maxX - x, z - extent.minZ, extent.maxZ - z));
  const height = (x: number, z: number) => {
    const d = D(x, z), gate = smoothstep(C.flatUntil - 2, 40, d);
    if (gate <= 0) return C.floor;
    let h = rise(d) * (1.4 * (0.5 + 0.5 * fbm2(x / 55, z / 55, 4, 13)) + 0.6 * fbm2(x / 17, z / 17, 2, 17));
    // Broad canyon benches tie the isolated formations into a single eroded landscape.
    // They begin beyond the entire planning corridor; their height also respects the
    // overview's sight line so a foreground ridge cannot cover a lower trail.
    const ridge = ridged2(x / 74 + 0.2 * fbm2(x / 100, z / 100, 2, 8), z / 46, 3, 817);
    const bench = smoothstep(C.flatUntil + 3, 57, d) * (2.2 + 12 * ridge);
    const bed = 2.1, fraction = bench / bed - Math.floor(bench / bed);
    h += bench * 0.4 + (Math.floor(bench / bed) + smoothstep(0.55, 0.94, fraction)) * bed * 0.6;
    // Talus aprons swell toward the tall rock; the canyon rims rise behind the walls.
    const t = tallField.nearest(x, z);
    if (t >= 0) { const sd = tallField(x, z), b = tall[t]; h += gate * 0.08 * b.height * Math.exp(-Math.max(0, sd) / (0.5 * b.height + 8)) * smoothstep(-1, 6, sd); }
    h += smoothstep(128, 200, Math.abs(z)) * 7;
    const dw = W(x, z); h += gate * (-0.9 * Math.exp(-((dw / 4.4) ** 2)) + 0.25 * Math.exp(-(((dw - 8) / 3) ** 2)));
    // Preserve each formation's readable cliff face instead of burying low ledges in a dune.
    const near = rockField.nearest(x, z);
    if (near >= 0) {
      const estimated = rockField(x, z);
      const contact = estimated < 3 ? rockField.exact(x, z) : { distance: estimated, index: near };
      h = Math.min(h, rocks[contact.index].height * 0.18 + Math.max(0, contact.distance) * 0.8);
    }
    return C.floor + Math.min(h, Math.max(0, (d - track.roadWidth / 2) / 1.45)) * edge(x, z);
  };
  const tint = (x: number, z: number, h: number, slope: number): Rgb => {
    const d = D(x, z), n1 = fbm2(x / 36, z / 36, 3, 23), n2 = fbm2(x / 8, z / 8, 2, 37);
    let c: Rgb = [1.08, 1.02, 1.0];
    c = mix(c, n1 > 0 ? [1.16, 1.08, 1.02] : [0.95, 0.88, 0.86], Math.min(1, Math.abs(n1) * 1.7) * 0.6);
    const pavement = smoothstep(0.1, 0.4, fbm2(x / 22, z / 22, 3, 43)) * smoothstep(26, 44, d) * (1 - smoothstep(0.05, 0.2, slope));
    c = mix(c, [0.86, 0.74, 0.7], pavement * 0.6);
    const near = rockField.nearest(x, z);
    if (near >= 0) c = mix(c, [1.0, 0.8, 0.7], Math.exp(-Math.max(0, rockField(x, z)) / (0.3 * rocks[near].height + 5)) * 0.5);
    const dw = W(x, z); c = mix(c, [1.2, 1.12, 1.06], Math.exp(-((dw / 4.4) ** 2)) * 0.65);
    c = mix(c, [1.0, 0.86, 0.78], smoothstep(0.1, 0.35, slope) * 0.25);
    const exposed = smoothstep(0.06, 0.35, slope) * smoothstep(C.floor + 1.6, C.floor + 4.5, h);
    const bed = Math.floor((h - C.floor) / 2.1) % 3;
    c = mix(c, bed === 1 ? [1.08, 0.88, 0.69] : bed === 2 ? [0.83, 0.64, 0.53] : [1.0, 0.73, 0.55], exposed * 0.7);
    return scale(c, 1 + 0.035 * n2 + 0.015 * (h - C.floor) / 6);
  };

  let scattered: ReturnType<typeof scatterCanyon> | null = null;
  const scatterCanyon = () => {
    const tools = scatterTools({ visible: C.visible, corridor: C.corridor, D, height, barriers: track.barriers }, extent, 4343);
    tools.scree(rocks, b => b.kind !== 'rock' || !b.id.includes('rim'), 0.65);
    tools.cobbles(washes);
    tools.stones(700, 18);
    tools.field(3.1, (p, d, roll) => {
      const dw = W(p.x, p.z), wash = Math.exp(-((dw / 6) ** 2)), n = rockField.nearest(p.x, p.z), foot = n >= 0 ? Math.exp(-Math.max(0, rockField(p.x, p.z) - 1) / 10) : 0;
      if (roll > 0.075 + 0.6 * wash + 0.4 * foot + 0.08 * Math.max(0, fbm2(p.x / 20, p.z / 20, 2, 7))) return null;
      const r = tools.rand(), dry = Math.max(0, Math.min(1, 0.3 + 0.6 * fbm2(p.x / 15, p.z / 15, 2, 67) - wash * 0.4));
      const kind: PlantKind = r < 0.4 ? 'sage' : r < 0.66 ? 'grass' : r < 0.78 ? 'juniper' : r < 0.9 ? 'agave' : r < 0.96 ? 'yucca' : 'deadwood';
      const size = kind === 'juniper' ? 2.4 + tools.rand() * 2.2 : kind === 'sage' ? 0.7 + tools.rand() * 0.6 : kind === 'grass' ? 0.5 + tools.rand() * 0.4 : kind === 'agave' ? 0.8 + tools.rand() * 0.6 : kind === 'yucca' ? 1.2 + tools.rand() * 0.8 : 1.2 + tools.rand();
      return { kind, size, dryness: kind === 'deadwood' ? 1 : dry };
    });
    tools.trees(30, 'juniper', () => 3.5 + tools.rand() * 2.5, 12);
    return { loose: tools.loose, plants: tools.plants };
  };
  const scatter = () => (scattered ??= scatterCanyon());
  return { extent, D, W, washes, height, tint, formations, scatter, rocks };
}
export type CanyonLayout = ReturnType<typeof canyonLayout>;

/** Builds the canyon floor now; paint, rock and plants follow after the first frame (lazy chunk). */
export function buildCanyonLandscape(scene: Scene, track: TrackDefinition, materials: Map<string, StandardMaterial>) {
  const { timings, timed } = stopwatch(), C = CANYON, layout = timed('layout', () => canyonLayout(track)), terrainMaterial = materials.get('terrain')!;
  const terrain = timed('terrain', () => buildTerrain('canyon-floor', scene, { extent: C.extent, cell: C.terrainCell, height: (x, z) => layout.height(x, z), color: (x, z, h, slope) => layout.tint(x, z, h, slope) }, terrainMaterial));
  const { shadowCasters } = runLandscape(scene, materials, { name: 'canyon', props: 'launchsite', timings, load: async () => {
    const detail = await import('./canyon-detail'), { loose, plants } = timed('scatter', () => layout.scatter());
    return { generators: detail, paint: detail.paintInto(scene, track, layout, terrainMaterial, materials.get('shoulder')), formations: layout.formations, rock: C.rock, loose, plants, plantPalette: C.plants, topPlants: ['sage', 'grass', 'agave'] };
  } });
  return { terrain: terrain.mesh, shadowCasters };
}
