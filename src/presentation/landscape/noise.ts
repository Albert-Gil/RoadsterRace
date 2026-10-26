/**
 * Small deterministic noise kit for procedural landscape (presentation only).
 * Gradient noise in 2D/3D (roughly -1..1), fractal sums, ridges and a seeded random stream.
 */
const hash = (x: number, y: number, z: number, seed: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245); return (h ^ (h >>> 16)) >>> 0;
};
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const GX = new Float64Array([1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0]), GY = new Float64Array([1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1]), GZ = new Float64Array([0, 0, 0, 0, 1, 1, -1, -1, 1, 1, -1, -1]);
const G2X = new Float64Array(256), G2Y = new Float64Array(256);
for (let i = 0; i < 256; i++) { G2X[i] = Math.cos(i / 256 * Math.PI * 2); G2Y[i] = Math.sin(i / 256 * Math.PI * 2); }

export function noise2(x: number, y: number, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fade(fx), v = fade(fy);
  const a = hash(ix, iy, 0, seed) & 255, b = hash(ix + 1, iy, 0, seed) & 255, c = hash(ix, iy + 1, 0, seed) & 255, d = hash(ix + 1, iy + 1, 0, seed) & 255;
  const n00 = G2X[a] * fx + G2Y[a] * fy, n10 = G2X[b] * (fx - 1) + G2Y[b] * fy, n01 = G2X[c] * fx + G2Y[c] * (fy - 1), n11 = G2X[d] * (fx - 1) + G2Y[d] * (fy - 1);
  return 1.4 * lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}
export function noise3(x: number, y: number, z: number, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fade(fx), v = fade(fy), w = fade(fz);
  let h = hash(ix, iy, iz, seed) % 12; const n000 = GX[h] * fx + GY[h] * fy + GZ[h] * fz;
  h = hash(ix + 1, iy, iz, seed) % 12; const n100 = GX[h] * (fx - 1) + GY[h] * fy + GZ[h] * fz;
  h = hash(ix, iy + 1, iz, seed) % 12; const n010 = GX[h] * fx + GY[h] * (fy - 1) + GZ[h] * fz;
  h = hash(ix + 1, iy + 1, iz, seed) % 12; const n110 = GX[h] * (fx - 1) + GY[h] * (fy - 1) + GZ[h] * fz;
  h = hash(ix, iy, iz + 1, seed) % 12; const n001 = GX[h] * fx + GY[h] * fy + GZ[h] * (fz - 1);
  h = hash(ix + 1, iy, iz + 1, seed) % 12; const n101 = GX[h] * (fx - 1) + GY[h] * fy + GZ[h] * (fz - 1);
  h = hash(ix, iy + 1, iz + 1, seed) % 12; const n011 = GX[h] * fx + GY[h] * (fy - 1) + GZ[h] * (fz - 1);
  h = hash(ix + 1, iy + 1, iz + 1, seed) % 12; const n111 = GX[h] * (fx - 1) + GY[h] * (fy - 1) + GZ[h] * (fz - 1);
  return lerp(lerp(lerp(n000, n100, u), lerp(n010, n110, u), v), lerp(lerp(n001, n101, u), lerp(n011, n111, u), v), w);
}
/** Fractal sum, normalised to roughly -1..1. */
export function fbm2(x: number, y: number, octaves = 4, seed = 0, lacunarity = 2.03, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0;
  for (let i = 0; i < octaves; i++) { sum += noise2(x, y, seed + i * 131) * amp; norm += amp; amp *= gain; x *= lacunarity; y *= lacunarity; }
  return sum / norm;
}
export function fbm3(x: number, y: number, z: number, octaves = 4, seed = 0) {
  let sum = 0, amp = 1, norm = 0;
  for (let i = 0; i < octaves; i++) { sum += noise3(x, y, z, seed + i * 131) * amp; norm += amp; amp *= 0.5; x *= 2.03; y *= 2.03; z *= 2.03; }
  return sum / norm;
}
/** Ridged fractal (0..1): sharp crests, like dune ridges or rock fractures. */
export function ridged2(x: number, y: number, octaves = 3, seed = 0) {
  let sum = 0, amp = 0.6, norm = 0;
  for (let i = 0; i < octaves; i++) { const n = 1 - Math.abs(noise2(x, y, seed + i * 977)); sum += n * n * amp; norm += amp; amp *= 0.5; x *= 2.1; y *= 2.1; }
  return sum / norm;
}
export const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Seeded uniform stream in [0, 1). */
export function random(seed: number) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
