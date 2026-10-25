import { expect, test, type Page } from '@playwright/test';
import { waitForPhase } from './ui';
import { formatTime } from '../../src/ui/format';

const state = (page: Page) => page.evaluate(() => (window as any).__roadster.getState());
async function ready(page: Page, query = '') {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => Boolean((window as any).__roadster));
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  await expect(page.getByRole('button', { name: "Time Trial" })).toBeVisible();
}
async function drawLap(page: Page, touch = false) {
  await page.getByRole('button', { name: "Time Trial" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  // Projection and picking agree immediately, before a render loop refreshes the camera.
  expect(await page.evaluate(() => (window as any).__roadster.getProjectionError())).toBeLessThan(0.01);
  await expect(page.getByRole('button', { name: 'Start again', exact: true })).toBeVisible();
  await page.waitForTimeout(100);
  const points = await page.evaluate(() => {
    const game = (window as any).__roadster, track = game.getTrack();
    const selected = track.centerline.filter((_: unknown, i: number) => i % 2 === 0);
    selected.push(track.centerline[track.centerline.length - 1]);
    return selected.map((p: unknown) => game.project(p)) as { x: number; y: number }[];
  });
  // The instruction panel must never block a section needed to draw a full lap.
  const blocked = await page.evaluate(points => points.filter(p => document.elementFromPoint(p.x, p.y)?.id !== 'race-canvas'), points);
  expect(blocked).toEqual([]);
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }] });
    for (const p of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(p.x, p.y);
    await page.mouse.up();
  }
  await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
}

test('mouse drawing reaches a valid preview; theme, redraw and optional artwork fallback work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await ready(page);
  expect(await page.evaluate(() => (window as any).__roadster.getProjectionError())).toBeLessThan(0.01);
  await drawLap(page);
  const previous = (await state(page)).route;
  await page.keyboard.press('KeyT');
  expect((await state(page)).theme).toBe('graphite'); expect((await state(page)).route).toEqual(previous);
  await page.getByRole('button', { name: 'Redraw', exact: true }).click();
  expect((await state(page)).route).toBeNull();
  await expect(page.getByRole('button', { name: 'Start again', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Race setup', exact: true }).click();
  await page.evaluate(() => { document.querySelector<HTMLImageElement>('.brand-mark')!.src = '/missing-optional-logo.svg'; });
  await expect(page.locator('.brand-mark')).toBeHidden(); await expect(page.locator('.brand-name')).toBeVisible();
  expect(errors).toEqual([]);
});

test('early lift is rejected with useful recovery', async ({ page }) => {
  await ready(page); await page.getByRole('button', { name: "Time Trial" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click(); await page.waitForTimeout(100);
  const p = await page.evaluate(() => (window as any).__roadster.project((window as any).__roadster.getTrack().start));
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 20, p.y); await page.mouse.up();
  await expect(page.locator('.instruction')).toContainText(/one.*lap/);
  expect((await state(page)).phase).toBe('drawing');
});

test('two-lap race, held thrust, pause/resume, results and retry', async ({ page }) => {
  await ready(page); await page.getByRole('button', { name: "Time Trial" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  await page.getByRole('button', { name: 'Race this line' }).click();
  await waitForPhase(page, 'racing');
  await page.keyboard.down('Space');
  await page.waitForFunction(() => { const s = (window as any).__roadster.getState().race; return s.thrustCount > 0 && s.time > s.thrustReadyAt + 0.1; });
  expect((await state(page)).race.thrustCount).toBe(1);
  await page.keyboard.up('Space'); await page.keyboard.press('Escape');
  const paused = (await state(page)).race.time; await page.waitForTimeout(300);
  expect((await state(page)).race.time).toBe(paused);
  await page.getByRole('button', { name: 'Resume' }).click();
  await waitForPhase(page, 'racing');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as any).__roadster.getState().race.thrustCount === 2);
  await waitForPhase(page, 'results', 120000);
  const result = await state(page); expect(result.race.lapTimes).toHaveLength(2); expect(result.best).toBe(result.race.finishTime);
  // Time Trial shows the fastest lap as the headline result and both splits.
  await expect(page.locator('.finish-time')).toHaveText(formatTime(Math.min(...result.race.lapTimes)));
  await expect(page.locator('.result-detail span')).toHaveText(result.race.lapTimes.map((lap: number, i: number) => `Lap ${i + 1} ${formatTime(lap)}`));
  await page.screenshot({ path: 'artifacts/race-results.png' });
  await page.getByRole('button', { name: 'Restart' }).click();
  const retry = await state(page); expect(retry.phase).toBe('countdown'); expect(retry.race.time).toBe(0); expect(retry.race.thrustCount).toBe(0); expect(retry.route).toEqual(result.route);
});

test('landscape touch drawing works at a phone viewport and high pixel density', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await ready(page);
  expect(await page.evaluate(() => (window as any).__roadster.getProjectionError())).toBeLessThan(0.01);
  await drawLap(page, true);
  await page.screenshot({ path: 'artifacts/phone-preview.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  await context.close();
});

test('four real browser touch pointers survive 50 overlapping cycles and cancellation', async ({ page }) => {
  await ready(page); await page.getByRole('button', { name: 'Touch test' }).click();
  const points = await page.locator('.diagnostic-pad').evaluateAll(pads => pads.map((pad, i) => { const r = pad.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: i + 1 }; }));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  for (let cycle = 0; cycle < 50; cycle++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points.map((p, i) => cycle === 25 ? { ...points[3 - i], id: p.id } : { ...p, x: p.x + 4 }) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  let inputs = (await state(page)).inputs;
  expect(inputs.activations).toEqual([50, 50, 50, 50]); expect(inputs.active).toEqual([0, 0, 0, 0]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  inputs = (await state(page)).inputs; expect(inputs.active).toEqual([0, 0, 0, 0]); expect(inputs.cancellations).toEqual([1, 1, 1, 1]);
  await page.screenshot({ path: 'artifacts/touch-diagnostics.png' }); await cdp.detach();
});

test('both presentation presets load, change type and assets, and preserve geometry', async ({ page }) => {
  await ready(page); const initial = await page.evaluate(() => ({ title: document.title, logo: document.querySelector<HTMLImageElement>('.brand-mark')!.src, font: getComputedStyle(document.querySelector('h1')!).fontFamily, track: (window as any).__roadster.getTrack() }));
  await page.screenshot({ path: 'artifacts/coastal-day.png' });
  await ready(page, '?theme=graphite');
  const alternate = await page.evaluate(() => ({ title: document.title, logo: document.querySelector<HTMLImageElement>('.brand-mark')!.src, font: getComputedStyle(document.querySelector('h1')!).fontFamily, track: (window as any).__roadster.getTrack() }));
  expect(alternate.logo).not.toBe(initial.logo); expect(alternate.font).not.toBe(initial.font); expect(alternate.title).not.toBe(initial.title); expect(alternate.track).toEqual(initial.track);
  await page.screenshot({ path: 'artifacts/graphite.png' });
});
