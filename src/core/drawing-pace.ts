import { clamp, cumulative, distance, lerp, mix } from './geometry';
import { DRAWING_RULES } from './route-cleanup';
import type { DrawSample } from './types';

export const PACE_RANGE = Object.freeze({ min: 9, max: 30 });
export const PACE_FILTER = Object.freeze({ gestureRadius: 5, compiledRadius: 8, sampleSpacing: 1, pauseRadius: 0.35 });

/** Fraction of the circuit per second: independent of camera, CSS size and pixel density. */
export function paceToSpeed(worldUnitsPerSecond: number, trackLength: number): number {
  const u = clamp((worldUnitsPerSecond / trackLength - 0.015) / 0.245, 0, 1);
  return lerp(PACE_RANGE.min, PACE_RANGE.max, u * u * (3 - 2 * u));
}

/** A resting finger counts for at most 0.4 s, whether delivered as one event or 100. */
export function compressDrawingPauses(samples: DrawSample[]): DrawSample[] {
  if (!samples.length) return [];
  let anchor = samples[0], removed = 0, previousExcess = 0;
  return samples.map(p => {
    if (distance(p, anchor) > PACE_FILTER.pauseRadius) { anchor = p; previousExcess = 0; }
    const excess = Math.max(0, p.time - anchor.time - DRAWING_RULES.longestPause * 1000);
    removed += Math.max(0, excess - previousExcess); previousExcess = excess;
    return { ...p, time: p.time - removed };
  });
}

function timedAt(samples: DrawSample[], ds: number[], at: number): DrawSample {
  let lo = 0, hi = samples.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (ds[mid] <= at) lo = mid; else hi = mid; }
  const t = clamp((at - ds[lo]) / Math.max(1e-9, ds[hi] - ds[lo]), 0, 1);
  return { ...mix(samples[lo], samples[hi], t), time: lerp(samples[lo].time, samples[hi].time, t) };
}

/** Uniform metre spacing makes pace/geometry smoothing independent of pointer-event frequency. */
export function prepareDrawingSamples(input: DrawSample[]): DrawSample[] {
  const samples = compressDrawingPauses(input);
  if (samples.length < 2) return samples;
  const ds = cumulative(samples), total = ds.at(-1)!;
  if (total < 1e-6) return [samples[0]];
  const count = Math.max(1, Math.ceil(total / PACE_FILTER.sampleSpacing));
  return Array.from({ length: count + 1 }, (_, i) => i === 0 ? samples[0] : i === count ? samples.at(-1)! : timedAt(samples, ds, total * i / count));
}

/** Exact distance-window endpoints, rather than the nearest device-dependent events. */
export function gestureSpeeds(samples: DrawSample[], trackLength: number) {
  if (samples.length < 2) return samples.map(() => PACE_RANGE.min);
  const ds = cumulative(samples), total = ds.at(-1)!;
  return samples.map((_, i) => {
    const from = Math.max(0, ds[i] - PACE_FILTER.gestureRadius), to = Math.min(total, ds[i] + PACE_FILTER.gestureRadius);
    const a = timedAt(samples, ds, from), b = timedAt(samples, ds, to);
    return paceToSpeed((to - from) / Math.max(0.001, (b.time - a.time) / 1000), trackLength);
  });
}
