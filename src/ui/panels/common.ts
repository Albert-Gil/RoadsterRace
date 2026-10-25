/** Shared fragments for the phase panels. Panels are pure markup builders: no DOM, scene or storage access. */
export const arrow = '<span aria-hidden="true">↗</span>';
export const playerChip = (i: number) => `<span class="player-chip" style="--identity:var(--player-${i + 1});--identity-ink:var(--player-${i + 1}-ink)">${i + 1}</span>`;
export const homeIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
export const plural = (count: number, one: string, many: string) => count === 1 ? one : many;
