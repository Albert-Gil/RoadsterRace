import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts/higher-hop', { recursive: true });

for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
  test(`circuit selection omits feature notes and accepts hidden branches at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/');
    await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
    await expect(page.locator('.circuit-card')).toHaveCount(4);
    await expect(page.locator('.circuit-card small,.circuit-description')).toHaveCount(0);
    for (const name of ['Coastal Launch', 'Launchsite', 'Golden Gate', 'Santa Monica']) {
      const card = page.getByRole('button', { name: `${name} circuit`, exact: true });
      await expect(card.locator('strong')).toHaveText(name); await expect(card.locator('svg')).toHaveCount(1);
      await expect(card.locator('.circuit-length')).toContainText('m');
    }
    await page.screenshot({ path: `artifacts/higher-hop/selection-${viewport.width}.png` });
    for (const [name, branch] of [['Launchsite', 'service-hop'], ['Santa Monica', true]] as const) {
      await page.getByRole('button', { name: `${name} circuit`, exact: true }).click();
      await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
      await page.evaluate(branch => (window as any).__roadster.usePracticeLine(branch), branch);
      await expect(page.getByRole('button', { name: 'Race this line', exact: true })).toBeVisible();
      await expect(page.locator('.hop-required')).toHaveCount(0);
      await expect(page.locator('#panel')).not.toContainText(/hop required|marked lane|marked landing/i);
      await page.getByRole('button', { name: 'Race setup', exact: true }).click();
    }
  });
}
