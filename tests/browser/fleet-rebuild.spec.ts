import { test, expect } from '@playwright/test';
import { waitForPhase } from './ui';

test('four local drivers finish the rebuilt fleet with simultaneous abilities and readable phone framing', async ({ browser }) => {
 const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }), page = await context.newPage();
 const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto('/?circuit=san-diego-fleet&graphics=medium'); await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
 await page.getByRole('button', { name: '4 players', exact: true }).click(); await page.getByRole('button', { name: '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Plan your lines', exact: true }).click();
 await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
 for (let i = 0; i < 4; i++) {
  if (i) await page.locator('[data-action="take-turn"]').click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Lock in my line', exact: true }).click();
 }
 await waitForPhase(page, 'ready');
 const fit = await page.evaluate(() => {
  const g = (window as any).__roadster, t = g.getTrack(), r = document.querySelector('#course-space')!.getBoundingClientRect();
  return [t.centerline, ...t.hopShortcuts.map((h: any) => h.branch)].flat().every((p: any) => { const q = g.project(p); return q.x >= r.left && q.x <= r.right && q.y >= r.top && q.y <= r.bottom; });
 }); expect(fit).toBe(true);
 for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP']) await page.keyboard.press(key);
 await waitForPhase(page, 'racing'); expect(await page.evaluate(() => (window as any).__roadster.getState().ghostStartRemaining)).toBeGreaterThan(4);
 for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP', 'KeyZ', 'KeyK', 'KeyW', 'KeyO']) await page.keyboard.press(key);
 await page.waitForTimeout(200);
 expect(await page.evaluate(() => (window as any).__roadster.getGraphics().drawCalls)).toBeLessThanOrEqual(150);
 await page.screenshot({ path: 'artifacts/fleet-rebuild/four-player-phone.png' });
 await page.locator('[data-action="pause"]').click(); await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
 await page.getByRole('button', { name: 'Resume', exact: true }).click(); await waitForPhase(page, 'racing');
 const deadline = Date.now() + 120000;
 while (Date.now() < deadline) {
  const s = await page.evaluate(() => (window as any).__roadster.getState()); if (s.phase === 'results') break;
  if (s.phase === 'paused') { await page.getByRole('button', { name: 'Resume', exact: true }).click(); await waitForPhase(page, 'racing'); }
  await page.waitForTimeout(250);
 }
 await waitForPhase(page, 'results'); const state = await page.evaluate(() => (window as any).__roadster.getState());
 expect(state.players.every((p: any) => p.finished)).toBe(true); expect(state.contactCount).toBeGreaterThan(0); expect(state.ghostStartRemaining).toBe(0);
 expect(errors).toEqual([]); await context.close();
});
