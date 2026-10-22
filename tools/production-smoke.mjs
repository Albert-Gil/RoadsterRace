import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const backend = process.env.WEBGL_BACKEND === 'd3d11' ? 'd3d11' : 'swiftshader';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: backend === 'd3d11' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { date: new Date().toISOString(), backend, checks: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => localStorage.clear());
  for (const query of ['', '?theme=graphite', '?theme=constructor', '?circuit=orbital-launchyard', '?circuit=orbital-launchyard&theme=graphite', '?circuit=constructor', '?circuit=golden-gate', '?circuit=golden-gate&theme=graphite', '?circuit=launchsite']) {
    const errors = [], requests = [];
    const onError = e => errors.push(e.message), onResponse = r => requests.push(r.url());
    page.on('pageerror', onError); page.on('response', onResponse);
    await page.goto(`${process.env.PREVIEW_URL ?? 'http://127.0.0.1:4175'}/${query}`);
    await page.getByRole('button', { name: "Let's race" }).waitFor();
    await page.getByRole('button', { name: 'Turn sound on' }).click();
    await page.getByRole('button', { name: "Let's race" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
    await page.getByRole('button', { name: 'Start again', exact: true }).waitFor();
    const details = await page.evaluate(() => ({ phase: document.querySelector('main').dataset.phase, circuit: document.querySelector('.circuit-caption').textContent, theme: document.documentElement.dataset.theme, soundEnabled: document.querySelector('#sound-button').getAttribute('aria-pressed') === 'true', testApiAbsent: !('__roadster' in window) }));
    if (errors.length || !details.testApiAbsent || !details.soundEnabled || details.phase !== 'drawing' || await page.getByRole('button', { name: 'Try a practice line' }).count()) throw new Error(JSON.stringify({ errors, details }));
    if (query.includes('orbital-launchyard') && !details.circuit.includes('LAUNCHSITE')) throw new Error('Wrong production course selected');
    if (query.includes('golden-gate') && !details.circuit.includes('GOLDEN GATE')) throw new Error('Wrong Golden Gate selection');
    if (query.includes('launchsite') && !details.circuit.includes('LAUNCHSITE')) throw new Error('Wrong Launchsite alias selection');
    report.checks.push({ query: query || 'default', ...details, errors, resourcesRequested: requests.length });
    page.removeListener('pageerror', onError); page.removeListener('response', onResponse);
  }
  for (const query of ['', '?theme=graphite', '?circuit=orbital-launchyard', '?circuit=orbital-launchyard&theme=graphite', '?circuit=golden-gate', '?circuit=golden-gate&theme=graphite']) {
    const errors = [];
    const onError = e => errors.push(e.message); page.on('pageerror', onError);
    await page.goto(`${process.env.PREVIEW_URL ?? 'http://127.0.0.1:4175'}/${query}`);
    await page.getByRole('button', { name: 'Turn sound on' }).click();
    await page.getByRole('button', { name: 'Race with friends' }).click();
    await page.getByRole('button', { name: '4 players', exact: true }).click();
    await page.getByRole('button', { name: 'Plan your lines' }).click();
    // Normal play deliberately has no automatic practice plan. Smoke-check the
    // four-player drawing entry here; recorded-input browser tests exercise races.
    await page.getByRole('button', { name: 'Start again', exact: true }).waitFor();
    const details = await page.evaluate(() => ({ phase: document.querySelector('main').dataset.phase, circuit: document.querySelector('.circuit-caption').textContent, playerCount: document.querySelectorAll('.racer-pad').length, theme: document.documentElement.dataset.theme, soundEnabled: document.querySelector('#sound-button').getAttribute('aria-pressed') === 'true', testApiAbsent: !('__roadster' in window) }));
    if (errors.length || details.phase !== 'drawing' || details.playerCount !== 4 || !details.soundEnabled || !details.testApiAbsent) throw new Error(JSON.stringify({ errors, details }));
    if (query.includes('orbital-launchyard') && !details.circuit.includes('LAUNCHSITE')) throw new Error('Wrong production course selected');
    if (query.includes('golden-gate') && !details.circuit.includes('GOLDEN GATE')) throw new Error('Wrong Golden Gate selection');
    if (query.includes('launchsite') && !details.circuit.includes('LAUNCHSITE')) throw new Error('Wrong Launchsite alias selection');
    report.checks.push({ query: query || 'default', mode: 'four-player-drawing-entry', ...details, errors });
    page.removeListener('pageerror', onError);
  }
  console.log(JSON.stringify(report, null, 2));
  await writeFile('artifacts/production-smoke.json', JSON.stringify(report, null, 2));
} finally { await browser.close(); }
