import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { createTournament, finalizeRound } from '../../src/core/tournament';
import { COMPUTER_VERSION } from '../../src/core/computer';
import { CUPS } from '../../src/core/progression';
import { circuits } from '../../src/content/circuits';
import { createPracticeSamples } from '../../src/core/route';
import { sanDiegoFleetTrack as fleet } from '../../src/core/tracks/san-diego-fleet';
import { fleetExplorerSamples } from '../fixtures/challenge-lines';
import type { DrawSample } from '../../src/core/types';
import { waitForPhase } from './ui';
const root = 'artifacts/challenges'; mkdirSync(root, { recursive: true });
const state = (page: Page) => page.evaluate(() => (window as any).__roadster.getState());
async function open(page: Page) { await page.goto('/'); await page.getByRole('button', { name: 'Challenges', exact: true }).click(); await waitForPhase(page, 'challenges'); }
const launch = (page: Page, id: string) => page.locator(`[data-challenge="${id}"]`).click();
async function draw(page: Page, context: BrowserContext, raw: DrawSample[]) {
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  const points = await page.evaluate(ps => ps.map(p => ({ ...(window as any).__roadster.project(p), time: p.time })), raw);
  const cdp = await context.newCDPSession(page), epoch = Date.now() / 1000;
  for (const [i, p] of points.entries()) await cdp.send('Input.dispatchMouseEvent', { type: i ? 'mouseMoved' : 'mousePressed', x: p.x, y: p.y, button: i ? 'none' : 'left', buttons: 1, clickCount: i ? 0 : 1, timestamp: epoch + p.time / 1000 });
  const last = points.at(-1)!; await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: last.x, y: last.y, button: 'left', buttons: 0, clickCount: 1, timestamp: epoch + last.time / 1000 }); await cdp.detach(); await waitForPhase(page, 'preview');
}
for (const viewport of [{ width: 1440, height: 900 }, { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1024, height: 768 }]) test(`challenge menu and borrowed settings ${viewport.width}x${viewport.height}`, async ({ browser }) => {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width !== 1440, isMobile: viewport.width < 1000 }), page = await context.newPage();
  await page.goto('/?circuit=golden-gate'); await page.getByRole('button', { name: 'Solo Race', exact: true }).click(); await page.getByRole('button', { name: '6 laps', exact: true }).click(); await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Challenges', exact: true }).click();
  await expect(page.locator('.challenge-card')).toHaveCount(3); await page.screenshot({ path: `${root}/menu-${viewport.width}.png` });
  for (const button of await page.locator('[data-action="challenge-start"]').all()) { await button.scrollIntoViewIfNeeded(); const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width); }
  await launch(page, 'alpine-precision'); await waitForPhase(page, 'drawing'); expect(await state(page)).toMatchObject({ activeChallenge: 'alpine-precision', mode: 'time-trial', circuitId: 'snowy-tahoe', lapCount: 1, playerCount: 1 });
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('roadster-race.preferences.v1')!)); expect(prefs).toMatchObject({ circuitId: 'golden-gate', laps: 6 });
  await page.getByRole('button', { name: 'Home', exact: true }).click(); await waitForPhase(page, 'welcome'); expect(await state(page)).toMatchObject({ activeChallenge: null, circuitId: 'golden-gate', lapCount: 6 }); await context.close();
});
test('Fleet both support sequences complete through real drawing, legal Hop controls and physical landings', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: `${root}/video`, size: { width: 1280, height: 720 } } }), page = await context.newPage();
  await open(page); await launch(page, 'fleet-explorer'); await waitForPhase(page, 'drawing'); await draw(page, context, fleetExplorerSamples(fleet));
  const compiled = await page.evaluate(() => (window as any).__roadster.getRoute()); expect(compiled.hazards).toBeUndefined(); expect(compiled.crossings).toHaveLength(6);
  await page.getByRole('button', { name: 'Race this line', exact: true }).click(); await waitForPhase(page, 'racing');
  const hopped = new Set<string>(), deadline = Date.now() + 115000;
  while (Date.now() < deadline) {
    const s = await state(page); if (s.phase === 'results') break;
    if (s.phase === 'paused') { await page.getByRole('button', { name: 'Resume', exact: true }).click(); await waitForPhase(page, 'racing'); }
    const car = s.race;
    for (const j of fleet.jumps!.filter(j => j.activation === 'hop')) {
      const dx = car.position.x - j.from.x, dz = car.position.z - j.from.z, along = dx * j.forward.x + dz * j.forward.z, across = dx * j.forward.z - dz * j.forward.x;
      if (!hopped.has(j.id) && along >= -5.2 && along <= -3.4 && Math.abs(across) < 5 && car.movement === 'grounded') { await page.keyboard.press('KeyH'); hopped.add(j.id); }
    }
    await page.waitForTimeout(25);
  }
  await waitForPhase(page, 'results'); await expect(page.locator('.challenge-result')).toContainText('Challenge complete'); expect(hopped.size).toBe(2);
  expect((await state(page)).race.recoveryCount).toBe(0); await page.screenshot({ path: `${root}/fleet-complete.png` });
  await page.getByRole('button', { name: 'Challenges ↗', exact: true }).click(); await expect(page.locator('[data-challenge-card="fleet-explorer"]')).toContainText('COMPLETE');
  await page.reload(); await page.getByRole('button', { name: 'Challenges', exact: true }).click(); await expect(page.locator('[data-challenge-card="fleet-explorer"]')).toContainText('COMPLETE'); const video = page.video(); await context.close(); await video?.saveAs(`${root}/fleet-challenge.webm`);
});
test('practice cannot earn a challenge; retry and redraw retain the curated mode', async ({ page }) => {
  await open(page); await launch(page, 'alpine-precision'); await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Race this line', exact: true }).click(); await waitForPhase(page, 'results', 120000);
  await expect(page.locator('.challenge-result')).toContainText('Practice run'); expect(await page.evaluate(() => localStorage.getItem('roadster-race.challenges.v1'))).toBeNull();
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await waitForPhase(page, 'racing'); await page.locator('[data-action="pause"]').click(); await page.locator('[data-action="redraw-all"]').click(); await waitForPhase(page, 'drawing'); expect(await state(page)).toMatchObject({ activeChallenge: 'alpine-precision', lapCount: 1 });
});
test('a real clean Tahoe lap earns and retains Alpine Precision', async ({ browser }) => {
  const context = await browser.newContext(), page = await context.newPage(); await open(page); await launch(page, 'alpine-precision');
  await draw(page, context, createPracticeSamples(circuits.find(c => c.id === 'snowy-tahoe')!.track, 7)); await page.getByRole('button', { name: 'Race this line', exact: true }).click();
  await waitForPhase(page, 'results', 120000); await expect(page.locator('.challenge-result')).toContainText('Challenge complete'); await page.screenshot({ path: `${root}/alpine-complete.png` });
  await page.reload(); await page.getByRole('button', { name: 'Challenges', exact: true }).click(); await expect(page.locator('[data-challenge-card="alpine-precision"]')).toContainText('COMPLETE'); await context.close();
});
test('Hard Frontier plays all four ordinary rounds and evaluates only final championship standings', async ({ browser }) => {
  test.setTimeout(360000);
  const context = await browser.newContext(), page = await context.newPage(); await open(page); await launch(page, 'frontier-champion');
  for (const [i, id] of CUPS.find(c => c.id === 'frontier')!.rounds.entries()) {
    await waitForPhase(page, 'tour-intro'); await page.getByRole('button', { name: 'Draw your lines', exact: false }).click();
    await draw(page, context, createPracticeSamples(circuits.find(c => c.id === id)!.track, 7)); await page.getByRole('button', { name: 'Race this line', exact: true }).click(); await waitForPhase(page, 'racing');
    const deadline = Date.now() + 120000;
    while ((await state(page)).phase !== 'results' && Date.now() < deadline) {
      if ((await state(page)).phase === 'paused') { await page.getByRole('button', { name: 'Resume', exact: true }).click(); await waitForPhase(page, 'racing'); }
      await page.waitForTimeout(250);
    }
    await waitForPhase(page, 'results'); const s = await state(page); expect(s.players.every((p: any) => p.finished)).toBe(true); expect(s.tournament.results).toHaveLength(i + 1);
    if (i < 3) { await expect(page.locator('.challenge-result')).toContainText('continues'); expect(await page.evaluate(() => localStorage.getItem('roadster-race.challenges.v1'))).toBeNull(); await page.getByRole('button', { name: 'Next race', exact: false }).click(); }
  }
  const rows = await page.locator('.championship-table tbody tr').allTextContents(); expect(rows.length).toBe(4); const human = await page.locator('.championship-table tbody tr').filter({ has: page.locator('.player-chip', { hasText: '1' }) }).first().locator('td').first().textContent();
  await expect(page.locator('.challenge-result')).toContainText(human?.trim() === '1' ? 'Challenge complete' : 'first place required'); await page.screenshot({ path: `${root}/frontier-final.png` }); await context.close();
});
test('Hard Frontier guards saved tours, preserves challenge identity and restores preferences on exit', async ({ page }) => {
  await open(page); await launch(page, 'frontier-champion'); await waitForPhase(page, 'tour-intro'); expect(await state(page)).toMatchObject({ activeChallenge: 'frontier-champion', mode: 'solo-race', difficulty: 'hard', lapCount: 1, playerCount: 4 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('roadster-race.tournament.v1')!)); expect(saved).toMatchObject({ challengeId: 'frontier-champion', challengeEligible: true }); expect(saved.state.rounds.map((r: any) => r.circuitId)).toEqual(CUPS.find(c => c.id === 'frontier')!.rounds);
  await page.reload(); await page.getByRole('button', { name: 'Resume tournament', exact: true }).click(); await waitForPhase(page, 'tour-intro'); expect(await state(page)).toMatchObject({ activeChallenge: 'frontier-champion', difficulty: 'hard' });
  await page.getByRole('button', { name: 'Save and exit', exact: true }).click(); await waitForPhase(page, 'tour-exit'); await page.locator('[data-action="tour-save-exit"]').click(); await waitForPhase(page, 'welcome');
  await page.getByRole('button', { name: 'Challenges', exact: true }).click(); await launch(page, 'frontier-champion'); await waitForPhase(page, 'tour-replace'); await page.getByRole('button', { name: 'Back', exact: true }).click(); await waitForPhase(page, 'challenges'); expect(await state(page)).toMatchObject({ activeChallenge: null }); expect(await page.evaluate(() => JSON.parse(localStorage.getItem('roadster-race.tournament.v1')!).challengeId)).toBe('frontier-champion');
});
test('completed Hard cup resume awards a shared title once; ineligible cups never award', async ({ browser }) => {
  let s = createTournament(CUPS.find(c => c.id === 'frontier')!.rounds.map(id => ({ circuitId: id, trackVersion: circuits.find(c => c.id === id)!.track.version })), 4, 1);
  for (let i = 0; i < 4; i++) s = finalizeRound(s, i, s.rounds[i], [0, 1, 2, 3].map(player => ({ player, rank: player < 2 ? 1 : player + 1, finishTime: player < 2 ? 30 : 30 + player })));
  for (const eligible of [true, false]) {
    const context = await browser.newContext(), page = await context.newPage();
    const saved = { state: s, options: { mode: 'solo-race', difficulty: 'hard', seed: 73149 }, computerVersion: COMPUTER_VERSION, cupId: 'frontier', cupVersion: 1, challengeId: 'frontier-champion', challengeEligible: eligible, drivers: [0, 1, 2, 3].map(i => ({ name: `P${i}`, paint: 'glacier', controller: i ? 'computer' : 'human' })) };
    await page.addInitScript(saved => { if (!localStorage.getItem('roadster-race.tournament.v1')) localStorage.setItem('roadster-race.tournament.v1', JSON.stringify(saved)); }, saved);
    await page.goto('/'); await page.getByRole('button', { name: 'Resume tournament', exact: true }).click(); await waitForPhase(page, 'results');
    await expect(page.locator('.challenge-result')).toContainText(eligible ? 'Challenge complete' : 'Practice run'); const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('roadster-race.challenges.v1') ?? 'null')); expect(progress?.completed ?? []).toEqual(eligible ? ['frontier-champion'] : []); await context.close();
  }
});
