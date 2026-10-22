import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('artifacts/car-rotation', { recursive: true });

async function proportional(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const p = (window as any).__roadster.getShowcaseProjection();
    return Math.abs(p.aspect / p.expectedAspect - 1);
  })).toBeLessThan(0.002);
  await expect.poll(async () => page.evaluate(() => {
    const p = (window as any).__roadster.getShowcaseProjection();
    return Math.abs((p.renderWidth / p.renderHeight) / (p.cssWidth / p.cssHeight) - 1);
  })).toBeLessThan(0.002);
}

test('car proportions follow delayed phone rotation layout and toolbar resizing', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__roadster?.getGraphics().renderReady);
  await proportional(page);

  // Safari's layout/visual viewport can settle after its window resize event.
  // Hold the old height through rotation, then change CSS without a new event.
  await page.locator('main').evaluate(main => main.style.height = '844px');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.locator('main').evaluate(main => main.style.height = '390px');
  await proportional(page);
  await page.screenshot({ path: 'artifacts/car-rotation/welcome-landscape-after.png' });

  // Canvas-only resizing also represents browser toolbar height changes.
  await page.locator('main').evaluate(main => main.style.height = '320px');
  await proportional(page);
  await page.getByRole('button', { name: "Let's race" }).click();
  await proportional(page);
  await page.locator('main').evaluate(main => main.style.removeProperty('height'));
  for (const viewport of [{ width: 390, height: 844 }, { width: 667, height: 320 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport); await proportional(page);
  }
  await page.getByRole('button', { name: 'Golden Gate circuit', exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  await page.setViewportSize({ width: 844, height: 390 }); await proportional(page);
  await page.screenshot({ path: 'artifacts/car-rotation/setup-landscape-after.png' });
  expect(errors).toEqual([]);
  await context.close();
});
