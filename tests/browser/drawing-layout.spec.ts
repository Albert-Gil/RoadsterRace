import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';
mkdirSync('artifacts/drawing-layout', { recursive: true });
const cases = [
  { circuit: 'la-nights', width: 844, height: 390 },
  { circuit: 'la-nights', width: 390, height: 844 },
  { circuit: 'la-nights', width: 1024, height: 768 },
  { circuit: 'grand-canyon', width: 844, height: 390 },
  { circuit: 'grand-canyon', width: 390, height: 844 },
  { circuit: 'grand-canyon', width: 1024, height: 768 },
  { circuit: 'grand-canyon', width: 1440, height: 900 },
  { circuit: 'coastal-launch', width: 844, height: 390 },
  { circuit: 'orbital-launchyard', width: 844, height: 390 },
  { circuit: 'golden-gate', width: 844, height: 390 },
  { circuit: 'golden-gate', width: 390, height: 844 },
  { circuit: 'golden-gate', width: 320, height: 568 },
  { circuit: 'golden-gate', width: 1024, height: 768 },
  { circuit: 'golden-gate', width: 1440, height: 900 },
  { circuit: 'orbital-launchyard', width: 667, height: 320 },
];
for (const spec of cases) test(`edge-to-edge ${spec.circuit} ${spec.width}x${spec.height} supports touch and fixed race framing`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 2, hasTouch: true, isMobile: spec.width < 1000 });
  const page = await context.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`/?circuit=${spec.circuit}`); await page.getByRole('button', { name: "Time Trial" }).click();
  await page.getByRole('button', { name: 'Draw racing line' }).click();
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady); await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().roadVisible);
  await expect(page.getByRole('button', { name: 'Try a practice line' })).toHaveCount(0);
  await expect(page.locator('#panel p, .drawing-legend, .route-stats, .instruction')).toHaveCount(0);
  await expect(page.locator('.brand')).toBeHidden(); await expect(page.locator('.topbar')).toBeHidden();
  const plan = await page.evaluate(() => {
    const game = (window as any).__roadster, t = game.getTrack();
    const points = t.centerline.map((p: any, i: number) => ({ ...game.project(p), time: t.distances[i] / t.length * 7 }));
    const g = t.startFinish;
    const gate = [-1, 1].flatMap(side => [0, -12].map(along => game.project({ x: g.center.x + g.forward.x * along + g.forward.z * g.width / 2 * side, z: g.center.z + g.forward.z * along - g.forward.x * g.width / 2 * side })));
    const blocked = [...points, ...gate].filter(p => p.x < 0 || p.x > innerWidth || p.y < 0 || p.y > innerHeight || document.elementFromPoint(p.x, p.y)?.id !== 'race-canvas');
    const controls = [...document.querySelectorAll<HTMLButtonElement>('#panel button')].map(b => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    return { points, blocked, controls, projectionError: game.getProjectionError(), scroll: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight + 1 };
  });
  expect(plan.blocked).toEqual([]); expect(plan.projectionError).toBeLessThan(0.01); expect(plan.scroll).toBe(false);
  for (const b of plan.controls) { expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44); expect(b.x + b.width).toBeLessThanOrEqual(spec.width + 1); expect(b.y + b.height).toBeLessThanOrEqual(spec.height + 1); }
  await page.screenshot({ path: `artifacts/drawing-layout/${spec.circuit}-${spec.width}-drawing.png` });
  const cdp = await context.newCDPSession(page), epoch = Date.now() / 1000;
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const points = plan.points.filter((_: any, i: number) => i % 2 === 0 || i === plan.points.length - 1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0].x, y: points[0].y, id: 1 }], timestamp: epoch });
  for (const p of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y, id: 1 }], timestamp: epoch + p.time });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: epoch + 7 }); await cdp.detach();
  await expect(page.getByRole('button', { name: 'Race this line' })).toBeVisible();
  await expect(page.locator('#panel p, .route-stats')).toHaveCount(0);
  const preview = await page.evaluate(() => { const g = (window as any).__roadster; return { points: g.getTrack().centerline.map((p: any) => g.project(p)), route: g.getState().route }; });
  expect(preview.route.drawingDuration).toBeCloseTo(7, 1);
  const delta = (points: any[]) => Math.max(...points.map((p: any, i: number) => Math.hypot(p.x - plan.points[i].x, p.y - plan.points[i].y)));
  expect(delta(preview.points)).toBeLessThan(0.001);
  await page.screenshot({ path: `artifacts/drawing-layout/${spec.circuit}-${spec.width}-preview.png` });
  await page.getByRole('button', { name: 'Race this line' }).click();
  await waitForPhase(page, 'racing');
  const racing = await page.evaluate(() => { const g = (window as any).__roadster; return g.getTrack().centerline.map((p: any) => g.project(p)); });
  expect(delta(racing)).toBeLessThan(0.001); expect(errors).toEqual([]);
  writeFileSync(`artifacts/drawing-layout/${spec.circuit}-${spec.width}-report.json`, JSON.stringify({ spec, controls: plan.controls, track: { width: Math.max(...plan.points.map((p: any) => p.x)) - Math.min(...plan.points.map((p: any) => p.x)), height: Math.max(...plan.points.map((p: any) => p.y)) - Math.min(...plan.points.map((p: any) => p.y)) }, previewDelta: delta(preview.points), raceDelta: delta(racing), errors }, null, 2));
  await context.close();
});

test('compact portrait multiplayer controls keep player identity and private handoffs', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await page.goto('/?circuit=golden-gate');
  await page.getByRole('button', { name: 'Multiplayer' }).click(); await page.getByRole('button', { name: '4 players', exact: true }).click();
  await page.getByRole('button', { name: 'Plan your lines' }).click();
  for (let i = 0; i < 4; i++) {
    if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}` }).click();
    await expect(page.locator('.planning-driver .player-chip')).toHaveText(String(i + 1));
    expect(await page.evaluate(() => (window as any).__roadster.getState().visibleRouteCount)).toBe(0);
    await expect(page.getByRole('button', { name: 'Try a practice line' })).toHaveCount(0);
    await page.evaluate(() => (window as any).__roadster.usePracticeLine());
    const boxes = await page.locator('#panel button').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
    for (const box of boxes) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); expect(box.x + box.width).toBeLessThanOrEqual(320); expect(box.y + box.height).toBeLessThanOrEqual(568); }
    await page.getByRole('button', { name: 'Lock in my line', exact: true }).click();
    if (i < 3) expect(await page.evaluate(() => (window as any).__roadster.getState().visibleRouteCount)).toBe(0);
  }
  await expect(page.getByRole('heading', { name: 'Take your corner.' })).toBeVisible(); await context.close();
});
