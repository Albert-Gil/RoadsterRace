import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { waitForPhase } from './ui';

mkdirSync('artifacts/race-settings', { recursive: true });

test('solo preferences persist, one lap finishes cleanly, and six-lap bests stay separate', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: "Time Trial" }).click();
  await page.getByRole('button', { name: '6 laps', exact: true }).click();
  await page.getByRole('textbox', { name: 'Driver 1 name' }).fill('Taylor <b>');
  await page.getByRole('textbox', { name: 'Driver 1 name' }).press('End');
  await page.getByRole('textbox', { name: 'Driver 1 name' }).press('T');
  expect(await page.evaluate(() => (window as any).__roadster.getState().theme)).toBe('coastal');
  await page.getByRole('textbox', { name: 'Driver 1 name' }).press('Backspace');
  await page.getByRole('group', { name: 'Driver 1 paint' }).getByRole('button', { name: 'Ultraviolet', exact: true }).click();
  await page.screenshot({ path: 'artifacts/race-settings/solo-garage.png' });
  await page.reload(); await page.getByRole('button', { name: "Time Trial" }).click();
  await expect(page.getByRole('textbox', { name: 'Driver 1 name' })).toHaveValue('Taylor <b>');
  await expect(page.getByRole('button', { name: '6 laps', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Driver 1 paint' }).getByRole('button', { name: 'Ultraviolet', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '1 lap', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line' }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  await page.getByRole('button', { name: 'Race this line' }).click();
  await waitForPhase(page, 'racing');
  await page.keyboard.press('Space');
  await expect(page.locator('#race-lap')).toContainText('/ 1');
  await waitForPhase(page, 'results');
  const finished = await page.evaluate(() => (window as any).__roadster.getState());
  expect(finished.race.lapTimes).toHaveLength(1); expect(finished.best).toBe(finished.race.finishTime);
  await expect(page.locator('.result-detail > span')).toHaveCount(1);
  await expect(page.locator('#panel')).toContainText('Taylor <b>');
  expect(await page.locator('#panel b').allTextContents()).not.toContain('Taylor');
  await expect(page.locator('#panel')).not.toContainText(/drifts|Carry less|clean line|well-timed/i);
  await page.screenshot({ path: 'artifacts/race-settings/one-lap-results.png' });
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('button', { name: '6 laps', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line' }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  await page.getByRole('button', { name: 'Race this line' }).click();
  const fresh = await page.evaluate(() => (window as any).__roadster.getState());
  expect(fresh.lapCount).toBe(6); expect(fresh.best).toBeNull(); expect(fresh.race.time).toBe(0);
  expect(fresh.drivers[0]).toMatchObject({ name: 'Taylor <b>', paint: 'ultraviolet' });
  expect(errors).toEqual([]);
});

test('custom names and paints survive a six-lap local race, results and rematch', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('button', { name: '6 laps', exact: true }).click();
  for (const [index, name, paint] of [[1, 'Ana & Max', 'Verdant green'], [2, 'Lee', 'Solar yellow']] as const) {
    await page.getByRole('textbox', { name: `Driver ${index} name` }).fill(name);
    await page.getByRole('group', { name: `Driver ${index} paint` }).getByRole('button', { name: paint, exact: true }).click();
  }
  await page.screenshot({ path: 'artifacts/race-settings/local-garage.png' });
  await page.getByRole('button', { name: 'Plan your lines' }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Lock in my line' }).click();
  await expect(page.getByRole('heading', { name: 'Pass to Lee.' })).toBeVisible();
  await page.getByRole('button', { name: "I'm Lee" }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Lock in my line' }).click();
  await page.getByRole('button', { name: 'Ana & Max thrust', exact: true }).click(); await page.getByRole('button', { name: 'Lee thrust', exact: true }).click();
  await waitForPhase(page, 'racing');
  await page.keyboard.press('KeyA');
  await expect(page.locator('.racer-0 .pod-name')).toHaveText('Ana & Max');
  await expect(page.locator('.racer-1 .pod-lap')).toContainText('/6');
  await waitForPhase(page, 'results', 150000);
  const result = await page.evaluate(() => (window as any).__roadster.getState());
  expect(result.players.every((p: any) => p.finished && p.lapTimes.length === 6)).toBe(true);
  await expect(page.locator('.standings')).toContainText('Ana & Max'); await expect(page.locator('.standings')).toContainText('Lee');
  await expect(page.locator('.standing-laps').first()).toContainText('L6');
  await page.screenshot({ path: 'artifacts/race-settings/six-lap-results.png' });
  await page.getByRole('button', { name: 'Restart', exact: false }).click();
  const rematch = await page.evaluate(() => (window as any).__roadster.getState());
  expect(rematch.phase).toBe('ready'); expect(rematch.lapCount).toBe(6); expect(rematch.drivers).toEqual(result.drivers);
  expect(errors).toEqual([]);
});

test('garage fits phone portrait/landscape and tablet with reachable names, paint and start controls', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('button', { name: '4 players', exact: true }).click();
  await expect(page.locator('#mode-label')).toHaveText('4 PLAYER LOCAL RACE');
  for (const [width, height] of [[844, 390], [390, 844], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    const name = page.getByRole('textbox', { name: 'Driver 4 name' }); await name.fill('Morgan'); await name.press('Enter');
    const swatch = page.getByRole('group', { name: 'Driver 4 paint' }).getByRole('button', { name: 'Stainless steel gray', exact: true });
    await swatch.click(); const bounds = await swatch.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44); expect(bounds!.height).toBeGreaterThanOrEqual(44);
    const start = page.getByRole('button', { name: 'Plan your lines' }); await expect(start).toBeInViewport();
    expect(await start.evaluate(button => { const r = button.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('button') === button; })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/race-settings/garage-${width}x${height}.png` });
  }
});
