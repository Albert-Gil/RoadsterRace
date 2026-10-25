// Deterministic "human" drawing strokes for acceptance measurements. A stroke follows the
// centerline with smooth lateral wander, optional corner cutting, timing variation,
// hesitations, sloppy start/finish positions and finger jitter.
import { cumulative, distance, samplePolyline } from '../../src/core/geometry';
import { gatePoint } from '../../src/core/start-finish';
import type { DrawSample, Point, TrackDefinition } from '../../src/core/types';

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export interface StrokeProfile { name: string; wander: number; cut: number; jitter: number; pauses: number; startSlop: number; endSlop: [number, number] }
export const PROFILES: StrokeProfile[] = [
  { name: 'tidy', wander: 0.2, cut: 0, jitter: 0.15, pauses: 0, startSlop: 0.3, endSlop: [0.5, 6] },
  { name: 'loose', wander: 0.55, cut: 0.4, jitter: 0.35, pauses: 0.15, startSlop: 0.7, endSlop: [-1, 10] },
  { name: 'wild', wander: 1.1, cut: 1, jitter: 0.6, pauses: 0.35, startSlop: 1, endSlop: [-4, 14] },
  { name: 'cutter', wander: 0.35, cut: 2.2, jitter: 0.35, pauses: 0.1, startSlop: 0.6, endSlop: [-2, 10] },
];

/** Signed curvature of the centerline at s (positive = turning left). */
function curvature(track: TrackDefinition, s: number) {
  const L = track.length, at = (v: number) => samplePolyline(track.centerline, track.distances, ((v % L) + L) % L);
  const a = at(s - 6), b = at(s), c = at(s + 6);
  const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
  return 2 * cross / Math.max(1e-6, distance(a, b) * distance(b, c) * distance(a, c));
}

export function humanStroke(track: TrackDefinition, profile: StrokeProfile, seed: number): DrawSample[] {
  const r = rng(seed), w = track.roadWidth, L = track.length;
  const phases = [0, 1, 2].map(() => r() * Math.PI * 2), freqs = [2 + r() * 2, 5 + r() * 4, 11 + r() * 6];
  const amps = [0.6, 0.3, 0.1].map(f => f * profile.wander * w * (0.6 + r() * 0.8));
  const startAlong = -10 * r() * profile.startSlop + (r() < 0.3 * profile.startSlop ? 2.5 * r() : 0);
  const startAcross = (r() * 2 - 1) * (w / 2 + 1.5 * profile.startSlop);
  const endOver = profile.endSlop[0] + r() * (profile.endSlop[1] - profile.endSlop[0]);
  const lateral = (s: number) => {
    let o = 0; for (let k = 0; k < 3; k++) o += amps[k] * Math.sin(freqs[k] * s / L * Math.PI * 2 + phases[k]);
    // Cut towards the inside of bends, never past the bend's own centre (a player draws an apex, not a loop).
    const k = curvature(track, s); o += Math.sign(k) * Math.min(profile.cut * w, profile.cut * Math.abs(k) * 120, 0.85 / Math.max(1e-6, Math.abs(k)));
    return o;
  };
  const left = (s: number) => { const a = samplePolyline(track.centerline, track.distances, Math.max(0, s - 1)), b = samplePolyline(track.centerline, track.distances, Math.min(L, s + 1)), d = distance(a, b) || 1; return { x: -(b.z - a.z) / d, z: (b.x - a.x) / d }; };
  const points: Point[] = [];
  const lead = gatePoint(track, startAcross, startAlong);
  points.push(lead);
  for (let s = 1.2; s <= L + endOver; s += 1.2) {
    const sm = ((s % L) + L) % L, c = samplePolyline(track.centerline, track.distances, sm), n = left(sm);
    // Fade from the start offset into the wander, and back towards the gate at the end.
    const fadeIn = Math.min(1, s / 25), o = startAcross * (1 - fadeIn) + lateral(sm) * fadeIn * Math.min(1, Math.max(0.15, (L + endOver - s) / 20));
    points.push({ x: c.x + n.x * o + (r() - 0.5) * 2 * profile.jitter, z: c.z + n.z * o + (r() - 0.5) * 2 * profile.jitter });
  }
  const ds = cumulative(points), duration = 4000 + r() * 9000;
  let time = 0, pauseBudget = profile.pauses > 0 && r() < profile.pauses ? 1 + Math.floor(r() * 2) : 0;
  return points.map((p, i) => {
    if (i) {
      const step = (ds[i] - ds[i - 1]) / ds.at(-1)! * duration * (0.6 + 0.8 * (0.5 + 0.5 * Math.sin(i * 0.07 + phases[0])));
      time += step;
      if (pauseBudget && r() < 0.004) { time += 600 + r() * 2400; pauseBudget--; }
    }
    return { ...p, time };
  });
}

