import { describe, expect, it } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { canStartDrawing, gateCoordinates, startGate } from '../../src/core/start-finish';
import { startArrows, startZoneTriangles } from '../../src/presentation/start-zone';

describe('drawing start box', () => {
  for (const { id, track } of circuits) it(id + ': two large arrows on the road inside the box point the racing direction', () => {
    const arrows = startArrows(track), road = startGate(track).width / 2;
    expect(arrows).toHaveLength(2);
    for (const arrow of arrows) {
      expect(arrow.tip).toBeGreaterThan(arrow.neck); expect(arrow.neck).toBeGreaterThan(arrow.tail);
      expect(arrow.width).toBeGreaterThanOrEqual(4.5);
      expect(Math.abs(arrow.across) + arrow.width / 2).toBeLessThanOrEqual(road);
    }
    // Every guide vertex (border and arrows) lies inside the box where a stroke may start.
    const { fill, guide } = startZoneTriangles(track);
    expect(fill).toHaveLength(2);
    for (const p of guide.flat()) expect(canStartDrawing(p, track)).toBe(true);
    // The arrow tips are the guide points furthest along the racing direction before the gate.
    const tips = guide.flat().map(p => gateCoordinates(p, track).along).filter(along => along < 0);
    expect(Math.max(...tips)).toBeCloseTo(-6, 6);
  });
});
