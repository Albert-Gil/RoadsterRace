// Development tool page (not shipped): prefilters a Radiance .hdr into a Babylon .env.
// Driven by tools/bake-environments.mjs through Vite + Playwright.
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { EnvironmentTextureTools } from '@babylonjs/core/Misc/environmentTextureTools';
import '@babylonjs/core/Materials/Textures/Filtering/hdrFiltering';

const engine = new Engine(document.getElementById('bake') as HTMLCanvasElement, false, { preserveDrawingBuffer: true });
const scene = new Scene(engine);
const toBase64 = (buffer: ArrayBuffer) => { let s = ''; const bytes = new Uint8Array(buffer); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

/** The driver serves each source sky at /bake-input/<name>.hdr through request interception. */
async function bake(name: string, size: number) {
  const url = `/bake-input/${name}.hdr`;
  const texture = await new Promise<HDRCubeTexture>((resolve, reject) => {
    const t: HDRCubeTexture = new HDRCubeTexture(url, scene, size, false, true, false, true, () => resolve(t), (message, error) => reject(new Error(String(message ?? error))));
  });
  const env = await EnvironmentTextureTools.CreateEnvTextureAsync(texture, { imageType: 'image/png' });
  texture.dispose();
  return toBase64(env);
}
Object.assign(window, { bakeEnvironment: bake, bakeReady: true, webgl: engine.webGLVersion });
