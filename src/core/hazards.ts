import { modulo } from './geometry';
import type { RouteHazard, RoutePoint, TrackDefinition } from './types';

/** Clear gaps shorter than this (m) join neighbouring hazards; the reset point sits this far past one. */
export const HAZARD_RULES = Object.freeze({ mergeGap: 8, resetMargin: 3 });

/**
 * Groups per-point problems on a closed route into hazard spans. `points` is the closed loop
 * (last point repeats the first); `course` is each point's unwrapped circuit distance.
 */
export function hazardSpans(points: RoutePoint[], blocked: boolean[], unsupported: boolean[], course: number[], track: TrackDefinition, length: number): RouteHazard[] {
  const n = points.length - 1, bad = (i: number) => blocked[modulo(i, n)] || unsupported[modulo(i, n)];
  const clear = Array.from({ length: n }, (_, i) => !bad(i));
  if (clear.every(Boolean) || !clear.some(Boolean)) return [];
  const spacing = length / n, gapPoints = Math.ceil((HAZARD_RULES.mergeGap + track.carLength) / spacing);
  // Start scanning just after a long clear stretch so no span is split by the lap seam.
  let origin = 0;
  for (let i = 0; i < n; i++) { let run = 0; while (run < n && clear[modulo(i - run, n)]) run++; if (run >= gapPoints || run === n) { origin = i + 1; break; } }
  const spans: RouteHazard[] = [];
  for (let k = 0; k < n; k++) {
    const i = origin + k;
    if (clear[modulo(i, n)]) continue;
    let end = i, kind: RouteHazard['kind'] = blocked[modulo(i, n)] ? 'barrier' : 'support';
    // Extend until a clear stretch long enough to hold the car.
    for (let j = i + 1; j < origin + n + gapPoints; j++) {
      if (!clear[modulo(j, n)]) { end = j; if (blocked[modulo(j, n)]) kind = 'barrier'; continue; }
      let run = 0; while (run < gapPoints && clear[modulo(j + run, n)]) run++;
      if (run >= gapPoints) break;
      j += run - 1;
    }
    const lapOf = (index: number) => Math.floor(index / n), at = (index: number) => points[modulo(index, n)].distance + lapOf(index) * length;
    const courseAt = (index: number) => course[modulo(index, n)] + lapOf(index) * track.length;
    const resetIndex = end + 1 + Math.ceil(HAZARD_RULES.resetMargin / spacing);
    const from = at(i), to = at(resetIndex);
    spans.push({ from: modulo(from, length), to: to - (from - modulo(from, length)), course: Math.max(0, courseAt(resetIndex) - courseAt(i)), kind });
    k = end - origin;
  }
  return spans.sort((a, b) => a.from - b.from);
}
