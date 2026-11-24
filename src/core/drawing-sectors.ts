import { distance, modulo, samplePolyline } from './geometry';
import { projectCourse } from './route-cleanup';
import type { DrawSample, Point, TrackDefinition } from './types';

/**
 * Zoomed drawing sectors for small (phone-sized) screens. A sector is a stretch of the lap's
 * course distance [from, to); the count sets the drawing zoom. The camera follows the line in
 * steps: after each lift it shows as much of the upcoming course as fits, and the player
 * continues from the end of the line. Sectors only change the drawing camera and how
 * strokes are joined: the joined samples are timed exactly like one continuous stroke, so the
 * route compiler, rules and records are unchanged.
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
export function drawnProgress(points: readonly Point[], track: TrackDefinition) {
  if (!points.length) return 0;
  const step: Point[] = [points[0]];
  for (const p of points) if (distance(p, step.at(-1)!) >= 1.5) step.push(p);
  if (step.at(-1) !== points.at(-1)) step.push(points.at(-1)!);
  let previous = projectCourse(step[0], track);
  let unwrapped = previous.progress > track.length / 2 ? previous.progress - track.length : previous.progress;
  for (let i = 1; i < step.length; i++) {
    const next = projectCourse(step[i], track, { point: step[i - 1], progress: previous.progress });
    unwrapped += next.progress - previous.progress; previous = next;
  }
  return unwrapped;
}

/** Course centreline points every `step` m from course distance `from` for `ahead` m (wrapping at the line). */
export function upcomingCourse(track: TrackDefinition, from: number, ahead: number, step = 4): Point[] {
  const out: Point[] = [];
  for (let s = from; s <= from + Math.min(ahead, track.length); s += step) out.push(samplePolyline(track.centerline, track.distances, modulo(s, track.length)));
  return out;
}

/**
 * Clock shift for a stroke that continues a lifted line at sample `from` (the line is trimmed
 * there first). The first new sample is timed as if the finger had travelled from that point at
 * the line's pace over its last 0.4 s, so the lift and the camera glide cost no time and the
 * joined samples read as one continuous stroke.
 */
export function continuationOffset(stroke: readonly DrawSample[], from: number, touch: Point, timeStamp: number) {
  const end = stroke[from];
  let k = from; while (k > 0 && end.time - stroke[k - 1].time < 400) k--;
  let length = 0; for (let i = k + 1; i <= from; i++) length += distance(stroke[i - 1], stroke[i]);
  const span = (end.time - stroke[k].time) / 1000, speed = span > 0.05 ? Math.max(2, length / span) : 15;
  const gap = Math.min(400, Math.max(16, distance(touch, end) / speed * 1000));
  return end.time + gap - timeStamp;
}
