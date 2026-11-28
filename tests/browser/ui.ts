import type { Browser, BrowserContext, BrowserContextOptions, CDPSession, Page } from '@playwright/test';

/**
 * Production-safe helpers: they read only the rendered interface, never the development
 * inspector (`window.__roadster`), so the same checks work against built Pages releases.
 */
export type UiPhase = 'welcome' | 'setup' | 'handoff' | 'drawing' | 'preview' | 'ready' | 'countdown' | 'racing' | 'paused' | 'results' | 'diagnostics' | 'error' | 'tour-intro' | 'tour-resume' | 'tour-exit' | 'tour-replace' | 'tutorial-intro' | 'collection' | 'challenges';

export const currentPhase = (page: Page) => page.locator('.playground').getAttribute('data-phase') as Promise<UiPhase>;
export function waitForPhase(page: Page, phase: UiPhase, timeout?: number) {
  return page.waitForFunction(p => document.querySelector('.playground')?.getAttribute('data-phase') === p, phase, timeout === undefined ? undefined : { timeout });
}
/** The race HUD as players read it. */
export const hudText = (page: Page) => page.evaluate(() => ({
  time: document.querySelector('#race-time')?.textContent ?? '', lapLabel: document.querySelector('#lap-label')?.textContent ?? '',
  lap: document.querySelector('#race-lap')?.textContent ?? '', paceLabel: document.querySelector('#pace-label')?.textContent ?? '', pace: document.querySelector('#race-speed')?.textContent ?? '',
}));
/** Settings (sound, touch test, graphics, renderer) opens from the gear on Home and race setup. */
export const openSettings = (page: Page) => page.getByRole('button', { name: 'Settings', exact: true }).click();
export const closeSettings = (page: Page) => page.getByRole('button', { name: 'Close settings', exact: true }).click();
/** The Sound toggle: in Settings, and in the Pause menu during a race. */
export const soundToggle = (page: Page) => page.getByRole('button', { name: 'Sound', exact: true });
/** Finishing table rows from the results panel: place (with "=" for ties), driver text and time. */
export const resultRows = (page: Page) => page.locator('.standings:not(.championship-table) tbody tr').evaluateAll(rows => rows.map(row => ({
  place: row.querySelector('td')?.textContent?.trim() ?? '', driver: row.querySelector('th')?.textContent?.trim() ?? '', time: row.querySelectorAll('td')[1]?.childNodes[0]?.textContent?.trim() ?? '',
})));
/** Every human seat taps the same choice on the shared-screen Results vote (ui/panels/ballot.ts). */
export async function voteEveryone(page: Page, label: string) {
  const seats = await page.locator('.ballot-seat').count();
  for (let seat = 0; seat < seats; seat++) await page.locator(`[data-action="vote"][data-seat="${seat}"]`).filter({ hasText: label }).click();
}

/** Device pixel ratio for a spec: the requested one on a GPU (WEBGL_BACKEND=d3d11), 1 on software WebGL, where each extra pixel slows every frame and every dispatched touch. */
export const testPixelRatio = (gpu: number) => process.env.WEBGL_BACKEND === 'd3d11' ? gpu : 1;
/** Test-only race speed (src/app/test-clock.ts) for specs that wait for whole races. */
export const RACE_SPEED = 'simRate=4';

/**
 * Sends a whole touch stroke without waiting for each event's acknowledgement. The browser then coalesces
 * several moves into one frame, and the game reads every coalesced sample with its own timestamp, so the
 * drawn line is the same while a slow (software WebGL) frame no longer gates every single point.
 * `time` is seconds after the stroke starts; `end` defaults to the last point's time.
 */
export async function sendTouchStroke(cdp: CDPSession, points: { x: number; y: number; time: number }[], id = 1, end = points.at(-1)!.time) {
  const epoch = Date.now() / 1000;
  const sends = points.map((p, i) => cdp.send('Input.dispatchTouchEvent', { type: i ? 'touchMove' : 'touchStart', touchPoints: [{ x: p.x, y: p.y, id }], timestamp: epoch + (i ? p.time : 0) }));
  sends.push(cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: epoch + end }));
  await Promise.all(sends);
}

/** A time budget for slow software WebGL (CI and the cloud): three times the GPU budget unless WEBGL_BACKEND=d3d11. */
export const softwareBudget = (gpuMs: number) => process.env.WEBGL_BACKEND === 'd3d11' ? gpuMs : gpuMs * 3;

/** A context that records video when Playwright's ffmpeg is installed, and the same context without video otherwise. */
export async function contextWithOptionalVideo(browser: Browser, options: BrowserContextOptions): Promise<{ context: BrowserContext; page: Page; video: boolean }> {
  try {
    const context = await browser.newContext(options);
    try { return { context, page: await context.newPage(), video: true }; }
    catch (error) { await context.close(); throw error; }
  } catch (error) {
    if (!options.recordVideo || !/ffmpeg/i.test(String(error))) throw error;
    const { recordVideo: _skip, ...rest } = options;
    const context = await browser.newContext(rest);
    return { context, page: await context.newPage(), video: false };
  }
}
