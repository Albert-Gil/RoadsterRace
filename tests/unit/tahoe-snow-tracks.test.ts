import { describe, expect, it } from 'vitest';
import { snowyTahoeTrack as track } from '../../src/core/tracks/snowy-tahoe';
import { tahoeShore } from '../../src/core/tracks/tahoe-terrain';
import { cumulative, projectToPolyline } from '../../src/core/geometry';
import { insideBarrier } from '../../src/core/barriers';
import { Geometry } from '../../src/presentation/landscape/mesh';
import { tahoeSnowTracks } from '../../src/presentation/tahoe-course';
import { tahoeCourseAppearance as art } from '../../src/presentation/themes';

describe('Snowy Tahoe snow tracks (visual pass 6)', () => {
  it('paints flat tracks only on open snow, clear of the course, Hop lanes, barriers and the lake', () => {
    const g = new Geometry(); tahoeSnowTracks(g, track, () => 0);
    expect(g.vertexCount).toBeGreaterThan(400);
    const lanes = [{ line: track.centerline, d: track.distances }, ...(track.hopShortcuts ?? []).map(h => ({ line: h.branch, d: cumulative(h.branch) }))];
    for (let i = 0; i < g.positions.length; i += 3) {
      const p = { x: g.positions[i], z: g.positions[i + 2] };
      expect(g.positions[i + 1]).toBeCloseTo(art.tracks.lift, 5);
      expect(p.x).toBeLessThan(tahoeShore(p.z));
      for (const l of lanes) expect(projectToPolyline(p, l.line, l.d).distance).toBeGreaterThan(art.tracks.clearance - 2);
      expect(track.barriers.some(b => insideBarrier(p, b))).toBe(false);
    }
  });
});
