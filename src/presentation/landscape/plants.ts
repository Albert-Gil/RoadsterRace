import { boulder } from './rocks';
import { Geometry, mix, scale, type Rgb } from './mesh';
import { fbm3, random } from './noise';

/**
 * Desert plants as merged, vertex-coloured low-poly clumps (presentation only). At the game's
 * camera distance a shrub covers a handful of pixels, so shape and colour carry it: dark domed
 * creosote, pale grey bursage, straw bunch grass, golden cholla and Joshua trees as landmarks.
 */
export type PlantKind = 'creosote' | 'bursage' | 'grass' | 'cholla' | 'joshua' | 'deadwood';
export interface PlantPalette { creosote: [Rgb, Rgb]; bursage: Rgb; grass: [Rgb, Rgb]; cholla: Rgb; joshuaLeaf: Rgb; joshuaTrunk: Rgb; dry: Rgb }
export interface Plant { kind: PlantKind; x: number; y: number; z: number; size: number; heading: number; seed: number; /** 0 fresh .. 1 dry. */ dryness?: number }

/** A lumpy blob (icosahedron) for foliage. */
function clump(size: [number, number, number], seed: number, colour: (y: number, up: number) => Rgb) {
  return boulder({ size, seed, roundness: 2, detail: 0, roughness: 0.28, flatten: 0.55, colour: (_x, y, _z, up, height) => colour(y / height, up) });
}

/** Unit-size shrub templates (several per kind), coloured fresh; plants scale, turn and dry them per instance. */
const templateCache = new WeakMap<PlantPalette, Map<PlantKind, Geometry[]>>();
function templates(palette: PlantPalette, kind: PlantKind): Geometry[] {
  let byKind = templateCache.get(palette); if (!byKind) { byKind = new Map(); templateCache.set(palette, byKind); }
  const cached = byKind.get(kind); if (cached) return cached;
  const list: Geometry[] = [];
  for (let v = 0; v < 8; v++) {
    const g = new Geometry(), rand = random(v * 977 + kind.length * 31);
    const lump = (size: [number, number, number], at: [number, number, number], colour: (y: number, up: number) => Rgb) => g.instance(clump(size, v * 13 + g.vertexCount, colour), { x: at[0], y: at[1], z: at[2], heading: rand() * 6.28 });
    if (kind === 'creosote' || kind === 'bursage') {
      const [deep, tip] = kind === 'creosote' ? palette.creosote : [scale(palette.bursage, 0.82), palette.bursage];
      const lumps = kind === 'creosote' ? 3 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 2);
      for (let i = 0; i < lumps; i++) {
        const a = rand() * Math.PI * 2, r = i === 0 ? 0 : 0.22 + rand() * 0.18, w = i === 0 ? 0.75 : 0.45 + rand() * 0.25, h = w * (kind === 'creosote' ? 0.95 + rand() * 0.3 : 0.7);
        lump([w, h, w * (0.85 + rand() * 0.3)], [Math.cos(a) * r, (i === 0 ? 0 : 0.12 * rand()) - 0.05, Math.sin(a) * r], (y, up) => scale(mix(deep, tip, Math.min(1, Math.max(0, y * 0.8 + up * 0.3 + 0.12 * fbm3(y * 3, i, v, 2)))), 0.78 + 0.22 * y));
      }
    } else if (kind === 'grass') {
      // Bunch grass: a low tuft, straw over green.
      const [green, straw] = palette.grass;
      lump([1, 0.55, 0.9], [0, -0.04, 0], (y, up) => scale(mix(green, straw, 0.4 + y * 0.5), 0.8 + 0.25 * y + 0.05 * up));
    } else if (kind === 'cholla') {
      for (let i = 0; i < 3; i++) lump([0.5 - i * 0.1, 0.5, 0.45 - i * 0.08], [(rand() - 0.5) * 0.4, 0.25 * i, (rand() - 0.5) * 0.4], (y, up) => scale(palette.cholla, 0.85 + 0.25 * y + 0.08 * up));
    } else {
      // Deadwood: a grey fallen branch lying on the ground.
      lump([1, 0.12, 0.14], [0, -0.02, 0], () => scale(palette.dry, 1.05));
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
    const dry = (p.dryness ?? 0) * (p.kind === 'cholla' ? 0.5 : p.kind === 'grass' ? 0.6 : 0.7), bright = 0.92 + rand() * 0.16;
    g.instance(template, { x: p.x, y: p.y, z: p.z, heading: p.heading, scale: [s * (0.9 + rand() * 0.2), s * (0.85 + rand() * 0.3), s * (0.9 + rand() * 0.2)] }, c => mix(scale(c, bright), palette.dry, dry));
  }
  return g;
}

/** Joshua tree: a shaggy trunk that forks twice, each arm ending in a spiky rosette. */
function joshua(g: Geometry, p: Plant, palette: PlantPalette, rand: () => number) {
  const s = p.size, trunk = palette.joshuaTrunk, shaggy = mix(palette.joshuaTrunk, palette.dry, 0.45);
  const limb = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r0: number, r1: number, segments = 5) => {
    const part = new Geometry(), dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, len = Math.hypot(dx, dy, dz);
    // Orthonormal frame around the limb axis.
    const ax = dx / len, ay = dy / len, az = dz / len, ux0 = Math.abs(ay) < 0.9 ? 0 : 1, uy0 = Math.abs(ay) < 0.9 ? 1 : 0;
    let ux = uy0 * az - 0 * ay, uy = 0 * ax - ux0 * az, uz = ux0 * ay - uy0 * ax; const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
    const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
    const ring = (t: number, r: number) => Array.from({ length: segments }, (_, i) => {
      const a = i / segments * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      return part.vertex(x0 + dx * t + ux * ca + vx * sa, y0 + dy * t + uy * ca + vy * sa, z0 + dz * t + uz * ca + vz * sa, mix(trunk, shaggy, (i % 2) * 0.5 + t * 0.3));
    });
    const a = ring(0, r0), b = ring(1, r1);
    for (let i = 0; i < segments; i++) { const j = (i + 1) % segments; part.triangle(a[i], b[i], a[j]); part.triangle(a[j], b[i], b[j]); }
    g.append(part);
  };
  const rosette = (x: number, y: number, z: number, r: number, seed: number) => {
    // Spiky star: an icosahedron with alternate vertices pushed out, dark green with yellowed tips.
    const part = boulder({ size: [r * 2, r * 1.7, r * 2], seed, roundness: 2, detail: 0, roughness: 0.5, flatten: 0.9, colour: (_x, yy, _z, up, h) => mix(scale(palette.joshuaLeaf, 0.75 + 0.35 * yy / h), palette.dry, Math.max(0, -up) * 0.35) });
    for (let i = 0; i < part.vertexCount; i += 2) { part.positions[i * 3] *= 1.35; part.positions[i * 3 + 2] *= 1.35; }
    g.instance(part, { x, y: y - r * 0.8, z, heading: rand() * 6.28 });
  };
  const h1 = s * (0.45 + rand() * 0.15), lean = (rand() - 0.5) * 0.3;
  const top = { x: p.x + lean * h1, y: p.y + h1, z: p.z + (rand() - 0.5) * 0.3 * h1 };
  limb(p.x, p.y - 0.2, p.z, top.x, top.y, top.z, s * 0.07, s * 0.055, 6);
  const arms = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < arms; i++) {
    const a = p.heading + i / arms * Math.PI * 2 + rand() * 0.8, out = s * (0.18 + rand() * 0.12), up = s * (0.2 + rand() * 0.15);
    const mid = { x: top.x + Math.cos(a) * out, y: top.y + up, z: top.z + Math.sin(a) * out };
    limb(top.x, top.y - 0.1, top.z, mid.x, mid.y, mid.z, s * 0.05, s * 0.04);
    if (rand() < 0.55) {
      const b = a + (rand() - 0.5) * 1.6, end = { x: mid.x + Math.cos(b) * out * 0.6, y: mid.y + up * 0.6, z: mid.z + Math.sin(b) * out * 0.6 };
      limb(mid.x, mid.y - 0.05, mid.z, end.x, end.y, end.z, s * 0.04, s * 0.032);
      rosette(end.x, end.y, end.z, s * 0.11, p.seed * 11 + i * 2 + 1);
    }
    rosette(mid.x, mid.y, mid.z, s * 0.12, p.seed * 11 + i * 2);
  }
}
