import type { Page } from '@playwright/test';

/**
 * Production-safe helpers: they read only the rendered interface, never the development
 * inspector (`window.__roadster`), so the same checks work against built Pages releases.
 */
export type UiPhase = 'welcome' | 'setup' | 'handoff' | 'drawing' | 'preview' | 'ready' | 'countdown' | 'racing' | 'paused' | 'results' | 'diagnostics' | 'error' | 'tour-intro' | 'tour-resume' | 'tour-exit' | 'tour-replace';

export const currentPhase = (page: Page) => page.locator('.playground').getAttribute('data-phase') as Promise<UiPhase>;
export function waitForPhase(page: Page, phase: UiPhase, timeout?: number) {
  return page.waitForFunction(p => document.querySelector('.playground')?.getAttribute('data-phase') === p, phase, timeout === undefined ? undefined : { timeout });
}
/** The race HUD as players read it. */
export const hudText = (page: Page) => page.evaluate(() => ({
  time: document.querySelector('#race-time')?.textContent ?? '', lapLabel: document.querySelector('#lap-label')?.textContent ?? '',
  lap: document.querySelector('#race-lap')?.textContent ?? '', paceLabel: document.querySelector('#pace-label')?.textContent ?? '', pace: document.querySelector('#race-speed')?.textContent ?? '',
}));
/** Finishing table rows from the results panel: place (with "=" for ties), driver text and time. */
export const resultRows = (page: Page) => page.locator('.standings:not(.championship-table) tbody tr').evaluateAll(rows => rows.map(row => ({
  place: row.querySelector('td')?.textContent?.trim() ?? '', driver: row.querySelector('th')?.textContent?.trim() ?? '', time: row.querySelectorAll('td')[1]?.childNodes[0]?.textContent?.trim() ?? '',
})));
