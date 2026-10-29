import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

/** Periodic value noise: irregular large-scale mottling without visible sine-wave bands. */
function mineralNoise(u: number, v: number, cells: number) {
  const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const hash = (a: number, b: number) => {
    let h = Math.imul((a % cells) + 17, 374761393) ^ Math.imul((b % cells) + 31, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const tx = smooth(x - ix), ty = smooth(y - iy);
  const a = hash(ix, iy) * (1 - tx) + hash(ix + 1, iy) * tx;
  const b = hash(ix, iy + 1) * (1 - tx) + hash(ix + 1, iy + 1) * tx;
  return (a * (1 - ty) + b * ty - .5) * 2;
}

/** Small original, seeded textures. They multiply theme colors; no network art dependency. */
export function surfaceTexture(scene: Scene, kind: 'asphalt' | 'sand' | 'snow' | 'water' | 'rubber' | 'gravel' | 'timber' | 'concrete' | 'sandstone') {
  const size = 256, texture = new DynamicTexture(`${kind}-grain`, size, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  const context = texture.getContext() as CanvasRenderingContext2D, pixels = new ImageData(size, size);
  let seed = 731;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const noise = random(), wave = Math.sin(x / size * Math.PI * 4 + Math.sin(y / size * Math.PI * 2) * 1.7);
    const broad = mineralNoise(x / size, y / size, 4) + mineralNoise(x / size, y / size, 12) * .4;
    const plank = (x % 32 < 2 ? 0.72 : 1) * (0.94 + Math.sin(Math.floor(x / 32) * 4.7) * 0.04);
    const strata = Math.sin(y / size * Math.PI * 28 + Math.sin(x / size * Math.PI * 4) * .8);
    const fineGrain = Math.sin(x * 1.9 + y * 2.1) * Math.sin(y * .9 - x * .7);
    const value = kind === 'sandstone' ? 224 + strata * 12 + broad * 4 + noise * 11 : kind === 'timber' ? (230 + Math.sin(y * 0.4 + Math.sin(x * 0.11) * 2) * 6 + noise * 12) * plank : kind === 'concrete' ? 229 + broad * 4 + noise * 17 : kind === 'gravel' ? 222 + broad * 14 + fineGrain * 6 + noise * 23 : kind === 'rubber' ? 210 : kind === 'water' ? 235 + wave * 1.2 + broad * 1.5 + noise : kind === 'sand' ? 225 + broad * 8 + noise * 13 : 207 + noise * 47;
    const offset = (y * size + x) * 4;
    const tone=kind==='snow'?240+broad*4+noise*8:value;
    pixels.data[offset] = tone * (kind === 'water' ? 0.9 : 1); pixels.data[offset + 1] = tone * (kind === 'water' ? 0.98 : 1); pixels.data[offset + 2] = tone;
    pixels.data[offset + 3] = kind === 'rubber' ? Math.max(0, Math.sin(y / size * Math.PI)) ** 3 * (0.35 + 0.65 * Math.sin(y / size * Math.PI * 24 + wave * 0.3) ** 8) * noise * 240 : 255;
  }
  context.putImageData(pixels, 0, 0);
  // Deterministic mineral flecks, pores and timber fasteners provide detail without large downloads.
  if (kind === 'gravel' || kind === 'concrete' || kind === 'sandstone') {
    for (let i = 0; i < (kind === 'gravel' ? 650 : 170); i++) {
      const x = random() * size, y = random() * size, radius = .25 + random() * (kind === 'gravel' ? 1.3 : .6);
      context.fillStyle = i % 3 ? 'rgba(55,45,36,0.13)' : 'rgba(255,249,230,0.2)';
      context.beginPath(); context.ellipse(x, y, radius * 1.5, radius, random() * Math.PI, 0, Math.PI * 2); context.fill();
    }
  }
  if (kind === 'timber') for (let x = 5; x < size; x += 32) for (const y of [8, 120, 248]) {
    context.fillStyle = 'rgba(32,28,24,0.42)'; context.fillRect(x, y, 1.5, 1.5); context.fillRect(x + 22, y, 1.5, 1.5);
  }
  texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE; texture.update(false);
  if (kind === 'rubber') texture.hasAlpha = true;
  texture.anisotropicFilteringLevel = 4;
  return texture;
}

export function softShadowTexture(scene: Scene) {
  const texture = new DynamicTexture('soft-contact-shadow', 64, scene, false);
  const context = texture.getContext(), gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(13,31,39,0.5)'); gradient.addColorStop(0.45, 'rgba(13,31,39,0.3)'); gradient.addColorStop(1, 'rgba(13,31,39,0)');
  context.clearRect(0, 0, 64, 64); context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  texture.hasAlpha = true; texture.update(false); return texture;
}
