import type { TrackDefinition, TrackJump } from '../core/types';
import { deckAt } from '../core/decks';
import { fleetAppearance, fleetRampGuideAppearance as guide } from './themes';

export interface RampGuideQuad { jumpId: string; kind: 'strip' | 'touchdown'; points: number[][]; deckId?: string }

/**
 * Bright edge strips up each automatic ramp and matching touchdown bars on its receiving deck,
 * so the ramp and its landing read at gameplay scale. Bars are clipped to the receiving deck in
 * 0.5 m steps; manual Hop entries (no ramp) get nothing. Presentation only.
 */
export function rampGuideQuads(track: TrackDefinition): RampGuideQuad[] {
  const quads: RampGuideQuad[] = [];
  for (const j of (track.jumps ?? []).filter(j => j.activation !== 'hop' && j.rampLength > 0)) {
    const base = j.takeoffElevation ?? 0, landing = j.landingElevation ?? base;
    const at = (along: number, across: number, y: number) => [j.from.x + j.forward.x * along + j.forward.z * across, y, j.from.z + j.forward.z * along - j.forward.x * across];
    const flat = (a0: number, a1: number, c0: number, c1: number, y0: number, y1: number) => [at(a0, c0, y0), at(a1, c0, y1), at(a1, c1, y1), at(a0, c1, y0)].reverse();
    const lift = fleetAppearance.drivingOffset + guide.lift;
    for (const side of [-1, 1]) {
      const outer = side * (j.width / 2 - guide.stripInset), inner = outer - side * guide.stripWidth;
      quads.push({ jumpId: j.id, kind: 'strip', points: flat(0, j.rampLength, Math.min(outer, inner), Math.max(outer, inner), base + lift, base + j.lipHeight + lift) });
    }
    const start = j.rampLength + j.gap + guide.touchdownStart;
    for (let n = 0; n < guide.touchdownBars; n++) {
      const a0 = start + n * guide.touchdownSpacing, a1 = a0 + guide.touchdownDepth;
      for (const [c0, c1] of supportedSpans(track, j, (a0 + a1) / 2, a1 - a0)) {
        quads.push({ jumpId: j.id, kind: 'touchdown', deckId: j.landingSurfaceId, points: flat(a0, a1, c0, c1, landing + lift, landing + lift) });
      }
    }
  }
  return quads;
}

/** Across-ranges at `along` where a bar of depth `depth` lies wholly on the jump's receiving deck. */
function supportedSpans(track: TrackDefinition, j: TrackJump, along: number, depth: number): [number, number][] {
  const half = j.width / 2 - guide.touchdownInset, spans: [number, number][] = [];
  const on = (across: number) => [-depth / 2, depth / 2].every(d => {
    const p = { x: j.from.x + j.forward.x * (along + d) + j.forward.z * across, z: j.from.z + j.forward.z * (along + d) - j.forward.x * across };
    return deckAt(p, track, Infinity, j.landingSurfaceId)?.id === j.landingSurfaceId;
  });
  let from: number | null = null;
  for (let c = -half; c <= half + 1e-9; c += 0.5) {
    if (on(c)) { if (from === null) from = c; }
    else if (from !== null) { if (c - 0.5 - from >= 1) spans.push([from, c - 0.5]); from = null; }
  }
  if (from !== null && half - from >= 1) spans.push([from, half]);
  return spans;
}
