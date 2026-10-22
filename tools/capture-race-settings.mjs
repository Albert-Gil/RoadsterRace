import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('artifacts/race-settings', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173/');
  await page.getByRole('button', { name: "Let's race" }).click();
  await page.getByRole('button', { name: '6 laps', exact: true }).click();
  await page.getByRole('textbox', { name: 'Driver 1 name' }).fill('Alex');
  await page.getByRole('group', { name: 'Driver 1 paint' }).getByRole('button', { name: 'Cobalt blue', exact: true }).click();
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1500);
  await page.screenshot({ path: 'artifacts/race-settings/garage-desktop.png' });
  await page.getByRole('button', { name: '2 players', exact: true }).click();
  await page.getByRole('textbox', { name: 'Driver 2 name' }).fill('Sam');
  await page.getByRole('group', { name: 'Driver 2 paint' }).getByRole('button', { name: 'Glacier silver', exact: true }).click();
  await page.waitForTimeout(300); await page.screenshot({ path: 'artifacts/race-settings/garage-local-desktop.png' });
  for (const [width, height] of [[844, 390], [390, 844]]) {
    await page.setViewportSize({ width, height }); await page.locator('.setup-scroll').evaluate(el => el.scrollTop = 0);
    await page.waitForTimeout(250); await page.screenshot({ path: `artifacts/race-settings/setup-${width}x${height}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await page.getByRole('button', { name: 'Solo', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line' }).click();
  await page.evaluate(() => window.__roadster.usePracticeLine());
  await page.waitForTimeout(300); await page.screenshot({ path: 'artifacts/race-settings/wider-line.png' });
  await page.getByRole('button', { name: 'Race this line' }).click();
  await page.waitForFunction(() => document.querySelector('main').dataset.phase === 'racing');
  await page.waitForTimeout(1200); await page.screenshot({ path: 'artifacts/race-settings/six-lap-race.png' });
  const result = await page.evaluate(() => ({ phase: document.querySelector('main').dataset.phase, lap: document.querySelector('#race-lap').textContent, theme: document.documentElement.dataset.theme, developmentApi: '__roadster' in window, saved: JSON.parse(localStorage.getItem('roadster-race.preferences.v1')) }));
  if (!result.lap.includes('/ 6') || errors.length) throw new Error(JSON.stringify({ result, errors }));
  writeFileSync('artifacts/race-settings/presentation-report.json', JSON.stringify({ result, errors }, null, 2));
  console.log(JSON.stringify({ phase: result.phase, lap: result.lap, developmentApi: result.developmentApi, errors }));
} finally { await browser.close(); }
