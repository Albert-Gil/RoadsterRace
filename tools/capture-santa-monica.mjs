import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserOptions } from './browser-options.mjs';
const directory = 'artifacts/santa-monica'; await mkdir(directory, { recursive: true });
const browser = await chromium.launch(browserOptions());
try {
  const startedAt = Date.now();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(process.env.CAPTURE_RACE === '1' ? { recordVideo: { dir: `${directory}/video`, size: { width: 1440, height: 900 } } } : {}) });
  const page = await context.newPage(), video = page.video(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?circuit=santa-monica');
  await page.getByRole('button', { name: "Let's race" }).click({ timeout: 15000 }).catch(async e => { console.log(JSON.stringify({ errors, body: await page.locator('body').innerText() })); await page.screenshot({path: `${directory}/error.png`}); throw e; });
  await page.getByRole('button', { name: '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await page.waitForFunction(() => window.__roadster?.getGraphics().renderReady);
  await page.screenshot({ path: `${directory}/desktop-circuit.png` });
  await page.evaluate(() => window.__roadster.usePracticeLine(true));
  await page.screenshot({ path: `${directory}/desktop-jump-plan.png` });
  const initial = await page.evaluate(() => ({ state: window.__roadster.getState(), graphics: window.__roadster.getGraphics(), trackLength: window.__roadster.getTrack().length }));
  if (process.env.CAPTURE_RACE === '1') {
    await page.getByRole('button', { name: 'Race this line' }).click();
    await page.waitForFunction(() => window.__roadster.getState().phase === 'racing');
    initial.recordedRaceStart = (Date.now() - startedAt) / 1000;
    const calls = [], fps = []; let captured = false;
    for (let i = 0; i < 900; i++) {
      const s = await page.evaluate(() => ({ state: window.__roadster.getState(), graphics: window.__roadster.getGraphics() }));
      if (s.state.phase === 'racing') { calls.push(s.graphics.drawCalls); fps.push(s.graphics.fps); }
      if (!captured && s.state.race?.elevation > 1.4) { await page.screenshot({ path: `${directory}/desktop-airborne.png` }); captured = true; }
      if (s.state.phase === 'paused') await page.getByRole('button', { name: 'Resume', exact: true }).click();
      if (s.state.phase === 'results') break;
      await page.waitForTimeout(100);
    }
    initial.finished = await page.evaluate(() => window.__roadster.getState()); initial.maxDrawCalls = Math.max(...calls); initial.meanRaceFps = fps.reduce((a, b) => a + b, 0) / fps.length; initial.capturedJump = captured;
    await page.screenshot({ path: `${directory}/desktop-results.png` });
  }
  for (const [name, viewport] of [['phone-landscape', { width: 844, height: 390 }], ['phone-portrait', { width: 390, height: 844 }], ['tablet', { width: 1024, height: 768 }]]) {
    await page.setViewportSize(viewport); await page.goto('http://127.0.0.1:5173/?circuit=santa-monica'); await page.getByRole('button', { name: "Let's race" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
    await page.waitForFunction(() => window.__roadster?.getGraphics().renderReady); await page.screenshot({ path: `${directory}/${name}.png` });
  }
  initial.errors = errors; await writeFile(`${directory}/capture-report.json`, JSON.stringify(initial, null, 2)); console.log(JSON.stringify(initial, null, 2));
  await context.close(); if (video) await video.saveAs(`${directory}/gameplay.webm`);
} finally { await browser.close(); }
