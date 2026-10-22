import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

/** Original small sky/studio reflection cube. No external HDR download is required. */
export function createReflectionSky(scene: Scene, studio = false) {
  const size = 64, faces: Uint8Array[] = [], sun = new Vector3(-0.5, 0.7, -0.5).normalize();
  for (let face = 0; face < 6; face++) {
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = 2 * (x + 0.5) / size - 1, v = 2 * (y + 0.5) / size - 1;
      const directions = [new Vector3(1, -v, -u), new Vector3(-1, -v, u), new Vector3(u, 1, v), new Vector3(u, -1, -v), new Vector3(u, -v, 1), new Vector3(-u, -v, -1)];
      const d = directions[face].normalize(), height = Math.max(0, d.y), horizon = Math.exp(-Math.abs(d.y) * 9), highlight = Math.max(0, Vector3.Dot(d, sun)) ** 100;
      const color = d.y > 0 ? [0.31 - height * 0.12 + horizon * 0.35, 0.44 - height * 0.13 + horizon * 0.28, 0.55 - height * 0.14 + horizon * 0.2] : [0.19, 0.18, 0.15];
      const offset = (y * size + x) * 4;
      const strip = studio ? Math.exp(-(((d.y - 0.55) / 0.11) ** 2)) * 0.7 + Math.exp(-(((d.x - 0.7) / 0.12) ** 2)) * Math.max(0, d.y) : 0;
      color.forEach((channel, i) => pixels[offset + i] = Math.round(Math.min(1, channel + highlight * 0.8 + strip) * 255)); pixels[offset + 3] = 255;
    }
    faces.push(pixels);
  }
  const texture = new RawCubeTexture(scene, faces, size, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_UNSIGNED_BYTE, true);
  texture.name = 'original-coastal-reflection-sky'; texture.gammaSpace = false; return texture;
}
