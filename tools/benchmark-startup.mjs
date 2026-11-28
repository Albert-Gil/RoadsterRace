// How long the first screen takes on a slow phone profile, for comparing builds (plan step 3.2).
// Serves a built site (default dist/) with `vite preview`, then opens it in fresh Chromium contexts with
// Lighthouse's mobile throttling: 150 ms round trip, 1.6 Mbit/s down, 750 kbit/s up, and 4× CPU slowdown
// (DevTools emulation, so absolute numbers depend on this machine's CPU; compare builds on one machine).
// "First screen" = the Home panel's Multiplayer button is visible and enabled; also reports first contentful
// paint and the JavaScript bytes transferred before it. Prints medians over --runs (default 5).
//   node tools/benchmark-startup.mjs [--dir dist] [--runs 5] [--port 4719] [--json out.json]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { browserOptions } from './browser-options.mjs';

const { values } = parseArgs({ options: { dir: { type: 'string', default: 'dist' }, runs: { type: 'string', default: '5' }, port: { type: 'string', default: '4719' }, json: { type: 'string' } } });
const runs = Number(values.runs), url = `http://127.0.0.1:${values.port}/`;
const PROFILE = { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8, cpuRate: 4 };

const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', values.dir, '--host', '127.0.0.1', '--port', values.port, '--strictPort'], { stdio: 'ignore', env: { ...process.env, VITE_BASE_PATH: '/' } });
const stop = () => preview.kill();
process.on('exit', stop);
for (let i = 0; ; i++) {
  try { if ((await fetch(url)).ok) break; } catch {}
  if (i > 100) throw new Error('vite preview did not start');
  await new Promise(r => setTimeout(r, 200));
}

const median = list => { const s = [...list].sort((a, b) => a - b); return Math.round(s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2); };
const browser = await chromium.launch(browserOptions());
const samples = [];
try {
  for (let run = 0; run < runs; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: PROFILE.latency, downloadThroughput: PROFILE.downloadThroughput, uploadThroughput: PROFILE.uploadThroughput });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: PROFILE.cpuRate });
    let scriptBytes = 0, ready = false;
    const scripts = new Set();
    cdp.on('Network.loadingFinished', e => { if (!ready && scripts.has(e.requestId)) scriptBytes += e.encodedDataLength; });
    cdp.on('Network.responseReceived', e => { if (e.type === 'Script') scripts.add(e.requestId); });
    const began = Date.now();
    await page.goto(url, { waitUntil: 'commit' });
    const multiplayer = page.locator('button[data-action="friends"]');
    await multiplayer.waitFor({ state: 'visible', timeout: 180_000 });
    while (!(await multiplayer.isEnabled())) { if (Date.now() - began > 240_000) throw new Error('Multiplayer never enabled'); await page.waitForTimeout(25); }
    const firstScreenMs = Date.now() - began; ready = true;
    const fcpMs = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null);
    samples.push({ firstScreenMs, fcpMs: fcpMs === null ? null : Math.round(fcpMs), scriptBytes });
    console.log(`run ${run + 1}: first screen ${firstScreenMs} ms, FCP ${Math.round(fcpMs ?? NaN)} ms, scripts ${(scriptBytes / 1000).toFixed(0)} kB`);
    await context.close();
  }
} finally {
  await browser.close(); stop();
}
const result = {
  profile: 'Lighthouse mobile: 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up, 4x CPU (DevTools emulation)', dir: values.dir, runs,
  firstScreenMedianMs: median(samples.map(s => s.firstScreenMs)), fcpMedianMs: median(samples.map(s => s.fcpMs ?? 0)),
  scriptBytesMedian: median(samples.map(s => s.scriptBytes)), samples,
};
console.log(JSON.stringify(result, null, 2));
if (values.json) writeFileSync(values.json, JSON.stringify(result, null, 2) + '\n');
