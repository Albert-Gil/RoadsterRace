import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';
mkdirSync('artifacts/hop', { recursive: true });
const state = (page: Page) => page.evaluate(() => (window as any).__roadster.getState());
async function friends(page: Page, count = 4) {
  await page.goto('/?circuit=santa-monica'); await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
  await page.getByRole('button', { name: `${count} players`, exact: true }).click(); await page.getByRole('button', { name: '1 lap', exact: true }).click();
  await page.getByRole('button', { name: 'Plan your lines', exact: true }).click();
  for (let i = 0; i < count; i++) {
    if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}`, exact: true }).click();
    await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Lock in my line', exact: true }).click();
  }
  for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP'].slice(0, count)) await page.keyboard.press(key);
  await waitForPhase(page, 'racing');
}

for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 1024, height: 768 }]) {
  test(`four-player ability pairs stay inside the existing rails at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await friends(page);
    const layout = await page.evaluate(() => {
      const rect = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      const pads = [...document.querySelectorAll('.ability-control')].map(e => ({ ability: (e as HTMLElement).dataset.ability, ...rect(e) }));
      return { pads, course: rect(document.querySelector('#course-space')!), hud: rect(document.querySelector('.race-hud')!), others: [...document.querySelectorAll('.pause-button')].map(rect) };
    });
    const overlaps = (a: any, b: any) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
    expect(layout.pads).toHaveLength(8);
    for (const [i, p] of layout.pads.entries()) {
      expect(p.width).toBe(p.ability === 'hop' ? 44 : 64); expect(p.height).toBe(p.width);
      expect(p.x).toBeGreaterThanOrEqual(0); expect(p.right).toBeLessThanOrEqual(viewport.width); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.bottom).toBeLessThanOrEqual(viewport.height);
      expect(overlaps(p, layout.course), `road overlap ${i}: ${JSON.stringify(layout)}`).toBe(false);
      for (const other of [...layout.pads.slice(i + 1), layout.hud, ...layout.others]) expect(overlaps(p, other), `control overlap ${i}: ${JSON.stringify(layout)}`).toBe(false);
    }
    expect(errors).toEqual([]); writeFileSync(`artifacts/hop/layout-${viewport.width}.json`, JSON.stringify(layout, null, 2));
    await page.screenshot({ path: `artifacts/hop/phone-controls-${viewport.width}.png` });
  });
}

test('eight real touches retain player and ability ownership through hold, sliding, cancel and pause', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage(); await friends(page);
  const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  const points = await page.locator('.ability-control').evaluateAll(pads => pads.map((p, i) => { const r = p.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: i + 1 }; }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await page.waitForFunction(() => (window as any).__roadster.getState().players.every((s: any) => s.hopCount === 1 && s.thrustCount === 1));
  const effects = await page.evaluate(async () => {
    const samples: any[] = []; for (let i = 0; i < 8; i++) { await new Promise(requestAnimationFrame); samples.push((window as any).__roadster.getGraphics()); }
    return { drawCalls: Math.max(...samples.map(s => s.drawCalls)), particles: Math.max(...samples.map(s => s.vaporParticles.reduce((a: number, b: number) => a + b, 0))) };
  });
  expect(effects.drawCalls).toBeLessThanOrEqual(150); expect(effects.particles).toBeGreaterThan(0); writeFileSync('artifacts/hop/four-car-effects.json', JSON.stringify(effects, null, 2));
  expect((await state(page)).abilityInputs).toEqual({ thrust: [1, 1, 1, 1], hop: [1, 1, 1, 1] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points.map((p, i) => ({ ...points[7 - i], id: p.id })) });
  expect((await state(page)).abilityInputs).toEqual({ thrust: [1, 1, 1, 1], hop: [1, 1, 1, 1] });
  await page.waitForFunction(() => (window as any).__roadster.getState().race.time > 7.4);
  expect((await state(page)).players.map((s: any) => s.hopCount)).toEqual([1, 1, 1, 1]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  expect((await state(page)).raceInputs.active).toEqual([0, 0, 0, 0]);
  // Fifty overlapping browser touch cycles supplement the core ownership test.
  // Pause during the cycles avoids accidentally running an entire race.
  await page.keyboard.press('Escape'); const paused = await state(page); await page.waitForTimeout(150); expect((await state(page)).players).toEqual(paused.players);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await waitForPhase(page, 'racing');
  for (let i = 0; i < 50; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    expect((await state(page)).raceInputs.active).toEqual([0, 0, 0, 0]);
  }
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); expect((await state(page)).abilityInputs).toEqual({ thrust: [0, 0, 0, 0], hop: [0, 0, 0, 0] });
  await cdp.detach(); await context.close();
});

test('hop keyboard hold, focused buttons, pause and retry preserve independent ability state', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('button', { name: '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Race this line', exact: true }).click();
  await expect(page.locator('#hop-button')).toBeDisabled(); await page.keyboard.press('KeyH');
  expect((await state(page)).race.hopCount).toBe(0); await waitForPhase(page, 'racing');
  await page.keyboard.down('KeyH'); await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as any).__roadster.getState().race.time > 7.2); await page.keyboard.up('KeyH');
  expect((await state(page)).race.hopCount).toBe(1); expect((await state(page)).race.thrustCount).toBe(1);
  await page.locator('#hop-button').focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => (window as any).__roadster.getState().race.hopCount === 2);
  await page.keyboard.press('Escape'); const paused = await state(page); await page.waitForTimeout(200); expect((await state(page)).race).toEqual(paused.race);
  await page.getByRole('button', { name: 'Restart race', exact: true }).click(); const reset = await state(page);
  expect(reset.race.hopCount).toBe(0); expect(reset.race.hopReadyAt).toBe(0); expect(reset.race.movement).toBe('grounded');
});

test('actual hop and ramp gameplay capture retains the one-car rendering budget', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, recordVideo: { dir: 'artifacts/hop/video', size: { width: 844, height: 390 } } });
  const page = await context.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=santa-monica');
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click(); await page.getByRole('button', { name: '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine(true)); await page.getByRole('button', { name: 'Race this line', exact: true }).click();
  await waitForPhase(page, 'racing');
  await page.keyboard.press('KeyH'); await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as any).__roadster.getState().race.elevation > 0.9);
  const hop = await page.evaluate(() => ({ state: (window as any).__roadster.getState(), graphics: (window as any).__roadster.getGraphics() }));
  expect(hop.graphics.drawCalls).toBeLessThanOrEqual(90); expect(hop.graphics.vaporParticles[0]).toBeGreaterThan(0);
  await page.screenshot({ path: 'artifacts/hop/manual-hop-landscape.png' });
  // Headless video capture may trigger the intentional render-delay pause.
  if ((await state(page)).phase === 'paused') { await page.getByRole('button', { name: 'Resume', exact: true }).click(); }
  await page.waitForFunction(() => (window as any).__roadster.getState().race.flightOrigin === 'ramp', undefined, { timeout: 60000 });
  expect(await page.evaluate(() => (window as any).__roadster.getGraphics().hopCores)).toBe(0);
  await page.screenshot({ path: 'artifacts/hop/ramp-jump-landscape.png' });
  if ((await state(page)).phase === 'paused') await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await waitForPhase(page, 'results', 120000);
  const result = await state(page); expect(result.race.hopCount).toBe(1); expect(result.race.recoveryCount).toBe(0); expect(errors).toEqual([]);
  writeFileSync('artifacts/hop/gameplay.json', JSON.stringify({ hop, result, errors }, null, 2));
  await context.close(); await page.video()!.saveAs('artifacts/hop/hop-and-ramp-gameplay.webm');
});
