import { expect, test } from '@playwright/test';
import { waitForPhase } from '../browser/ui';
import { draw } from './draw';

// Plan step 5.3: two devices race each heavy venue (landscape workers, long loads) to Results. The other
// further circuits are covered by unit equivalence (tests/unit/duel-venues.test.ts). The test room server
// enables them with DUEL_EXTRA_VENUES (playwright.duels.config.ts); production keeps them off until /stats allows.
const softwareGraphics = process.env.WEBGL_BACKEND !== 'd3d11';
for (const venue of ['snowy-tahoe', 'capitan-yosemite', 'lax'] as const) test(`venue ${venue}: a two-device room reaches Results`, async ({ browser }) => {
  test.setTimeout(480_000);
  const contexts = await Promise.all([0, 1].map(() => browser.newContext({ viewport: softwareGraphics ? { width: 640, height: 440 } : { width: 800, height: 600 }, deviceScaleFactor: softwareGraphics ? 0.5 : 1 })));
  if (softwareGraphics) await Promise.all(contexts.map(c => c.addInitScript(() => {
    const timer = window.setInterval(() => { const engine = (window as any).__roadster?.getWorld()?.engine; if (engine) { engine.maxFPS = 10; window.clearInterval(timer); } }, 100);
  })));
  const [host, guest] = await Promise.all(contexts.map(c => c.newPage()));
  const errors: string[] = []; for (const p of [host, guest]) p.on('pageerror', e => errors.push(e.message));
  try {
    await host.goto('/'); await host.getByRole('button', { name: 'Multiplayer' }).click();
    await host.getByRole('button', { name: 'Private Duel' }).click();
    const picker = host.getByRole('dialog').getByLabel('Circuit', { exact: true });
    await expect(picker.locator(`option[value="${venue}"]`)).toHaveCount(1, { timeout: 30000 });
    await picker.selectOption(venue);
    // Earlier specs may still hold seats in their reconnect window; a heavy venue needs the server to itself.
    for (let attempt = 0; ; attempt++) {
      await host.getByRole('button', { name: 'Create room' }).click();
      const outcome = await Promise.race([
        host.getByText('Private room', { exact: true }).waitFor({ timeout: 60000 }).then(() => 'room'),
        host.getByRole('dialog').getByText(/server is full/i).waitFor({ timeout: 60000 }).then(() => 'full'),
      ]);
      if (outcome === 'room') break;
      expect(attempt, 'the room server stayed full').toBeLessThan(12);
      await host.waitForTimeout(8000);
    }
    await guest.goto(host.url(), { waitUntil: 'domcontentloaded' });
    await guest.getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(host.getByRole('dialog').locator('p').filter({ hasText: 'Joined' })).toHaveCount(2, { timeout: 60000 });
    await host.getByRole('button', { name: 'Start drawing' }).click();
    await Promise.all([draw(host, false), draw(guest, false)]);
    await Promise.all([host, guest].map(p => waitForPhase(p, 'racing', 90000)));
    const results = await Promise.all([host, guest].map(async p => {
      const d = p.getByRole('dialog');
      await expect(d.getByRole('heading', { name: 'Race results' })).toBeVisible({ timeout: 300000 });
      return d.locator('.seat-result').allTextContents();
    }));
    expect(results[0]).toHaveLength(2);
    expect(results[1]).toEqual(results[0]);
    expect(errors).toEqual([]);
  } finally {
    // Leave through Home so the seats are released at once (heavy venues fill the server on their own).
    for (const p of [guest, host]) await p.getByRole('dialog').getByRole('button', { name: 'Home', exact: true }).click({ timeout: 3000 }).catch(() => {});
    await Promise.allSettled(contexts.map(c => c.close()));
  }
});
