// Public release smoke check, run by the Pages workflow after publishing (and locally against the
// duel test servers). A fresh browser opens the site, waits until it serves the expected build,
// creates a Newport Island room and joins it from a second browser context; both players leave.
// Any failure exits 1 and leaves screenshots in artifacts/public-smoke/.
// With --server, it then prints the room server's /stats (step times per circuit, rooms, cold-start time)
// to the log and the job summary; a server without /stats only warns.
//   node tools/public-smoke.mjs --url https://<user>.github.io/RoadsterRace/ [--build abc1234] [--server https://<room server>]
import { chromium } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { browserOptions } from './browser-options.mjs';

const { values } = parseArgs({ options: { url: { type: 'string' }, build: { type: 'string' }, 'build-wait': { type: 'string', default: '360' }, server: { type: 'string' } } });
if (!values.url) { console.error('Usage: node tools/public-smoke.mjs --url <site> [--build <id>]'); process.exit(2); }
const site = new URL(values.url), evidence = 'artifacts/public-smoke';
mkdirSync(evidence, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForBuild(page) {
  const deadline = Date.now() + Number(values['build-wait']) * 1000;
  for (;;) {
    await page.goto(site.href, { waitUntil: 'domcontentloaded' });
    const build = await page.evaluate(() => document.documentElement.dataset.build ?? null);
    if (!values.build || build === values.build) return build;
    if (Date.now() > deadline) throw new Error(`The site still serves build ${build}, not ${values.build}.`);
    console.log(`Waiting for build ${values.build} (site serves ${build})…`);
    await sleep(15_000);
  }
}

/** Waits for the lobby, retrying a full server for up to two minutes. */
async function enterLobby(page, press) {
  const dialog = page.getByRole('dialog');
  const deadline = Date.now() + 120_000;
  for (;;) {
    await press();
    const outcome = await Promise.race([
      dialog.getByText('Private room', { exact: true }).waitFor({ timeout: 150_000 }).then(() => 'lobby'),
      dialog.getByText(/server is full/i).waitFor({ timeout: 150_000 }).then(() => 'full'),
      dialog.getByText(/Online play is updating|unreachable|did not wake up|No open race|expired/).waitFor({ timeout: 150_000 }).then(() => 'error'),
    ]);
    if (outcome === 'lobby') return;
    const status = (await dialog.textContent())?.replace(/\s+/g, ' ').trim();
    if (outcome === 'error' || Date.now() > deadline) throw new Error(`Could not open the room: ${status}`);
    console.log('The room server is full; retrying…');
    await sleep(15_000);
  }
}

/** Prints the room server's live numbers; informational, never fails the check. */
async function reportStats(server) {
  try {
    const response = await fetch(new URL('/stats', server), { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const stats = await response.json(), lines = [`Room server: up ${stats.uptimeSeconds} s, ready ${stats.readyMs ?? '?'} ms after start, rooms ${JSON.stringify(stats.rooms)}`];
    for (const [circuit, s] of Object.entries({ ...stats.stepsLastHour, ...stats.stepsLastMinute }))
      lines.push(`  ${circuit}: step median ${s.medianMs} ms, p95 ${s.p95Ms} ms, max ${s.maxMs} ms over ${s.samples} steps; behind ${s.behindMs} ms (budget ${stats.tickBudgetMs} ms)`);
    console.log(lines.join('\n'));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ['### Room server /stats', '```', ...lines, '```', ''].join('\n'));
  } catch (error) {
    console.log(`::warning::Could not read ${server}/stats: ${error.message}`);
  }
}

const browser = await chromium.launch(browserOptions());
const pages = [];
try {
  const host = await (await browser.newContext({ viewport: { width: 900, height: 700 } })).newPage(); pages.push(host);
  const build = await waitForBuild(host);
  console.log(`Site ${site.href} serves build ${build}.`);
  await host.getByRole('button', { name: 'Multiplayer' }).click();
  await host.getByRole('button', { name: 'Private Duel' }).click();
  await host.getByLabel('Driver name', { exact: true }).fill('Release check A');
  await host.getByRole('dialog').getByLabel('Circuit', { exact: true }).selectOption('coastal-launch');
  await enterLobby(host, () => host.getByRole('button', { name: 'Create room' }).click());
  const invite = host.url();
  console.log(`Created room ${new URL(invite).searchParams.get('duel')}.`);

  const guest = await (await browser.newContext({ viewport: { width: 900, height: 700 } })).newPage(); pages.push(guest);
  await guest.goto(invite, { waitUntil: 'domcontentloaded' });
  await guest.getByLabel('Driver name', { exact: true }).fill('Release check B');
  await enterLobby(guest, () => guest.getByRole('button', { name: 'Join room', exact: true }).click());
  await host.getByRole('dialog').locator('p').filter({ hasText: 'Joined' }).nth(1).waitFor({ timeout: 30_000 });
  console.log('Both players are in the room.');

  for (const page of [guest, host]) await page.getByRole('dialog').getByRole('button', { name: 'Home', exact: true }).click();
  console.log('Both players left. Public release check passed.');
} catch (error) {
  for (const [i, page] of pages.entries()) await page.screenshot({ path: `${evidence}/player-${i + 1}.png` }).catch(() => {});
  console.error(`::error::Public release check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
if (values.server) await reportStats(values.server);
