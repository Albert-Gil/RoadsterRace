import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

async function open(page: Page) {
  await page.goto('/'); await page.waitForFunction(() => (window as any).__roadster?.getGraphics().renderReady);
}
async function stroke(page: Page, blocked: boolean) {
  const points = await page.evaluate(blocked => {
    const game = (window as any).__roadster, track = game.getTrack(); let time = 0;
    return track.centerline.map((p: any, i: number, all: any[]) => {
      if (i) time += Math.hypot(p.x - all[i - 1].x, p.z - all[i - 1].z) / (i < all.length / 3 ? 7 : 95);
      const f = (p.x + 16) / 30;
      const z = p.z + (blocked && p.z < -27 && f > 0 && f < 1 ? Math.sin(f * Math.PI) * 15 : 0);
      return { ...game.project({ x: p.x, z }), time };
    }).filter((_: any, i: number) => i % 2 === 0 || i === track.centerline.length - 1);
  }, blocked);
  const cdp = await page.context().newCDPSession(page), epoch = Date.now() / 1000;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: points[0].x, y: points[0].y, button: 'left', buttons: 1, clickCount: 1, timestamp: epoch });
  for (const p of points.slice(1)) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, buttons: 1, timestamp: epoch + p.time });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: points.at(-1)!.x, y: points.at(-1)!.y, button: 'left', buttons: 0, clickCount: 1, timestamp: epoch + points.at(-1)!.time });
  await cdp.detach();
}

test('solid crossing stays visible and cannot be confirmed; pace retains slow and fast sections', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: "Let's race" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await stroke(page, true);
  await expect(page.locator('.instruction')).toContainText('inner barrier');
  await expect(page.getByRole('button', { name: 'Race this line' })).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/overhaul/blocked-line.png' });
  await stroke(page, false);
  await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
  const data = await page.evaluate(() => ({ route: (window as any).__roadster.getRoute(), graphics: (window as any).__roadster.getGraphics() }));
  expect(Math.min(...data.route.points.map((p: any) => p.desiredSpeed))).toBeLessThan(11);
  expect(Math.max(...data.route.points.map((p: any) => p.desiredSpeed))).toBeGreaterThan(23);
  expect(data.graphics.pace).toEqual({ slow: '#ff4c48', medium: '#ffd15a', fast: '#4ce879', width: 10, outlineWidth: 14, racingWidth: 8, racingOutlineWidth: 11 });
  expect(data.graphics.carTriangles).toBeLessThanOrEqual(10000);
  await page.screenshot({ path: 'artifacts/overhaul/pace-preview.png' });
});

for (const count of [3, 4]) test(`${count} drivers finish both laps with the upgraded car and scenery`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  if (count === 3) await page.setViewportSize({ width: 1024, height: 768 });
  await open(page); await page.getByRole('button', { name: 'Race with friends' }).click();
  await page.getByRole('button', { name: `${count} players`, exact: true }).click();
  await page.getByRole('button', { name: 'Plan your lines' }).click();
  for (let i = 0; i < count; i++) {
    if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}` }).click();
    await page.evaluate(() => (window as any).__roadster.usePracticeLine());
    await page.getByRole('button', { name: 'Lock in my line' }).click();
  }
  for (let i = 0; i < count; i++) await page.getByRole('button', { name: `Player ${i + 1} thrust`, exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'racing');
  const samples: any[] = [];
  for (let j = 0; j < 8; j++) {
    if (j === 2) for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP'].slice(0, count)) await page.keyboard.press(key);
    await page.waitForTimeout(150); samples.push(await page.evaluate(() => (window as any).__roadster.getGraphics()));
  }
  await page.screenshot({ path: `artifacts/overhaul/${count}-player-race.png` });
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'results', undefined, { timeout: 120000 });
  const state = await page.evaluate(() => (window as any).__roadster.getState());
  expect(state.players.every((p: any) => p.finished && p.lapTimes.length === 2)).toBe(true);
  expect(errors).toEqual([]); expect(Math.max(...samples.map(s => s.drawCalls))).toBeLessThanOrEqual(150);
  await page.screenshot({ path: `artifacts/overhaul/${count}-player-results.png` });
  writeFileSync(`artifacts/overhaul/${count}-player-report.json`, JSON.stringify({ samples, players: state.players, errors }, null, 2));
});
