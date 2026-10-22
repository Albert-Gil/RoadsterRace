import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserOptions } from './browser-options.mjs';
const directory = 'artifacts/car-rotation';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch(browserOptions());
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(() => window.__roadster?.getGraphics().renderReady);
  const report = [];
  for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }], ['landscape-toolbar', { width: 844, height: 320 }], ['portrait-return', { width: 390, height: 844 }]]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    report.push({ name, ...await page.evaluate(() => window.__roadster.getShowcaseProjection()) });
    await page.screenshot({ path: `${directory}/${name}-${process.env.CAPTURE_LABEL || 'before'}.png` });
  }
  await writeFile(`${directory}/${process.env.CAPTURE_LABEL || 'before'}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
