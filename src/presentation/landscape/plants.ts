import { boulder } from './rocks';
import { Geometry, mix, scale, type Rgb } from './mesh';
import { fbm3, random } from './noise';

/**
 * Plants as merged, vertex-coloured low-poly clumps (presentation only). At the game's camera
 * distance a shrub covers a handful of pixels, so shape and colour carry it. Desert: dark domed
 * creosote, pale bursage and sage, bunch grass, golden cholla, agave and yucca rosettes, junipers and
 * Joshua trees. Coast and city: Monterey cypress, garden shrubs, ice plant mats, dune grass and palms.
 */
export type PlantKind = 'creosote' | 'bursage' | 'grass' | 'cholla' | 'joshua' | 'deadwood'
  | 'juniper' | 'sage' | 'agave' | 'yucca' | 'cypress' | 'shrub' | 'iceplant' | 'dunegrass' | 'palm';
/** Colours per kind ([deep, tip] pairs or one tone); a venue lists only the kinds it grows. */
export interface PlantPalette {
  dry: Rgb;
  creosote?: [Rgb, Rgb]; bursage?: Rgb; grass?: [Rgb, Rgb]; cholla?: Rgb; joshuaLeaf?: Rgb; joshuaTrunk?: Rgb;
  juniper?: [Rgb, Rgb]; sage?: Rgb; agave?: [Rgb, Rgb]; cypress?: [Rgb, Rgb]; shrub?: [Rgb, Rgb];
  iceplant?: [Rgb, Rgb]; dunegrass?: [Rgb, Rgb]; palm?: [Rgb, Rgb]; bark?: Rgb;
}
/** size: width for shrubs and mats, height for trees (juniper, cypress, palm, joshua, yucca). */
export interface Plant { kind: PlantKind; x: number; y: number; z: number; size: number; heading: number; seed: number; /** 0 fresh .. 1 dry. */ dryness?: number }

const need = <T>(value: T | undefined, kind: string): T => { if (value === undefined) throw new Error(`Plant palette has no ${kind}`); return value; };

/** A lumpy blob (icosahedron) for foliage. */
function clump(size: [number, number, number], seed: number, colour: (y: number, up: number) => Rgb, detail = 0) {
  return boulder({ size, seed, roundness: 2, detail, roughness: 0.28, flatten: 0.55, colour: (_x, y, _z, up, height) => colour(y / height, up) });
}
/** A tapered limb (trunk or branch) between two points. */
function limb(g: Geometry, from: [number, number, number], to: [number, number, number], r0: number, r1: number, colour: (t: number, side: number) => Rgb, segments = 5) {
  const part = new Geometry(), [x0, y0, z0] = from, dx = to[0] - x0, dy = to[1] - y0, dz = to[2] - z0, len = Math.hypot(dx, dy, dz) || 1;
  const ax = dx / len, ay = dy / len, az = dz / len, ux0 = Math.abs(ay) < 0.9 ? 0 : 1, uy0 = Math.abs(ay) < 0.9 ? 1 : 0;
  let ux = uy0 * az, uy = -ux0 * az, uz = ux0 * ay - uy0 * ax; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
  const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
  const ring = (t: number, r: number) => Array.from({ length: segments }, (_, i) => {
    const a = i / segments * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
    return part.vertex(x0 + dx * t + ux * ca + vx * sa, y0 + dy * t + uy * ca + vy * sa, z0 + dz * t + uz * ca + vz * sa, colour(t, i % 2));
  });
  const a = ring(0, r0), b = ring(1, r1);
  for (let i = 0; i < segments; i++) { const j = (i + 1) % segments; part.triangle(a[i], b[i], a[j]); part.triangle(a[j], b[i], b[j]); }
  g.append(part);
}
/** A thin pointed leaf or frond (two triangles; the plant material is double-sided). */
function blade(g: Geometry, base: [number, number, number], tip: [number, number, number], width: number, root: Rgb, end: Rgb, bend = 0) {
  const dx = tip[0] - base[0], dz = tip[2] - base[2], l = Math.hypot(dx, dz) || 1, sx = -dz / l * width / 2, sz = dx / l * width / 2;
  const mid: [number, number, number] = [base[0] + dx * 0.55, base[1] + (tip[1] - base[1]) * 0.55 + bend, base[2] + dz * 0.55];
  const a = g.vertex(base[0] + sx, base[1], base[2] + sz, root), b = g.vertex(base[0] - sx, base[1], base[2] - sz, root);
  const c = g.vertex(mid[0] + sx, mid[1], mid[2] + sz, mix(root, end, 0.5)), d = g.vertex(mid[0] - sx, mid[1], mid[2] - sz, mix(root, end, 0.5)), e = g.vertex(tip[0], tip[1], tip[2], end);
  g.triangle(a, c, b); g.triangle(b, c, d); g.triangle(c, e, d);
}

/** Unit-size templates (several per kind), coloured fresh; plants scale, turn and dry them per instance. */
const templateCache = new WeakMap<PlantPalette, Map<PlantKind, Geometry[]>>();
function templates(palette: PlantPalette, kind: PlantKind): Geometry[] {
  let byKind = templateCache.get(palette); if (!byKind) { byKind = new Map(); templateCache.set(palette, byKind); }
  const cached = byKind.get(kind); if (cached) return cached;
  const list: Geometry[] = [];
  for (let v = 0; v < 8; v++) {
    const g = new Geometry(), rand = random(v * 977 + kind.length * 31 + kind.charCodeAt(0));
    const lump = (size: [number, number, number], at: [number, number, number], colour: (y: number, up: number) => Rgb, detail = 0) => g.instance(clump(size, v * 13 + g.vertexCount, colour, detail), { x: at[0], y: at[1], z: at[2], heading: rand() * 6.28 });
    const crown = (deep: Rgb, tip: Rgb) => (y: number, up: number) => scale(mix(deep, tip, Math.min(1, Math.max(0, y * 0.7 + up * 0.35 + 0.1 * fbm3(y * 3, v, 1, 2)))), 0.8 + 0.2 * y);
    const bark = palette.bark ?? scale(palette.dry, 0.75);
    if (kind === 'creosote' || kind === 'bursage' || kind === 'sage' || kind === 'shrub') {
      const [deep, tip] = kind === 'creosote' ? need(palette.creosote, kind) : kind === 'shrub' ? need(palette.shrub, kind) : [scale(need(kind === 'sage' ? palette.sage : palette.bursage, kind), 0.82), need(kind === 'sage' ? palette.sage : palette.bursage, kind)];
      const lumps = kind === 'creosote' ? 3 + Math.floor(rand() * 2) : kind === 'shrub' ? 2 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 2);
      for (let i = 0; i < lumps; i++) {
        const a = rand() * Math.PI * 2, r = i === 0 ? 0 : 0.22 + rand() * 0.18, w = i === 0 ? 0.75 : 0.45 + rand() * 0.25, h = w * (kind === 'creosote' ? 0.95 + rand() * 0.3 : kind === 'shrub' ? 0.85 : 0.7);
        lump([w, h, w * (0.85 + rand() * 0.3)], [Math.cos(a) * r, (i === 0 ? 0 : 0.12 * rand()) - 0.05, Math.sin(a) * r], crown(deep, tip));
      }
    } else if (kind === 'grass' || kind === 'dunegrass') {
      // Bunch grass: a tuft, straw over green; dune grass is taller and greener.
      const [green, straw] = need(kind === 'grass' ? palette.grass : palette.dunegrass, kind), tall = kind === 'dunegrass' ? 1.35 : 1;
      const base: [number, number, number] = kind === 'grass' ? [1, 0.55, 0.9] : [0.62, 0.26, 0.58];
      lump(base, [0, -0.04, 0], (y, up) => scale(mix(green, straw, (kind === 'grass' ? 0.4 : 0.15) + y * 0.5), 0.8 + 0.25 * y + 0.05 * up));
      // Marram: a fountain of long, thin leaves over a low tussock.
      if (kind === 'dunegrass') for (let i = 0; i < 13; i++) { const a = i / 13 * 6.28 + rand() * 0.4, r = 0.2 + rand() * 0.3; blade(g, [Math.cos(a) * 0.12, 0.12, Math.sin(a) * 0.12], [Math.cos(a) * r * 1.7, (0.6 + rand() * 0.4) * tall, Math.sin(a) * r * 1.7], 0.05, green, straw, 0.07); }
    } else if (kind === 'cholla') {
      const c = need(palette.cholla, kind);
      for (let i = 0; i < 3; i++) lump([0.5 - i * 0.1, 0.5, 0.45 - i * 0.08], [(rand() - 0.5) * 0.4, 0.25 * i, (rand() - 0.5) * 0.4], (y, up) => scale(c, 0.85 + 0.25 * y + 0.08 * up));
    } else if (kind === 'deadwood') {
      lump([1, 0.12, 0.14], [0, -0.02, 0], () => scale(palette.dry, 1.05));
    } else if (kind === 'agave' || kind === 'yucca') {
      // A rosette of stiff pointed leaves; yucca stands on a short shaggy trunk.
      const [deep, tip] = need(palette.agave, kind), stem = kind === 'yucca' ? 0.35 + rand() * 0.2 : 0;
      if (stem) limb(g, [0, -0.05, 0], [(rand() - 0.5) * 0.1, stem, (rand() - 0.5) * 0.1], 0.07, 0.06, (t, side) => mix(bark, palette.dry, 0.3 * side + 0.2 * t));
      const leaves = kind === 'agave' ? 10 + Math.floor(rand() * 4) : 16;
      for (let i = 0; i < leaves; i++) {
        const a = i / leaves * Math.PI * 2 + rand() * 0.3, up = kind === 'agave' ? 0.15 + rand() * 0.45 : 0.1 + rand() * 0.6, len = kind === 'agave' ? 0.5 : 0.35, r = len * Math.sqrt(1 - up * up);
        blade(g, [0, stem, 0], [Math.cos(a) * r, stem + len * up + 0.08, Math.sin(a) * r], kind === 'agave' ? 0.13 : 0.05, deep, tip, kind === 'agave' ? 0.04 : 0.02);
      }
    } else if (kind === 'juniper') {
      // Utah juniper: a short twisted trunk under an irregular, dense blue-green crown.
      const [deep, tip] = need(palette.juniper, kind), lean = (rand() - 0.5) * 0.25;
      limb(g, [0, -0.05, 0], [lean, 0.38, (rand() - 0.5) * 0.15], 0.07, 0.05, (t, side) => mix(bark, palette.dry, 0.35 * side + 0.15 * t));
      for (let i = 0, n = 4 + Math.floor(rand() * 3); i < n; i++) {
        const a = rand() * Math.PI * 2, r = i === 0 ? 0 : 0.15 + rand() * 0.18, w = 0.38 + rand() * 0.22;
        lump([w, w * (0.75 + rand() * 0.3), w], [lean * 0.8 + Math.cos(a) * r, 0.32 + rand() * 0.35, Math.sin(a) * r], crown(deep, tip));
      }
    } else if (kind === 'cypress') {
      // Monterey cypress: a leaning trunk and a broad, flat-topped, wind-swept canopy.
      const [deep, tip] = need(palette.cypress, kind), lean = 0.12 + rand() * 0.15;
      limb(g, [0, -0.05, 0], [lean, 0.55, 0], 0.05, 0.035, (t, side) => mix(bark, palette.dry, 0.3 * side + 0.15 * t));
      limb(g, [lean * 0.6, 0.35, 0], [lean + 0.25, 0.62, 0.12], 0.03, 0.02, () => bark);
      for (let i = 0, n = 5 + Math.floor(rand() * 3); i < n; i++) {
        const x = lean + (rand() - 0.3) * 0.75, z = (rand() - 0.5) * 0.45, w = 0.32 + rand() * 0.25;
        lump([w * 1.3, w * 0.5, w], [x, 0.58 + rand() * 0.22 - Math.abs(x - lean) * 0.25, z], crown(deep, tip));
      }
    } else if (kind === 'iceplant') {
      // Ice plant: a low succulent mat, green with pink flowers.
      const [green, flower] = need(palette.iceplant, kind);
      for (let i = 0; i < 4; i++) {
        const a = rand() * 6.28, r = i === 0 ? 0 : 0.25 + rand() * 0.15;
        lump([0.6 + rand() * 0.3, 0.12, 0.5 + rand() * 0.3], [Math.cos(a) * r, -0.03, Math.sin(a) * r], (y, up) => fbm3(up * 4, y * 7, i + v, 2) > 0.18 ? flower : scale(green, 0.85 + 0.25 * y));
      }
    } else if (kind === 'palm') {
      // A tall, slightly curved trunk with drooping fronds and a dark crown knot.
      // Grey-brown trunk; a dense crown of arching fronds (a lower drooping ring, an upper rising one).
      const [deep, tip] = need(palette.palm, kind), bend = (rand() - 0.5) * 0.12, trunk = (t: number, side: number) => mix(bark, palette.dry, 0.4 + 0.2 * side + 0.1 * t);
      limb(g, [0, -0.05, 0], [bend * 0.5, 0.5, 0], 0.027, 0.021, trunk, 6);
      limb(g, [bend * 0.5, 0.5, 0], [bend, 0.95, 0], 0.021, 0.019, trunk, 6);
      lump([0.1, 0.09, 0.1], [bend, 0.92, 0], () => scale(deep, 0.75));
      for (let i = 0; i < 18; i++) {
        const low = i < 11, a = (low ? i / 11 : (i - 11) / 7) * Math.PI * 2 + rand() * 0.35 + (low ? 0 : 0.3), len = low ? 0.26 + rand() * 0.08 : 0.2 + rand() * 0.06;
        blade(g, [bend, 0.96, 0], [bend + Math.cos(a) * len, low ? 0.86 - rand() * 0.06 : 1.04 + rand() * 0.04, Math.sin(a) * len], low ? 0.1 : 0.08, deep, tip, low ? 0.07 : 0.03);
      }
    }
    list.push(g.withNormals());
  }
  byKind.set(kind, list); return list;
}

export function plantGeometry(plants: readonly Plant[], palette: PlantPalette): Geometry {
  const g = new Geometry();
  for (const p of plants) {
    const rand = random(p.seed * 4099 + 17);
    if (p.kind === 'joshua') { joshua(g, p, palette, rand); continue; }
    const variants = templates(palette, p.kind), template = variants[p.seed % variants.length], s = p.size;
    const dry = (p.dryness ?? 0) * (p.kind === 'cholla' || p.kind === 'palm' ? 0.4 : p.kind === 'grass' ? 0.6 : 0.7), bright = 0.92 + rand() * 0.16;
    g.instance(template, { x: p.x, y: p.y, z: p.z, heading: p.heading, scale: [s * (0.9 + rand() * 0.2), s * (0.85 + rand() * 0.3), s * (0.9 + rand() * 0.2)] }, c => mix(scale(c, bright), palette.dry, dry));
  }
  return g;
}

/** Joshua tree: a shaggy trunk that forks twice, each arm ending in a spiky rosette. */
function joshua(g: Geometry, p: Plant, palette: PlantPalette, rand: () => number) {
  const s = p.size, trunk = need(palette.joshuaTrunk, 'joshua'), leaf = need(palette.joshuaLeaf, 'joshua'), shaggy = mix(trunk, palette.dry, 0.45);
  const branch = (from: [number, number, number], to: [number, number, number], r0: number, r1: number, segments = 5) => limb(g, from, to, r0, r1, (t, side) => mix(trunk, shaggy, side * 0.5 + t * 0.3), segments);
  const rosette = (x: number, y: number, z: number, r: number, seed: number) => {
    // Spiky star: an icosahedron with alternate vertices pushed out, dark green with yellowed tips.
    const part = boulder({ size: [r * 2, r * 1.7, r * 2], seed, roundness: 2, detail: 0, roughness: 0.5, flatten: 0.9, colour: (_x, yy, _z, up, h) => mix(scale(leaf, 0.75 + 0.35 * yy / h), palette.dry, Math.max(0, -up) * 0.35) });
    for (let i = 0; i < part.vertexCount; i += 2) { part.positions[i * 3] *= 1.35; part.positions[i * 3 + 2] *= 1.35; }
    g.instance(part, { x, y: y - r * 0.8, z, heading: rand() * 6.28 });
  };
  const h1 = s * (0.45 + rand() * 0.15), lean = (rand() - 0.5) * 0.3;
  const top: [number, number, number] = [p.x + lean * h1, p.y + h1, p.z + (rand() - 0.5) * 0.3 * h1];
  branch([p.x, p.y - 0.2, p.z], top, s * 0.07, s * 0.055, 6);
  const arms = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < arms; i++) {
    const a = p.heading + i / arms * Math.PI * 2 + rand() * 0.8, out = s * (0.18 + rand() * 0.12), up = s * (0.2 + rand() * 0.15);
    const mid: [number, number, number] = [top[0] + Math.cos(a) * out, top[1] + up, top[2] + Math.sin(a) * out];
    branch([top[0], top[1] - 0.1, top[2]], mid, s * 0.05, s * 0.04);
    if (rand() < 0.55) {
      const b = a + (rand() - 0.5) * 1.6, end: [number, number, number] = [mid[0] + Math.cos(b) * out * 0.6, mid[1] + up * 0.6, mid[2] + Math.sin(b) * out * 0.6];
      branch([mid[0], mid[1] - 0.05, mid[2]], end, s * 0.04, s * 0.032);
      rosette(end[0], end[1], end[2], s * 0.11, p.seed * 11 + i * 2 + 1);
    }
    rosette(mid[0], mid[1], mid[2], s * 0.12, p.seed * 11 + i * 2);
  }
}
