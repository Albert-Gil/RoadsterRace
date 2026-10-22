import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { browserOptions } from './browser-options.mjs';

// Rasterize our original vector mark; no external artwork or service is used.
const svg = await readFile(new URL('../public/assets/mark.svg', import.meta.url), 'utf8');
const directory = new URL('../public/assets/icons/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch(browserOptions());
try {
  const page = await browser.newPage();
  for (const size of [180, 192, 512]) {
    const png = await page.evaluate(async ({ svg, size }) => {
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#111820'; ctx.fillRect(0, 0, size, size);
      const width = size * 0.7, height = width * 48 / 64;
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { svg, size });
    await writeFile(new URL(`app-${size}.png`, directory), Buffer.from(png, 'base64'));
  }
} finally { await browser.close(); }
