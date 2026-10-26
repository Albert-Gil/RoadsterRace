import type { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Point, TrackDefinition } from '../core/types';
import { buildTerrain, courseDistance, distanceField, polygonField, type Extent } from './landscape/terrain';
import { fbm2, ridged2, smoothstep } from './landscape/noise';
import { edgeDistance, hex, insidePolygon, mix, scale, type Rgb } from './landscape/mesh';
import type { FormationSpec, LooseRock, RockPalette } from './landscape/rocks';
import type { PlantPalette } from './landscape/plants';
import { smoothPath } from './landscape/paths';
import { scatterTools } from './landscape/scatter';
import { runLandscape, stopwatch } from './landscape/runtime';

/**
 * Golden Gate's waterfront parks and shore (presentation only). The city stands on flat land boxes
 * (content/golden-city.ts); their tops carry a painted map of lawns, sidewalks, plazas, promenades,
 * paths, tennis courts and a lagoon. Granite riprap lines the seawalls, a beach runs along the south
 * shore, Monterey cypress, palms, shrubs and ice plant grow beyond the corridor, and dry golden
 * headlands rise across the bay. The track's 'rock' barriers become granite park boulders.
 */
const P = (x: number, z: number): Point => ({ x, z });
export const GOLDEN = {
  /** The land the painted map covers (the city's land boxes). */
  land: { minX: -125, maxX: 125, minZ: -85, maxZ: 115 } satisfies Extent,
  /** Distance fields and scatter. */
  extent: { minX: -150, maxX: 150, minZ: -112, maxZ: 135 } satisfies Extent,
  /** Ground the cameras can see (bounds of the phone, tablet and desktop fits below), with a margin. */
  visible: { minX: -160, maxX: 140, minZ: -108, maxZ: 125 } satisfies Extent,
  /** Each fit's visible ground (phone landscape, phone portrait, desktop, tablet portrait and landscape), 4 m margins. */
  views: [{ minX: -140, maxX: 140, minZ: -56, maxZ: 72 }, { minX: -160, maxX: 128, minZ: -68, maxZ: 68 }, { minX: -180, maxX: 100, minZ: -104, maxZ: 188 }, { minX: -236, maxX: 132, minZ: -108, maxZ: 112 }, { minX: -176, maxX: 100, minZ: -96, maxZ: 172 }] satisfies Extent[],
  level: -0.035, water: -2.08, seabed: -3.4, corridor: 24,
  /** Seabed, beach and headlands: one vertex-coloured heightfield under and around the bay. */
  shore: { minX: -380, maxX: 380, minZ: -210, maxZ: 340 } satisfies Extent, shoreCell: 4,
  /** The land's outline (U-shaped around the inlet) and which of its edges face the open bay. */
  outline: [P(-125, -85), P(125, -85), P(125, 115), P(43, 115), P(43, 24), P(-43, 24), P(-43, 115), P(-125, 115)],
  /** Seawalls with a promenade behind the planting strip; the skyline block's wall has a cypress windbreak instead. */
  seaEdges: [[0, 1, 'promenade'], [1, 2, 'promenade'], [2, 3, 'promenade'], [6, 7, 'windbreak'], [7, 0, 'promenade']] as [number, number, 'promenade' | 'windbreak'][],
  quayEdges: [[3, 4], [4, 5], [5, 6]] as [number, number][],
  /** Bands in from a seawall (m): coping, then a planting strip, then the promenade. Quays: coping, promenade. */
  bands: { coping: 0.6, planting: 2.6, promenade: 6.6, quay: 5 },
  /** The south shore's beach (x range; it tapers into riprap at both ends). */
  beach: { from: -100, to: 118 },
  courts: [P(-48, -71.2), P(-20, -71.2)],
  pond: { x: 100, z: -46, rx: 11, rz: 7, angle: 0.25 },
  fountain: { x: -5, z: -1, r: 6.5 },
  paths: [
    [P(49.6, 72), P(58, 78), P(68, 82), P(80, 85), P(92, 92), P(104, 97), P(114, 100), P(118.4, 103)],
    [P(80, 85), P(77, 95), P(72, 103), P(66, 108.4)],
    [P(-118.4, -67), P(-100, -66), P(-84, -69.5), P(-68, -67.5)],
    [P(-4, -70), P(14, -67.5), P(34, -70.5), P(54, -68.5), P(74, -65), P(92, -60), P(104, -56.5)],
    [P(-48.4, 86), P(-57, 84.5), P(-66, 84)],
    [P(118.4, -20), P(110, -24), P(104, -32), P(103, -38.5)],
  ],
  beds: [{ x: 70, z: 95, rx: 4, rz: 2.4 }, { x: 92, z: 106, rx: 3, rz: 2 }, { x: -56, z: 96, rx: 3.4, rz: 2.2 }, { x: 34, z: -75, rx: 3.6, rz: 2 }, { x: 112, z: -66, rx: 3, rz: 2 }, { x: -110, z: -74, rx: 3.2, rz: 2.2 }],
  rock: {
    strata: ['#8c8a84', '#9d9a92'].map(hex), stratum: 3,
    talus: hex('#7d7a72'), cap: hex('#b4b0a6'), varnish: hex('#4b4a46'),
    granite: [hex('#8f8d86'), hex('#b8b5ac'), hex('#5f5e5a')], lichen: hex('#a3a46a'), dust: hex('#6f7c4c'), scanTint: 0.75,
  } satisfies RockPalette,
  plants: {
    dry: hex('#9c8a62'), bark: hex('#6a5848'), cypress: [hex('#345a3a'), hex('#6c9256')], shrub: [hex('#46693a'), hex('#91ae5e')],
    iceplant: [hex('#5d7f3b'), hex('#d4579a')], dunegrass: [hex('#8f9a62'), hex('#d6c58c')], palm: [hex('#3f5f32'), hex('#8aa055')],
    grass: [hex('#6f8a4a'), hex('#c2b277')],
  } satisfies PlantPalette,
};

const segment = (a: Point, b: Point, p: Point) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
};

/** The deterministic layout (no rendering): land, shore heights and tints, formations, loose rocks and plants. */
export function goldenLayout(track: TrackDefinition) {
  const G = GOLDEN, extent = G.extent, D = courseDistance(track, extent, 2), outline = G.outline;
  const edges = (list: readonly (readonly [number, number, ...unknown[]])[]) => list.map(([a, b]) => [outline[a], outline[b]] as const);
  const seaEdges = edges(G.seaEdges), quayEdges = edges(G.quayEdges), walkEdges = edges(G.seaEdges.filter(e => e[2] === 'promenade'));
  const onLand = (p: Point) => insidePolygon(p, outline);
  /** Distance (m) in from the nearest seawall, and from the nearest quay. */
  const fromSea = (p: Point) => Math.min(...seaEdges.map(([a, b]) => segment(a, b, p)));
  const fromQuay = (p: Point) => Math.min(...quayEdges.map(([a, b]) => segment(a, b, p)));
  const fromWalk = (p: Point) => Math.min(...walkEdges.map(([a, b]) => segment(a, b, p)));
  const blocks = track.barriers.filter(b => b.kind === 'infield' && b.id !== 'inlet-head');
  const rocks = track.barriers.filter(b => b.kind === 'rock');
  const formations: FormationSpec[] = rocks.map((b, i) => ({ id: b.id, footprint: b.footprint, height: b.height, base: 0, seed: 611 + i * 37, style: 'boulders' }));
  const paths = G.paths.map(p => smoothPath(p, 1.5)), pathField = distanceField(paths, extent, 2);
  const plazas = blocks.map(b => { const xs = b.footprint.map(p => p.x), zs = b.footprint.map(p => p.z); return { minX: Math.min(...xs) - 4, maxX: Math.max(...xs) + 4, minZ: Math.min(...zs) - 4, maxZ: Math.max(...zs) + 4 }; });
  const blockField = polygonField(blocks.map(b => b.footprint), extent, 2);
  const courtBox = (c: Point) => ({ minX: c.x - 13.4, maxX: c.x + 13.4, minZ: c.z - 7, maxZ: c.z + 7 });
  const inBox = (p: Point, e: Extent, margin = 0) => p.x >= e.minX - margin && p.x <= e.maxX + margin && p.z >= e.minZ - margin && p.z <= e.maxZ + margin;
  const pondDistance = (p: Point) => {
    const { x, z, rx, rz, angle } = G.pond, dx = p.x - x, dz = p.z - z, u = dx * Math.cos(angle) + dz * Math.sin(angle), v = -dx * Math.sin(angle) + dz * Math.cos(angle);
    return (Math.hypot(u / rx, v / rz) - 1) * Math.min(rx, rz);
  };
  /** Paved or built-on ground (plazas, promenades, paths, courts, the pond and fountain); plants keep off it. */
  const paved = (p: Point, clearance = 0) => {
    const walk = fromWalk(p), quay = fromQuay(p);
    if (walk < G.bands.promenade + clearance && walk > G.bands.planting - clearance) return true;
    if (quay < G.bands.quay + clearance) return true;
    if (pathField(p.x, p.z) < 1.3 + clearance) return true;
    if (plazas.some(e => inBox(p, e, clearance)) || G.courts.some(c => inBox(p, courtBox(c), clearance))) return true;
    if (G.beds.some(b => Math.hypot((p.x - b.x) / (b.rx + 0.4 + clearance), (p.z - b.z) / (b.rz + 0.4 + clearance)) < 1)) return true;
    return pondDistance(p) < 4.6 + clearance || Math.hypot(p.x - G.fountain.x, p.z - G.fountain.z) < G.fountain.r + clearance;
  };

  // Seabed, beach and headlands.
  const shoreHeight = (x: number, z: number) => {
    let h = G.seabed;
    const B = G.beach;
    if (z < -78 && x > B.from - 12 && x < B.to + 12) {
      const w = smoothstep(B.from - 10, B.from + 4, x) * smoothstep(B.to + 10, B.to - 4, x), t = Math.max(0, -85 - z);
      const cusp = 0.06 * Math.sin(x / 7 + fbm2(x / 30, 1, 2, 5) * 3) * smoothstep(8, 14, t);
      const profile = -0.3 - 0.115 * t - 0.012 * t * t * smoothstep(12, 20, t) + 0.25 * fbm2(x / 18, t / 9, 2, 13) * smoothstep(1, 6, t) * (1 - smoothstep(10, 15, t)) + cusp;
      h = G.seabed + (Math.max(G.seabed, profile) - G.seabed) * w;
    }
    // Headlands: the seabed climbs to a low rocky shore, then grassy slopes rise inland.
    const inland = z - (148 + 9 * fbm2(x / 70, 0.5, 3, 61) + 5 * Math.sin(x / 47));
    if (inland > -7) {
      const cliff = (3 + 5 * (0.5 + 0.5 * fbm2(x / 40, 7, 2, 67))) * smoothstep(-1, 6, inland);
      const slopes = smoothstep(2, 80, inland) * (18 + 24 * (0.5 + 0.5 * fbm2(x / 110, z / 110, 4, 73))) + 5 * ridged2(x / 45, z / 45, 3, 79) * smoothstep(4, 30, inland);
      h += (cliff + slopes - h) * smoothstep(-7, 3, inland);
    }
    return h;
  };
  const shoreTint = (x: number, z: number, h: number, slope: number): Rgb => {
    const n = fbm2(x / 30, z / 30, 3, 83), fine = fbm2(x / 7, z / 7, 2, 89);
    if (h < G.water - 0.25) return z < -84 && x > G.beach.from - 12 && x < G.beach.to + 12 ? [0.55, 0.52, 0.42] : [0.36, 0.38, 0.34];
    if (z < 0) {
      // Beach: dry sand, a damp band and a wrack line above the water.
      const dry: Rgb = [0.83, 0.77, 0.62], wet: Rgb = [0.66, 0.6, 0.47];
      let c = mix(dry, wet, smoothstep(-1.45, -1.9, h));
      c = mix(c, [0.5, 0.45, 0.36], Math.exp(-(((h + 1.42) / 0.05) ** 2)) * 0.5);
      return scale(c, 1 + 0.05 * n + 0.03 * fine);
    }
    // Headlands: golden grass, dark coastal scrub in the folds, rock on the cliffs and at the water.
    let c: Rgb = mix([0.69, 0.62, 0.41], [0.76, 0.68, 0.46], 0.5 + 0.5 * fine);
    c = mix(c, [0.33, 0.39, 0.24], smoothstep(0.05, 0.35, n + 0.25 * ridged2(x / 45, z / 45, 3, 79) - 0.15) * 0.85);
    c = mix(c, [0.5, 0.45, 0.39], smoothstep(0.32, 0.6, slope));
    c = mix(c, [0.38, 0.35, 0.31], smoothstep(1.5, -1.2, h));
    return scale(c, 1 + 0.04 * fine);
  };
  const height = (x: number, z: number) => (onLand({ x, z }) ? G.level : shoreHeight(x, z));

  let scattered: ReturnType<typeof scatterGolden> | null = null;
  const scatterGolden = () => {
    const tools = scatterTools({ visible: G.visible, corridor: G.corridor, D, height, barriers: track.barriers, blocked: (p, clearance) => !onLand(p) || fromSea(p) < 0.4 + clearance || fromQuay(p) < 0.4 + clearance || paved(p, clearance) }, extent, 7171);
    const { rand, loose, plants } = tools;
    const visible = (p: Point) => G.views.some(v => p.x >= v.minX && p.x <= v.maxX && p.z >= v.minZ && p.z <= v.maxZ);
    const clearOfCourse = (p: Point, minD: number) => D(p.x, p.z) >= minD + 2 || D.exact(p.x, p.z) >= minD;
    // Riprap: granite blocks in three rows at the foot of every seawall that is not beach.
    for (const [a, b] of seaEdges) {
      const len = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
      const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, out = onLand({ x: mid.x - uz, z: mid.z + ux }) ? -1 : 1; // Outward normal: (-uz, ux) * out.
      // The first row (scanned boulders, about 0.37 x their size tall, and quarried blocks) reaches near the
      // coping; low-poly blocks fill the rows below, the last just breaking the water.
      for (const [row, spacing, reach, base, size] of [[0, 1.5, 1.3, -1.5, [2, 2.8]], [1, 1.7, 3, -2.45, [1.5, 2]], [2, 2.1, 4.6, -2.8, [1.2, 1.6]]] as const) {
        for (let s = rand() * spacing; s < len; s += spacing * (0.8 + rand() * 0.4)) {
          const along = { x: a.x + ux * s, z: a.z + uz * s };
          const p = { x: along.x - uz * out * (reach + (rand() - 0.5) * 0.8), z: along.z + ux * out * (reach + (rand() - 0.5) * 0.8) };
          // The beach replaces riprap along the south shore; the land's corners need none outside the views.
          if (!visible(p) || (p.z < -85 && p.x > G.beach.from - 2 && p.x < G.beach.to + 2) || (row === 2 && rand() < 0.35)) continue;
          const sz = size[0] + rand() * (size[1] - size[0]), scan = row === 0 && rand() < 0.45;
          loose.push({ x: p.x, y: (scan ? base : row === 0 ? -2.4 : base) - rand() * 0.15, z: p.z, size: sz, heading: rand() * Math.PI * 2, seed: loose.length * 13 + 7, kind: scan ? 'boulder' : 'block' });
        }
      }
    }
    // A few granite boulders on the lawns and at the lagoon's edge.
    for (let k = 0, made = 0; k < 400 && made < 6; k++) {
      const c = tools.anywhere(); if (!tools.open(c, 4, G.corridor + 8)) continue;
      for (let j = 0, n = 2 + Math.floor(rand() * 2); j < n; j++) { const a = rand() * Math.PI * 2, r = j ? 0.9 + rand() * 1.2 : 0, s = j ? 0.5 + rand() * 0.5 : 1.2 + rand() * 0.5; tools.addRock({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }, s, s > 0.9 ? 'boulder' : 'pebble', G.corridor + 8); }
      made++;
    }
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + rand() * 0.4, { x, z, rx, rz, angle } = G.pond, u = Math.cos(a) * (rx + 1.1), v = Math.sin(a) * (rz + 1.1);
      if (rand() < 0.7) loose.push({ x: x + u * Math.cos(angle) - v * Math.sin(angle), y: G.level, z: z + u * Math.sin(angle) + v * Math.cos(angle), size: 0.5 + rand() * 0.6, heading: rand() * 6.28, seed: loose.length * 13 + 7, kind: 'pebble' });
    }
    // Ice plant along the seawalls' planting strip, with gaps.
    for (const [a, b] of seaEdges) {
      const len = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
      const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, inward = onLand({ x: mid.x - uz, z: mid.z + ux }) ? 1 : -1;
      for (let s = 0.8; s < len - 0.8; s += 1.7 + rand() * 0.8) {
        if (fbm2(s / 9, a.x + a.z, 2, 101) < -0.25) continue;
        const depth = G.bands.coping + 0.5 + rand() * (G.bands.planting - G.bands.coping - 1), p = { x: a.x + ux * s - uz * inward * depth, z: a.z + uz * s + ux * inward * depth };
        if (visible(p) && clearOfCourse(p, G.corridor) && !track.barriers.some(br => insidePolygon(p, br.footprint)) && !plazas.some(e => inBox(p, e, 0.5))) tools.addPlant(p, 'iceplant', 1.5 + rand() * 0.9);
      }
    }
    // Palms: along the south seawall and both inlet quays (Embarcadero style).
    const palm = (p: Point) => {
      const h = 8 + rand() * 3;
      if (!visible(p) || !clearOfCourse(p, Math.max(G.corridor + 6, 8 + 1.5 * h)) || track.barriers.some(br => edgeDistance(p, br.footprint) < 3 || insidePolygon(p, br.footprint))) return;
      tools.addPlant(p, 'palm', h);
    };
    for (let x = -116; x <= 116; x += 11 + rand() * 1.5) palm({ x, z: -85 + 1.6 });
    for (const side of [-1, 1]) for (let z = 76; z <= 110; z += 9.5) palm({ x: side * (43 + G.bands.quay + 0.9), z });
    // Monterey cypress: groves on the west and east lawns and in the parks, a windbreak behind the skyline block.
    const cypress = (p: Point, h: number) => {
      if (!visible(p) || !onLand(p) || paved(p, 1.5) || fromWalk(p) < G.bands.promenade + 1.5 || fromSea(p) < 2.5 || !clearOfCourse(p, Math.max(G.corridor + 6, 8 + 1.5 * h)) || blockField(p.x, p.z) < 3) return false;
      if (track.barriers.some(br => edgeDistance(p, br.footprint) < 3 || insidePolygon(p, br.footprint)) || plants.some(q => q.kind === 'cypress' && Math.hypot(q.x - p.x, q.z - p.z) < h * 0.75)) return false;
      tools.addPlant(p, 'cypress', h); return true;
    };
    const groves = [P(-111, -74), P(-112, -52), P(-110, 36), P(-112, 54), P(113, -74), P(110, -12), P(114, 40), P(112, 56), P(110, 98), P(60, 102), P(-6, -79), P(64, -79)];
    for (const c of groves) for (let i = 0, n = 3 + Math.floor(rand() * 3); i < n * 8 && plants.filter(q => q.kind === 'cypress' && Math.hypot(q.x - c.x, q.z - c.z) < 14).length < n; i++) {
      const a = rand() * Math.PI * 2, r = rand() * 8; cypress({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }, 6 + rand() * 4);
    }
    for (let x = -120; x <= -50; x += 7 + rand() * 3) cypress({ x, z: 111 + (rand() - 0.5) * 1.2 }, 6.5 + rand() * 3);
    // Shrubs: hedges along paths and plazas, clumps in garden patches; reeds at the lagoon; dune grass on the beach.
    tools.field(3.2, (p, d, roll) => {
      const path = pathField(p.x, p.z), edge = Math.exp(-(((path - 2.6) / 1) ** 2)), garden = smoothstep(0.15, 0.45, fbm2(p.x / 26, p.z / 26, 3, 113));
      const plaza = plazas.some(e => inBox(p, e, 2.4)) && !plazas.some(e => inBox(p, e, 0.6)) ? 1 : 0, pond = Math.exp(-(((pondDistance(p) - 2.4) / 1.4) ** 2));
      if (roll > 0.02 + 0.55 * edge + 0.5 * plaza + 0.25 * garden + 0.8 * pond) return null;
      if (pond > 0.4) return { kind: 'grass', size: 0.6 + rand() * 0.5 };
      return rand() < 0.8 ? { kind: 'shrub', size: 0.9 + rand() * 1.1, dryness: 0.1 * rand() } : { kind: 'grass', size: 0.5 + rand() * 0.4, dryness: 0.3 };
    }, 0.9);
    for (const bed of G.beds) for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.75, p = { x: bed.x + Math.cos(a) * r * bed.rx, z: bed.z + Math.sin(a) * r * bed.rz };
      if (clearOfCourse(p, G.corridor)) tools.addPlant(p, rand() < 0.5 ? 'shrub' : 'grass', 0.6 + rand() * 0.5);
    }
    for (let x = G.beach.from + 6; x < G.beach.to - 4; x += 1.6) {
      if (fbm2(x / 14, 3, 2, 127) < -0.1) continue;
      const p = { x: x + (rand() - 0.5) * 1.2, z: -86.2 - rand() * 5 };
      if (shoreHeight(p.x, p.z) > -1.3 && visible(p)) plants.push({ kind: 'dunegrass', x: p.x, y: shoreHeight(p.x, p.z), z: p.z, size: 0.7 + rand() * 0.6, heading: rand() * 6.28, seed: plants.length * 31 + 3, dryness: 0.2 + rand() * 0.4 });
    }
    return { loose: loose as LooseRock[], plants };
  };
  const scatter = () => (scattered ??= scatterGolden());
  return { extent, D, outline, seaEdges, walkEdges, quayEdges, onLand, fromSea, fromQuay, fromWalk, blocks, rocks, formations, paths, pathField, plazas, courtBox, pondDistance, paved, height, shoreHeight, shoreTint, scatter };
}
export type GoldenLayout = ReturnType<typeof goldenLayout>;

/** Builds the shore now; the city's painted map, rock and plants follow after the first frame (lazy chunk). */
export function buildGoldenGateLandscape(scene: Scene, track: TrackDefinition, materials: Map<string, StandardMaterial>, ground: StandardMaterial) {
  const { timings, timed } = stopwatch(), G = GOLDEN, layout = timed('layout', () => goldenLayout(track));
  const shore = new StandardMaterial('golden-shore', scene); shore.diffuseColor = Color3.White(); shore.specularColor.setAll(0.04); materials.set('golden-shore', shore);
  timed('terrain', () => buildTerrain('golden-shore', scene, { extent: G.shore, cell: G.shoreCell, height: layout.shoreHeight, color: layout.shoreTint }, shore, 1400));
  const { shadowCasters } = runLandscape(scene, materials, { name: 'golden-gate', props: 'launchsite', timings, load: async () => {
    const detail = await import('./golden-gate-detail'), { loose, plants } = timed('scatter', () => layout.scatter());
    return { generators: detail, paint: detail.paintInto(scene, track, layout, ground), formations: layout.formations, rock: G.rock, loose, plants, plantPalette: G.plants };
  } });
  return { shadowCasters };
}
