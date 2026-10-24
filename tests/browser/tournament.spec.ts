import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createTournament, finalizeRound } from '../../src/core/tournament';
import { waitForPhase } from './ui';
mkdirSync('artifacts/golden-gate', { recursive: true });
const state = (page: Page) => page.evaluate(() => (window as any).__roadster.getState());
test('older three-circuit championships are explained as incompatible after widening',async({page})=>{
 const saved={state:{version:1,rulesVersion:8,compilerVersion:8,playerCount:2,laps:3,rounds:[{circuitId:'coastal-launch',trackVersion:2},{circuitId:'golden-gate',trackVersion:2}],results:[]},drivers:[{name:'Avery',paint:'crimson'},{name:'Jordan',paint:'cobalt'}]};
 await page.addInitScript(value=>localStorage.setItem('roadster-race.tournament.v1',JSON.stringify(value)),saved);
 await page.goto('/');await expect(page.getByRole('button',{name:'Resume tournament',exact:false})).toHaveCount(0);
 await expect(page.locator('#panel')).toContainText('previous tournament cannot resume');
});
async function drawAndRace(page: Page, count = 2) {
  await page.getByRole('button', { name: 'Draw your lines', exact: false }).click();
  for (let i = 0; i < count; i++) {
    if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}`, exact: false }).click();
    await page.evaluate(() => (window as any).__roadster.usePracticeLine());
    await page.getByRole('button', { name: 'Lock in my line', exact: false }).click();
  }
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP'].slice(0, count)) await page.keyboard.press(key);
  await waitForPhase(page, 'racing');
  await page.keyboard.press('KeyA'); await page.keyboard.press('KeyL');
}
test('Full Tour scores all four circuits, survives refresh and ends with a championship', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=golden-gate');
  await page.getByRole('button', { name: 'Multiplayer', exact: false }).click();
  await page.getByRole('button', { name: '4 players', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: '1 lap', exact: true }).click();
  await page.screenshot({ path: 'artifacts/golden-gate/tournament-setup.png' });
  await page.getByRole('button', { name: 'Start tournament', exact: false }).click();
  const reports = [];
  for (let round = 0; round < 4; round++) {
    const intro = await state(page); expect(intro.roundIndex).toBe(round); expect(intro.confirmedCount).toBe(0);
    expect(intro.circuitId).toBe(['coastal-launch', 'orbital-launchyard', 'golden-gate', 'santa-monica'][round]);
    if (await page.getByRole('button', { name: 'Turn sound on', exact: true }).count()) await page.getByRole('button', { name: 'Turn sound on', exact: true }).click();
    await drawAndRace(page, 4);
    if (round === 2) {
      await page.waitForTimeout(350); await page.screenshot({ path: 'artifacts/golden-gate/thrust-race.png' });
      reports.push({ graphics: await page.evaluate(() => (window as any).__roadster.getGraphics()), audio: await page.evaluate(() => (window as any).__roadster.getAudio()) });
    }
    await waitForPhase(page, 'results', 120000);
    const done = await state(page); expect(done.tournament.results).toHaveLength(round + 1);
    expect(done.tournament.results[round].points).toEqual(Array.from({ length: 4 }, (_, p) => [10, 6, 4, 0][done.tournament.results[round].finishes.find((f: any) => f.player === p).rank - 1]));
    expect(done.players.every((p: any) => p.finished)).toBe(true); reports.push({ round, contactCount: done.contactCount, results: done.tournament.results[round] });
    if (!round) {
      await page.reload(); await page.getByRole('button', { name: 'Resume tournament', exact: false }).click();
      expect((await state(page)).tournament.results).toHaveLength(1);
      await page.reload(); await page.getByRole('button', { name: 'Resume tournament', exact: false }).click();
      expect((await state(page)).confirmedCount).toBe(0);
    } else if (round < 3) await page.getByRole('button', { name: 'Next race', exact: false }).click();
  }
  await expect(page.locator('#panel .eyebrow')).toHaveText('TOURNAMENT COMPLETE');
  await expect(page.locator('.championship-table tbody tr')).toHaveCount(4);
  await page.screenshot({ path: 'artifacts/golden-gate/championship-results.png' });
  expect(reports.some((r: any) => r.contactCount > 0)).toBe(true);
  expect(errors).toEqual([]); writeFileSync('artifacts/golden-gate/tournament-report.json', JSON.stringify({ reports, errors }, null, 2));
  await page.reload(); await page.getByRole('button', { name: 'Resume tournament', exact: false }).click();
  await expect(page.locator('#panel .eyebrow')).toHaveText('TOURNAMENT COMPLETE'); expect((await state(page)).tournament.results).toHaveLength(4);
  await page.getByRole('button', { name: 'Race tournament again', exact: false }).click(); expect((await state(page)).tournament.results).toHaveLength(0);
});
test('custom schedule supports repeated circuits, 12 races, reorder, save/exit and discard', async ({ page }) => {
  await page.goto('/?circuit=golden-gate'); await page.getByRole('button', { name: 'Multiplayer', exact: false }).click();
  await page.getByRole('button', { name: '4 players', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click(); await page.getByRole('button', { name: 'Custom Tour', exact: true }).click();
  await page.getByLabel('Number of tournament races').selectOption('12');
  await page.getByLabel('Round 1 circuit', { exact: true }).selectOption('golden-gate'); await page.getByLabel('Round 2 circuit', { exact: true }).selectOption('golden-gate');
  await page.getByRole('button', { name: 'Move round 3 up', exact: true }).click();
  await page.getByLabel('Number of tournament races').selectOption('2');
  await page.getByRole('button', { name: '6 laps', exact: true }).click(); await page.getByRole('button', { name: 'Start tournament', exact: false }).click();
  const ready = await state(page); expect(ready.tournament.rounds.map((r: any) => r.circuitId)).toEqual(['golden-gate', 'golden-gate']); expect(ready.tournament.laps).toBe(6); expect(ready.tournament.playerCount).toBe(4);
  await page.getByRole('button', { name: 'Save and exit', exact: true }).click(); await page.getByRole('button', { name: 'Keep playing', exact: false }).click();
  expect((await state(page)).phase).toBe('tour-intro');
  await page.getByRole('button', { name: 'Save and exit', exact: true }).click(); await page.getByRole('button', { name: 'Save and exit', exact: true }).click();
  await page.reload(); await page.getByRole('button', { name: 'Resume tournament', exact: false }).click(); expect((await state(page)).tournament.playerCount).toBe(4);
  await page.getByRole('button', { name: 'Save and exit', exact: true }).click(); await page.getByRole('button', { name: 'Save and exit', exact: true }).click();
  await page.getByRole('button', { name: 'Discard tournament', exact: true }).click(); await page.getByRole('button', { name: 'Discard tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume tournament', exact: false })).toHaveCount(0);
});
test('Golden Gate solo and responsive garage preserve layout and clear projection', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=golden-gate'); await page.getByRole('button', { name: "Time Trial", exact: false }).click();
  await expect(page.getByRole('button', { name: 'Golden Gate circuit', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport); await expect(page.getByRole('button', { name: 'Draw racing line', exact: false })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/golden-gate/setup-${viewport.width}.png` });
  }
  await page.getByRole('button', { name: '1 lap', exact: true }).click(); await page.getByRole('button', { name: 'Draw racing line', exact: false }).click(); await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady); await page.screenshot({ path: 'artifacts/golden-gate/circuit-preview.png' });
  expect(await page.evaluate(() => (window as any).__roadster.getProjectionError())).toBeLessThan(0.01);
  await page.getByRole('button', { name: 'Race this line', exact: false }).click(); await waitForPhase(page, 'results', 90000);
  expect((await state(page)).race.lapTimes).toHaveLength(1); expect(errors).toEqual([]);
});
