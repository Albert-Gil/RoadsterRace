import { expect, test } from '@playwright/test';

test('a fast drawn lap visibly slides off its route, slows in sand and steers back', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.waitForFunction(() => Boolean((window as any).__roadster));
  await page.getByRole('button', { name: "Let's race" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  const points = await page.evaluate(() => {
    const game = (window as any).__roadster, track = game.getTrack();
    return track.centerline.map((point: any, i: number) => ({ ...game.project(point), fraction: track.distances[i] / track.length }));
  });
  const cdp = await page.context().newCDPSession(page), epoch = Date.now() / 1000;
  // Replay a recorded two-second gesture through real mouse/Pointer Events.
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: points[0].x, y: points[0].y, timestamp: epoch });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: points[0].x, y: points[0].y, button: 'left', buttons: 1, clickCount: 1, timestamp: epoch });
  for (const point of points.slice(1)) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, button: 'left', buttons: 1, timestamp: epoch + point.fraction * 2 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: points.at(-1)!.x, y: points.at(-1)!.y, button: 'left', buttons: 0, clickCount: 1, timestamp: epoch + 2 });
  await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
  const drawing = await page.evaluate(() => (window as any).__roadster.getState().route.drawingDuration);
  expect(drawing).toBeLessThan(2.2);
  await page.getByRole('button', { name: 'Race this line' }).click();
  await page.waitForFunction(() => { const s = (window as any).__roadster.getState(); return s.phase === 'racing' && s.race.lineError > 7 && s.race.sandAmount > 0.5; }, undefined, { timeout: 30000 });
  const offRoad = await page.evaluate(() => (window as any).__roadster.getState());
  await expect(page.locator('.race-notice')).not.toContainText(/Drifting|less grip|steering back/i);
  expect(offRoad.race.surface).toBe('sand');
  expect(Math.hypot(offRoad.renderedPlayers[0].x - offRoad.race.position.x, offRoad.renderedPlayers[0].z - offRoad.race.position.z)).toBeLessThan(0.7);
  await page.screenshot({ path: 'artifacts/drift-sand.png' });
  const speedBefore = offRoad.race.speed;
  await page.waitForFunction(speed => { const s = (window as any).__roadster.getState().race; return s.sandAmount > 0.5 && s.speed < speed - 1; }, speedBefore);
  await page.waitForFunction(() => { const s = (window as any).__roadster.getState().race; return s.sandAmount === 0 && s.lineError < 1 && !s.drifting; }, undefined, { timeout: 30000 });
  await page.screenshot({ path: 'artifacts/drift-recovered.png' });
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'results', undefined, { timeout: 120000 });
  expect((await page.evaluate(() => (window as any).__roadster.getState())).race.lapTimes).toHaveLength(2);
  await expect(page.locator('#panel')).not.toContainText(/Carry less|drifts\.|clean line|well-timed/i);
  expect(errors).toEqual([]); await cdp.detach();
});
