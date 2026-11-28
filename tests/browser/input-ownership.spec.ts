import { expect, test } from '@playwright/test';
import { waitForPhase, RACE_SPEED } from './ui';

test('a press that began before the screen changed cannot activate the next screen; assistive activation still works', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?' + RACE_SPEED.replace('4', '1'));
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster?.getGraphics().renderReady);
  await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  await page.getByRole('button', { name: 'Race this line', exact: true }).click();
  await waitForPhase(page, 'racing');
  // Hold the pause button, then the race pauses another way (Escape) while the finger is still down.
  const pause = page.locator('.pause-button'), box = (await pause.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.keyboard.press('Escape');
  await waitForPhase(page, 'paused');
  await page.mouse.up();
  // A touch browser may fire the click on whatever is under the finger at release (iOS): it must not resume.
  await page.getByRole('button', { name: 'Resume', exact: true }).dispatchEvent('click', { detail: 1 });
  expect(await page.locator('.playground').getAttribute('data-phase')).toBe('paused');
  // A fresh press on this screen works, and so does assistive activation (no pointer behind the click).
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await waitForPhase(page, 'racing');
  await page.keyboard.press('Escape');
  await waitForPhase(page, 'paused');
  await page.getByRole('button', { name: 'Resume', exact: true }).dispatchEvent('click');
  await waitForPhase(page, 'racing');
  // Holding Enter on a focused button activates it once, never once per keyboard repeat.
  await page.keyboard.press('Escape');
  await waitForPhase(page, 'paused');
  await page.getByRole('button', { name: 'Resume', exact: true }).focus();
  await page.keyboard.down('Enter');
  await waitForPhase(page, 'racing');
  await page.keyboard.down('Enter'); await page.keyboard.down('Enter'); // repeats
  await page.keyboard.up('Enter');
  expect(await page.locator('.playground').getAttribute('data-phase')).toBe('racing');
  expect(errors).toEqual([]);
});

test('on a shared screen, a pad finger releasing beside a Results tap neither blocks the tap nor votes itself', async ({ page }) => {
  await page.goto('/?' + RACE_SPEED); await page.waitForFunction(() => Boolean((window as any).__roadster));
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('button', { name: '2 players', exact: true }).click();
  await page.getByRole('button', { name: '1 lap', exact: true }).click();
  await page.getByRole('button', { name: 'Plan your lines' }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Lock in my line' }).click();
  await page.getByRole('button', { name: /I'm Player 2/ }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Lock in my line' }).click();
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  for (const key of ['KeyA', 'KeyL']) await page.keyboard.press(key);
  await waitForPhase(page, 'results', 180000);
  // Finger 5 began on Player 2's pad during the race; finger 6 taps Player 1's "Race again" on Results.
  const voted = await page.evaluate(() => {
    const pad = document.querySelector<HTMLElement>('[data-racer="1"].ability-control')!, vote = document.querySelector<HTMLElement>('[data-action="vote"][data-seat="0"]')!;
    const fire = (el: Element, type: string, id: number) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true, composed: true, isPrimary: id === 5, detail: 1 } as PointerEventInit));
    fire(pad, 'pointerdown', 5); fire(vote, 'pointerdown', 6);
    fire(vote, 'pointerup', 6); fire(pad, 'pointerup', 5);           // the pad finger lifts last
    fire(vote, 'click', 5);                                          // a click attributed to the pad finger: refused
    const afterPadClick = vote.getAttribute('aria-pressed');
    fire(vote, 'click', 6);                                          // the tap's own click: votes
    return { afterPadClick, afterTap: document.querySelector('[data-action="vote"][data-seat="0"]')?.getAttribute('aria-pressed') };
  });
  expect(voted.afterPadClick).toBe('false');
  expect(voted.afterTap).toBe('true');
});
