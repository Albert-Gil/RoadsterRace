import { describe, expect, it } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { projectToPolyline } from '../../src/core/geometry';
import { nearbySegments, projectToPolylineNear, segmentGrid } from '../../src/core/nearest';
import { random } from '../../src/presentation/landscape/noise';

/** Points on, beside and far from every course, plus exact vertices (ties between segments). */
function probes(points: { x: number; z: number }[], seed: number) {
  const rand = random(seed), xs = points.map(p => p.x), zs = points.map(p => p.z);
  const minX = Math.min(...xs) - 60, maxX = Math.max(...xs) + 60, minZ = Math.min(...zs) - 60, maxZ = Math.max(...zs) + 60;
  const result = points.filter((_, i) => i % 7 === 0).map(p => ({ x: p.x, z: p.z }));
  for (let i = 0; i < 1500; i++) result.push({ x: minX + rand() * (maxX - minX), z: minZ + rand() * (maxZ - minZ) });
  for (let i = 0; i < 1500; i++) { const p = points[Math.floor(rand() * points.length)]; result.push({ x: p.x + (rand() - 0.5) * 30, z: p.z + (rand() - 0.5) * 30 }); }
  result.push({ x: minX - 400, z: maxZ + 300 }, { x: maxX + 1000, z: minZ - 50 });
  return result;
}

describe('exact nearest-segment search', () => {
  it.each(circuits.map(c => [c.id, c.track] as const))('%s: projections match the full scan exactly', (_, track) => {
    for (const p of probes(track.centerline, 91)) expect(projectToPolylineNear(p, track.centerline, track.distances)).toEqual(projectToPolyline(p, track.centerline, track.distances));
  });
  it.each(circuits.map(c => [c.id, c.track] as const))('%s: candidates always include the first nearest segment, branches included', (_, track) => {
    const segments = [track.centerline, ...(track.hopShortcuts ?? []).map(h => h.branch)].flatMap(path => path.slice(1).map((b, i) => [path[i], b] as const));
    const grid = segmentGrid(segments.length, i => [segments[i][0], segments[i][1]]);
    const gap = (p: { x: number; z: number }, i: number) => projectToPolyline(p, [segments[i][0], segments[i][1]], [0, 1]).distance;
    for (const p of probes(track.centerline, 17)) {
      let first = 0; for (let i = 1; i < segments.length; i++) if (gap(p, i) < gap(p, first)) first = i;
      const found = nearbySegments(p, grid);
      expect(found).toContain(first); expect([...found].sort((a, b) => a - b)).toEqual(found);
      expect(Math.min(...found.map(i => gap(p, i)))).toBe(gap(p, first));
    }
  });
});
