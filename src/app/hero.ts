import type { Phase } from './phases';

/**
 * Home key art rotation. A new picture is drawn each time the player arrives on Home, never the one
 * shown last time, and it stays put while they remain there (Settings, Touch test and the discard
 * confirmation all belong to Home).
 */
export const homePhases: readonly Phase[] = ['welcome', 'tour-resume', 'diagnostics'];

export function nextHero(count: number, previous: number | null, random = Math.random) {
  if (count <= 1) return 0;
  if (previous === null || previous < 0 || previous >= count) return Math.floor(random() * count);
  // Pick among the other pictures so the same one never appears twice in a row.
  return (previous + 1 + Math.floor(random() * (count - 1))) % count;
}

/** True when moving from `from` to `to` arrives on Home from elsewhere (or on first load, when `from` is null). */
export const arrivesHome = (from: Phase | null, to: Phase) => to === 'welcome' && (from === null || !homePhases.includes(from));
