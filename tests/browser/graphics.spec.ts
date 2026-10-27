import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { closeSettings, openSettings, waitForPhase } from './ui';

const graphics = (page: Page) => page.evaluate(() => (window as any).__roadster.getGraphics());
const ready = (page: Page) => page.waitForFunction(() => (window as any).__roadster?.getGraphics().renderReady, null, { timeout: 120000 });

test('automation starts on Low; the Graphics setting switches tiers live, persists and never changes the race', async ({ page }) => {
  test.setTimeout(600000); // High on software WebGL renders a few frames a minute.
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?circuit=coastal-launch'); await ready(page);
  let g = await graphics(page);
  expect(g.graphicsChoice).toBe('auto'); expect(g.graphicsLevel).toBe('low');
  expect(g.postPasses).toEqual([]); expect(g.sky).toBe('original-coastal-reflection-sky');
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click(); await waitForPhase(page, 'setup');
  await openSettings(page); const group = page.getByRole('group', { name: 'Graphics quality' });
  await expect(group.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Auto · Low on this device')).toBeVisible();

  await group.getByRole('button', { name: 'High' }).click(); await ready(page);
  g = await graphics(page);
  expect(g.graphicsLevel).toBe('high'); expect(g.postPasses).toEqual(['ambient-occlusion', 'pipeline']);
  expect(g.sky).toBe('sky-sky'); expect(g.shadowMapSize).toBe(2048);
  await expect(group.getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true');
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('roadster-race.graphics.v1') ?? '{}'))).toEqual({ choice: 'high', renderer: 'webgl2' });

  // The same practice line compiles identically whatever the tier.
  await closeSettings(page); await page.getByRole('button', { name: 'Draw racing line' }).click(); await waitForPhase(page, 'drawing');
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await waitForPhase(page, 'preview');
  const highRoute = await page.evaluate(() => (window as any).__roadster.getRoute());
  mkdirSync('artifacts/graphics', { recursive: true }); await ready(page); await page.screenshot({ path: 'artifacts/graphics/coastal-high.png' });

  await page.reload(); await ready(page);
  g = await graphics(page); expect(g.graphicsChoice).toBe('high'); expect(g.graphicsLevel).toBe('high');
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click(); await waitForPhase(page, 'setup');
  await openSettings(page); await page.getByRole('group', { name: 'Graphics quality' }).getByRole('button', { name: 'Medium' }).click(); await ready(page);
  g = await graphics(page); expect(g.graphicsLevel).toBe('medium'); expect(g.postPasses).toEqual([]); expect(g.sky).toBe('sky-sky');
  await closeSettings(page); await page.getByRole('button', { name: 'Draw racing line' }).click(); await waitForPhase(page, 'drawing');
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await waitForPhase(page, 'preview');
  const mediumRoute = await page.evaluate(() => (window as any).__roadster.getRoute());
  expect(mediumRoute.points).toEqual(highRoute.points);
  // Medium is the reference tier for the draw-call budget.
  await ready(page); const calls: number[] = []; for (let i = 0; i < 4; i++) { await page.waitForTimeout(150); calls.push((await graphics(page)).drawCalls); }
  expect(Math.max(...calls)).toBeLessThanOrEqual(90);
  expect(errors).toEqual([]);
});

test('every venue loads its real sky and surface detail on Ultra without errors', async ({ page }) => {
  test.setTimeout(1200000); await page.setViewportSize({ width: 640, height: 360 }); // Ultra is slow on software WebGL.

  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  mkdirSync('artifacts/graphics', { recursive: true });
  for (const [circuit, sky] of [['coastal-launch', 'sky-sky'], ['orbital-launchyard', 'sky-dawn'], ['golden-gate', 'sky-sky'], ['santa-monica', 'sky-sunset'], ['grand-canyon', 'sky-dawn'], ['la-nights', 'sky-night']]) {
    await page.goto(`/?circuit=${circuit}&graphics=ultra`); await ready(page);
    const g = await graphics(page);
    expect(g.graphicsLevel).toBe('ultra'); expect(g.sky).toBe(sky); expect(g.shadowMapSize).toBe(4096);
    expect(g.postPasses).toEqual(['ambient-occlusion', 'screen-reflections', 'pipeline']);
    await page.screenshot({ path: `artifacts/graphics/${circuit}-ultra-welcome.png` });
  }
  expect(errors).toEqual([]);
});

test('the renderer setting reloads into WebGPU when available and always returns to WebGL 2', async ({ page }) => {
  test.setTimeout(400000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?circuit=coastal-launch'); await ready(page);
  expect((await graphics(page)).renderer).toBe('webgl2');
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click(); await waitForPhase(page, 'setup');
  await openSettings(page); const renderer = page.getByRole('group', { name: 'Renderer' });
  await expect(renderer.getByRole('button', { name: 'WebGL 2' })).toHaveAttribute('aria-pressed', 'true');
  await Promise.all([page.waitForEvent('load'), renderer.getByRole('button', { name: 'WebGPU (beta)' }).click()]);
  await ready(page);
  const gpu = await graphics(page); // WebGPU where the browser offers an adapter, otherwise the WebGL 2 fallback.
  expect(['webgpu', 'webgl2']).toContain(gpu.renderer);
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click(); await waitForPhase(page, 'setup'); await openSettings(page);
  if (gpu.renderer === 'webgl2') await expect(page.getByText('WebGPU unavailable here · using WebGL 2')).toBeVisible();
  await Promise.all([page.waitForEvent('load'), page.getByRole('group', { name: 'Renderer' }).getByRole('button', { name: 'WebGL 2' }).click()]);
  await ready(page); expect((await graphics(page)).renderer).toBe('webgl2');
  expect(errors).toEqual([]);
});

test('double taps and pinches cannot zoom the page', async ({ page }) => {
  await page.goto('/'); await ready(page);
  const prevented = await page.evaluate(() => ['dblclick', 'gesturestart', 'gesturechange'].map(type => {
    const event = new Event(type, { bubbles: true, cancelable: true }); document.querySelector('.playground')!.dispatchEvent(event); return event.defaultPrevented;
  }));
  expect(prevented).toEqual([true, true, true]);
  expect(await page.evaluate(() => getComputedStyle(document.body).touchAction)).toBe('manipulation');
  expect(await page.evaluate(() => document.querySelector('meta[name="viewport"]')!.getAttribute('content'))).toContain('user-scalable=no');
});
