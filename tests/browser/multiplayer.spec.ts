import { expect, test, type Page } from '@playwright/test';
import { resultRows, waitForPhase } from './ui';
import { formatTime } from '../../src/ui/format';

const state = (page: Page) => page.evaluate(() => (window as any).__roadster.getState());
async function planFriends(page: Page, count: number) {
  await page.goto('/'); await page.waitForFunction(() => Boolean((window as any).__roadster));
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('button', { name: `${count} players`, exact: true }).click();
  await page.getByRole('button', { name: 'Plan your lines' }).click();
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      const handoff = await state(page);
      expect(handoff.phase).toBe('handoff'); expect(handoff.turn).toBe(i);
      expect(handoff.confirmedCount).toBe(i); expect(handoff.visibleRouteCount).toBe(0); expect(handoff.route).toBeNull();
      // Changing presentation during a handoff cannot reveal a previous plan.
      await page.keyboard.press('KeyT'); expect((await state(page)).visibleRouteCount).toBe(0);
      await page.getByRole('button', { name: `I'm Player ${i + 1}` }).click();
    }
    expect((await state(page)).visibleRouteCount).toBe(0);
    await page.evaluate(() => (window as any).__roadster.usePracticeLine());
    expect((await state(page)).visibleRouteCount).toBe(1);
    await page.getByRole('button', { name: 'Lock in my line' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Take your corner.' })).toBeVisible();
  expect((await state(page)).visibleRouteCount).toBe(count);
}

test('four-player ghost start uses race time, survives pause and resets on rematch', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await planFriends(page, 4);
  await expect(page.locator('#panel')).toContainText('first 3 seconds');
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP']) await page.keyboard.press(key);
  await page.waitForFunction(() => { const s = (window as any).__roadster.getState(); return s.phase === 'racing' && s.race.time > 0.4; });
  const opening = await state(page);
  expect(opening.ghostStartRemaining).toBeGreaterThan(0); expect(opening.contactCount).toBe(0);
  await expect(page.locator('#pace-label')).toHaveText('GHOST START');
  await page.keyboard.press('KeyA');
  await page.keyboard.press('Escape');
  const paused = await state(page); await page.waitForTimeout(250);
  expect((await state(page)).ghostStartRemaining).toBe(paused.ghostStartRemaining);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForFunction(() => { const s = (window as any).__roadster.getState(); return s.phase === 'racing' && s.ghostStartRemaining === 0; });
  await expect(page.locator('#pace-label')).toHaveText('FINISHED');
  await waitForPhase(page, 'results', 120000);
  const result = await state(page); expect(result.players.every((p: any) => p.finished)).toBe(true);
  // The visible table must match the simulation: one row per car, in finishing order, with displayed times.
  const rows = await resultRows(page);
  expect(rows.map(r => r.time)).toEqual(result.standings.map((s: any) => formatTime(s.finishTime)));
  expect(rows.map(r => r.place.replace('=', ''))).toEqual(result.standings.map((s: any) => String(s.rank)));
  await page.getByRole('button', { name: 'Restart', exact: false }).click();
  for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP']) await page.keyboard.press(key);
  await page.waitForFunction(() => { const s = (window as any).__roadster.getState(); return s.phase === 'racing' && s.race.time > 0.1; });
  expect((await state(page)).ghostStartRemaining).toBeGreaterThan(2);
  expect((await state(page)).contactCount).toBe(0); expect(errors).toEqual([]);
});

test('two-player handoff, ready check, independent thrust, finish order and fresh rematch', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await planFriends(page, 2);
  await page.getByRole('button', { name: 'Player 1 thrust', exact: true }).click();
  expect((await state(page)).phase).toBe('ready'); expect((await state(page)).readyPlayers).toEqual([true, false]);
  await page.getByRole('button', { name: 'Player 2 thrust', exact: true }).click();
  expect((await state(page)).phase).toBe('countdown'); expect((await state(page)).players.map((p: any) => p.time)).toEqual([0, 0]);
  await waitForPhase(page, 'racing');
  expect((await state(page)).players.map((p: any) => p.thrustCount)).toEqual([0, 0]);
  await page.keyboard.down('KeyA');
  await page.waitForFunction(() => { const s = (window as any).__roadster.getState().players[0]; return s.thrustCount > 0 && s.time > s.thrustReadyAt + 0.1; });
  await page.keyboard.up('KeyA');
  expect((await state(page)).players.map((p: any) => p.thrustCount)).toEqual([1, 0]);
  await page.keyboard.press('Escape');
  const paused = (await state(page)).players.map((p: any) => p.time); await page.waitForTimeout(200);
  expect((await state(page)).players.map((p: any) => p.time)).toEqual(paused);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await waitForPhase(page, 'racing');
  await page.screenshot({ path: 'artifacts/multiplayer-race.png' });
  await waitForPhase(page, 'results', 120000);
  const finished = await state(page);
  expect(finished.players.every((p: any) => p.finished && p.lapTimes.length === 2)).toBe(true);
  expect(finished.standings[0].player).toBe(0); expect(finished.best).toBeNull();
  await expect(page.locator('.standings tbody tr')).toHaveCount(2);
  await page.screenshot({ path: 'artifacts/multiplayer-results.png' });
  await page.getByRole('button', { name: 'Restart' }).click();
  expect((await state(page)).phase).toBe('ready'); expect((await state(page)).readyPlayers).toEqual([false, false]);
  await page.keyboard.press('KeyA'); await page.keyboard.press('KeyL');
  const fresh = await state(page); expect(fresh.players.map((p: any) => p.time)).toEqual([0, 0]); expect(fresh.players.map((p: any) => p.thrustCount)).toEqual([0, 0]);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Home', exact:true }).click();
  await expect(page.getByRole('button', { name: "Time Trial" })).toBeVisible();
  expect((await state(page)).playerCount).toBe(1); expect((await state(page)).confirmedCount).toBe(0);
  expect(errors).toEqual([]);
});

test('four simultaneous corner touches on a phone retain ownership, never auto-repeat, and clear on interruption', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await planFriends(page, 4);
  const points = await page.locator('.racer-pad').evaluateAll(pads => pads.map((pad, i) => { const r = pad.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: i + 1 }; }));
  const hits = await page.evaluate(points => points.map(p => document.elementFromPoint(p.x, p.y)?.closest<HTMLElement>('.racer-pad')?.dataset.racer), points);
  expect(hits).toEqual(['0', '1', '2', '3']);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/multiplayer-ready-phone.png' });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  expect((await state(page)).readyPlayers).toEqual([true, true, true, true]);
  await waitForPhase(page, 'racing');
  expect((await state(page)).players.map((p: any) => p.thrustCount)).toEqual([0, 0, 0, 0]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points.map((p, i) => ({ ...points[3 - i], id: p.id })) });
  expect((await state(page)).raceInputs.active).toEqual([1, 1, 1, 1]);
  await page.waitForFunction(() => (window as any).__roadster.getState().players.every((s: any) => s.thrustCount > 0 && s.time > s.thrustReadyAt + 0.1));
  expect((await state(page)).players.map((p: any) => p.thrustCount)).toEqual([1, 1, 1, 1]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  expect((await state(page)).raceInputs.active).toEqual([0, 0, 0, 0]);
  await page.waitForTimeout(200); // Allow canceled-touch button paint to settle before the still.
  await page.screenshot({ path: 'artifacts/multiplayer-four-phone.png' });
  const photographed=await state(page);
  if(photographed.phase==='paused'){
    expect(photographed.pauseReason).toBe('render-delay');
    console.log('High-density screenshot triggered the frame-gap pause safeguard');
    await page.getByRole('button',{name:'Resume',exact:true}).click();
    await waitForPhase(page, 'racing');
  }

  // A fresh touch in just P3's corner must only activate that player.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[2]] });
  await page.waitForFunction(() => (window as any).__roadster.getState().players[2].thrustCount === 2);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const paused = await state(page); expect(paused.phase).toBe('paused'); expect(paused.raceInputs.active).toEqual([0, 0, 0, 0]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await waitForPhase(page, 'racing');
  expect((await state(page)).players.map((p: any) => p.thrustCount)).toEqual([1, 1, 2, 1]);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Restart race' }).click();
  await page.getByRole('button', { name: 'Draw new lines' }).click();
  expect((await state(page)).phase).toBe('drawing'); expect((await state(page)).turn).toBe(0); expect((await state(page)).confirmedCount).toBe(0);
  expect(errors).toEqual([]); await cdp.detach(); await context.close();
});

test('three players require three ready pads and expose only their three controls', async ({ page }) => {
  await planFriends(page, 3);
  await expect(page.locator('.racer-pad')).toHaveCount(3);
  await page.keyboard.press('KeyA'); await page.keyboard.press('KeyL');
  expect((await state(page)).phase).toBe('ready');
  await page.keyboard.press('KeyP'); expect((await state(page)).phase).toBe('ready');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await state(page)).readyPlayers).toEqual([false, false, false]);
  await page.keyboard.press('KeyA'); await page.keyboard.press('KeyL');
  await page.keyboard.press('KeyQ'); expect((await state(page)).phase).toBe('countdown');
  await waitForPhase(page, 'racing');
  await page.keyboard.press('KeyL');
  await page.waitForFunction(() => (window as any).__roadster.getState().players[1].thrustCount === 1);
  expect((await state(page)).players.map((p: any) => p.thrustCount)).toEqual([0, 1, 0]);
});
