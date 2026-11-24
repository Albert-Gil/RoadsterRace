import { distance, modulo, samplePolyline } from './geometry';
import { projectCourse } from './route-cleanup';
import type { DrawSample, Point, TrackDefinition } from './types';

/**
 * Zoomed drawing sectors for small (phone-sized) screens. A sector is a stretch of the lap's
 * course distance [from, to); the count sets the drawing zoom. The camera follows the line in
 * steps: after each lift it shows as much of the upcoming course as fits, and the player
 * continues from the end of the line. The input adapter normalizes zoom and blends recontacts
 * before passing the joined gesture to the ordinary route compiler.
 */
export interface DrawingSector { index: number; from: number; to: number }

export const SECTOR_RULES = Object.freeze({
  /** Boundaries stay this far (m) from the ends of every jump and Hop corridor. */
  corridorMargin: 14,
  /** Boundaries stay this far (m) from the start/finish line. */
  gateMargin: 30,
  /** A boundary may move this share of a sector's length to find a straighter spot. */
  search: 0.2,
});

/** Turning (radians) of the centreline within ±window metres of course distance `at`. */
function turning(track: TrackDefinition, at: number, window = 10) {
  const L = track.length, p = (s: number) => samplePolyline(track.centerline, track.distances, modulo(s, L));
  const a = p(at - window), b = p(at), c = p(at + window);
  const h1 = Math.atan2(b.x - a.x, b.z - a.z), h2 = Math.atan2(c.x - b.x, c.z - b.z);
  return Math.abs(Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1)));
}

/** Splits the lap into `count` sectors with boundaries on straights, outside jump and Hop corridors. */
export function drawingSectors(track: TrackDefinition, count: number): DrawingSector[] {
  const L = track.length, n = Math.max(1, Math.min(4, Math.round(count)));
  if (n === 1) return [{ index: 0, from: 0, to: L }];
  const R = SECTOR_RULES, corridors = [...(track.jumps ?? []), ...(track.hopShortcuts ?? [])].map(c => [c.entryProgress - R.corridorMargin, c.exitProgress + R.corridorMargin]);
  const blocked = (s: number) => s < R.gateMargin || s > L - R.gateMargin || corridors.some(([a, b]) => s >= a && s <= b);
  const bounds = [0];
  for (let k = 1; k < n; k++) {
    const ideal = k * L / n, span = R.search * L / n;
    let best = ideal, cost = Infinity;
    for (let s = ideal - span * 2; s <= ideal + span * 2; s += 2) {
      if (blocked(s) || s <= bounds.at(-1)! + R.gateMargin) continue;
      const c = turning(track, s) * 4 + Math.abs(s - ideal) / span * (Math.abs(s - ideal) > span ? 3 : .6);
      if (c < cost) { cost = c; best = s; }
    }
    // Long corridors (San Diego Fleet's support lanes) can cover the whole search window:
    // then take the nearest open spot anywhere after the previous boundary.
    if (cost === Infinity) {
      let nearest = NaN;
      for (let s = bounds.at(-1)! + R.gateMargin; s < L - R.gateMargin; s += 2) if (!blocked(s) && (Number.isNaN(nearest) || Math.abs(s - ideal) < Math.abs(nearest - ideal))) nearest = s;
      if (Number.isNaN(nearest)) break;
      best = nearest;
    }
    bounds.push(best);
  }
  bounds.push(L);
  return bounds.slice(0, -1).map((from, index) => ({ index, from, to: bounds[index + 1] }));
}

/** The sector containing course distance `progress` (0 at the start line, unwrapped). */
export function sectorAt(sectors: readonly DrawingSector[], progress: number) {
  return sectors.find(s => progress < s.to) ?? sectors.at(-1)!;
}

/**
 * How far around the course a partial drawing has travelled (m, unwrapped, from the start line).
 * Samples may begin up to 12 m behind the line, which counts as slightly negative.
 */
export function drawnProgress(points: readonly Point[], track: TrackDefinition, visit?: (index: number, progress: number) => void) {
  if (!points.length) return 0;
  let last = points[0], previous = projectCourse(last, track);
  let unwrapped = previous.progress > track.length / 2 ? previous.progress - track.length : previous.progress;
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    if (i < points.length - 1 && distance(point, last) < 1.5) continue;
    const next = projectCourse(point, track, { point: last, progress: previous.progress });
    unwrapped += next.progress - previous.progress;
    visit?.(i, unwrapped);
    last = point;
    previous = next;
  }
  return unwrapped;
}

/** Course centreline points every `step` m from course distance `from` for `ahead` m (wrapping at the line). */
export function upcomingCourse(track: TrackDefinition, from: number, ahead: number, step = 4): Point[] {
  const out: Point[] = [];
  for (let s = from; s <= from + Math.min(ahead, track.length); s += step) out.push(samplePolyline(track.centerline, track.distances, modulo(s, track.length)));
  return out;
}

/** Reconstruct the last five metres at the incoming pace, ignoring hesitation to lift. */
export function joinSectorTail(stroke: DrawSample[], preservedCount = 0) {
  let pivot = stroke.length - 1, tail = 0;
  while (pivot > 0 && tail < 5) {
    tail += distance(stroke[pivot], stroke[pivot - 1]);
    pivot--;
  }
  let start = pivot, approach = 0;
  while (start > 0 && approach < 12) {
    approach += distance(stroke[start], stroke[start - 1]);
    start--;
  }
  if (approach < 1) return tail > .1 ? (stroke.at(-1)!.time - stroke[pivot].time) / tail : undefined;
  const msPerMetre = (stroke[pivot].time - stroke[start].time) / approach;
  for (let i = Math.max(pivot + 1, preservedCount); i < stroke.length; i++) {
    const previous = stroke[i - 1], p = stroke[i];
    stroke[i] = { ...p, time: previous.time + distance(previous, p) * msPerMetre };
  }
  return msPerMetre;
}

/** Match the overview finger speed. Ease from incoming pace into measured movement after recontact. */
export function sectorSampleDuration(rawMs: number, zoom: number, metres: number, fromJoin: number, incoming?: number) {
  const measured = rawMs / zoom;
  if (incoming === undefined || fromJoin >= 6) return measured;
  if (rawMs === 0 && fromJoin === 0) return metres * incoming;
  const t = Math.max(0, Math.min(1, (fromJoin + metres / 2 - 1) / 5));
  const blend = t * t * (3 - 2 * t);
  return metres * incoming * (1 - blend) + measured * blend;
}
