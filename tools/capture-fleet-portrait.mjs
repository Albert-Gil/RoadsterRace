// Compares fixed San Diego Fleet camera angles at iPhone portrait sizes (dev server on 5173).
// For every azimuth/elevation it reports the narrowest automatic ramp's projected width in CSS px;
// the framing itself still guarantees that all crossings, shortcuts, the start area and the
// flight envelope stay in view. Writes artifacts/fleet-portrait/report.json and images of the
// current setting and the best candidate.   node tools/capture-fleet-portrait.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserOptions } from './browser-options.mjs';

const dir = 'artifacts/fleet-portrait'; mkdirSync(dir, { recursive: true });
const browser = await chromium.launch(browserOptions());
const report = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    await page.goto('http://127.0.0.1:5173/?circuit=san-diego-fleet&graphics=low&sectors=off');
    await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
    await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
    await page.waitForFunction(() => window.__roadster?.getGraphics().renderReady, null, { timeout: 240000 });
    const measure = (azimuth, elevation) => page.evaluate(async ([azimuth, elevation]) => {
      const { fleetCamera } = await import('/src/presentation/themes.ts');
      fleetCamera.portraitAzimuth = azimuth; fleetCamera.portraitElevation = elevation;
      const g = window.__roadster, w = g.getWorld(); w.overviewFits.clear(); w.resize();
      const t = g.getTrack(), widths = {};
      for (const j of t.jumps.filter(j => j.activation !== 'hop' && j.rampLength > 0)) {
        const at = (along, across) => ({ x: j.from.x + j.forward.x * along + j.forward.z * across, z: j.from.z + j.forward.z * along - j.forward.x * across, y: j.takeoffElevation });
        const a = g.project(at(j.rampLength / 2, -j.width / 2)), b = g.project(at(j.rampLength / 2, j.width / 2));
        widths[j.id] = Math.hypot(a.x - b.x, a.y - b.y);
      }
      return { azimuth, elevation, narrowest: Math.min(...Object.values(widths)), widths };
    }, [azimuth, elevation]);
    const current = await page.evaluate(async () => { const { fleetCamera } = await import('/src/presentation/themes.ts'); return [fleetCamera.portraitAzimuth, fleetCamera.portraitElevation]; });
    const rows = [];
    for (let azimuth = 0; azimuth < 360; azimuth += 15) for (const elevation of [50, 56, 62, 68, 74]) rows.push(await measure(azimuth, elevation));
    rows.sort((a, b) => b.narrowest - a.narrowest);
    const baseline = await measure(...current);
    report.push({ viewport, current: baseline, best: rows.slice(0, 5) });
    console.log(`${viewport.width}x${viewport.height}: current ${current.join('/')} -> ${baseline.narrowest.toFixed(1)} px; best ${rows[0].azimuth}/${rows[0].elevation} -> ${rows[0].narrowest.toFixed(1)} px`);
    for (const [name, [az, el]] of [['current', current], ['best', [rows[0].azimuth, rows[0].elevation]]]) {
      await measure(az, el); await page.waitForTimeout(1200);
      await page.screenshot({ path: `${dir}/${viewport.width}x${viewport.height}-${name}.png` });
    }
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 2));
