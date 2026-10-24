import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';

const audio = (page: import('@playwright/test').Page) => page.evaluate(() => (window as any).__roadster.getAudio());

test('perspective shows real depth while drawing and countdown keep the same projection', async ({ page }) => {
  await page.goto('/'); await page.waitForFunction(() => (window as any).__roadster?.getGraphics().renderReady);
  await page.getByRole('button', { name: "Time Trial" }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  const geometry = await page.evaluate(() => {
    const game = (window as any).__roadster, width = (z: number) => { const a = game.project({ x: 0, z }), b = game.project({ x: 5, z }); return Math.hypot(a.x - b.x, a.y - b.y); };
    return { nearWidth: width(-30), farWidth: width(30), start: game.project(game.getTrack().start), ground: game.project({ x: -10, y: 0, z: -6 }), roof: game.project({ x: -10, y: 5, z: -6 }), graphics: game.getGraphics() };
  });
  expect(geometry.nearWidth).toBeGreaterThan(geometry.farWidth * 1.1);
  expect(Math.abs(geometry.roof.y - geometry.ground.y)).toBeGreaterThan(5);
  expect(geometry.graphics.perspective).toBe(true); expect(geometry.graphics.shadowMapSize).toBeGreaterThanOrEqual(1024); expect(geometry.graphics.shadowCasters).toBeGreaterThan(4);
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady); await page.waitForTimeout(150); await page.screenshot({ path: 'artifacts/3d-circuit-preview.png' });
  await page.getByRole('button', { name: 'Race this line' }).click();
  const start = await page.evaluate(() => { const game = (window as any).__roadster; return game.project(game.getTrack().start); });
  expect(Math.hypot(start.x - geometry.start.x, start.y - geometry.start.y)).toBeLessThan(0.01);
});

test('sound defaults on, unlocks on first play, follows a race, silences on pause and mute, and survives theme changes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.waitForFunction(() => Boolean((window as any).__roadster));
  expect((await audio(page)).context).toBe('locked'); expect((await audio(page)).muted).toBe(false);
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await expect.poll(async () => (await audio(page)).context).toBe('running');
  await expect(page.getByRole('button', { name: 'Turn sound off' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Draw racing line' }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine()); await page.getByRole('button', { name: 'Race this line' }).click();
  await waitForPhase(page, 'racing');
  await expect.poll(async () => (await audio(page)).levels.drive).toBeGreaterThan(0.025);
  await expect.poll(async () => (await audio(page)).outputRms).toBeGreaterThan(0.001);
  await page.keyboard.press('Space'); await page.waitForFunction(() => (window as any).__roadster.getState().race.thrustCount === 1);
  await page.screenshot({ path: 'artifacts/visuals-thrust.png' });
  await page.keyboard.press('Escape'); await page.waitForTimeout(450);
  expect((await audio(page)).active).toBe(false); expect((await audio(page)).outputRms).toBeLessThan(0.0001);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await waitForPhase(page, 'racing');
  await expect.poll(async () => (await audio(page)).outputRms).toBeGreaterThan(0.001);
  await page.getByRole('button', { name: 'Turn sound off' }).click(); await page.waitForTimeout(450);
  expect((await audio(page)).outputRms).toBeLessThan(0.0001);
  const before = await page.evaluate(() => (window as any).__roadster.getState());
  await page.keyboard.press('KeyT'); await page.waitForTimeout(400);
  const after = await page.evaluate(() => (window as any).__roadster.getState());
  expect(after.theme).toBe('graphite'); expect(after.race.time).toBeGreaterThan(before.race.time); expect(after.route).toEqual(before.route);
  const graphics = await page.evaluate(() => (window as any).__roadster.getGraphics());
  expect(graphics.drawCalls).toBeLessThan(100); // Budget, not a geometry implementation assertion.
  writeFileSync('artifacts/presentation-runtime.json', JSON.stringify({ graphics, audio: await audio(page), errors }, null, 2));
  await page.screenshot({ path: 'artifacts/visuals-graphite-race.png' }); expect(errors).toEqual([]);
});

test('recorded audio roles decode and play, while missing or invalid recordings retain synthesis', async ({ page }) => {
  const sampleRate = 22050, length = sampleRate / 2, wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) wav.writeInt16LE(Math.round(Math.sin(i / sampleRate * Math.PI * 400) * 6000), 44 + i * 2);
  await page.route('**/test-audio/**', route => route.fulfill(route.request().url().endsWith('valid.wav') ? { status: 200, contentType: 'audio/wav', body: wav } : route.request().url().endsWith('broken.wav') ? { status: 200, contentType: 'audio/wav', body: 'invalid audio data' } : { status: 404, body: 'missing' }));
  await page.goto('/'); await page.waitForFunction(() => Boolean((window as any).__roadster));
  await page.getByRole('button', { name: 'Turn sound off' }).click();
  await page.evaluate(async () => {
    const { GameAudio } = await import('/src/presentation/audio.ts' as string);
    const engine = new GameAudio({ cues: { finish: { url: '/test-audio/valid.wav' }, thrust: { url: '/test-audio/missing.wav' } }, loops: { drive: { url: '/test-audio/valid.wav', loopStart: 0, loopEnd: 0.5 }, sand: { url: '/test-audio/broken.wav' } } });
    (window as any).__audioCandidate = engine; engine.unlock();
  });
  const status = () => page.evaluate(() => (window as any).__audioCandidate.getStatus());
  await expect.poll(async () => (await status()).loaded.length).toBe(2); await expect.poll(async () => (await status()).failed.length).toBe(2);
  await page.evaluate(() => { const engine = (window as any).__audioCandidate; engine.mix({ active: true, speed: 24, slip: 0.3, sand: 0.5 }); engine.cue('thrust'); engine.cue('finish'); });
  await expect.poll(async () => (await status()).outputRms).toBeGreaterThan(0.001);
  await page.evaluate(() => (window as any).__audioCandidate.silence()); await page.waitForTimeout(450);
  expect((await status()).outputRms).toBeLessThan(0.0001);
});

test('original cue palette renders an unclipped preview with audible cues and quiet gaps', async ({ page }) => {
  await page.goto('/');
  const preview = await page.evaluate(async () => {
    const { synthCue } = await import('/src/presentation/audio.ts' as string);
    const context = new OfflineAudioContext(1, 44100 * 13, 44100), gain = context.createGain(); gain.gain.value = 0.65 * 0.6; gain.connect(context.destination);
    const cues = [['countdown', 0], ['countdown', 1], ['countdown', 2], ['start', 3], ['thrust', 3.6], ['drift', 4.6], ['lap', 5.3], ['ready', 6.2], ['finish', 7], ['collision', 9], ['recovery', 10], ['car-impact', 11], ['scrape', 12]] as const;
    cues.forEach(([cue, at]) => synthCue(context, gain, cue, at));
    const output = await context.startRendering(), data = output.getChannelData(0), pcm = new Int16Array(data.length);
    let peak = 0; data.forEach((value, i) => { peak = Math.max(peak, Math.abs(value)); pcm[i] = Math.round(Math.max(-1, Math.min(1, value)) * 32767); });
    const energy = (start: number, end: number) => { const segment = data.slice(start * 44100, end * 44100); return Math.sqrt(segment.reduce((sum, value) => sum + value * value, 0) / segment.length); };
    const bytes = new Uint8Array(pcm.buffer); let binary = ''; for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return { peak, levels: cues.map(([cue, at]) => ({ cue, rms: energy(at + 0.015, at + 0.1) })), gap: energy(0.4, 0.7), pcm: btoa(binary) };
  });
  expect(preview.peak).toBeLessThan(0.95); preview.levels.forEach(cue => expect(cue.rms, cue.cue).toBeGreaterThan(0.003)); expect(preview.gap).toBeLessThan(0.0001);
  const pcm = Buffer.from(preview.pcm, 'base64'), header = Buffer.alloc(44); header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(44100, 24); header.writeUInt32LE(88200, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  writeFileSync('artifacts/sound-preview.wav', Buffer.concat([header, pcm]));
  writeFileSync('artifacts/sound-preview.json', JSON.stringify({ peak: preview.peak, levels: preview.levels, gap: preview.gap }, null, 2));
});
