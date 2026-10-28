import { test, expect } from '@playwright/test';

for (const circuit of ['coastal-launch', 'launchsite', 'golden-gate', 'santa-monica', 'grand-canyon', 'la-nights']) {
  test(`${circuit}: expanded touchdown region stays visible and accepts a real touch lead-in`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(`/?circuit=${circuit}`);
    await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
    await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
    await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
    for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const data = await page.evaluate(() => {
        const g = (window as any).__roadster, t = g.getTrack(), gate = t.startFinish;
        const at = (across: number, along: number) => ({ x: gate.center.x + gate.forward.x * along + gate.forward.z * across, z: gate.center.z + gate.forward.z * along - gate.forward.x * across });
        const corners = [-16, 16].flatMap(across => [-30, 8].map(along => g.project(at(across, along))));
        const r = document.querySelector('#course-space')!.getBoundingClientRect();
        return { corners, rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
          points: [at(15.5, -29), at(5, -10), at(0, -2), ...t.centerline.filter((_: unknown, i: number) => i % 2 === 0 || i === t.centerline.length - 1)].map(p => g.project(p)) };
      });
      for (const p of data.corners) {
        expect(p.x).toBeGreaterThanOrEqual(data.rect.left - 0.5); expect(p.x).toBeLessThanOrEqual(data.rect.right + 0.5);
        expect(p.y).toBeGreaterThanOrEqual(data.rect.top - 0.5); expect(p.y).toBeLessThanOrEqual(data.rect.bottom + 0.5);
      }
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...data.points[0], id: 7 }] });
      for (const p of data.points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 7 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
      await expect(page.getByRole('button', { name: 'Race this line', exact: true })).toBeVisible();
      expect(await page.evaluate(() => (window as any).__roadster.getState().route.leadInCount)).toBeGreaterThan(2);
      await page.getByRole('button', { name: 'Redraw', exact: true }).click();
    }
    await context.close();
  });
}
