import { expect, test, type Page } from '@playwright/test';

async function drawRecorded(page: Page, shape: 'backtrack' | 'wide', touch = false) {
  const points = await page.evaluate(shape => {
    const game = (window as any).__roadster, track = game.getTrack(), base = track.centerline;
    const world = shape === 'backtrack' ? [...base.slice(0, 31), ...base.slice(14, 30).reverse(), ...base.slice(15, 31), ...base.slice(31)] : base.map((p: any, i: number) => {
      const a = base[Math.max(0, i - 1)], b = base[Math.min(base.length - 1, i + 1)], length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const fraction = (track.distances[i] - 8) / 72, offset = fraction > 0 && fraction < 1 ? Math.sin(fraction * Math.PI) ** 2 * 12 : 0;
      return { x: p.x + (b.z - a.z) / length * offset, z: p.z - (b.x - a.x) / length * offset };
    });
    let distance = 0;
    return world.map((p: any, i: number) => { if (i) distance += Math.hypot(p.x - world[i - 1].x, p.z - world[i - 1].z); return { ...game.project(p), time: distance / (track.length / 7) }; }).filter((_: unknown, i: number) => i % 2 === 0 || i === world.length - 1);
  }, shape);
  expect(await page.evaluate(points => points.filter(p => document.elementFromPoint(p.x, p.y)?.id !== 'race-canvas'), points)).toEqual([]);
  const cdp = await page.context().newCDPSession(page), epoch = Date.now() / 1000;
  if (touch) {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0].x, y: points[0].y, id: 1 }], timestamp: epoch });
    for (const p of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y, id: 1 }], timestamp: epoch + p.time });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: epoch + points.at(-1)!.time });
  } else {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: points[0].x, y: points[0].y, timestamp: epoch });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: points[0].x, y: points[0].y, button: 'left', buttons: 1, clickCount: 1, timestamp: epoch });
    for (const p of points.slice(1)) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, button: 'left', buttons: 1, timestamp: epoch + p.time });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: points.at(-1)!.x, y: points.at(-1)!.y, button: 'left', buttons: 0, clickCount: 1, timestamp: epoch + points.at(-1)!.time });
  }
  await cdp.detach();
  await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
}

test('backtracking is cleaned from an actual mouse stroke with an uncluttered preview', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.getByRole('button', { name: "Time Trial" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  const reference = await page.evaluate(() => (window as any).__roadster.getRoute());
  await page.getByRole('button', { name: 'Redraw', exact: true }).click();
  await drawRecorded(page, 'backtrack');
  await expect(page.locator('#panel p')).toHaveCount(0);
  const corrected = await page.evaluate(() => (window as any).__roadster.getRoute());
  expect(corrected.cleanup.removedPoints).toBeGreaterThanOrEqual(14);
  // This replay uses half the fixture's samples; allow <1 m of smoothing/resampling difference.
  expect(Math.abs(corrected.length - reference.length)).toBeLessThan(1);
  expect(Math.max(...corrected.points.map((p: any, i: number) => Math.abs(p.desiredSpeed - reference.points[Math.round(i / (corrected.points.length - 1) * (reference.points.length - 1))].desiredSpeed)))).toBeLessThan(0.5);
  await page.keyboard.press('KeyT'); expect(await page.evaluate(() => (window as any).__roadster.getRoute())).toEqual(corrected);
  await page.screenshot({ path: 'artifacts/route-cleaned.png' }); expect(errors).toEqual([]);
});

test('a phone touch stroke can plan a substantially wider line through sand', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.getByRole('button', { name: "Time Trial" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await drawRecorded(page, 'wide', true);
  const maximum = await page.evaluate(() => {
    const game = (window as any).__roadster, route = game.getRoute(), track = game.getTrack();
    return Math.max(...route.points.map((p: any) => Math.min(...track.centerline.slice(1).map((b: any, i: number) => {
      const a = track.centerline[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
    }))));
  });
  expect(maximum).toBeGreaterThan(11);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  await page.screenshot({ path: 'artifacts/route-wide-phone.png' });
  await page.getByRole('button', { name: 'Race this line' }).click();
  await page.waitForFunction(() => { const s = (window as any).__roadster.getState(); return s.phase === 'racing' && s.race.sandAmount > 0.5; });
  await page.screenshot({ path: 'artifacts/route-wide-racing.png' });
  expect(errors).toEqual([]); await context.close();
});
