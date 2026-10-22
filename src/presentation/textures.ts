import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

/** Small original, seeded textures. They multiply theme colors; no network art dependency. */
export function surfaceTexture(scene: Scene, kind: 'asphalt' | 'sand' | 'water' | 'rubber' | 'gravel') {
  const size = 256, texture = new DynamicTexture(`${kind}-grain`, size, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  const context = texture.getContext(), pixels = new ImageData(size, size);
  let seed = 731;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const noise = random(), wave = Math.sin(x / size * Math.PI * 4 + Math.sin(y / size * Math.PI * 2) * 1.7);
    const broad = Math.sin(x / size * Math.PI * 6) * Math.cos(y / size * Math.PI * 4) + Math.sin((x + y) / size * Math.PI * 2) * 0.5;
    const value = kind === 'gravel' ? 220 + noise * 27 : kind === 'rubber' ? 210 : kind === 'water' ? 240 + wave * 2 + noise * 3 : kind === 'sand' ? 211 + broad * 13 + wave * 4 + noise * 22 : 207 + noise * 47;
    const offset = (y * size + x) * 4;
    pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = value;
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
