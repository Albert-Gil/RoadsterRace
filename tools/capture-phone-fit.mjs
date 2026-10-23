import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserOptions } from './browser-options.mjs';
const label = process.env.CAPTURE_LABEL || 'after', root = `artifacts/phone-upgrade/${label}`;
await mkdir(root, { recursive: true });
const browser = await chromium.launch(browserOptions()), report = [];
try {
  for (const [orientation, viewport] of [['landscape', { width: 844, height: 390 }], ['portrait', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    for (const id of ['coastal-launch', 'launchsite', 'golden-gate', 'santa-monica']) {
      await page.goto(`http://127.0.0.1:5173/?circuit=${id}`);
      await page.getByRole('button', { name: /Time Trial|Time Trial/, exact: true }).click();
      await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
      await page.waitForFunction(() => window.__roadster?.getGraphics().renderReady);
      const metrics = await page.evaluate(() => {
        const g = window.__roadster, t = g.getTrack(), widths = [];
        for (let i = 0; i < t.centerline.length - 1; i += 9) {
          const p = t.centerline[i], b = t.centerline[i + 1], d = Math.hypot(b.x - p.x, b.z - p.z), nx = -(b.z - p.z) / d, nz = (b.x - p.x) / d;
          const a = g.project({ x: p.x + nx * t.roadWidth / 2, z: p.z + nz * t.roadWidth / 2 }), c = g.project({ x: p.x - nx * t.roadWidth / 2, z: p.z - nz * t.roadWidth / 2 });
          widths.push(Math.hypot(a.x - c.x, a.y - c.y));
        }
        return { width: t.roadWidth, minPixels: Math.min(...widths), meanPixels: widths.reduce((a,b)=>a+b,0)/widths.length, projectionError: g.getProjectionError() };
      });
      report.push({ id, orientation, ...metrics });
      await page.screenshot({ path: `${root}/${id}-${orientation}.png` });
    }
    await context.close();
  }
} finally { await browser.close(); await writeFile(`${root}/report.json`, JSON.stringify(report, null, 2)); }
console.log(JSON.stringify(report, null, 2));
