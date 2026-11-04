import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { cumulative, projectToPolyline } from '../../src/core/geometry';
import { supported } from '../../src/core/support';
import { insideBarrier } from '../../src/core/barriers';
import { venueFringe } from '../../src/presentation/venue-fringe';

for (const { track, scenery } of circuits) test(`${track.name}: cosmetic ground transitions stay supported, outside the road and out of solids`, () => {
  const original = JSON.stringify(track), result = venueFringe(track, scenery), { geometry: g } = result;
  expect(result.patches).toBeGreaterThan(0);
  expect(g.triangleCount).toBeLessThan(5000);
  const paths = [track.centerline, ...(track.hopShortcuts ?? []).map(h => h.branch), ...(track.jumps ?? []).map(j => j.branch)].map(p => ({ p, d: cumulative(p) }));
  for (let i = 0; i < g.positions.length; i += 3) {
    const p = { x: g.positions[i], z: g.positions[i + 2] };
    expect(g.positions.slice(i, i + 3).every(Number.isFinite)).toBe(true);
    expect(supported(p, track)).toBe(true);
    expect(Math.min(...paths.map(a => projectToPolyline(p, a.p, a.d).distance))).toBeGreaterThan(track.roadWidth / 2);
    expect(track.barriers.some(b => insideBarrier(p, b))).toBe(false);
  }
  const normals = g.toVertexData().normals!;
  expect(normals.every(Number.isFinite)).toBe(true);
  expect(JSON.stringify(track)).toBe(original);
});
