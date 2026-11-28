import { expect, test, type Browser, type Page } from '@playwright/test';
import { waitForPhase } from '../browser/ui';
import { draw } from './draw';

// The Private Duels paddock (src/duels/paddock.ts): in-place updates, covered rendering, a device that is
// still loading its circuit, and leaving while a room is being reached.
const softwareGraphics = process.env.WEBGL_BACKEND !== 'd3d11';
async function player(browser: Browser) {
  const context = await browser.newContext({ viewport: softwareGraphics ? { width: 640, height: 440 } : { width: 800, height: 600 }, deviceScaleFactor: softwareGraphics ? 0.5 : 1 });
  if (softwareGraphics) await context.addInitScript(() => {
    const timer = window.setInterval(() => { const engine = (window as any).__roadster?.getWorld()?.engine; if (engine) { engine.maxFPS = 10; window.clearInterval(timer); } }, 100);
  });
  return context.newPage();
}
async function createRoom(host: Page, name = 'Harbor Racer') {
  await host.goto('/'); await host.getByRole('button', { name: 'Multiplayer' }).click();
  await host.getByRole('button', { name: 'Private Duel' }).click();
  await host.getByLabel('Driver name', { exact: true }).fill(name);
  await host.getByRole('button', { name: 'Create room' }).click();
  await expect(host.getByText('Private room', { exact: true })).toBeVisible({ timeout: 45000 });
}
async function join(guest: Page, invite: string, name = 'Guest 1') {
  await guest.goto(invite, { waitUntil: 'domcontentloaded' });
  await guest.getByLabel('Driver name', { exact: true }).fill(name);
  await guest.getByRole('button', { name: 'Join room', exact: true }).click();
  await expect(guest.getByRole('dialog').getByText('Private room', { exact: true })).toBeVisible({ timeout: 60000 });
}
/** Leaves through Home (releasing the seat at once, so the next test finds room on the server), then closes. */
async function leave(...pages: Page[]) {
  await Promise.allSettled(pages.map(async page => {
    const home = page.getByRole('dialog').getByRole('button', { name: 'Home', exact: true });
    if (await home.isVisible().catch(() => false)) await home.click({ timeout: 3000 }).catch(() => {});
    else await page.evaluate(() => (window as any).__roadsterDuel?.leave()).catch(() => {});
    await page.context().close();
  }));
}
const renderId = (page: Page) => page.evaluate(() => (window as any).__roadster.getWorld().scene.getRenderId() as number);

test('the paddock updates in place: a focused circuit picker and existing cards survive a driver joining', async ({ browser }) => {
  test.setTimeout(240_000);
  const host = await player(browser), guest = await player(browser);
  try {
    await createRoom(host);
    const dialog = host.getByRole('dialog');
    await expect(dialog.locator('.seat-card:not(.seat-open)')).toHaveCount(1);
    await expect(dialog.locator('.seat-open')).toHaveCount(3);
    await dialog.getByLabel('Circuit', { exact: true }).focus();
    await host.evaluate(() => { (document.querySelector('.seat-card:not(.seat-open)') as any).__kept = true; });
    // The scene is fully covered: it is not drawn while the paddock is open.
    const before = await renderId(host); await host.waitForTimeout(800);
    expect(await renderId(host)).toBe(before);
    await join(guest, host.url());
    await expect(dialog.locator('.seat-card:not(.seat-open)')).toHaveCount(2, { timeout: 30000 });
    await expect(dialog.locator('.seat-open')).toHaveCount(2);
    expect(await host.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Circuit');
    expect(await host.evaluate(() => (document.querySelector('.seat-card:not(.seat-open)') as any).__kept)).toBe(true);
    await expect(dialog.locator('.seat-card').nth(1)).toContainText('Guest 1');
    await expect(dialog.getByRole('button', { name: 'Start drawing' })).toBeEnabled();
    await expect(guest.getByRole('dialog').getByRole('button', { name: 'Start drawing' })).toHaveCount(0);
    await expect(guest.getByRole('dialog').getByLabel('Circuit', { exact: true })).toHaveCount(0);
  } finally { await leave(host, guest); }
});

test('a device still loading its circuit shows Loading circuit, then joins the race where it is and keeps its seat', async ({ browser }) => {
  test.setTimeout(360_000);
  const host = await player(browser), guest = await player(browser);
  try {
    await createRoom(host);
    const invite = new URL(host.url()); invite.searchParams.set('duelSceneDelay', '7000');
    await join(guest, invite.href);
    await host.getByRole('button', { name: 'Start drawing' }).click();
    await Promise.all([draw(host, false), draw(guest, true)]);
    const loading = guest.getByRole('dialog').getByRole('heading', { name: 'Loading circuit' });
    await expect(loading).toBeVisible({ timeout: 15000 });
    await expect(guest.getByRole('dialog').locator('.seat-card')).toHaveCount(2);
    // Revealed once ready, straight into the race the room is already running (no replayed start).
    await expect(loading).toBeHidden({ timeout: 20000 });
    await expect(guest.getByRole('dialog')).toHaveCount(0, { timeout: 5000 });
    await waitForPhase(guest, 'racing', 5000);
    await expect(guest.locator('.countdown')).toBeHidden();
    const racing = await renderId(guest); await guest.waitForTimeout(800);
    expect(await renderId(guest)).toBeGreaterThan(racing);
    for (const page of [host, guest]) {
      const d = page.getByRole('dialog');
      await expect(d.getByRole('heading', { name: 'Race results' })).toBeVisible({ timeout: 200000 });
      await expect(d.locator('.seat-result')).toHaveCount(2);
    }
  } finally { await leave(host, guest); }
});

test('leaving while a room is being reached closes everything and nothing reopens', async ({ browser }) => {
  const page = await player(browser);
  try {
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.goto('/'); await page.getByRole('button', { name: 'Multiplayer' }).click();
    await page.getByRole('button', { name: 'Private Duel' }).click();
    await page.route('**/health', async route => { await held; await route.continue().catch(() => {}); });
    await page.getByRole('button', { name: 'Create room' }).click();
    await expect(page.getByRole('dialog').getByText(/Connecting/)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    release();
    await page.waitForTimeout(4000);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.playground')).toHaveAttribute('data-phase', 'welcome');
  } finally { await page.context().close(); }
});

test('first online race: tips appear once per device and Settings shows them again', async ({ browser }) => {
  test.setTimeout(240_000);
  const host = await player(browser);
  try {
    await createRoom(host);
    const dialog = host.getByRole('dialog'), tip = dialog.getByRole('note');
    await expect(tip).toContainText('Invite your friends');
    await tip.getByRole('button', { name: 'Got it' }).click();
    await expect(tip).toContainText('Your line stays private');
    await tip.getByRole('button', { name: 'Got it' }).click();
    await expect(tip).toBeHidden();
    // A new room on this device: no tips.
    await dialog.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(host.getByRole('dialog')).toHaveCount(0);
    await host.getByRole('button', { name: 'Multiplayer' }).click();
    await host.getByRole('button', { name: 'Private Duel' }).click();
    await host.getByRole('button', { name: 'Create room' }).click();
    await expect(host.getByText('Private room', { exact: true })).toBeVisible({ timeout: 45000 });
    await expect(host.getByRole('dialog').getByRole('note')).toBeHidden();
    await host.getByRole('dialog').getByRole('button', { name: 'Home', exact: true }).click();
    // Settings → Online race tips: the next room shows them again.
    await host.locator('button[data-action="settings"]').first().click();
    await host.locator('button[data-action="duel-tips"]').click();
    await expect(host.locator('#duel-tips-note')).toContainText('next Private Duel');
    await host.locator('button[data-action="close-settings"]').click();
    await host.getByRole('button', { name: 'Multiplayer' }).click();
    await host.getByRole('button', { name: 'Private Duel' }).click();
    await host.getByRole('button', { name: 'Create room' }).click();
    await expect(host.getByRole('dialog').getByRole('note')).toContainText('Invite your friends', { timeout: 45000 });
  } finally { await leave(host); }
});
