import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const backend = process.env.WEBGL_BACKEND ?? 'd3d11';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: [`--use-angle=${backend}`, '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(() => Boolean(window.__roadster), undefined, { timeout: 30000 });
  const renderer = await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'), ext = gl?.getExtension('WEBGL_debug_renderer_info'); return gl && ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null; });
  await page.getByRole('button', { name: "Let's race" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await page.evaluate(() => window.__roadster.usePracticeLine());
  await page.getByRole('button', { name: 'Race this line' }).click();
  await page.waitForFunction(() => window.__roadster.getState().phase === 'racing');
  const start = performance.now(); await page.waitForTimeout(5000);
  const state = await page.evaluate(() => window.__roadster.getState());
  const report = { backend, renderer, wallSeconds: (performance.now() - start) / 1000, phase: state.phase, raceSeconds: state.race.time };
  console.log(JSON.stringify(report)); writeFileSync('artifacts/browser-renderer.json', JSON.stringify(report, null, 2));
} finally { await browser.close(); }
