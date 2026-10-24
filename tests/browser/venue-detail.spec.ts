import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';

const stage = process.env.VENUE_CAPTURE_STAGE ?? 'after';
const directory = `artifacts/venue-detail/${stage}`;
mkdirSync(directory, { recursive: true });
for (const circuit of ['coastal-launch', 'launchsite', 'golden-gate', 'santa-monica', 'grand-canyon']) {
 for (const mode of ['Time Trial', 'Solo Race']) {
  test(`${circuit} ${mode}: scenery, phone framing and active-effect budget`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/?circuit=${circuit}`);
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
    await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
    for (const [width, height] of mode === 'Time Trial' ? [[1440, 900], [844, 390], [390, 844]] : []) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${directory}/${circuit}-${width}.png` });
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => (window as any).__roadster.usePracticeLine());
    await page.getByRole('button', { name: 'Race this line', exact: true }).click();
    await waitForPhase(page, 'racing');
    await page.keyboard.press('Space');
    await page.keyboard.press('h');
    const samples: any[] = [];
    for (let i = 0; i < 12; i++) {
      samples.push(await page.evaluate(() => (window as any).__roadster.getGraphics()));
      await page.waitForTimeout(40);
    }
    expect(Math.max(...samples.map(s => s.drawCalls))).toBeLessThanOrEqual(mode === 'Time Trial' ? 90 : 150);
    expect(errors).toEqual([]);
    writeFileSync(`${directory}/${circuit}-${mode.replace(' ', '-')}.json`, JSON.stringify({ errors, samples }, null, 2));
  });
 }
}
