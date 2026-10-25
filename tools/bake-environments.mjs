// Bakes the venue sky lighting files in public/assets/env/ from CC0 HDRIs.
//
//   pnpm bake:env
//
// Source: @pmndrs/assets (CC0-1.0) — a selection of Poly Haven HDRIs as 512x256 DWAB EXRs.
// Babylon's EXR loader has no DWA support, so three's EXRLoader (MIT, dev-only) decodes them
// here. The decoded sky is clamped (the directional light already carries the sun), written
// as Radiance RGBE, then prefiltered by Babylon in a headless browser and saved as .env.
// Nothing in this tool ships with the game; only the .env outputs do.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { FloatType } from 'three';
import { browserOptions } from './browser-options.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const outDir = join(root, 'public/assets/env');

/** Baked file -> source HDRI. Venues choose files through venueSkies in src/presentation/themes.ts. */
export const ENVIRONMENTS = Object.freeze({
  sky: { source: 'sky', clamp: 48 },
  sunset: { source: 'sunset', clamp: 48 },
  dawn: { source: 'dawn', clamp: 48 },
  night: { source: 'night', clamp: 24 },
  studio: { source: 'studio', clamp: 48 },
});
const CUBE_SIZE = 128; // 512x256 sources hold about 128 px per cube face.

function decode(name) {
  const file = require.resolve(`@pmndrs/assets/hdri/${name}.exr.js`), src = readFileSync(file, 'utf8');
  const bytes = Buffer.from(src.slice(src.indexOf('base64,') + 7, src.lastIndexOf("'")), 'base64');
  const loader = new EXRLoader(); loader.setDataType(FloatType);
  return loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
}

/** Float RGB(A) equirect (bottom-up rows) -> top-down Radiance RGBE with a highlight clamp. */
function radiance({ width, height, data }, clamp) {
  const channels = data.length / (width * height);
  const header = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`, 'ascii');
  const body = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const src = ((height - 1 - y) * width + x) * channels, dst = (y * width + x) * 4;
    let rgb = [0, 1, 2].map(c => { const v = data[src + c]; return Number.isFinite(v) ? v : clamp; });
    // Lossy DWAB ringing can leave negative channels inside the sun disc: keep it a white highlight.
    if (Math.min(...rgb) < 0) rgb = rgb.map(() => Math.max(...rgb.map(Math.abs)));
    const peak = Math.max(...rgb), scale = peak > clamp ? clamp / peak : 1;
    const [r, g, b] = rgb.map(v => v * scale), m = Math.max(r, g, b);
    if (m < 1e-32) continue;
    const e = Math.ceil(Math.log2(m)), f = 256 / 2 ** e;
    body[dst] = Math.min(255, Math.floor(r * f)); body[dst + 1] = Math.min(255, Math.floor(g * f)); body[dst + 2] = Math.min(255, Math.floor(b * f)); body[dst + 3] = e + 128;
  }
  return Buffer.concat([header, body]);
}

mkdirSync(outDir, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch(browserOptions());
try {
  const page = await browser.newPage();
  page.on('pageerror', error => console.error('page error:', error.message));
  await page.goto(`${server.resolvedUrls.local[0]}tools/env-bake/index.html`);
  await page.waitForFunction(() => window.bakeReady === true, null, { timeout: 120000 });
  const inputs = new Map(Object.entries(ENVIRONMENTS).map(([name, { source, clamp }]) => [name, radiance(decode(source), clamp)]));
  await page.route('**/bake-input/*.hdr', route => route.fulfill({ status: 200, contentType: 'application/octet-stream', body: inputs.get(route.request().url().split('/').pop().replace('.hdr', '')) }));
  for (const [name, { source }] of Object.entries(ENVIRONMENTS)) {
    const env = await page.evaluate(([sky, size]) => window.bakeEnvironment(sky, size), [name, CUBE_SIZE]);
    const bytes = Buffer.from(env, 'base64');
    writeFileSync(join(outDir, `${name}.env`), bytes);
    console.log(`${name}.env  <- @pmndrs/assets/hdri/${source}.exr  (${(bytes.length / 1024).toFixed(0)} KB)`);
  }
} finally {
  await browser.close(); await server.close();
}
