/** Shared fragments for the phase panels. Panels are pure markup builders: no DOM, scene or storage access. */
export const arrow = '<span aria-hidden="true">↗</span>';
export const playerChip = (i: number) => `<span class="player-chip" style="--identity:var(--player-${i + 1});--identity-ink:var(--player-${i + 1}-ink)">${i + 1}</span>`;
export const plural = (count: number, one: string, many: string) => count === 1 ? one : many;

const icon = (paths: string) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export const homeIcon = icon('<path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/>');
export const settingsIcon = icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>');
export const chevronIcon = icon('<path d="m9 6 6 6-6 6"/>');
export const closeIcon = icon('<path d="M6 6l12 12M18 6 6 18"/>');
export const restartIcon = icon('<path d="M4 10a8 8 0 1 1 1.4 7M4 4v6h6"/>');
export const drawIcon = icon('<path d="M4 20h4L19 9l-4-4L4 16z"/>');
export const setupIcon = icon('<path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6"/>');
export const exitIcon = icon('<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>');
export const playIcon = icon('<path d="M7 5v14l11-7z"/>');
export const soundIcon = icon('<path d="M4 9h4l5-4v14l-5-4H4z"/><path class="sound-waves" d="M16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/><path class="sound-slash" d="m4 3 17 18"/>');
export const deviceIcon = icon('<path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M11 18h2"/>');
/** A two-part slanted tag (red, then white), the broadcast-style label on results and standings. */
export const tags = (first: string, second?: string) => `<div class="tag-pair"><span class="tag eyebrow">${first}</span>${second ? `<span class="tag tag-light">${second}</span>` : ''}</div>`;
/** On/off switch drawn inside a toggle button (the button carries aria-pressed). */
export const switchMark = '<span class="switch" aria-hidden="true"><i></i></span>';
