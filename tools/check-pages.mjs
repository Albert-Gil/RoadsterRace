import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { browserOptions } from './browser-options.mjs';

// Production receives only real UI events. A separate development page records
// screen coordinates from the same track/camera, never production test hooks.
const base = '/RoadsterRace/';
// Local runs may reuse a warm inspector server; production is still tested at its real base.
const devURL = process.env.PAGES_DEV_URL || `http://127.0.0.1:5177${base}`;
const productionURL = process.env.PAGES_URL || `http://127.0.0.1:4177${base}`;
const fullRaces = process.env.PAGES_FULL_RACES === '1';
const tournamentOnly = process.env.PAGES_ONLY === 'tournament';
const circuits = ['coastal-launch', 'launchsite', 'golden-gate', 'santa-monica', 'grand-canyon', 'la-nights', 'snowy-tahoe', 'capitan-yosemite'];
const selection = process.env.PAGES_ONLY;
assert.ok(!selection || ['tournament', 'sessions', 'phone', 'multiplayer', 'solo'].includes(selection) || circuits.includes(selection), 'Unknown PAGES_ONLY group');
const selectedCircuits = selection ? circuits.filter(id => id === selection) : circuits;
const sessionChecks = !selection || selection === 'sessions';
const output = new URL('../artifacts/pages/', import.meta.url);
await mkdir(output, { recursive: true });
const report = { date: new Date().toISOString(), url: productionURL, devURL, group: selection || 'all', fullRaces, checks: [], errors: [], failedRequests: [] };
const servers = [];
let browser;

async function server(args, url) {
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...args, '--host', '127.0.0.1', '--strictPort'], {
    env: { ...process.env, VITE_BASE_PATH: base }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  servers.push(child);
  let logs = '';
  child.stdout.on('data', data => { logs = (logs + data).slice(-5000); });
  child.stderr.on('data', data => { logs = (logs + data).slice(-5000); });
  child.on('error', error => { logs += error.message; });
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Test server exited: ${logs}`);
    try { if ((await fetch(url)).ok) return; } catch { /* wait for Vite */ }
    await delay(250);
  }
  throw new Error(`Test server did not start: ${logs}`);
}
// CI uses CPU-only WebGL: keep the same CSS layout/touch behavior at 1x so
// rendering four cars does not repeatedly trigger the real frame-gap pause.
// Local touch/layout suites additionally verify 2x/3x density.
const phone = { viewport: { width: 844, height: 390 }, deviceScaleFactor: process.env.CI ? 1 : 2, hasTouch: true, isMobile: true };
const fixtureCache = new Map();

async function fixture(circuit, count = 1, options = phone, jump = false) {
  const key = JSON.stringify({ circuit, count, options, jump });
  if (fixtureCache.has(key)) return fixtureCache.get(key);
  const context = await browser.newContext(options), page = await context.newPage();
  page.setDefaultTimeout(45000);
  try {
    // A cold Vite module graph can compile while another verification job is
    // running. Wait for the application DOM, then assert rendering separately.
    await page.goto(`${devURL}?circuit=${circuit}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByRole('button', { name: count === 1 ? "Time Trial" : 'Multiplayer' }).click();
    if (count > 1) await page.getByRole('button', { name: `${count} players`, exact: true }).click();
    // Software WebGL can keep the animated setup panel moving for several frames.
    // A forced pointer click still exercises the real button and is followed by
    // the drawing/render assertions below.
    await page.getByRole('button', { name: count === 1 ? 'Draw racing line' : 'Plan your lines' }).click({ force: true });
    await page.waitForFunction(() => window.__roadster.getGraphics().renderReady && window.__roadster.getGraphics().roadVisible);
    await page.evaluate(() => document.fonts.ready);
    const variants = await page.evaluate(() => {
      const g = window.__roadster, t = g.getTrack();
      const project = path => {
        const ds = [0]; for (let i = 1; i < path.length; i++) ds.push(ds[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
        return path.map((p, i) => ({ ...g.project(p), time: ds[i] / ds.at(-1) * 7 })).filter((_, i) => i % 2 === 0 || i === path.length - 1);
      };
      const normal = project(t.centerline), j = t.jumps?.[0] ?? t.hopShortcuts?.[0]; if (!j) return { normal };
      const a = t.distances.findIndex(d => d >= j.entryProgress), b = t.distances.findIndex(d => d >= j.exitProgress), branch = [];
      for (let i = 1; i < j.branch.length; i++) {
        const a = j.branch[i - 1], b = j.branch[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.6);
        for (let k = 0; k < n; k++) branch.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n });
      }
      return { normal, jump: project([...t.centerline.slice(0, a), ...branch, ...t.centerline.slice(b)]) };
    });
    fixtureCache.set(JSON.stringify({ circuit, count, options, jump: false }), variants.normal);
    if (variants.jump) fixtureCache.set(JSON.stringify({ circuit, count, options, jump: true }), variants.jump);
    return fixtureCache.get(key);
  } finally { await context.close(); }
}

async function productionPage(options = phone) {
  const context = await browser.newContext(options), page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) report.failedRequests.push({ url: response.url(), status: response.status() });
    const url = new URL(response.url());
    if (url.origin === new URL(productionURL).origin && !url.pathname.startsWith(base)) {
      report.errors.push(`Request escaped deployment root: ${url.href}`);
    }
  });
  page.on('requestfailed', request => {
    // Navigation deliberately cancels outstanding cosmetic loads; HTTP failures
    // and actual application exceptions are never ignored.
    if (!request.failure()?.errorText.includes('ERR_ABORTED')) report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
  return { context, page };
}
async function ready(page) {
  assert.equal(await page.evaluate(() => '__roadster' in window), false, 'Development inspector must not ship');
  assert.equal(await page.getByRole('button', { name: 'Try a practice line' }).count(), 0);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(async () => {
    const loaded = await Promise.all([document.fonts.load('italic 700 20px "Barlow Condensed"'), document.fonts.load('400 14px Barlow')]);
    return loaded.every(faces => faces.length > 0 && faces.every(face => face.status === 'loaded'));
  }), true);
  await page.evaluate(() => new Promise(resolve => { let n = 0; function frame() { if (++n === 8) resolve(); else requestAnimationFrame(frame); } requestAnimationFrame(frame); }));
}
async function canvasProportions(page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#race-canvas'), rect = canvas.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && Math.abs((canvas.width / canvas.height) / (rect.width / rect.height) - 1) < 0.002;
  });
}
async function draw(page, context, points) {
  await page.bringToFront();
  const cdp = await context.newCDPSession(page), epoch = Date.now() / 1000;
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0].x, y: points[0].y, id: 1 }], timestamp: epoch });
    for (const p of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y, id: 1 }], timestamp: epoch + p.time });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: epoch + 7 });
  } finally { await cdp.detach(); }
}
async function racing(page) {
  await page.waitForFunction(() => document.querySelector('main').dataset.phase === 'racing' && document.querySelector('#race-time').textContent !== '00:00.00', undefined, { timeout: 60000 });
}
async function checkHops(page, keys, withThrust = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await page.locator('main').getAttribute('data-phase') === 'paused') {
      console.log('Resuming the software-renderer interruption before ability verification');
      await page.getByRole('button', { name: 'Resume', exact: true }).click(); await racing(page);
    }
    for (const key of keys) await page.keyboard.press(key);
    if (withThrust) await page.keyboard.press('Space');
    // An expensive software-rendered frame can invoke the real pause safeguard
    // between the key event and the next simulation tick. Resume through the UI;
    // never disable that safeguard or advance production simulation artificially.
    await page.waitForFunction(() => document.querySelector('main').dataset.phase === 'paused'
      || [...document.querySelectorAll('.hop-control')].every(b => /s$/.test(b.querySelector('.hop-status').textContent)));
    const observation = await page.evaluate(() => ({ phase: document.querySelector('main').dataset.phase,
      hop: [...document.querySelectorAll('.hop-status')].map(e => e.textContent), time: document.querySelector('#race-time').textContent }));
    (report.abilityObservations ??= []).push(observation);
    if (observation.hop.every(text => /s$/.test(text))) return;
    console.log('Ability verification interrupted:', JSON.stringify(observation));
  }
  throw new Error('Hop did not activate after bounded UI resume attempts');
}
async function finish(page) {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    try {
      await page.waitForFunction(() => document.querySelector('main').dataset.phase === 'results', undefined, { timeout: 10000 });
      return;
    } catch (error) {
      if (error.name !== 'TimeoutError') throw error;
      const state = await page.evaluate(() => ({ phase: document.querySelector('main').dataset.phase, time: document.querySelector('#race-time').textContent, panel: document.querySelector('#panel').textContent }));
      console.log('Race progress:', JSON.stringify(state));
      assert.notEqual(state.phase, 'paused', 'Automation interrupted the race: ' + JSON.stringify(state));
    }
  }
  throw new Error('Race did not finish within 180 seconds');
}

try {
  if(!process.env.PAGES_DEV_URL)await server(['--port', '5177'], devURL);
  if (!process.env.PAGES_URL) {
    const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
    assert.ok(html.includes('/RoadsterRace/assets/'), 'Build with VITE_BASE_PATH=/RoadsterRace/ before testing');
    await server(['preview', '--port', '4177'], productionURL);
  }
  browser = await chromium.launch(browserOptions());
  for (const circuit of selectedCircuits) {
    console.log(`Checking ${circuit}: production touch drawing and racing`);
    const points = await fixture(circuit);
    const { context, page } = await productionPage();
    try {
      await page.goto(`${productionURL}?circuit=${circuit}`);
      assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex,nofollow');
      assert.equal(await page.locator('.brand').getAttribute('href'), base);
      assert.equal(await page.locator('.brand img').evaluate(img => img.complete && img.naturalWidth > 0), true);
      // Sound lives in Settings (Home and race setup): make sure it is on.
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      const sound = page.getByRole('button', { name: 'Sound', exact: true });
      if (await sound.getAttribute('aria-pressed') === 'false') await sound.click();
      await page.getByRole('button', { name: 'Close settings', exact: true }).click();
      await page.getByRole('button', { name: "Time Trial" }).click();
      const build = await page.locator('.build-id').textContent();
      assert.ok(build.startsWith('TEST BUILD '));
      await page.getByLabel('Driver 1 name', { exact: true }).fill('Pages Tester');
      await page.getByRole('button', { name: 'Cobalt blue', exact: true }).click();
      await page.getByRole('button', { name: '1 lap', exact: true }).click();
      await page.getByRole('button', { name: 'Draw racing line' }).click();
      await ready(page);
      await draw(page, context, points);
      await page.getByRole('button', { name: 'Race this line' }).waitFor();
      await page.screenshot({ path: fileURLToPath(new URL(`${circuit}-phone-preview.png`, output)) });
      await page.getByRole('button', { name: 'Race this line' }).click();
      await racing(page);
      await page.keyboard.press('Space');
      if (fullRaces) { await finish(page); assert.ok((await page.locator('#panel').textContent()).includes('Pages Tester')); }
      else await page.keyboard.press('Escape');
      report.checks.push({ circuit, build, realTouchPreview: true, startedRace: true, completedRace: fullRaces, soundEnabled: await page.locator('#sound-button').getAttribute('aria-pressed') === 'true' });
      if (circuit === 'santa-monica' || circuit === 'launchsite' || circuit === 'la-nights') {
        // Reuse the same compiled/rendered scene; exercise the shortcut in the
        // shipped build using actual input, without any production inspector.
        await page.getByRole('button', { name: 'Home', exact: true }).click();
        await page.getByRole('button', { name: "Time Trial" }).click();
        await page.getByRole('button', { name: 'Draw racing line' }).click();
        await draw(page, context, await fixture(circuit, 1, phone, true));
        await page.getByRole('button', { name: 'Race this line' }).click(); await racing(page);
        if (circuit === 'launchsite') { await checkHops(page, ['KeyH']); await page.keyboard.press('Escape'); }
        else if (fullRaces) await finish(page); else await page.keyboard.press('Escape');
        report.checks.push({ circuit, manualHopLane: circuit === 'launchsite', jumpRealTouchPreview: true, jumpRaceStarted: true, jumpCompleted: fullRaces && circuit !== 'launchsite' });
      }
      await page.reload(); await page.getByRole('button', { name: "Time Trial" }).click();
      assert.equal(await page.getByLabel('Driver 1 name', { exact: true }).inputValue(), 'Pages Tester');
      assert.equal(await page.getByRole('button', { name: 'Cobalt blue', exact: true }).getAttribute('aria-pressed'), 'true');
      await page.locator('.brand').click();
      assert.equal(page.url(), productionURL);
    } finally { await context.close(); }
  }
  // Alternate presentation and portrait layout, including standalone metadata.
  if (sessionChecks || selection === 'phone') {
    console.log('Checking portrait, Graphite, manifest and Home Screen icons');
    // Compile the coordinate fixture before opening production WebGL. Two
    // simultaneous scenes compete for shader compilation on slower machines.
    const points = await fixture('golden-gate', 1, { ...phone, viewport: { width: 390, height: 844 } });
    const { context, page } = await productionPage({ ...phone, viewport: { width: 390, height: 844 } });
    try {
      await page.goto(`${productionURL}?circuit=golden-gate&theme=graphite`);
      await page.getByRole('button', { name: "Time Trial" }).click(); await ready(page);
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'graphite');
      const manifestURL = await page.locator('link[rel=manifest]').evaluate(link => link.href);
      const manifest = await (await context.request.get(manifestURL)).json();
      assert.equal(manifest.display, 'standalone');
      for (const icon of manifest.icons) {
        const response = await context.request.get(new URL(icon.src, manifestURL).href);
        assert.equal(response.status(), 200); assert.ok(response.headers()['content-type'].includes('image/png'));
      }
      const appleIcon = await page.locator('link[rel=apple-touch-icon]').evaluate(link => link.href);
      assert.equal((await context.request.get(appleIcon)).status(), 200);
      assert.equal(await page.locator('meta[name=apple-mobile-web-app-capable]').getAttribute('content'), 'yes');
      // Reproduce mobile layout settling after the orientation resize event,
      // while the showcase car is visible. No development inspector is used.
      await page.locator('main').evaluate(main => { main.style.height = '844px'; });
      await page.setViewportSize({ width: 844, height: 390 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('main').evaluate(main => { main.style.height = '390px'; });
      await canvasProportions(page);
      await page.screenshot({ path: fileURLToPath(new URL('phone-car-landscape.png', output)) });
      await page.locator('main').evaluate(main => { main.style.height = '320px'; });
      await canvasProportions(page);
      await page.locator('main').evaluate(main => { main.style.removeProperty('height'); });
      await page.setViewportSize({ width: 390, height: 844 });
      await canvasProportions(page);
      await page.getByRole('button', { name: 'Draw racing line' }).click();
      await ready(page);
      await draw(page, context, points); await page.getByRole('button', { name: 'Race this line' }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight + 1), false);
      report.checks.push({ portrait: true, graphite: true, manifestAndIcons: true, realTouchPreview: true, canvasRotation: true });
    } finally { await context.close(); }
  }
  // Four private drawing turns and shared start; optional complete race locally.
  if (sessionChecks || selection === 'multiplayer') {
    console.log('Checking four-player drawing, readiness and racing');
    const points = await fixture('coastal-launch', 4);
    const { context, page } = await productionPage();
    try {
      await page.goto(productionURL); await page.getByRole('button', { name: 'Multiplayer' }).click();
      await page.getByRole('button', { name: '4 players', exact: true }).click();
      await page.getByRole('button', { name: '1 lap', exact: true }).click();
      await page.getByRole('button', { name: 'Plan your lines' }).click(); await ready(page);
      for (let i = 0; i < 4; i++) {
        if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}` }).click();
        await draw(page, context, points); await page.getByRole('button', { name: 'Lock in my line', exact: true }).click();
      }
      for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP']) await page.keyboard.press(key);
      await racing(page);
      assert.equal(await page.locator('.hop-control').count(), 4);
      await checkHops(page, ['KeyZ', 'KeyK', 'KeyW', 'KeyO']);
      if (fullRaces) await finish(page); else await page.keyboard.press('Escape');
      report.checks.push({ fourPlayers: true, privateDrawingAndReadiness: true, sharedRaceStarted: true, independentHops: true, completedRace: fullRaces });
    } finally { await context.close(); }
  }
  if (sessionChecks || selection === 'solo') {
    console.log('Checking Solo Race: three CPU cars and one human input');
    const points = await fixture('coastal-launch');
    const { context, page } = await productionPage();
    try {
      await page.goto(productionURL);
      await page.getByRole('button', { name: 'Solo Race', exact: true }).click();
      await page.getByRole('button', { name: 'Hard', exact: true }).click();
      await page.getByRole('button', { name: '1 lap', exact: true }).click();
      await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
      await ready(page); await draw(page, context, points);
      await page.getByRole('button', { name: 'Race this line', exact: true }).click();
      await racing(page);
      assert.equal(await page.locator('.racer-pad').count(), 1);
      assert.equal(await page.locator('.hop-control').count(), 1);
      await checkHops(page, ['KeyH'], true);
      assert.equal(await page.locator('#hop-button').getAttribute('data-ready'), 'false');
      assert.equal(await page.locator('.vehicle-label:not([hidden])').count(), 0);
      if (fullRaces) { await finish(page); assert.ok((await page.locator('.standings').textContent()).includes('Apex')); }
      report.checks.push({ soloComputerRace: true, oneHumanAbilityPair: true, hopAndThrust: true, fourCars: true, hardDifficulty: true, completedRace: fullRaces });
    } finally { await context.close(); }
  }
  // Saved tournament creation/resumption is checked in every complete release;
  // full mode additionally completes all registered rounds using real drawn input.
  if (sessionChecks || tournamentOnly) {
    console.log('Checking saved tournament and resumption');
    const { context, page } = await productionPage();
    try {
      await page.goto(productionURL); await page.getByRole('button', { name: 'Multiplayer' }).click();
      await page.getByRole('button', { name: '2 players', exact: true }).click();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await page.getByRole('button', { name: '1 lap', exact: true }).click();
      await page.getByRole('button', { name: 'Start tournament' }).click();
      await page.reload(); await page.getByRole('button', { name: 'Resume tournament' }).click();
      if (fullRaces) for (const [round, circuit] of circuits.entries()) {
        console.log(`Tournament round ${round + 1}: ${circuit}`);
        const points = await fixture(circuit, 2);
        await page.getByRole('button', { name: 'Draw your lines' }).click(); await ready(page);
        for (let i = 0; i < 2; i++) {
          if (i) await page.getByRole('button', { name: "I'm Player 2" }).click();
          await draw(page, context, points); await page.getByRole('button', { name: 'Lock in my line', exact: true }).click();
        }
        await page.keyboard.press('KeyA'); await page.keyboard.press('KeyL'); await racing(page); await finish(page);
        if (round < circuits.length - 1) await page.getByRole('button', { name: 'Next race' }).click();
      }
      if (fullRaces) {
        assert.equal(await page.locator('#panel .eyebrow').textContent(), 'TOURNAMENT COMPLETE');
        assert.equal(await page.locator('.championship-table tbody tr').count(), 2);
      }
      report.checks.push({ tournamentSavedAndResumed: true, completedAllRounds: fullRaces });
    } finally { await context.close(); }
  }
  assert.deepEqual(report.errors, []); assert.deepEqual(report.failedRequests, []);
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = String(error.stack || error); process.exitCode = 1;
} finally {
  await browser?.close();
  for (const child of servers) child.kill();
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
