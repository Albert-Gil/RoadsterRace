import { chromium } from '@playwright/test';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Actual local browser frames, preserving capture timestamps. No simulated/predrawn race footage.
const folder = mkdtempSync(join(tmpdir(), 'roadster-capture-'));
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const frames = [], errors = [], samples = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?circuit=golden-gate');
  await page.waitForFunction(() => window.__roadster?.getGraphics().renderReady);
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('button', { name: '4 players', exact: true }).click();
  await page.getByRole('button', { name: '2 laps', exact: true }).click();
  await page.getByRole('button', { name: 'Plan your lines' }).click();
  for (let i = 0; i < 4; i++) {
    if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}` }).click();
    await page.evaluate(() => window.__roadster.usePracticeLine());
    await page.getByRole('button', { name: 'Lock in my line' }).click();
  }
  await page.waitForFunction(() => window.__roadster.getGraphics().renderReady);
  const cdp = await page.context().newCDPSession(page);
  cdp.on('Page.screencastFrame', async frame => {
    if (!frames.length || frame.metadata.timestamp - frames.at(-1).time >= 0.06) {
      const file = join(folder, `${String(frames.length).padStart(5, '0')}.jpg`);
      writeFileSync(file, Buffer.from(frame.data, 'base64')); frames.push({ file, time: frame.metadata.timestamp });
    }
    await cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
  const start = performance.now();
  for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP']) await page.keyboard.press(key);
  await page.waitForFunction(() => window.__roadster.getState().phase === 'racing');
  let lastBurst = -10;
  while (performance.now() - start < 31000) {
    const state = await page.evaluate(() => window.__roadster.getState());
    if (state.phase === 'racing' && state.race.time > lastBurst + 5.2) { for (const key of ['KeyA', 'KeyL', 'KeyQ', 'KeyP']) await page.keyboard.press(key); lastBurst = state.race.time; }
    samples.push(await page.evaluate(() => window.__roadster.getGraphics()));
    await page.waitForTimeout(250);
  }
  await cdp.send('Page.stopScreencast'); await cdp.detach();
  await page.screenshot({ path: 'artifacts/golden-gate/four-car-race.png' });
  const gl = await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'), ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable'; });
  const report = { renderer: gl, frames: frames.length, capturedSeconds: frames.at(-1).time - frames[0].time, audio: 'silent browser capture', errors, samples };
  writeFileSync('artifacts/golden-gate/recording-report.json', JSON.stringify(report, null, 2));
  if (frames.length < 30 || errors.length) throw new Error('Incomplete capture: ' + JSON.stringify(report));
  const list = join(folder, 'frames.txt');
  writeFileSync(list, frames.map((f, i) => `file '${f.file.replaceAll('\\', '/')}'\nduration ${i < frames.length - 1 ? frames[i + 1].time - f.time : 0.0667}`).join('\n'));
  const result = spawnSync('C:/Program Files/ffmpeg/bin/ffmpeg.exe', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-t', '30', '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '22', '-movflags', '+faststart', 'artifacts/golden-gate/gameplay-30s.mp4'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr);
  console.log(JSON.stringify({ renderer: gl, frames: report.frames, seconds: report.capturedSeconds, maxDrawCalls: Math.max(...samples.map(s => s.drawCalls)), meanFps: samples.reduce((n, s) => n + s.fps, 0) / samples.length, errors }));
  // Remove only the individually recorded files from this uniquely created temporary folder.
  for (const f of frames) unlinkSync(f.file); unlinkSync(list); rmdirSync(folder);
} finally { await browser.close(); }
