import type { SurfaceKind } from './themes';

// ---------------------------------------------------------------------------------------------
// Procedural, tileable detail maps. RG = surface slope (normal x/z), A = smooth tonal noise.
// Generated once per kind and size, then shared by every scene for the rest of the session.
// ---------------------------------------------------------------------------------------------

function lattice(cells: number, seed: number) {
  const values = new Float32Array(cells * cells);
  let state = seed >>> 0;
  for (let i = 0; i < values.length; i++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; values[i] = state / 4294967296; }
  return values;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Periodic value noise in [0, 1] on a cells x cells lattice; u, v in [0, 1). */
function noise(grid: Float32Array, cells: number, u: number, v: number) {
  const x = u * cells, y = v * cells, x0 = Math.floor(x) % cells, y0 = Math.floor(y) % cells, tx = smooth(x - Math.floor(x)), ty = smooth(y - Math.floor(y));
  const x1 = x0 + 1 === cells ? 0 : x0 + 1, r0 = y0 * cells, r1 = (y0 + 1 === cells ? 0 : y0 + 1) * cells;
  const a = grid[r0 + x0] + (grid[r0 + x1] - grid[r0 + x0]) * tx;
  const b = grid[r1 + x0] + (grid[r1 + x1] - grid[r1 + x0]) * tx;
  return a + (b - a) * ty;
}
function fbm(base: number, octaves: number, seed: number) {
  const grids = Array.from({ length: octaves }, (_, i) => ({ cells: base << i, grid: lattice(base << i, seed + i * 7919) }));
  return (u: number, v: number) => { let sum = 0, weight = 1, total = 0; for (const { cells, grid } of grids) { sum += noise(grid, cells, u, v) * weight; total += weight; weight *= 0.5; } return sum / total; };
}
/** Jittered-grid nearest-point distance (0 at a feature point) for stones and pebbles. */
function cellular(cells: number, seed: number) {
  const jitter = lattice(cells, seed), jitter2 = lattice(cells, seed + 1);
  return (u: number, v: number) => {
    const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y); let best = 9;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const cx = ix + ox, cy = iy + oy, k = (((cy % cells) + cells) % cells) * cells + (((cx % cells) + cells) % cells);
      const dx = cx + jitter[k] - x, dy = cy + jitter2[k] - y; best = Math.min(best, dx * dx + dy * dy);
    }
    return Math.sqrt(best);
  };
}
const TAU = Math.PI * 2;

interface DetailRecipe { height: (u: number, v: number) => number; tone: (u: number, v: number) => number; relief: number }
/**
 * Height recipes sized for the fixed whole-course camera (roughly 0.2-0.4 m per screen pixel):
 * the visible features are metre-scale ripples, clumps and swell, not millimetre grain.
 */
function recipe(kind: SurfaceKind): DetailRecipe {
  const tone = fbm(3, 4, 911);
  switch (kind) {
    case 'asphalt': {
      const patches = fbm(6, 3, 17), grain = fbm(24, 2, 23);
      return { relief: 1.2, tone, height: (u, v) => 0.6 * grain(u, v) + 0.4 * patches(u, v) };
    }
    case 'sand': {
      // Wind ripples about 2 m apart, bent by a slow warp, over gentle dune swell.
      const warp = fbm(3, 3, 41), swell = fbm(2, 3, 43), grain = fbm(32, 1, 47), fade = fbm(4, 2, 49);
      return { relief: 2.2, tone, height: (u, v) => 0.45 * (0.5 + 0.5 * Math.sin(TAU * (v * 12 + u * 2 + warp(u, v) * 3.2))) ** 1.5 * (0.35 + 0.65 * fade(u, v)) + 0.4 * swell(u, v) + 0.15 * grain(u, v) };
    }
    case 'dirt': {
      const lumps = fbm(8, 3, 61), stones = cellular(20, 67);
      return { relief: 2.4, tone, height: (u, v) => 0.7 * lumps(u, v) + 0.3 * Math.max(0, 1 - stones(u, v) / 0.45) ** 2 };
    }
    case 'concrete': {
      const pores = fbm(24, 2, 83), broad = fbm(4, 2, 89);
      return { relief: 0.8, tone, height: (u, v) => 0.6 * pores(u, v) + 0.4 * broad(u, v) };
    }
    case 'grass': {
      const tufts = fbm(20, 2, 101), clumps = fbm(6, 3, 103);
      return { relief: 2.6, tone, height: (u, v) => 0.55 * tufts(u, v) + 0.45 * clumps(u, v) };
    }
    case 'rock': {
      const ridges = fbm(4, 4, 131), strata = fbm(2, 2, 137);
      return { relief: 3, tone, height: (u, v) => { const r = 1 - Math.abs(ridges(u, v) * 2 - 1); return 0.6 * r * r + 0.4 * (0.5 + 0.5 * Math.sin(TAU * (v * 7 + strata(u, v) * 1.5))); } };
    }
    case 'water': {
      // Integer wave numbers keep the tile seamless; the shader scrolls two layers of it.
      const chop = fbm(5, 3, 151), waves = [[3, 1, 0.3], [-2, 4, 1.7], [5, -2, 2.9], [1, 7, 4.1], [-6, -3, 5.3], [8, 5, 0.9]] as const;
      return { relief: 1.5, tone: fbm(2, 3, 157), height: (u, v) => waves.reduce((h, [a, b, p], i) => h + Math.sin(TAU * (a * u + b * v) + p) / (i + 1.5), 0) * 0.3 + chop(u, v) * 0.7 };
    }
  }
}

const detailPixels = new Map<string, Uint8Array>();
/** RGBA8 detail map: RG = encoded normal x/z, B = height, A = tone. Cached for the session. */
export function detailMap(kind: SurfaceKind, size: number) {
  const key = `${kind}:${size}`, cached = detailPixels.get(key); if (cached) return cached;
  const { height, tone, relief } = recipe(kind), h = new Float32Array(size * size), pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = height((x + 0.5) / size, (y + 0.5) / size);
  let lo = Infinity, hi = -Infinity; for (const value of h) { lo = Math.min(lo, value); hi = Math.max(hi, value); }
  const range = hi - lo || 1, k = relief * size / 256 / range;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (dx: number, dy: number) => h[((y + dy + size) % size) * size + ((x + dx + size) % size)];
    const sx = (at(1, 0) - at(-1, 0)) * k, sz = (at(0, 1) - at(0, -1)) * k, length = Math.hypot(sx, 1, sz);
    const o = (y * size + x) * 4;
    pixels[o] = Math.round((0.5 - 0.5 * sx / length) * 255); pixels[o + 1] = Math.round((0.5 - 0.5 * sz / length) * 255);
    pixels[o + 2] = Math.round((h[y * size + x] - lo) / range * 255); pixels[o + 3] = Math.round(Math.min(1, Math.max(0, tone((x + 0.5) / size, (y + 0.5) / size))) * 255);
  }
  detailPixels.set(key, pixels); return pixels;
}

/** Neutral tile (flat normal, mid tone) shown until a generated tile arrives. */
export function neutralDetailMap(size: number) { return new Uint8Array(size * size * 4).fill(128); }

let worker: Worker | null | undefined, nextId = 0;
const pending = new Map<number, (pixels: Uint8Array) => void>(), requested = new Map<string, Promise<Uint8Array>>();
/**
 * Detail tile generated on a worker so venue loading never stalls the main thread
 * (a tile takes tens of milliseconds); falls back to inline generation without workers.
 */
export function requestDetailMap(kind: SurfaceKind, size: number): Promise<Uint8Array> {
  const key = `${kind}:${size}`, existing = requested.get(key); if (existing) return existing;
  if (worker === undefined) {
    try {
      worker = typeof Worker === 'undefined' ? null : new Worker(new URL('./surface-maps.worker.ts', import.meta.url), { type: 'module' });
      worker?.addEventListener('message', (event: MessageEvent<{ id: number; pixels: Uint8Array }>) => { pending.get(event.data.id)?.(event.data.pixels); pending.delete(event.data.id); });
      worker?.addEventListener('error', () => { worker = null; for (const [id, resolve] of pending) { pending.delete(id); resolve(new Uint8Array(0)); } });
    } catch { worker = null; }
  }
  const promise = worker
    ? new Promise<Uint8Array>(resolve => { const id = ++nextId; pending.set(id, resolve); worker!.postMessage({ id, kind, size }); }).then(pixels => pixels.length ? pixels : detailMap(kind, size))
    : Promise.resolve().then(() => detailMap(kind, size));
  requested.set(key, promise); return promise;
}
