/** Shared fragments for the phase panels. Panels are pure markup builders: no DOM, scene or storage access. */
export const arrow = '<span aria-hidden="true">↗</span>';
export const playerChip = (i: number) => `<span class="player-chip" style="--identity:var(--player-${i + 1});--identity-ink:var(--player-${i + 1}-ink)">${i + 1}</span>`;
export const plural = (count: number, one: string, many: string) => count === 1 ? one : many;
