import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

/** Small original, seeded textures. They multiply theme colors; no network art dependency. */
export function surfaceTexture(scene: Scene, kind: 'asphalt' | 'sand' | 'water' | 'rubber' | 'gravel' | 'timber' | 'concrete') {
  const size = 256, texture = new DynamicTexture(`${kind}-grain`, size, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  const context = texture.getContext(), pixels = new ImageData(size, size);
  let seed = 731;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const noise = random(), wave = Math.sin(x / size * Math.PI * 4 + Math.sin(y / size * Math.PI * 2) * 1.7);
    const broad = Math.sin(x / size * Math.PI * 6) * Math.cos(y / size * Math.PI * 4) + Math.sin((x + y) / size * Math.PI * 2) * 0.5;
    const plank = (x % 32 < 2 ? 0.72 : 1) * (0.94 + Math.sin(Math.floor(x / 32) * 4.7) * 0.04);
    const value = kind === 'timber' ? (230 + Math.sin(y * 0.4 + Math.sin(x * 0.11) * 2) * 6 + noise * 12) * plank : kind === 'concrete' ? 230 + broad * 3 + noise * 18 : kind === 'gravel' ? 220 + noise * 27 : kind === 'rubber' ? 210 : kind === 'water' ? 232 + wave * 4.5 + broad * 1.5 + noise * 2 : kind === 'sand' ? 225 + broad * 6 + wave * 2 + noise * 13 : 207 + noise * 47;
    const offset = (y * size + x) * 4;
    pixels.data[offset] = value * (kind === 'water' ? 0.9 : 1); pixels.data[offset + 1] = value * (kind === 'water' ? 0.98 : 1); pixels.data[offset + 2] = value;
    pixels.data[offset + 3] = kind === 'rubber' ? Math.max(0, Math.sin(y / size * Math.PI)) ** 3 * (0.35 + 0.65 * Math.sin(y / size * Math.PI * 24 + wave * 0.3) ** 8) * noise * 240 : 255;
  }
  context.putImageData(pixels, 0, 0); texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE; texture.update(false);
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
