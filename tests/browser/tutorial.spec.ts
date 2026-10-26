import { expect, test, type Page } from '@playwright/test';
import { waitForPhase } from './ui';

const state = (page: Page) => page.evaluate(() => (window as any).__roadster.getState());
/** Software WebGL can trip the render-delay pause; resume until `done` holds. */
async function until(page: Page, done: (s: any) => boolean, label: string) {
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    const s = await state(page);
    if (done(s)) return s;
    if (s.phase === 'paused') await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.waitForTimeout(150);
  }
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify((await state(page)).tutorial)}`);
}

test('Tutorial coaches drawing, Thrust and Hop on Newport, then restores the chosen circuit', async ({ page }) => {
  test.setTimeout(420000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=santa-monica');
  const before = await state(page);
  await page.getByRole('button', { name: 'Tutorial', exact: true }).click(); await waitForPhase(page, 'tutorial-intro');
  expect((await state(page)).circuitId).toBe('coastal-launch'); expect((await state(page)).lapCount).toBe(1);
  await expect(page.locator('#mode-label')).toHaveText('TUTORIAL');

  await page.getByRole('button', { name: 'Start tutorial', exact: false }).click(); await waitForPhase(page, 'drawing');
  await expect(page.locator('.tutorial-coach')).toContainText('Draw one lap.');
  await page.getByRole('button', { name: 'Show an example line', exact: true }).click(); await waitForPhase(page, 'preview');
  await expect(page.locator('.tutorial-coach')).toContainText('Your line is ready.');
  await page.getByRole('button', { name: 'Race this line', exact: true }).click();

  for (const [ability, key, other] of [['thrust', 'Space', 'KeyH'], ['hop', 'KeyH', 'Space']] as const) {
    await until(page, s => s.phase === 'coaching' && s.tutorial?.awaiting === ability, `${ability} prompt`);
    // The race keeps its racing layout, frozen, with the coach card and the matching pad highlighted.
    await expect(page.locator('.playground')).toHaveAttribute('data-coaching', 'true');
    await expect(page.locator('.tutorial-coach')).toContainText(ability === 'thrust' ? 'Tap THRUST now' : 'Tap HOP now');
    await expect(page.locator(`.ability-control[data-ability="${ability}"]`)).toHaveAttribute('data-coach', 'true');
    const frozen = (await state(page)).race.time; await page.waitForTimeout(300); expect((await state(page)).race.time).toBe(frozen);
    await page.keyboard.press(other); expect((await state(page)).tutorial.awaiting).toBe(ability);
    await page.keyboard.press(key);
    const after = await state(page);
    expect(after.tutorial.awaiting).toBeNull(); expect(after.race[ability === 'thrust' ? 'thrustCount' : 'hopCount']).toBe(1);
  }
  await until(page, s => s.phase === 'results', 'finish');
  await expect(page.locator('#panel')).toContainText('ready to race');
  const done = await state(page); expect(done.race.recoveryCount).toBe(0); expect(done.best).toBeNull();

  await page.getByRole('button', { name: 'Home', exact: true }).click(); await waitForPhase(page, 'welcome');
  const home = await state(page);
  expect([home.mode, home.circuitId, home.lapCount]).toEqual(['solo-race', before.circuitId, before.lapCount]);
  await expect(page.locator('.tutorial-coach')).toBeHidden();
  expect(errors).toEqual([]);
});
