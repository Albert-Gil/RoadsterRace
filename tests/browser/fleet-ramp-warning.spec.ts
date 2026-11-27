import { expect, test, type Page } from '@playwright/test';
import { waitForPhase } from './ui';

const rings = (page: Page) => page.evaluate(() => {
  const scene = (window as any).__roadster.getWorld().scene;
  return scene.meshes.filter((m: any) => m.name.startsWith('ramp-warning') && m.isEnabled()).length;
});

test('a slow Fleet line rings every automatic ramp it cannot clear; a fast line shows none', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=san-diego-fleet&graphics=low');
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster?.getGraphics().renderReady);
  // A lap drawn in 12 s: the pace a careful first attempt produces (about 13 m/s).
  await page.evaluate(() => (window as any).__roadster.usePracticeLine(false, 12));
  await waitForPhase(page, 'preview');
  await expect(page.locator('#panel')).toContainText('may need more speed');
  expect(await rings(page)).toBe(4);
  await page.getByRole('button', { name: 'Redraw', exact: true }).first().click();
  expect(await rings(page)).toBe(0);
  await page.evaluate(() => (window as any).__roadster.usePracticeLine(false, 7));
  await waitForPhase(page, 'preview');
  await expect(page.locator('#panel')).not.toContainText('may need more speed');
  expect(await rings(page)).toBe(0);
  expect(errors).toEqual([]);
});

test('a slow shortcut line warns before the support-ship Hop; racing a brisk one shows the Hop cue at the lip', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=san-diego-fleet&graphics=low');
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster?.getGraphics().renderReady);
  await page.evaluate(() => (window as any).__roadster.usePracticeLine('support-a-lane', 8.5));
  await waitForPhase(page, 'preview');
  await expect(page.locator('#panel')).toContainText('support-ship shortcut needs a faster line');
  await page.getByRole('button', { name: 'Redraw', exact: true }).first().click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine('support-a-lane', 7));
  await waitForPhase(page, 'preview');
  await expect(page.locator('#panel')).not.toContainText('support-ship shortcut');
  const cue = () => page.evaluate(() => (window as any).__roadster.getWorld().scene.meshes.some((m: any) => m.name === 'hop-cue' && m.isEnabled()));
  expect(await cue()).toBe(false);
  await page.getByRole('button', { name: 'Race this line', exact: true }).click();
  await waitForPhase(page, 'racing');
  expect(await cue()).toBe(true);
  await page.keyboard.press('Escape');
  expect(await cue()).toBe(false);
  expect(errors).toEqual([]);
});
