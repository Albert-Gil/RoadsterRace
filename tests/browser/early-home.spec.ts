import { expect, test } from '@playwright/test';

// Built sites show Home before the 3D scene has loaded (src/main.ts); the development server does so with ?earlyHome.
test('Home appears before the 3D scene and a press made while it loads is carried out once it is ready', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/src\/presentation\/scene\.ts/, async route => { await held; await route.continue(); });
  await page.goto('/?earlyHome=1');
  const playground = page.locator('.playground'), timeTrial = page.getByRole('button', { name: 'Time Trial', exact: true });
  await expect(timeTrial).toBeVisible();
  await expect(playground).toHaveAttribute('data-phase', 'welcome');
  await expect(playground).toHaveAttribute('data-scene', 'loading');
  await timeTrial.click();
  await expect(timeTrial).toHaveAttribute('aria-busy', 'true');
  await expect(playground).toHaveAttribute('data-waiting', 'true');
  await page.waitForTimeout(500);
  await expect(playground).toHaveAttribute('data-phase', 'welcome');
  release();
  await expect(playground).toHaveAttribute('data-scene', 'ready', { timeout: 60000 });
  await expect(playground).toHaveAttribute('data-phase', 'setup', { timeout: 10000 });
  await expect(playground).toHaveAttribute('data-mode', 'time-trial');
  await expect(playground).not.toHaveAttribute('data-waiting', /./);
});

test('without a press, Home stays put when the scene arrives', async ({ page }) => {
  await page.goto('/?earlyHome=1');
  const playground = page.locator('.playground');
  await expect(playground).toHaveAttribute('data-scene', 'ready', { timeout: 60000 });
  await expect(playground).toHaveAttribute('data-phase', 'welcome');
  await expect(page.getByRole('button', { name: 'Multiplayer', exact: true })).toBeEnabled();
});
