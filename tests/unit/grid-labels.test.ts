import { describe, expect, test } from 'vitest';
import { gridLabelPositions, type GridLabelAnchor } from '../../src/ui/grid-labels';

// A row of cars 18 px apart on screen, all pointing the same way (as on a side-by-side grid).
const row = (dx: number, dy: number, gap = 18, n = 4, from = { x: 200, y: 300 }): GridLabelAnchor[] =>
  Array.from({ length: n }, (_, i) => {
    const car = { x: from.x - dy * gap * i, y: from.y + dx * gap * i };
    return { car, tail: { x: car.x - dx * 20, y: car.y - dy * 20 } };
  });
const apart = (points: { x: number; y: number }[], spacing: number) => {
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++)
    expect(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)).toBeGreaterThanOrEqual(spacing - 1e-9);
};

describe('numbered grid chips', () => {
  test.each([[1, 0], [0, 1], [-1, 0], [0, -1], [Math.SQRT1_2, -Math.SQRT1_2]])('side-by-side cars facing (%f, %f) get separate chips, in their order, behind them', (dx, dy) => {
    const anchors = row(dx, dy), chips = gridLabelPositions(anchors);
    apart(chips, 24);
    // Each chip sits behind its own car's tail …
    chips.forEach((c, i) => expect((c.x - anchors[i].tail.x) * -dx + (c.y - anchors[i].tail.y) * -dy).toBeCloseTo(13, 6));
    // … and the chips keep the cars' order across the row, centred on it.
    const across = (p: { x: number; y: number }) => -dy * p.x + dx * p.y;
    for (let i = 1; i < chips.length; i++) expect(across(chips[i]) - across(chips[i - 1])).toBeCloseTo(24, 6);
    const mean = (values: number[]) => values.reduce((a, b) => a + b) / values.length;
    expect(mean(chips.map(across))).toBeCloseTo(mean(anchors.map(a => across(a.tail))), 6);
  });
  test('cars already far apart keep their chips directly behind them', () => {
    const anchors = row(1, 0, 40), chips = gridLabelPositions(anchors);
    chips.forEach((c, i) => { expect(c.x).toBeCloseTo(anchors[i].tail.x - 13, 6); expect(c.y).toBeCloseTo(anchors[i].tail.y, 6); });
  });
  test('coincident cars still get separate chips in player order', () => {
    const one = { car: { x: 100, y: 100 }, tail: { x: 100, y: 120 } };
    const chips = gridLabelPositions([one, one, one]);
    apart(chips, 24);
    // Spread across the row (horizontal here, since the cars point down the screen), in player order.
    expect(chips.map(c => c.y)).toEqual([133, 133, 133]);
    expect(chips[1].x - chips[0].x).toBeCloseTo(chips[2].x - chips[1].x, 9);
    expect(Math.abs(chips[1].x - chips[0].x)).toBeCloseTo(24, 9);
  });
  test('only a crowded cluster spreads; a distant car keeps its place', () => {
    const anchors = [...row(1, 0, 6, 3), ...row(1, 0, 6, 1, { x: 200, y: 420 })], chips = gridLabelPositions(anchors);
    apart(chips, 24);
    expect(chips[3].y).toBeCloseTo(420, 6);
  });
  test('no anchors, no chips', () => expect(gridLabelPositions([])).toEqual([]));
});
