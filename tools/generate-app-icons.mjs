import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { browserOptions } from './browser-options.mjs';

// Rasterize our original vector mark; no external artwork or service is used.
// Web icons go to public/assets/icons/; when the iOS project exists, its app icon and
// launch images are written too (ios/App/App/Assets.xcassets).
const svg = await readFile(new URL('../public/assets/mark.svg', import.meta.url), 'utf8');
const directory = new URL('../public/assets/icons/', import.meta.url);
const ios = new URL('../ios/App/App/Assets.xcassets/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch(browserOptions());
try {
  const page = await browser.newPage();
  /** Mark centered on the brand background; `share` is the mark width relative to the image. */
  const render = (size, share) => page.evaluate(async ({ svg, size, share }) => {
    const image = new Image();
    image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111820'; ctx.fillRect(0, 0, size, size);
    const width = size * share, height = width * 48 / 64;
    ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { svg, size, share });
  for (const size of [180, 192, 512]) await writeFile(new URL(`app-${size}.png`, directory), Buffer.from(await render(size, 0.7), 'base64'));
  if (existsSync(ios)) {
    await writeFile(new URL('AppIcon.appiconset/AppIcon-512@2x.png', ios), Buffer.from(await render(1024, 0.7), 'base64'));
    const splash = Buffer.from(await render(2732, 0.16), 'base64');
    for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) await writeFile(new URL(`Splash.imageset/${name}`, ios), splash);
  }
} finally { await browser.close(); }
