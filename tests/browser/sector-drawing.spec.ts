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
async function strokeOnScreen(page: Page, from: number, t0: number, interval = .03, settle = 0) {
  const plan = await page.evaluate(([from]) => {
    const api = (window as any).__roadster, t = api.getTrack(), raw = api.getRawStroke(), cl = t.centerline, L = t.length;
    const ds = [0]; for (let i = 1; i < cl.length; i++) ds.push(ds[i - 1] + Math.hypot(cl[i].x - cl[i - 1].x, cl[i].z - cl[i - 1].z));
    const at = (s: number) => { s = ((s % L) + L) % L; let i = 0; while (i < ds.length - 2 && ds[i + 1] < s) i++; const u = (s - ds[i]) / ((ds[i + 1] - ds[i]) || 1); return { x: cl[i].x + (cl[i + 1].x - cl[i].x) * u, z: cl[i].z + (cl[i + 1].z - cl[i].z) * u }; };
    const pts = [api.project(raw.length ? raw[raw.length - 1] : at(-4))];
    const portrait = innerHeight > innerWidth;
    const right = innerWidth - (portrait ? 20 : 110), bottom = innerHeight - (portrait ? 110 : 20);
    for (let s = from + 2; s <= L + 6; s += 2) { const q = api.project(at(s)); if (q.x < 30 || q.y < 20 || q.x > right || q.y > bottom) break; pts.push(q); }
    return { pts, to: from + 2 * (pts.length - 1) };
  }, [from]);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, pt: { x: number; y: number } | null, t: number) => cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: pt ? [{ x: pt.x, y: pt.y, id: 1 }] : [], timestamp: t });
  await touch('touchStart', plan.pts[0], t0);
  for (let i = 1; i < plan.pts.length; i++) await touch('touchMove', plan.pts[i], t0 + settle + i * interval);
  await touch('touchEnd', null, t0 + plan.pts.length * interval + .02 + 2 * settle);
  await cdp.detach();
  return plan.to;
}

test('an iPhone draws Santa Monica in zoomed sectors, lifting and continuing, then previews the joined lap', async ({ browser }) => {
  test.setTimeout(600000);
  const context = await browser.newContext(iphone), page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  // Hold one valid result to exercise Undo while a slower device is still preparing the preview.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', event => {
          const host = window as any;
          if (!host.holdPreview || !event.data?.result?.ok) return;
          host.holdPreview = false;
          event.stopImmediatePropagation();
          host.releasePreview = () => this.dispatchEvent(new MessageEvent('message', { data: event.data }));
        });
      }
    };
  });
  await openDrawing(page, 'santa-monica', '&sectors=off');
  const overview = await roadPixels(page);
  await openDrawing(page, 'santa-monica');
  await expect(page.locator('.planning-note')).toContainText('Circuit overview');
  expect(await roadPixels(page)).toBeCloseTo(overview, 3);
  await page.getByRole('button', {name:'Start sector 1'}).click();
  await page.waitForFunction(() => !(window as any).__roadster.getWorld().cameraMoving);
  await expect(page.locator('.planning-note')).toContainText('Sector 1 of 2');
  expect(await roadPixels(page)).toBeGreaterThan(overview * 1.4);
  let done = 0, strokes = 0;
  const L = await page.evaluate(() => (window as any).__roadster.getTrack().length);
  await page.evaluate(() => { (window as any).holdPreview = true; });
  let lastStart = 0;
  while (await page.evaluate(() => (window as any).__roadster.getState().phase) === 'drawing' && strokes < 12) {
    await page.waitForFunction(() => !(window as any).__roadster.getWorld().cameraMoving);
    lastStart = done;
    done = await strokeOnScreen(page, done, 1000 + strokes * 100); strokes++;
    if (strokes === 1) {
      await expect(page.locator('.planning-note')).toContainText('glowing end');
      // Undo removes the stroke and returns to a fresh start; draw it again.
      await page.locator('[data-action="undo-sector"]').click();
      expect(await page.evaluate(() => (window as any).__roadster.getRawStroke().length)).toBe(0);
      done = 0; await page.waitForFunction(() => !(window as any).__roadster.getWorld().cameraMoving);
      done = await strokeOnScreen(page, done, 5000);
    }
    await page.waitForFunction(() => (window as any).releasePreview ||
      (window as any).__roadster.getWorld().scene.getMeshByName('continue-handle')?.isVisible);
    if (await page.evaluate(() => !!(window as any).releasePreview)) break;
  }
  expect(strokes).toBeGreaterThan(1);
  expect(done).toBeGreaterThan(L);
  await page.locator('[data-action="undo-sector"]').click();
  const afterUndo = await page.evaluate(() => (window as any).__roadster.getRawStroke().length);
  await page.evaluate(() => (window as any).releasePreview());
  expect(await page.locator('main').getAttribute('data-phase')).toBe('drawing');
  expect(await page.evaluate(() => (window as any).__roadster.getRawStroke().length)).toBe(afterUndo);
  await page.waitForFunction(() => !(window as any).__roadster.getWorld().cameraMoving);
  await strokeOnScreen(page, lastStart, 8000);
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
  await expect(page.locator('.planning-note')).toContainText('4 sectors');
  await openDrawing(page, 'coastal-launch', '');
  await expect(page.locator('.planning-note')).toHaveCount(0);
  await context.close();
});

test('drawing view persists and portrait guidance clears the controls', async ({ browser }) => {
  const context = await browser.newContext({ ...iphone, viewport: { width: 375, height: 812 } });
  try {
    const page = await context.newPage();
    await page.goto('/?circuit=lax');
    const setup = () => page.getByRole('button', { name: 'Time Trial', exact: true }).click();
    const start = () => page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
    await setup();
    await page.getByRole('button', { name: 'Whole circuit', exact: true }).click();
    await page.reload();
    await setup();
    await expect(page.getByRole('button', { name: 'Whole circuit', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await start();
    await expect(page.getByRole('button', { name: 'Start again' })).toBeVisible();
    await expect(page.locator('.planning-note')).toHaveCount(0);
    await page.getByRole('button', { name: 'Race setup' }).click();
    await page.getByRole('button', {name:'By sector', exact:true}).click();
    await start();
    await page.getByRole('button', {name:'Draw whole circuit'}).click();
    await expect(page.getByRole('button', {name:'Start again'})).toBeVisible();
    await page.getByRole('button', { name: 'Race setup' }).click();
    await start();
    await page.getByRole('button', {name:'Start sector 1'}).click();
    const note = page.locator('.planning-note');
    await expect(note.locator('strong')).toHaveText('Sector 1 of 4');
    const bottom = await note.evaluate(el => el.getBoundingClientRect().bottom);
    expect(bottom).toBeLessThanOrEqual(await page.locator('#course-space').evaluate(el => el.getBoundingClientRect().top));
    expect(bottom).toBeLessThan(await page.locator('.panel-actions').evaluate(el => el.getBoundingClientRect().top));
    expect(await note.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
    await page.screenshot({path:test.info().outputPath('portrait-sector-header.png')});
  } finally { await context.close(); }
});

for (const portrait of [false, true]) test(`LAX ${portrait ? 'portrait' : 'landscape'} preserves earlier sectors on Retry and Previous and carries pace through joins`, async ({ browser }) => {
  test.setTimeout(360000);
  const context = await browser.newContext({ ...iphone, viewport: portrait ? {width:390, height:844} : iphone.viewport });
  try {
    const page = await context.newPage();
    await openDrawing(page, 'lax');
    await page.getByRole('button', { name: 'Start sector 1' }).click();
    let progress = 0, clock = 1000;
    const joins: number[] = [];
    let secondSectorJoin: number | undefined;
    for (let i = 0; i < 18; i++) {
      await page.waitForFunction(() => !(window as any).__roadster.getWorld().cameraMoving);
      const heading = page.locator('.planning-note strong');
      if (secondSectorJoin === undefined && await heading.textContent() === 'Sector 2 of 4') {
        secondSectorJoin = progress;
        if (portrait) {
          const header = await page.locator('.planning-note').boundingBox();
          const retry = await page.getByRole('button', {name:'Restart this sector'}).boundingBox();
          const previous = await page.getByRole('button', {name:'Edit previous sector'}).boundingBox();
          expect(header!.y + header!.height).toBeLessThan(Math.min(retry!.y, previous!.y));
          await page.screenshot({path:test.info().outputPath('lax-portrait-sector-two.png')});
        }
      }
      progress = await strokeOnScreen(page, progress, clock, .009, .18);
      clock += 100;
      await page.waitForFunction(() => document.querySelector('main')?.dataset.phase === 'preview' ||
        (window as any).__roadster.getWorld().scene.getMeshByName('continue-handle')?.isVisible);
      if (await page.locator('main').getAttribute('data-phase') === 'preview') break;
      joins.push(progress);
    }
    await expect(page.getByRole('button', {name:'Race this line'})).toBeVisible();
    expect(joins).toContain(secondSectorJoin);
    const result = await page.evaluate((joins) => {
      const api = (window as any).__roadster;
      const points = api.getRoute().points as {distance:number; desiredSpeed:number}[];
      return joins.map(at => points.filter(p => Math.abs(p.distance - at) < 6).map(p => p.desiredSpeed));
    }, joins.filter(s => s > 20 && s < progress - 20));
    expect(result.length).toBeGreaterThan(2);
    await test.info().attach('LAX join speeds in metres per second', {
      body: JSON.stringify(result.map(speeds => Math.min(...speeds))), contentType: 'application/json',
    });
    for (const speeds of result) {
      expect(speeds.length).toBeGreaterThan(0);
      expect(Math.min(...speeds)).toBeGreaterThan(27);
    }
    const raw = () => page.evaluate(() => (window as any).__roadster.getRawStroke() as {x:number;z:number;time:number}[]);
    const full = await raw();
    await page.getByRole('button', {name:'Restart this sector'}).click();
    await expect(page.locator('.planning-note')).toContainText('Sector 4 of 4');
    const anchor = await page.evaluate(() => {
      const api = (window as any).__roadster;
      return {point: api.project(api.getRawStroke().at(-1)), moving: api.getWorld().cameraMoving};
    });
    expect(anchor.moving).toBe(true);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:anchor.point.x, y:anchor.point.y, id:1}]});
    expect(await page.evaluate(() => {
      const world = (window as any).__roadster.getWorld();
      return !world.cameraMoving && !world.scene.getMeshByName('continue-handle').isVisible;
    })).toBe(true);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchCancel', touchPoints:[]});
    await cdp.detach();
    const fourth = await raw();
    expect(fourth.length).toBeLessThan(full.length);
    expect(fourth).toEqual(full.slice(0, fourth.length));
    await page.getByRole('button', {name:'Edit previous sector'}).click();
    await expect(page.locator('.planning-note')).toContainText('Sector 3 of 4');
    const third = await raw();
    expect(third.length).toBeLessThan(fourth.length);
    expect(third.length).toBeGreaterThan(30);
    expect(third).toEqual(full.slice(0, third.length));
    progress = await page.evaluate(() => {
      const api = (window as any).__roadster, track = api.getTrack(), end = api.getRawStroke().at(-1);
      let best = Infinity, at = 0;
      track.centerline.forEach((point: {x:number;z:number}, i:number) => {
        const d = Math.hypot(point.x - end.x, point.z - end.z);
        if (d < best) { best = d; at = track.distances[i]; }
      });
      return at;
    });
    for (let i = 0; i < 12; i++) {
      await page.waitForFunction(() => !(window as any).__roadster.getWorld().cameraMoving);
      progress = await strokeOnScreen(page, progress, clock, .02);
      clock += 100;
      await page.waitForFunction(() => document.querySelector('main')?.dataset.phase === 'preview' ||
        (window as any).__roadster.getWorld().scene.getMeshByName('continue-handle')?.isVisible);
      if (await page.locator('main').getAttribute('data-phase') === 'preview') break;
    }
    await expect(page.getByRole('button', {name:'Race this line'})).toBeVisible();
    const revised = await raw();
    expect(revised.slice(0, third.length)).toEqual(third);
  } finally { await context.close(); }
});
