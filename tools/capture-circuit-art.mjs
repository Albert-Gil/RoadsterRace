import { chromium } from '@playwright/test';
import { mkdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { browserOptions } from './browser-options.mjs';

// Offline native artwork, never an extra runtime scene. Start the development server first.
const base = process.env.ART_URL || 'http://127.0.0.1:5181/';
const ffmpeg = process.env.FFMPEG_PATH || (process.platform === 'win32' ? 'C:/Program Files/ffmpeg/bin/ffmpeg.exe' : 'ffmpeg');
const ids = ['coastal-launch','orbital-launchyard','golden-gate','santa-monica','grand-canyon','la-nights','snowy-tahoe','capitan-yosemite'];
await mkdir('artifacts/pro-polish/thumbnails', { recursive: true });
await mkdir('public/assets/circuits', { recursive: true });
const browser = await chromium.launch(browserOptions());
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.setDefaultTimeout(120000);
  for (const id of ids) {
    await page.goto(`${base}?circuit=${id}&graphics=medium`);
    await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
    await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
    await page.waitForFunction(() => window.__roadster.getGraphics().renderReady);
    await page.evaluate(() => window.__roadster.getWorld().showStart(false));
    await page.addStyleTag({content: '#panel,.topbar,.race-hud,.pause-button,#race-controls,.race-notice,.race-progress{visibility:hidden!important}'});
    await page.waitForTimeout(300);
    const png = `artifacts/pro-polish/thumbnails/${id}.png`, output = `public/assets/circuits/${id}.webp`;
    await page.locator('#race-canvas').screenshot({ path: png });
    for (const quality of [78, 65, 50]) {
      const result = spawnSync(ffmpeg, ['-y','-i',png,'-vf','scale=480:270','-c:v','libwebp','-quality',String(quality),output], { stdio: 'pipe' });
      if (result.status !== 0) throw new Error(result.stderr?.toString() || 'WebP encoding failed');
      if ((await stat(output)).size <= 60000) break;
    }
    const bytes = (await stat(output)).size;
    if (bytes > 60000) throw new Error(`${id} exceeds the thumbnail budget`);
    console.log(id, bytes);
  }
} finally { await browser.close(); }
