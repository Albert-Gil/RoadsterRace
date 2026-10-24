import { expect, test } from '@playwright/test';
import { waitForPhase } from './ui';

const state = (page: import('@playwright/test').Page) => page.evaluate(() => (window as any).__roadster.getState());

test('20 short recordings decode, music streams, and each venue selects its own ambient bed', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', r => { if (r.url().includes('/audio/') && !r.ok()) failed.push(r.url()); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Turn sound off' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  const audio = () => page.evaluate(() => (window as any).__roadster.getAudio());
  await expect.poll(async () => (await audio()).loaded.length).toBe(20);
  expect((await audio()).loaded).toContain('loop:drive');
  await expect.poll(async () => (await audio()).music?.playing).toBe(true);
  await expect.poll(async () => (await audio()).music?.duration).toBeGreaterThan(63);
  expect((await audio()).failed).toEqual([]);
  for (const [id, role] of [['coastal-launch', 'coast'], ['launchsite', 'launchsite'], ['golden-gate', 'city'], ['santa-monica', 'pier'], ['grand-canyon','canyon']]) {
    if (id !== 'coastal-launch') await page.locator(`[data-action="circuit"][data-circuit="${id === 'launchsite' ? 'orbital-launchyard' : id}"]`).click();
    expect((await audio()).ambience).toBe(role);
  }
  expect(failed).toEqual([]);
});

test('menu music loops, follows phase changes, mute and interruption without affecting racing', async ({ page }) => {
  await page.goto('/');
  const audio = () => page.evaluate(() => (window as any).__roadster.getAudio());
  expect((await audio()).music).toBeNull();
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await expect.poll(async () => (await audio()).music?.playing).toBe(true);
  await expect.poll(async () => (await audio()).outputRms).toBeGreaterThan(.001);
  await page.getByRole('button', { name: 'Turn sound off', exact: true }).click();
  expect((await audio()).music.playing).toBe(false);
  await page.waitForTimeout(400); expect((await audio()).outputRms).toBeLessThan(.0001);
  await page.getByRole('button', { name: 'Turn sound on', exact: true }).click();
  await expect.poll(async () => (await audio()).music.playing).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await audio()).music.playing).toBe(false);
  await page.getByRole('button', { name: '2 laps', exact: true }).click();
  await expect.poll(async () => (await audio()).music.playing).toBe(true);
  await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await expect.poll(async () => (await audio()).music.playing).toBe(false);
  await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  await page.getByRole('button', { name: 'Race this line', exact: true }).click();
  await waitForPhase(page, 'racing'); expect((await audio()).music.enabled).toBe(false);
  await page.keyboard.press('Escape'); expect((await audio()).music.playing).toBe(false);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect.poll(async () => (await audio()).music.playing).toBe(true);
});

test('streamed music loops and pauses even when an optional recording is unavailable', async ({ page }) => {
  await page.goto('/');
  // Reuse a tiny, valid generated cue from the existing fallback test to prove
  // actual HTML media looping rather than waiting a minute for the full song.
  const rate = 22050, length = rate / 2, wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) wav.writeInt16LE(Math.round(Math.sin(i / rate * Math.PI * 400) * 6000), 44 + i * 2);
  await page.route('**/music-check/**', route => route.fulfill(route.request().url().endsWith('loop.wav') ? { status: 200, contentType: 'audio/wav', body: wav } : { status: 404, body: 'missing' }));
  await page.getByRole('button', { name: 'Turn sound off', exact: true }).click();
  await page.evaluate(async () => {
    const { GameAudio } = await import('/src/presentation/audio.ts' as string);
    const candidate = new GameAudio({ cues: {}, loops: {}, music: { url: '/music-check/loop.wav' } });
    candidate.setMenuMusic(true); candidate.unlock(); (window as any).__musicCheck = candidate;
  });
  const status = () => page.evaluate(() => (window as any).__musicCheck.getStatus());
  await expect.poll(async () => (await status()).music?.readyState).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(1400);
  expect((await status()).music.playing).toBe(true); expect((await status()).music.time).toBeLessThan(.55);
  await page.evaluate(() => (window as any).__musicCheck.silence());
  expect((await status()).music.playing).toBe(false);
  await page.evaluate(async () => {
    const { GameAudio } = await import('/src/presentation/audio.ts' as string);
    const candidate = new GameAudio({ cues: {}, loops: {}, music: { url: '/music-check/missing.mp3' } });
    candidate.setMenuMusic(true); candidate.unlock(); (window as any).__missingMusic = candidate;
  });
  await expect.poll(() => page.evaluate(() => (window as any).__missingMusic.getStatus().music.failed)).toBe(true);
  expect(await page.evaluate(() => (window as any).__missingMusic.getStatus().music.playing)).toBe(false);
});

for (const mode of ['Time Trial', 'Solo Race', 'Multiplayer', 'Tournament']) {
  test(`pause redraw clears plans and race while preserving ${mode} configuration`, async ({ page }) => {
    await page.goto('/?circuit=launchsite');
    await page.getByRole('button', { name: mode === 'Tournament' ? 'Solo Race' : mode, exact: true }).click();
    const multi = mode === 'Multiplayer';
    if (multi) await page.getByRole('button', { name: '2 players', exact: true }).click();
    if (mode === 'Tournament') await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByRole('button', { name: '3 laps', exact: true }).click();
    await page.getByRole('button', { name: mode === 'Tournament' ? 'Start tournament' : multi ? 'Plan your lines' : 'Draw racing line', exact: true }).click();
    if (mode === 'Tournament') await page.getByRole('button', { name: /Draw your lines/ }).click();
    for (let i = 0; i < (multi ? 2 : 1); i++) {
      if (i) await page.getByRole('button', { name: "I'm Player 2", exact: true }).click();
      await page.evaluate(() => (window as any).__roadster.usePracticeLine());
      await page.getByRole('button', { name: multi ? 'Lock in my line' : 'Race this line', exact: true }).click();
    }
    if (multi) { await page.keyboard.press('KeyA'); await page.keyboard.press('KeyL'); }
    await waitForPhase(page, 'racing');
    const before = await state(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Restart race', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Draw new lines', exact: true }).click();
    const after = await state(page);
    expect(after.phase).toBe('drawing'); expect(after.turn).toBe(0); expect(after.confirmedCount).toBe(0);
    expect(after.race).toBeNull(); expect(after.route).toBeNull(); expect(after.readyPlayers).toEqual([]);
    expect(after.raceInputs.active).toEqual([0, 0, 0, 0]);
    for (const field of ['mode', 'circuitId', 'lapCount', 'drivers', 'tournament', 'roundIndex']) expect(after[field]).toEqual(before[field]);
    await page.evaluate(() => (window as any).__roadster.usePracticeLine());
    await expect(page.getByRole('button', { name: multi ? 'Lock in my line' : 'Race this line', exact: true })).toBeVisible();
  });
}
