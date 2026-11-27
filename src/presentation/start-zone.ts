import type { Point, TrackDefinition } from '../core/types';
import { drawingStartBounds, gatePoint, startGate } from '../core/start-finish';

/**
 * The drawing start box: a tinted fill, a solid border and two large arrows on the main
 * straight showing the lap direction. Distances in metres along/across the start gate
 * (along > 0 is the racing direction). These are the only direction arrows on a circuit.
 */
export const startZoneAppearance = {
  border: 0.7,          // border strip width
  arrowWidth: 6,        // arrow head width, capped at arrowShare of the road
  arrowShare: 0.36,
  shaftShare: 0.42,     // shaft width / head width
  arrowFrom: -25,       // tail, metres before the gate
  arrowTo: -6,          // tip
  headLength: 7,
  fillAlpha: 0.2,
  guideAlpha: 0.95,
  pulseHz: 0.8,         // guide alpha breathes between pulseLow and guideAlpha while drawing
  pulseLow: 0.6,
} as const;

export type Triangle = [Point, Point, Point];
const quad = (a: Point, b: Point, c: Point, d: Point): Triangle[] => [[a, b, c], [a, c, d]];

/** Arrow tip, tail and head corners at one lateral offset, for tests and placement. */
export function startArrows(track: TrackDefinition) {
  const a = startZoneAppearance, g = startGate(track), width = Math.min(a.arrowWidth, g.width * a.arrowShare);
  return [-g.width / 4, g.width / 4].map(across => ({ across, width, tail: a.arrowFrom, tip: a.arrowTo, neck: a.arrowTo - a.headLength }));
}

export function startZoneTriangles(track: TrackDefinition): { fill: Triangle[]; guide: Triangle[] } {
  const z = drawingStartBounds(track), b = startZoneAppearance.border, at = (across: number, along: number) => gatePoint(track, across, along);
  const box = (x0: number, x1: number, y0: number, y1: number) => quad(at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1));
  const fill = box(-z.halfWidth, z.halfWidth, z.from, z.to);
  const guide = [
    ...box(-z.halfWidth, z.halfWidth, z.from, z.from + b), ...box(-z.halfWidth, z.halfWidth, z.to - b, z.to),
    ...box(-z.halfWidth, -z.halfWidth + b, z.from + b, z.to - b), ...box(z.halfWidth - b, z.halfWidth, z.from + b, z.to - b),
  ];
  for (const arrow of startArrows(track)) {
    const shaft = arrow.width * startZoneAppearance.shaftShare / 2, c = arrow.across;
    guide.push(...box(c - shaft, c + shaft, arrow.tail, arrow.neck), [at(c - arrow.width / 2, arrow.neck), at(c + arrow.width / 2, arrow.neck), at(c, arrow.tip)]);
  }
  return { fill, guide };
}
