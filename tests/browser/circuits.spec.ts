import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';
mkdirSync('artifacts/orbital', { recursive: true });
const state = (page: Page) => page.evaluate(() => (window as any).__roadster.getState());

test('course switching clears plans, retains drivers and distance, scopes bests and releases old scenes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('textbox', { name: 'Driver 1 name' }).fill('Avery');
  await page.getByRole('group', { name: 'Driver 1 paint' }).getByRole('button', { name: 'Cobalt blue', exact: true }).click();
  await page.getByRole('button', { name: '3 laps', exact: true }).click();
  await page.getByRole('button', { name: 'Plan your lines' }).click();
  for (let i = 0; i < 2; i++) {
    if (i) await page.getByRole('button', { name: "I'm Player 2" }).click();
    await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Lock in my line' }).click();
  }
  expect((await state(page)).confirmedCount).toBe(2);
  await page.getByRole('button', { name: 'Race setup', exact: true }).click();
  for (const name of ['Launchsite', 'Coastal Launch', 'Launchsite', 'Coastal Launch', 'Launchsite']) {
    await page.getByRole('button', { name: `${name} circuit`, exact: true }).click();
    await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
    const current = await state(page);
    expect(current.phase).toBe('setup'); expect(current.confirmedCount).toBe(0); expect(current.route).toBeNull(); expect(current.race).toBeNull();
    expect(current.lapCount).toBe(3); expect(current.drivers[0]).toMatchObject({ name: 'Avery', paint: 'cobalt' });
    expect(await page.evaluate(() => (window as any).__roadster.getGraphics().engineScenes)).toBe(2);
    await expect(page.locator('.setup-heading')).toContainText(name.toUpperCase());
    await expect(page.locator('#mode-label')).toHaveText('2 PLAYER LOCAL RACE');
  }
  await page.reload(); await page.getByRole('button', { name: "Time Trial" }).click();
  await expect(page.getByRole('button', { name: 'Launchsite circuit', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: 'Driver 1 name' })).toHaveValue('Avery');
  // Establish a one-lap Coastal best, then make sure Orbital starts without inheriting it.
  await page.getByRole('button', { name: 'Coastal Launch circuit', exact: true }).click();
  await page.getByRole('button', { name: '1 lap', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line' }).click(); await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  await page.getByRole('button', { name: 'Race this line' }).click();
  await waitForPhase(page, 'results');
  expect((await state(page)).best).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Race setup', exact: true }).click();
  await page.getByRole('button', { name: 'Launchsite circuit', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line' }).click();
  expect((await state(page)).best).toBeNull(); expect(errors).toEqual([]);
});

async function touchLine(page: Page, shape: 'blocked' | 'wide') {
  const points = await page.evaluate(shape => {
    const game = (window as any).__roadster, track = game.getTrack();
    return track.centerline.map((p: any, i: number, all: any[]) => {
      const a = all[Math.max(0, i - 1)], b = all[Math.min(all.length - 1, i + 1)], len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const f = (track.distances[i] - 8) / 80, offset = f > 0 && f < 1 ? Math.sin(f * Math.PI) ** 2 * (shape === 'blocked' ? -14 : 12) : 0;
      return { ...game.project({ x: p.x + (b.z - a.z) / len * offset, z: p.z - (b.x - a.x) / len * offset }), time: track.distances[i] / track.length * 7 };
    }).filter((_: any, i: number) => i % 2 === 0 || i === track.centerline.length - 1);
  }, shape);
  expect(await page.evaluate(points => points.filter(p => document.elementFromPoint(p.x, p.y)?.id !== 'race-canvas'), points)).toEqual([]);
  const cdp = await page.context().newCDPSession(page), epoch = Date.now() / 1000;
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0].x, y: points[0].y, id: 1 }], timestamp: epoch });
  for (const p of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y, id: 1 }], timestamp: epoch + p.time });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: epoch + points.at(-1)!.time }); await cdp.detach();
}

test('Orbital phone touch drawing rejects protected cuts and races a wide outer-sand line', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const evidence = { gaps: [] as number[], interruptions: [] as string[] }; (window as any).__captureTiming = evidence;
    let previous = performance.now();
    const frame = (now: number) => { if (now - previous > 450) evidence.gaps.push(now - previous); previous = now; requestAnimationFrame(frame); }; requestAnimationFrame(frame);
    addEventListener('blur', () => evidence.interruptions.push('blur'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) evidence.interruptions.push('hidden'); });
  });
  await page.goto('/?circuit=orbital-launchyard'); await page.getByRole('button', { name: "Time Trial" }).click();
  await page.getByRole('button', { name: '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await touchLine(page, 'blocked'); await expect(page.locator('.instruction')).toContainText('inner barrier');
  await expect(page.getByRole('button', { name: 'Race this line' })).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/orbital/blocked-touch.png' });
  await touchLine(page, 'wide'); await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__roadster.getProjectionError())).toBeLessThan(0.01);
  await page.screenshot({ path: 'artifacts/orbital/wide-touch.png' });
  await page.getByRole('button', { name: 'Race this line' }).click();
  await page.waitForFunction(() => { const s = (window as any).__roadster.getState(); return s.phase === 'racing' && s.race.sandAmount > 0.5; });
  await page.screenshot({ path: 'artifacts/orbital/wide-sand-race.png' });
  // A high-density PNG capture may itself exceed the game's 500 ms interruption guard.
  // Resume only when actual long-frame/focus evidence explains that protective pause.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const capture = await page.evaluate(() => ({ ...(window as any).__captureTiming, phase: (window as any).__roadster.getState().phase }));
  writeFileSync('artifacts/orbital/touch-capture-timing.json', JSON.stringify(capture, null, 2));
  if (capture.phase === 'paused') {
    expect(capture.gaps.some((gap: number) => gap > 500) || capture.interruptions.length > 0).toBe(true);
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
  }
  await waitForPhase(page, 'results', 90000);
  expect((await state(page)).race.lapTimes).toHaveLength(1); expect(errors).toEqual([]); await context.close();
});

for (const count of [2, 3, 4]) test(`Orbital ${count}-player race finishes with independent thrust and a fresh rematch`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=orbital-launchyard'); await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('button', { name: `${count} players`, exact: true }).click(); await page.getByRole('button', { name: '1 lap', exact: true }).click();
  await page.getByRole('button', { name: 'Plan your lines' }).click();
  for (let i = 0; i < count; i++) {
    if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}` }).click();
    await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Lock in my line' }).click();
  }
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP'].slice(0, count)) await page.keyboard.press(key);
  await waitForPhase(page, 'racing');
  await page.keyboard.press('KeyA');
  await page.waitForFunction(() => (window as any).__roadster.getState().players[0].thrustCount === 1);
  expect((await state(page)).players.slice(1).every((p: any) => p.thrustCount === 0)).toBe(true);
  const calls: number[] = [];
  for (let i = 0; i < 5; i++) { await page.waitForTimeout(100); calls.push(await page.evaluate(() => (window as any).__roadster.getGraphics().drawCalls)); }
  await page.screenshot({ path: `artifacts/orbital/${count}-player-race.png` });
  await waitForPhase(page, 'results', 90000);
  const finished = await state(page); expect(finished.players.every((p: any) => p.finished && p.lapTimes.length === 1)).toBe(true);
  expect(Math.max(...calls)).toBeLessThanOrEqual(150); expect(errors).toEqual([]);
  await page.screenshot({ path: `artifacts/orbital/${count}-player-results.png` });
  writeFileSync(`artifacts/orbital/${count}-player-report.json`, JSON.stringify({ maxDrawCalls: Math.max(...calls), players: finished.players, errors }, null, 2));
  await page.getByRole('button', { name: 'Rematch', exact: true }).click();
  const fresh = await state(page); expect(fresh.circuitId).toBe('orbital-launchyard'); expect(fresh.readyPlayers).toEqual(Array(count).fill(false)); expect(fresh.confirmedCount).toBe(count);
});
