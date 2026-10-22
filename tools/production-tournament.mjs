import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4176';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const report = { checks: [], errors: [] };
const saved = {
  state: { version: 1, rulesVersion: 7, compilerVersion: 7, playerCount: 4, laps: 1,
    rounds: [{ circuitId: 'coastal-launch', trackVersion: 2 }, { circuitId: 'golden-gate', trackVersion: 2 }],
    results: [0, 1].map(round => ({ round, points: [10, 6, 4, 0], finishes: [0, 1, 2, 3].map(player => ({ player, rank: player + 1, finishTime: 20 + player + round })) })) },
  drivers: [{ name: 'Avery <b>', paint: 'cobalt' }, { name: 'Morgan', paint: 'crimson' }, { name: 'Sam', paint: 'verdant' }, { name: 'Jordan', paint: 'solar' }],
};
try {
  // Completed-save fixtures exercise resume/table layouts, not simulated race completion.
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
    const context = await browser.newContext({ viewport }); await context.addInitScript(value => localStorage.setItem('roadster-race.tournament.v1', JSON.stringify(value)), saved);
    const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message)); await page.goto(base);
    await page.getByRole('button', { name: 'Resume tournament', exact: false }).click();
    await page.getByRole('button', { name: 'Race tournament again', exact: false }).waitFor();
    if (!await page.locator('#panel').textContent().then(t => t.includes('Avery <b>'))) throw new Error('Missing escaped champion name');
    const box = await page.getByRole('button', { name: 'Race tournament again', exact: false }).boundingBox();
    await page.screenshot({ path: `artifacts/golden-gate/production-results-${viewport.width}.png` });
    if (!box || box.y < 60 || box.y + box.height > viewport.height) throw new Error('Unreachable tournament action ' + JSON.stringify({ viewport, box }));
    if (await page.evaluate(() => '__roadster' in window)) throw new Error('Development helper in production');
    await page.screenshot({ path: `artifacts/golden-gate/production-results-${viewport.width}.png` });
    report.checks.push({ type: 'completed-save-resume', viewport, action: box }); await context.close();
  }
  const context = await browser.newContext();
  await context.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage denied', 'QuotaExceededError'); }; });
  const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message)); await page.goto(base);
  await page.getByRole('button', { name: 'Race with friends', exact: false }).click(); await page.getByRole('button', { name: 'Tournament', exact: true }).click(); await page.getByRole('button', { name: 'Start tournament', exact: false }).click();
  await page.getByText('Progress could not be saved on this browser. Keep this page open.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Draw your lines', exact: false }).click(); await page.getByRole('button', { name: 'Start again', exact: true }).waitFor();
  report.checks.push({ type: 'storage-unavailable', playable: true }); await context.close();
  if (report.errors.length) throw new Error(JSON.stringify(report.errors));
  writeFileSync('artifacts/golden-gate/production-tournament.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} finally { await browser.close(); }
