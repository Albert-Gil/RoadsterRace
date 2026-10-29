import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';

const stage = process.env.VENUE_CAPTURE_STAGE ?? 'after';
const directory = `artifacts/venue-detail/${stage}`;
mkdirSync(directory, { recursive: true });
for (const circuit of ['coastal-launch', 'launchsite', 'golden-gate', 'santa-monica', 'grand-canyon', 'la-nights', 'snowy-tahoe', 'capitan-yosemite']) {
 for (const mode of ['Time Trial', 'Solo Race']) {
  test(`${circuit} ${mode}: scenery, phone framing and active-effect budget`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/?circuit=${circuit}&graphics=medium`);
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
    if(mode==='Time Trial')await page.evaluate(()=>{
      // A cosmetic pose fixture includes the replay mesh in this rendering budget.
      // Real recording/reload behavior is covered by the Time Trial journey tests.
      const g=(window as any).__roadster,w=g.getWorld(),set=w.setGhost.bind(w);
      w.setGhost=()=>{const s=g.getState().race;set({t:s.time,x:s.position.x+6,z:s.position.z,y:s.elevation,heading:s.heading,thrust:false});};
    });
    await page.keyboard.press('Space');
    await page.keyboard.press('h');
    const samples: any[] = [];
    for (let i = 0; i < 12; i++) {
      samples.push(await page.evaluate(() => (window as any).__roadster.getGraphics()));
      await page.waitForTimeout(40);
    }
    expect(Math.max(...samples.map(s => s.drawCalls))).toBeLessThanOrEqual(mode === 'Time Trial' ? 90 : 150);
    if(mode==='Time Trial')expect(samples.some(s=>s.ghostVisible)).toBe(true);
    expect(errors).toEqual([]);
    writeFileSync(`${directory}/${circuit}-${mode.replace(' ', '-')}.json`, JSON.stringify({ errors, samples }, null, 2));
  });
 }
}
