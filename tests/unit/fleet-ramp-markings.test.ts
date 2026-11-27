import { expect, test } from 'vitest';
import { sanDiegoFleetTrack as t } from '../../src/core/tracks/san-diego-fleet';
import { deckAt } from '../../src/core/decks';
import { rampGuideQuads } from '../../src/presentation/fleet-ramp-guides';

const quads = rampGuideQuads(t);
const automatic = t.jumps!.filter(j => j.activation !== 'hop' && j.rampLength > 0);

test('every automatic ramp gets two edge strips and touchdown bars; manual Hop entries get nothing', () => {
  expect(automatic).toHaveLength(6);
  for (const j of automatic) {
    expect(quads.filter(q => q.jumpId === j.id && q.kind === 'strip')).toHaveLength(2);
    expect(quads.filter(q => q.jumpId === j.id && q.kind === 'touchdown').length).toBeGreaterThanOrEqual(2);
  }
  for (const j of t.jumps!.filter(j => j.activation === 'hop')) expect(quads.some(q => q.jumpId === j.id)).toBe(false);
});

test('touchdown bars lie wholly on their receiving deck and every guide faces upward', () => {
  for (const q of quads) {
    const [a, b, c] = q.points, n = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    // Babylon's left-handed, clockwise front faces: (c - a) x (b - a) has a positive y for an upward top.
    expect(-n).toBeGreaterThan(0);
    if (q.kind === 'touchdown') for (const p of q.points) {
      const inside = { x: p[0] + (q.points[2][0] - p[0]) * 1e-3, z: p[2] + (q.points[2][2] - p[2]) * 1e-3 };
      expect(deckAt(inside, t, Infinity, q.deckId)?.id).toBe(q.deckId);
    }
  }
});
