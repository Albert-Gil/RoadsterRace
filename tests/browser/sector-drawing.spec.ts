import { expect, test, type Page } from '@playwright/test';

// Phone sector drawing with real touch input. Automation keeps the overview unless asked, so
// these pages opt in with ?sectors=on; the iPad-sized page checks that tablets are not zoomed.
const iphone = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 };

async function openDrawing(page: Page, circuit: string, query = '&sectors=on') {
  await page.goto(`/?circuit=${circuit}&graphics=low${query}`);
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster?.getGraphics().renderReady);
}
const roadPixels = (page: Page) => page.evaluate(() => {
  const g = (window as any).__roadster, s = g.getTrack().start, a = g.project(s), b = g.project({ x: s.x + 16, z: s.z }), c = g.project({ x: s.x, z: s.z + 16 });
  return Math.max(Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(c.x - a.x, c.y - a.y));
});

/** Draws from the end of the current line (or the start box) along the centreline while it stays on screen. */
async function strokeOnScreen(page: Page, from: number, t0: number) {
  const plan = await page.evaluate(([from]) => {
    const api = (window as any).__roadster, t = api.getTrack(), raw = api.getRawStroke(), cl = t.centerline, L = t.length;
    const ds = [0]; for (let i = 1; i < cl.length; i++) ds.push(ds[i - 1] + Math.hypot(cl[i].x - cl[i - 1].x, cl[i].z - cl[i - 1].z));
    const at = (s: number) => { s = ((s % L) + L) % L; let i = 0; while (i < ds.length - 2 && ds[i + 1] < s) i++; const u = (s - ds[i]) / ((ds[i + 1] - ds[i]) || 1); return { x: cl[i].x + (cl[i + 1].x - cl[i].x) * u, z: cl[i].z + (cl[i + 1].z - cl[i].z) * u }; };
    const pts = [api.project(raw.length ? raw[raw.length - 1] : at(-4))];
    for (let s = from + 2; s <= L + 6; s += 2) { const q = api.project(at(s)); if (q.x < 30 || q.y < 20 || q.x > innerWidth - 110 || q.y > innerHeight - 20) break; pts.push(q); }
    return { pts, to: from + 2 * (pts.length - 1) };
  }, [from]);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, pt: { x: number; y: number } | null, t: number) => cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: pt ? [{ x: pt.x, y: pt.y, id: 1 }] : [], timestamp: t });
  await touch('touchStart', plan.pts[0], t0);
  for (let i = 1; i < plan.pts.length; i++) await touch('touchMove', plan.pts[i], t0 + i * .03);
  await touch('touchEnd', null, t0 + plan.pts.length * .03 + .02);
  await cdp.detach();
  return plan.to;
}

test('an iPhone draws Santa Monica in zoomed sectors, lifting and continuing, then previews the joined lap', async ({ browser }) => {
  test.setTimeout(600000);
  const context = await browser.newContext(iphone), page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openDrawing(page, 'santa-monica', '&sectors=off');
  const overview = await roadPixels(page);
  await openDrawing(page, 'santa-monica');
  await expect(page.locator('.planning-note')).toContainText('Sector 1 of 2');
  expect(await roadPixels(page)).toBeGreaterThan(overview * 1.4);
  let done = 0, strokes = 0;
  const L = await page.evaluate(() => (window as any).__roadster.getTrack().length);
  while (await page.evaluate(() => (window as any).__roadster.getState().phase) === 'drawing' && strokes < 12) {
    await page.waitForFunction(() => !(window as any).__roadster.getWorld().cameraMoving);
    done = await strokeOnScreen(page, done, 1000 + strokes * 100); strokes++;
    if (strokes === 1) {
      await expect(page.locator('.planning-note')).toContainText('glowing end');
      // Undo removes the stroke and returns to a fresh start; draw it again.
      await page.locator('[data-action="undo-sector"]').click();
      expect(await page.evaluate(() => (window as any).__roadster.getRawStroke().length)).toBe(0);
      done = 0; await page.waitForFunction(() => !(window as any).__roadster.getWorld().cameraMoving);
      done = await strokeOnScreen(page, done, 5000);
    }
  }
  expect(strokes).toBeGreaterThan(1);
  expect(done).toBeGreaterThan(L);
  await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
  // The preview returns to the whole-circuit overview.
  expect(Math.abs(await roadPixels(page) - overview)).toBeLessThan(overview * .1);
  expect(errors).toEqual([]);
  await context.close();
});

test('iPad-sized touch screens and desktops keep the single-stroke overview', async ({ browser }) => {
  for (const options of [{ viewport: { width: 1133, height: 744 }, hasTouch: true, isMobile: true }, { viewport: { width: 1366, height: 1024 }, hasTouch: true, isMobile: true }, { viewport: { width: 800, height: 450 } }]) {
    const context = await browser.newContext(options), page = await context.newPage();
    // Automation alone would also keep the overview; `auto` is what a real device runs.
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await openDrawing(page, 'lax', '');
    await expect(page.locator('.planning-note')).toHaveCount(0);
    await context.close();
  }
  const context = await browser.newContext(iphone), page = await context.newPage();
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await openDrawing(page, 'lax', '');
  await expect(page.locator('.planning-note')).toContainText('Sector 1 of 4');
  await openDrawing(page, 'coastal-launch', '');
  await expect(page.locator('.planning-note')).toHaveCount(0);
  await context.close();
});
