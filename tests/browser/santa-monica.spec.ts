import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('artifacts/santa-monica', { recursive: true });
const state = (p: Page) => p.evaluate(() => (window as any).__roadster.getState());
const graphics = (p: Page) => p.evaluate(() => (window as any).__roadster.getGraphics());

async function touchLap(page: Page, jump: boolean) {
  const points = await page.evaluate(jump => {
    const game = (window as any).__roadster, t = game.getTrack(), j = t.jumps[0];
    let path = t.centerline;
    if (jump) {
      const a = t.distances.findIndex((d: number) => d >= j.entryProgress), b = t.distances.findIndex((d: number) => d >= j.exitProgress);
      const branch: any[] = [];
      for (let i = 1; i < j.branch.length; i++) {
        const a = j.branch[i - 1], b = j.branch[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.6);
        for (let k = 0; k < n; k++) branch.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n });
      }
      path = [...path.slice(0, a), ...branch, ...path.slice(b)];
    }
    const distances = [0]; for (let i = 1; i < path.length; i++) distances.push(distances[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
    const total = distances.at(-1)!;
    return path.map((p: any, i: number) => ({ ...game.project(p), time: distances[i] / total * 7 })).filter((_: any, i: number) => i % 2 === 0 || i === path.length - 1);
  }, jump);
  expect(await page.evaluate(points => points.filter(p => document.elementFromPoint(p.x, p.y)?.id !== 'race-canvas'), points)).toEqual([]);
  const cdp = await page.context().newCDPSession(page), epoch = Date.now() / 1000;
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0].x, y: points[0].y, id: 1 }], timestamp: epoch });
  for (const p of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y, id: 1 }], timestamp: epoch + p.time });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: epoch + 7 }); await cdp.detach();
}

test('real touch draws bypass and jump in landscape, portrait and tablet; rides respect reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=santa-monica'); await page.getByRole('button', { name: "Let's race" }).click();
  await expect(page.getByRole('button', { name: 'Santa Monica circuit', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Draw racing line' }).click(); await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).__roadster.getProjectionError())).toBeLessThan(0.01);
    for (const jump of [false, true]) {
      await touchLap(page, jump);
      if ((await state(page)).phase !== 'preview') writeFileSync(`artifacts/santa-monica/invalid-${viewport.width}-${jump}.json`, JSON.stringify(await page.evaluate(() => ({ stroke: (window as any).__roadster.getRawStroke(), track: (window as any).__roadster.getTrack() })), null, 2));
      await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
      const g = await graphics(page); expect(g.lineWidths).toEqual([[14, 10]]); expect(g.drawCalls).toBeLessThanOrEqual(90);
      expect((await state(page)).route.length).toBeGreaterThan(510);
      expect(await page.evaluate(() => (window as any).__roadster.getRoute().jumps ?? [])).toEqual(jump ? ['pacific-hop'] : []);
      await page.screenshot({ path: `artifacts/santa-monica/touch-${viewport.width}-${jump ? 'jump' : 'bypass'}.png` });
      await page.getByRole('button', { name: 'Redraw', exact: true }).click();
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100);
  const frozen = (await graphics(page)).decorativeMotion; await page.waitForTimeout(300);
  expect((await graphics(page)).decorativeMotion).toEqual(frozen); expect(errors).toEqual([]); await context.close();
});

test('jump race renders elevation, pauses safely, completes, and retry resets flight', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=santa-monica'); await page.getByRole('button', { name: 'Turn sound on', exact: true }).click();
  await page.getByRole('button', { name: "Let's race" }).click(); await page.getByRole('button', { name: '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await touchLap(page, true); await page.getByRole('button', { name: 'Race this line' }).click();
  await page.waitForFunction(() => (window as any).__roadster.getState().race?.elevation > 1.4);
  const airborne = await state(page); expect(airborne.race.movement).toBe('airborne'); expect(airborne.renderedPlayers[0].y).toBeGreaterThan(1.3);
  await page.keyboard.press('Escape'); const paused = await state(page); await page.waitForTimeout(250); expect((await state(page)).race).toEqual(paused.race);
  await page.screenshot({ path: 'artifacts/santa-monica/airborne-paused.png' }); await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'results', undefined, { timeout: 90000 });
  const completed = await state(page); expect(completed.race.lapTimes).toHaveLength(1); expect(completed.race.elevation).toBe(0);
  await page.getByRole('button', { name: 'Race again', exact: false }).click();
  expect((await state(page)).race.movement).toBe('grounded'); expect((await state(page)).race.elevation).toBe(0); expect((await state(page)).race.recoveryCount).toBe(0);
  expect(errors).toEqual([]);
});

test('four players race mixed branches with bounded draw calls and a clean rematch', async ({ page }) => {
  await page.goto('/?circuit=santa-monica'); await page.getByRole('button', { name: 'Race with friends' }).click(); await page.getByRole('button', { name: '4 players', exact: true }).click(); await page.getByRole('button', { name: '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Plan your lines' }).click();
  for (let i = 0; i < 4; i++) {
    if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}` }).click();
    await page.evaluate(jump => (window as any).__roadster.usePracticeLine(jump), i % 2 === 0); await page.getByRole('button', { name: 'Lock in my line' }).click();
  }
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP']) await page.keyboard.press(key);
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'racing');
  const calls: number[] = [];
  for (let i = 0; i < 10; i++) { for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP']) await page.keyboard.press(key); calls.push((await graphics(page)).drawCalls); await page.waitForTimeout(50); }
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'results', undefined, { timeout: 120000 });
  const finished = await state(page); expect(finished.players.every((p: any) => p.finished)).toBe(true); expect(Math.max(...calls)).toBeLessThanOrEqual(150);
  writeFileSync('artifacts/santa-monica/multiplayer-report.json', JSON.stringify({ maxDrawCalls: Math.max(...calls), players: finished.players, standings: finished.standings }, null, 2));
  await page.screenshot({ path: 'artifacts/santa-monica/multiplayer-results.png' }); await page.getByRole('button', { name: 'Rematch', exact: true }).click();
  expect((await state(page)).readyPlayers).toEqual([false, false, false, false]);
});
