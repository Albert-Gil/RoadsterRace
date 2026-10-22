import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, copyFileSync, existsSync, writeFileSync } from 'node:fs';
mkdirSync('artifacts/golden-city', { recursive: true });
if (existsSync('artifacts/golden-gate/circuit-preview.png') && !existsSync('artifacts/golden-city/before.png')) copyFileSync('artifacts/golden-gate/circuit-preview.png', 'artifacts/golden-city/before.png');
const state = (page: Page) => page.evaluate(() => (window as any).__roadster.getState());
const graphics = (page: Page) => page.evaluate(() => (window as any).__roadster.getGraphics());
async function stroke(page: Page, touch: boolean, lead = true, overshoot = 2) {
  const points = await page.evaluate(({lead, overshoot}) => {
    const game = (window as any).__roadster, t = game.getTrack(), g = t.startFinish;
    const point = (across: number, along: number) => ({ x: g.center.x + g.forward.x * along + g.forward.z * across, z: g.center.z + g.forward.z * along - g.forward.x * across });
    const prefix = lead ? [-12, -6, -9, -2].map((a, i) => ({ ...point(-4.5, a), time: i * 3 })) : [];
    const baseTime = lead ? 12 : 0;
    const lap = t.centerline.map((p: any, i: number) => {
      const d = t.distances[i], remaining = t.length - d;
      const across = d < 24 ? -4.5 * (1 - d / 24) : remaining < 24 ? 4.5 * (1 - remaining / 24) : 0;
      return { x: p.x + g.forward.z * across, z: p.z - g.forward.x * across, time: baseTime + d / t.length * 7 };
    }).filter((_: any, i: number) => i % 2 === 0 || i === t.centerline.length - 1);
    const end = { ...point(4.5, overshoot), time: baseTime + 7 + overshoot * 0.025 };
    return [...prefix, ...lap, end].map(p => ({ ...game.project(p), time: p.time }));
  }, {lead, overshoot});
  expect(await page.evaluate(points => points.filter(p => document.elementFromPoint(p.x, p.y)?.id !== 'race-canvas'), points)).toEqual([]);
  const cdp = await page.context().newCDPSession(page), epoch = Date.now() / 1000;
  if (touch) {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0].x, y: points[0].y, id: 3 }], timestamp: epoch });
    for (const p of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y, id: 3 }], timestamp: epoch + p.time });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: epoch + points.at(-1)!.time });
  } else {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: points[0].x, y: points[0].y, button: 'left', buttons: 1, clickCount: 1, timestamp: epoch });
    for (const p of points.slice(1)) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, buttons: 1, timestamp: epoch + p.time });
    const p = points.at(-1)!; await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: 1, timestamp: epoch + p.time });
  }
  await cdp.detach();
}
for (const circuit of ['coastal-launch', 'orbital-launchyard', 'golden-gate']) test(`${circuit} accepts release far past finish without changing counted lap`, async ({ page }) => {
  if (circuit === 'golden-gate') await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(`/?circuit=${circuit}`); await page.getByRole('button', { name: "Let's race" }).click();
  await page.getByRole('button', { name: 'Draw racing line' }).click();
  await stroke(page, false); await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
  const reference = (await state(page)).route;
  await page.getByRole('button', { name: 'Redraw', exact: true }).click();
  await stroke(page, circuit === 'golden-gate', true, 18);
  await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
  const actual = (await state(page)).route;
  // Browser input timestamps are quantized independently between gestures.
  expect(actual.drawingDuration).toBeCloseTo(reference.drawingDuration, 3);
  expect({ ...actual, drawingDuration: 0 }).toEqual({ ...reference, drawingDuration: 0 });
  expect((await graphics(page)).ignoredStrokeCount).toBe(2);
});
for (const circuit of ['coastal-launch', 'orbital-launchyard', 'golden-gate']) test(`${circuit} mouse lead-in and full-width finish retain preview through theme changes`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`/?circuit=${circuit}`); await page.getByRole('button', { name: "Let's race" }).click();
  await page.getByRole('button', { name: '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await stroke(page, false); await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
  expect((await state(page)).route.joined).toBe(true);
  const before = await state(page); expect(before.route.leadInCount).toBeGreaterThan(3); expect(before.route.drawingDuration).toBeCloseTo(7, 1);
  expect((await graphics(page)).lineWidths).toEqual([[14, 10]]); expect((await graphics(page)).ignoredStrokeCount).toBe(2);
  await page.screenshot({ path: `artifacts/golden-city/${circuit}-lead-in.png` });
  await page.keyboard.press('KeyT'); expect((await state(page)).route).toEqual(before.route); expect((await graphics(page)).ignoredStrokeCount).toBe(2);
  await page.getByRole('button', { name: 'Race this line' }).click(); await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'racing');
  expect((await graphics(page)).lineWidths).toEqual([[11, 8]]); expect((await graphics(page)).ignoredStrokeCount).toBe(0);
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'results', undefined, { timeout: 90000 });
  expect((await state(page)).race.lapTimes).toHaveLength(1); expect(errors).toEqual([]);
});
test('Golden Gate real browser touch works at high density in phone layouts; canceled lead-ins are cleared', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=golden-gate'); await page.getByRole('button', { name: "Let's race" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport); await page.waitForTimeout(150);
    await stroke(page, true); await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
    expect((await graphics(page)).lineWidths[0]).toEqual([14, 10]); expect((await state(page)).route.leadInCount).toBeGreaterThan(3);
    expect(await page.evaluate(() => (window as any).__roadster.getProjectionError())).toBeLessThan(0.01);
    await page.screenshot({ path: `artifacts/golden-city/touch-preview-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Redraw', exact: true }).click();
  }
  const p = await page.evaluate(() => { const g = (window as any).__roadster, t = g.getTrack(), s = t.startFinish; return g.project({ x: s.center.x - s.forward.x * 10, z: s.center.z - s.forward.z * 10 }); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 4 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await cdp.detach();
  expect((await state(page)).route).toBeNull(); expect((await graphics(page)).ignoredStrokeCount).toBe(0); expect(errors).toEqual([]); await context.close();
});
for (const count of [2, 3, 4]) test(`Golden Gate ${count}-car bridge race completes with physical contact`, async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=golden-gate'); await page.getByRole('button', { name: 'Race with friends' }).click();
  await page.getByRole('button', { name: `${count} players`, exact: true }).click();
  await page.getByRole('button', { name: count === 4 ? '6 laps' : '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Plan your lines' }).click();
  for (let i = 0; i < count; i++) { if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}` }).click(); await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Lock in my line' }).click(); }
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP'].slice(0, count)) await page.keyboard.press(key);
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'racing');
  for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP'].slice(0, count)) await page.keyboard.press(key);
  const samples: any[] = [];
  await page.waitForFunction(() => (window as any).__roadster.getState().players.some((p: any) => p.position.x > -40 && p.position.x < 40 && p.position.z > 36 && p.position.z < 48), undefined, { timeout: 90000 });
  await page.screenshot({ path: `artifacts/golden-city/bridge-race-${count}.png` });
  for (let i = 0; i < 5; i++) { samples.push(await graphics(page)); await page.waitForTimeout(120); }
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'results', undefined, { timeout: 240000 });
  const result = await state(page); expect(result.players.every((p: any) => p.finished && p.lapTimes.length === (count === 4 ? 6 : 1))).toBe(true);
  expect(result.contactCount).toBeGreaterThan(0); expect(Math.max(...samples.map(g => g.drawCalls))).toBeLessThanOrEqual(150); expect(errors).toEqual([]);
  writeFileSync(`artifacts/golden-city/race-${count}-report.json`, JSON.stringify({ samples, result, errors }, null, 2));
});

test('old Golden Gate and compiler tournament saves are rejected while ordinary preferences survive', async ({ page }) => {
  await page.goto('/?circuit=golden-gate'); await page.getByRole('button', { name: "Let's race" }).click();
  await page.getByRole('textbox', { name: 'Driver 1 name' }).fill('City Driver');
  await page.getByRole('group', { name: 'Driver 1 paint' }).getByRole('button', { name: 'Cobalt blue', exact: true }).click();
  await page.getByRole('button', { name: '6 laps', exact: true }).click();
  for (const stale of ['track', 'compiler']) {
    await page.evaluate(async stale => {
      const { createTournament } = await import('/src/core/tournament.ts' as string);
      const state = createTournament([{ circuitId: 'golden-gate', trackVersion: 2 }, { circuitId: 'coastal-launch', trackVersion: 2 }], 2, 6);
      if (stale === 'track') state.rounds[0].trackVersion = 1; else state.compilerVersion = 5;
      localStorage.setItem('roadster-race.tournament.v1', JSON.stringify({ state, drivers: [{ name: 'Old', paint: 'crimson' }, { name: 'Other', paint: 'solar' }] }));
    }, stale);
    await page.reload(); await expect(page.getByRole('button', { name: 'Resume tournament', exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: "Let's race" }).click();
    await expect(page.getByRole('textbox', { name: 'Driver 1 name' })).toHaveValue('City Driver');
    expect((await state(page)).drivers[0].paint).toBe('cobalt'); expect((await state(page)).lapCount).toBe(6);
  }
});
