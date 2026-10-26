import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Point, TrackDefinition } from '../core/types';
import { buildTerrain, courseDistance, distanceField, polygonField, type Extent } from './landscape/terrain';
import { fbm2, ridged2, smoothstep } from './landscape/noise';
import { edgeDistance, hex, insidePolygon, mix, scale, type Rgb } from './landscape/mesh';
import type { FormationSpec, LooseRock, RockPalette } from './landscape/rocks';
import type { Plant, PlantPalette } from './landscape/plants';
import { smoothPath } from './landscape/paths';
import { scatterTools } from './landscape/scatter';
import { runLandscape, stopwatch } from './landscape/runtime';

/**
 * Santa Monica's beach (presentation only, world coordinates). The flat beach support becomes a
 * heightfield: level across the corridor and around everything built, a low berm behind the wet
 * sand, hummocky restored dunes further out, and a short slope into the Pacific. Its painted map
 * carries groomed sand, the swash and wrack lines, the bike path, volleyball courts, towels, tyre
 * tracks and footprints. Tall palms line the promenade, dune grass and ice plant hold the dunes,
 * and the 'rock' barrier becomes the root of a granite groyne whose arm runs out into the surf.
 */
const P = (x: number, z: number): Point => ({ x, z });
export const SANTA = {
  extent: { minX: -250, maxX: 52, minZ: -232, maxZ: 232 } satisfies Extent,
  visible: { minX: -244, maxX: 52, minZ: -224, maxZ: 224 } satisfies Extent,
  /** Each fit's visible ground (phone landscape and portrait, desktop, tablet portrait and landscape), 4 m margins. */
  views: [{ minX: -132, maxX: 240, minZ: -72, maxZ: 100 }, { minX: -160, maxX: 224, minZ: -80, maxZ: 112 }, { minX: -196, maxX: 196, minZ: -224, maxZ: 148 }, { minX: -244, maxX: 220, minZ: -104, maxZ: 164 }, { minX: -212, maxX: 204, minZ: -144, maxZ: 224 }] satisfies Extent[],
  level: -0.04, water: -2.4, corridor: 24, cell: 2.5,
  /** The promenade the venue builds (x range) and the beach bike path beside it. */
  promenade: { minX: -105.4, maxX: -100.6 },
  bikePath: [P(-84, -236), P(-88, -170), P(-84, -110), P(-90, -55), P(-86, 0), P(-91, 45), P(-99, 66), P(-114, 72), P(-150, 74), P(-200, 70), P(-256, 72)],
  courts: [P(-124, -22), P(-124, 2), P(-150, -22)],
  /** Palms the venue always had (authored positions, reflected into the world), now with fronds. */
  palms: [[-30, -21], [-14, -21], [0, -21], [-73, -35], [-74, -12], [-73, 12], [-64, 45], [-40, 52], [-14, 50], [5, 66], [20, -65], [-92, -45], [-92, -24], [-91, 0], [-88, 25]].map(([x, z]) => ({ x, z: -z, height: 5 + Math.abs(x) % 3 })),
  /** The groyne's seaward arm (loose granite), continuing the root barrier into the surf. */
  groyne: { from: P(33.4, 84.2), to: P(66, 85.5) },
  rock: {
    strata: ['#a39b8e', '#b5ab9c'].map(hex), stratum: 3,
    talus: hex('#8f877c'), cap: hex('#c2b8a8'), varnish: hex('#5a524a'),
    granite: [hex('#9a948a'), hex('#c2bcb0'), hex('#66605a')], lichen: hex('#b0a070'), dust: hex('#d9be96'), scanTint: 0.7,
  } satisfies RockPalette,
  plants: {
    dry: hex('#b7a27a'), bark: hex('#8a6e56'), palm: [hex('#46663a'), hex('#94a860')],
    dunegrass: [hex('#8c9a5e'), hex('#dcc890')], iceplant: [hex('#5f8a42'), hex('#e0609c')], grass: [hex('#93a15e'), hex('#d8c48a')],
    shrub: [hex('#5c7344'), hex('#a7b26e')],
  } satisfies PlantPalette,
};

/** The deterministic layout (no rendering): beach heights and tints, formations, loose rocks and plants. */
export function santaLayout(track: TrackDefinition) {
  const S = SANTA, extent = S.extent, D = courseDistance(track, extent, 2.5);
  // Shoreline: the beach support's sea edge, x as a function of z (sampled every 10 m).
  const shore = track.supports!.find(s => s.id === 'beach-land')!.footprint.filter(p => p.x > -300).slice().sort((a, b) => a.z - b.z);
  const shoreX = (z: number) => {
    let i = 1; while (i < shore.length - 1 && shore[i].z < z) i++;
    const a = shore[i - 1], b = shore[i], t = Math.max(0, Math.min(1, (z - a.z) / (b.z - a.z || 1)));
    return a.x + (b.x - a.x) * t;
  };
  const onLand = (p: Point) => p.x <= shoreX(p.z);
  const barriers = track.barriers.filter(b => b.kind === 'infield' || b.kind === 'rock'), rocks = track.barriers.filter(b => b.kind === 'rock');
  const formations: FormationSpec[] = rocks.map((b, i) => ({ id: b.id, footprint: b.footprint, height: b.height, base: 0, seed: 811 + i * 29, style: 'riprap' }));
  const built = polygonField(barriers.map(b => b.footprint), extent, 2.5), bike = smoothPath(S.bikePath, 2), bikeField = distanceField([bike], extent, 2.5);
  const courtBox = (c: Point) => ({ minX: c.x - 8, maxX: c.x + 8, minZ: c.z - 4, maxZ: c.z + 4 });
  const inCourt = (p: Point, margin = 0) => S.courts.some(c => { const e = courtBox(c); return p.x > e.minX - margin && p.x < e.maxX + margin && p.z > e.minZ - margin && p.z < e.maxZ + margin; });
  /** Ground kept flat around everything built: the course, buildings, promenade, path and courts. */
  const flatness = (x: number, z: number) => {
    const promenade = Math.max(0, S.promenade.minX - x, x - S.promenade.maxX);
    return Math.min(built(x, z), promenade, bikeField(x, z) - 1.8, inCourt({ x, z }, 3) ? 0 : 99);
  };
  /** Seaward of the shoreline: the wet slope, the swash and the sand bank into the Pacific. */
  const surf = (d: number) => d < 2.5 ? S.level - 0.264 * d : d < 3 ? -0.7 - 0.3 * (d - 2.5) : d < 7 ? -0.85 - 0.3875 * (d - 3) : Math.max(-3, -2.4 - 0.1 * (d - 7));
  const height = (x: number, z: number) => {
    const d = x - shoreX(z);
    if (d > 0) return surf(d);
    const gate = smoothstep(S.corridor - 2, S.corridor + 14, D(x, z)) * smoothstep(1, 8, flatness(x, z)) * smoothstep(-2, -6, d);
    if (gate <= 0) return S.level;
    const berm = 0.32 * Math.exp(-(((d + 10) / 4.5) ** 2));
    const zone = smoothstep(0.02, 0.3, fbm2(x / 70, z / 70, 3, 211)) * smoothstep(-26, -50, d);
    const dunes = zone * Math.max(0, 0.7 + 0.9 * fbm2(x / 15, z / 15, 3, 223) + 0.35 * ridged2(x / 24, z / 24, 2, 227));
    return S.level + gate * (berm + dunes + 0.06 * fbm2(x / 9, z / 9, 2, 229));
  };
  const tint = (x: number, z: number, h: number, slope: number): Rgb => {
    const d = x - shoreX(z), n = fbm2(x / 40, z / 40, 3, 233), fine = fbm2(x / 8, z / 8, 2, 239);
    let c: Rgb = [1.04, 1.02, 1.0];
    c = mix(c, n > 0 ? [1.08, 1.05, 1.0] : [0.97, 0.95, 0.94], Math.min(1, Math.abs(n) * 1.6) * 0.5);
    c = mix(c, [0.84, 0.8, 0.78], smoothstep(-6, -0.5, d) * 0.7);
    c = mix(c, [0.72, 0.68, 0.66], smoothstep(0, 2.5, d));
    c = mix(c, [0.58, 0.6, 0.6], smoothstep(3, 6, d));
    c = mix(c, [1.0, 0.96, 0.9], smoothstep(0.08, 0.3, slope) * 0.3);
    return scale(c, 1 + 0.03 * fine + 0.02 * (h - S.level));
  };

  let scattered: ReturnType<typeof scatterSanta> | null = null;
  const scatterSanta = () => {
    const visible = (p: Point) => S.views.some(v => p.x >= v.minX && p.x <= v.maxX && p.z >= v.minZ && p.z <= v.maxZ);
    const tools = scatterTools({ visible: S.visible, corridor: S.corridor, D, height, barriers: track.barriers, blocked: (p, clearance) => !visible(p) || p.x > shoreX(p.z) - 4 - clearance || flatness(p.x, p.z) < 1 + clearance }, extent, 3131);
    const { rand, loose, plants } = tools;
    const clearOfCourse = (p: Point, minD: number) => D(p.x, p.z) >= minD + 2 || D.exact(p.x, p.z) >= minD;
    // The groyne's arm: granite blocks out into the surf, a crest stepping down seaward, with outliers.
    const { from, to } = S.groyne, len = Math.hypot(to.x - from.x, to.z - from.z), ux = (to.x - from.x) / len, uz = (to.z - from.z) / len;
    for (let s = 0; s < len; s += 1.05) for (const side of [-2.4, -1.2, 0, 1.2, 2.4]) {
      if (Math.abs(side) > 2 && rand() < 0.3) continue;
      const t = s / len, p = { x: from.x + ux * s - uz * (side + (rand() - 0.5) * 0.8), z: from.z + uz * s + ux * (side + (rand() - 0.5) * 0.8) };
      if (rocks.some(b => insidePolygon(p, b.footprint) || edgeDistance(p, b.footprint) < 0.3)) continue;
      const ground = height(p.x, p.z), size = 2.2 - Math.abs(side) * 0.25 + rand() * 0.5;
      loose.push({ x: p.x, y: Math.max(ground, S.water - 0.9) - 0.25 - Math.abs(side) * 0.3 - t * 0.3, z: p.z, size, heading: rand() * 6.28, seed: loose.length * 13 + 7, kind: rand() < 0.2 && !side ? 'boulder' : 'block' });
    }
    // A scatter of shells and pebbles along the wrack line and a few stones by the groyne root.
    for (let z = S.visible.minZ; z < S.visible.maxZ; z += 3.5) {
      const p = { x: shoreX(z) - 5.5 + (rand() - 0.5) * 2, z: z + (rand() - 0.5) * 3 };
      if (rand() < 0.35 && clearOfCourse(p, S.corridor) && visible(p) && !track.barriers.some(b => b.footprint.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 3))) loose.push({ x: p.x, y: height(p.x, p.z), z: p.z, size: 0.18 + rand() * 0.25, heading: rand() * 6.28, seed: loose.length * 13 + 7, kind: 'pebble' });
    }
    // Restored dunes: dune grass on the hummocks, ice plant mats, a few yellow-flowered shrubs.
    tools.field(3.4, (p, d, roll) => {
      const rise = height(p.x, p.z) - S.level, sea = p.x - shoreX(p.z);
      if (sea > -14 || roll > 0.02 + 0.55 * smoothstep(0.3, 0.9, rise)) return null;
      const r = rand();
      return r < 0.62 ? { kind: 'dunegrass', size: 0.8 + rand() * 0.7, dryness: 0.2 + rand() * 0.4 } : r < 0.9 ? { kind: 'iceplant', size: 1.3 + rand() * 1 } : { kind: 'shrub', size: 0.7 + rand() * 0.5, dryness: 0.25 };
    }, 0.8);
    // Palisades palms: a tall row along the promenade's inland side.
    for (let z = -214; z <= 74; z += 13 + rand() * 2) {
      const p = { x: S.promenade.minX - 4 + (rand() - 0.5), z }, h = 11 + rand() * 3.5;
      if (visible(p) && clearOfCourse(p, Math.max(S.corridor + 6, 8 + 1.5 * h)) && built(p.x, p.z) > 3) tools.addPlant(p, 'palm', h);
    }
    return { loose: loose as LooseRock[], plants };
  };
  const scatter = () => (scattered ??= scatterSanta());
  /** The venue's own palms (inside its gardens and runoff, as authored before): decoration, not scatter. */
  const decor = (): Plant[] => S.palms.map((p, i) => ({ kind: 'palm', x: p.x, y: S.level, z: p.z, size: p.height + 1.5, heading: i * 2.1, seed: 70000 + i * 31, dryness: 0 }));
  return { extent, D, shoreX, onLand, surf, barriers, rocks, formations, bike, bikeField, courtBox, inCourt, flatness, height, tint, scatter, decor };
}
export type SantaLayout = ReturnType<typeof santaLayout>;

/**
 * Builds the beach now (replacing the flat beach slab), volleyball nets, then the painted map, rock
 * and plants after the first frame (lazy chunk). The scene must already hold the venue's materials.
 */
export function buildSantaMonicaLandscape(scene: Scene, track: TrackDefinition, materials: Map<string, StandardMaterial>) {
  const { timings, timed } = stopwatch(), S = SANTA, layout = timed('layout', () => santaLayout(track)), sand = materials.get('terrain')!;
  timed('terrain', () => buildTerrain('santa-monica-beach', scene, { extent: S.extent, cell: S.cell, height: layout.height, color: layout.tint }, sand, 1400));
  // Volleyball nets: two posts and a net band on every court.
  const post = materials.get('architecture-trim')!, net = materials.get('architecture')!;
  for (const c of S.courts) {
    for (const side of [-1, 1]) { const m = MeshBuilder.CreateBox('volleyball-post', { width: 0.12, height: 2.5, depth: 0.12 }, scene); m.position.set(c.x, 1.21, c.z + side * 4.6); m.material = post; }
    const mesh = MeshBuilder.CreateBox('volleyball-net', { width: 0.03, height: 0.7, depth: 9.2 }, scene); mesh.position.set(c.x, 2.03, c.z); mesh.material = post;
    const tape = MeshBuilder.CreateBox('volleyball-net-tape', { width: 0.05, height: 0.08, depth: 9.2 }, scene); tape.position.set(c.x, 2.42, c.z); tape.material = net;
  }
  const { shadowCasters } = runLandscape(scene, materials, { name: 'santa-monica', props: 'launchsite', timings, load: async () => {
    const detail = await import('./santa-monica-detail'), { loose, plants } = timed('scatter', () => layout.scatter());
    return { generators: detail, paint: detail.paintInto(scene, track, layout, sand), formations: layout.formations, rock: S.rock, loose, plants: [...plants, ...layout.decor()], plantPalette: S.plants };
  } });
  return { shadowCasters };
}
