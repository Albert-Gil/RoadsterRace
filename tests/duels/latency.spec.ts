import { expect, test } from '@playwright/test';
import { waitForPhase } from '../browser/ui';
import { draw } from './draw';
import { latencyProxy } from './latency-proxy';

// Real browsers and the real room server, with every socket routed through a delaying proxy.
// CI runs the 150 ms ± 40 ms case; DUEL_LATENCY=all runs every round trip locally.
const all: [rtt: number, jitter: number][] = [[0, 0], [50, 0], [150, 0], [250, 0], [150, 40]];
const scenarios = process.env.DUEL_LATENCY === 'all' ? all : [[150, 40] as [number, number]];
const roomPort = Number(process.env.DUEL_ROOM_PORT || 2661);

for (const [rtt, jitter] of scenarios) test(`latency ${rtt} ms ± ${jitter} ms: a two-device race completes, presses resolve and cars never run backwards`, async ({ browser }) => {
  test.setTimeout(360_000);
  const proxy = await latencyProxy(roomPort, rtt, jitter);
  const contexts = await Promise.all([0, 1].map(() => browser.newContext({ viewport: { width: 640, height: 440 }, deviceScaleFactor: 0.5 })));
  await Promise.all(contexts.map(c => c.addInitScript(() => {
    const timer = window.setInterval(() => { const engine = (window as any).__roadster?.getWorld()?.engine; if (engine) { engine.maxFPS = 15; window.clearInterval(timer); } }, 100);
  })));
  const [host, guest] = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await host.goto(`/?duelServer=${encodeURIComponent('http://127.0.0.1:' + proxy.port)}`);
    await host.getByRole('button', { name: 'Multiplayer' }).click();
    await host.getByRole('button', { name: 'Private Duel' }).click();
    await host.getByRole('button', { name: 'Create room' }).click();
    await expect(host.getByText('Private room', { exact: true })).toBeVisible({ timeout: 45000 });
    await guest.goto(host.url(), { waitUntil: 'domcontentloaded' });
    await guest.getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(host.getByRole('dialog').locator('p').filter({ hasText: 'Joined' })).toHaveCount(2, { timeout: 45000 });
    await host.getByRole('button', { name: 'Start drawing' }).click();
    await Promise.all([draw(host, false), draw(guest, true)]);
    await Promise.all([host, guest].map(p => waitForPhase(p, 'racing', 30000)));
    // Press Hop and Thrust together: each command gets exactly one private outcome (no player-facing toast).
    await host.waitForTimeout(1500);
    await host.locator('#hop-button').click(); await host.locator('#thrust-button').click();
    const log = () => host.evaluate(() => (window as any).__roadsterDuel.commandLog as { ability: string; outcome: string; sequence: number }[]);
    await expect.poll(async () => (await log()).length, { timeout: 4000 + rtt * 4 }).toBeGreaterThanOrEqual(2);
    const outcomes = await log();
    expect(outcomes.map(o => o.ability).sort()).toEqual(['hop', 'thrust']);
    expect(new Set(outcomes.map(o => o.sequence)).size).toBe(outcomes.length);
    for (const o of outcomes) expect(['fired', 'recharging', 'too-late', 'unavailable']).toContain(o.outcome);
    expect(await guest.evaluate(() => (window as any).__roadsterDuel.commandLog.length)).toBe(0);
    await expect(host.locator('.race-notice')).not.toContainText(/missed/i);
    // Your own car is drawn where the room will be when a press lands: measured against the server's car at
    // the tick each press was applied (Thrust only, so no flight interrupts the lead).
    await host.locator('body').focus();
    await host.waitForTimeout(1500);
    // Space is Thrust for the one driver on this device; a press while recharging still gets a reply with its tick.
    for (let i = 0; i < 6; i++) { await host.keyboard.press('Space'); await host.waitForTimeout(400); }
    await expect.poll(async () => (await log()).length, { timeout: 4000 + rtt * 4 }).toBeGreaterThanOrEqual(8);
    type Entry = { displayErrorTicks?: number; bufferedErrorTicks?: number; roundTripMs?: number };
    const measured = ((await log()) as Entry[]).slice(2).filter(o => o.displayErrorTicks !== undefined && o.bufferedErrorTicks !== undefined);
    expect(measured.length).toBeGreaterThanOrEqual(4);
    const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const shown = median(measured.map(o => o.displayErrorTicks!)), buffered = median(measured.map(o => o.bufferedErrorTicks!)), roundTrip = median(measured.map(o => o.roundTripMs!));
    console.log(`display error at press, ${rtt} ms: drawn ${shown} ticks, buffer alone ${buffered} ticks, measured round trip ${roundTrip} ms`);
    // Per press: errors, round trip and the display's state (mode, catching up, route distances, lead).
    for (const o of measured) console.log(JSON.stringify(o));
    // Your car is always drawn closer to the room than the buffer alone would draw it.
    expect(shown).toBeLessThan(buffered);
    // When the page itself keeps up (round trip within 100 ms of the network's), the drawn car is within 3 ticks.
    if (roundTrip <= rtt + jitter + 100) expect(shown).toBeLessThanOrEqual(3);
    // Sample the displayed own car: progress along the course must not step backwards (recoveries jump further than 25 m).
    const progress = await host.evaluate(async () => {
      const g = (window as any).__roadster, t = g.getTrack(), w = g.getWorld(), out: number[] = [];
      for (let k = 0; k < 40; k++) {
        const p = w.vehicles[0].root.position; let best = 0, gap = Infinity;
        for (let i = 0; i < t.centerline.length; i++) { const c = t.centerline[i], d = (c.x - p.x) ** 2 + (c.z - p.z) ** 2; if (d < gap) { gap = d; best = t.distances[i]; } }
        out.push(best); await new Promise(r => setTimeout(r, 100));
      }
      return { out, length: t.length };
    });
    const steps = progress.out.slice(1).map((v, i) => { let d = v - progress.out[i]; if (d < -progress.length / 2) d += progress.length; return d; });
    expect(steps.filter(d => d < -1.5 && d > -25)).toEqual([]);
    await Promise.all([host, guest].map(p => expect(p.getByRole('dialog').getByRole('heading', { name: 'Race results' })).toBeVisible({ timeout: 150000 })));
  } finally {
    await Promise.allSettled(contexts.map(c => c.close()));
    await proxy.close();
  }
});
