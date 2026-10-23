import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('artifacts/polish', { recursive: true });
for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
  test(`larger phone thrust target, hidden race tags and explicit pause Home at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('/?circuit=santa-monica');
    await page.getByRole('button', { name: 'Solo Race', exact: true }).click();
    await page.getByLabel('Driver 1 name', { exact: true }).fill('Test Driver');
    await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
    await page.evaluate(() => (window as any).__roadster.usePracticeLine());
    await page.getByRole('button', { name: 'Race this line', exact: true }).click();
    await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'racing');
    const pad = await page.locator('#thrust-button').boundingBox();
    expect(pad!.width).toBe(56); expect(pad!.height).toBe(56);
    const sound = await page.locator('#sound-button').boundingBox();
    expect(pad!.x + pad!.width <= sound!.x || sound!.x + sound!.width <= pad!.x || pad!.y + pad!.height <= sound!.y || sound!.y + sound!.height <= pad!.y).toBe(true);
    if (viewport.height > viewport.width) {
      const hud = await page.locator('.race-hud').boundingBox(); expect(hud!.y + hud!.height).toBeLessThan(56);
    }

    const overlap = await page.evaluate(() => {
      const g = (window as any).__roadster, pad = document.querySelector('#thrust-button')!.getBoundingClientRect();
      return g.getTrack().centerline.some((p: any) => { const q = g.project(p); return q.x > pad.left && q.x < pad.right && q.y > pad.top && q.y < pad.bottom; });
    });
    expect(overlap).toBe(false);
    await expect(page.locator('.vehicle-label:visible')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__roadster.getGraphics().vehicleScale)).toBe(1.12);
    await page.locator('#thrust-button').click();
    await expect.poll(() => page.evaluate(() => (window as any).__roadster.getState().race.thrustCount)).toBe(1);
    await page.getByRole('button', { name: 'Pause race', exact: true }).click();
    const home = page.getByRole('button', { name: 'Home', exact: true }); await expect(home).toBeVisible();
    const size = await home.boundingBox(); expect(size!.height).toBeGreaterThanOrEqual(44);
    for (const b of await page.locator('#panel button').all()) { const r = await b.boundingBox(); expect(r!.x).toBeGreaterThanOrEqual(0); expect(r!.x+r!.width).toBeLessThanOrEqual(viewport.width); }
    await page.screenshot({ path: `artifacts/polish/pause-${viewport.width}.png` });
    await home.click(); await expect(page.getByRole('button', { name: 'Solo Race', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Solo Race', exact: true }).click();
    await expect(page.getByLabel('Driver 1 name', { exact: true })).toHaveValue('Test Driver');
    expect(errors).toEqual([]);
  });
}

for (const circuit of ['coastal-launch', 'launchsite', 'golden-gate', 'santa-monica']) {
  test(`${circuit} scenery stays readable and within the four-car rendering budget`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width: 844, height: 390 }); await page.goto(`/?circuit=${circuit}`);
    await page.getByRole('button', { name: 'Solo Race', exact: true }).click();
    await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
    await page.evaluate(() => (window as any).__roadster.usePracticeLine());
    await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
    await page.getByRole('button', { name: 'Race this line', exact: true }).click();
    await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'racing');
    await page.keyboard.press('Space');
    const metrics = await page.evaluate(async () => {
      const samples: any[] = [];
      for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); samples.push((window as any).__roadster.getGraphics()); }
      return { maximumDrawCalls: Math.max(...samples.map(s => s.drawCalls)), maximumVapor: Math.max(...samples.map(s => s.vaporParticles[0])), graphics: samples.at(-1), state: (window as any).__roadster.getState() };
    });
    expect(metrics.maximumDrawCalls).toBeLessThanOrEqual(150); expect(metrics.maximumVapor).toBeGreaterThan(0);
    expect(metrics.state.players).toHaveLength(4); expect(metrics.graphics.carTriangles).toBeLessThanOrEqual(10000);
    await expect(page.locator('.vehicle-label:visible')).toHaveCount(0);
    writeFileSync(`artifacts/polish/${circuit}-rendering.json`, JSON.stringify({ ...metrics, errors }, null, 2));
    await page.screenshot({ path: `artifacts/polish/${circuit}-racing.png` });
    expect(errors).toEqual([]);
  });
}

test('Home from a paused championship preserves completed progress through the exit safeguard', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Solo Race', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Draw your lines', exact: false }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Race this line', exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster.getState().phase === 'racing'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__roadster.getState().phase)).toBe('tour-exit');
  await expect(page.getByRole('button', { name: /Save.*exit/i })).toBeVisible();
});
