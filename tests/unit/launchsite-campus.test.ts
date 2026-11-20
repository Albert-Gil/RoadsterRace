import { describe, expect, it } from 'vitest';
import { orbitalTrack } from '../../src/core/tracks/orbital';
import { cumulative, projectToPolyline } from '../../src/core/geometry';
import { edgeDistance, insidePolygon } from '../../src/presentation/landscape/mesh';
import { launchsiteCampusSites, launchsiteCampus } from '../../src/presentation/launchsite-campus';
import { launchMounts } from '../../src/presentation/launchsite-pads';
import { launchsiteRemoteRockets } from '../../src/core/tracks/venue-parcels';

const course = (x: number, z: number) => Math.min(
  projectToPolyline({ x, z }, orbitalTrack.centerline, orbitalTrack.distances).distance,
  ...(orbitalTrack.hopShortcuts ?? []).map(h => projectToPolyline({ x, z }, h.branch, cumulative(h.branch)).distance));

describe('Launchsite campus (visual pass 4)', () => {
  it('keeps every campus site at least 30 m (and 1.1 x its height) from the course and Hop lanes, and clear of every barrier', () => {
    for (const s of launchsiteCampusSites) {
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => ({ x: s.x + u * s.width / 2, z: s.z + v * s.depth / 2 }));
      for (const p of [...corners, { x: s.x, z: s.z }]) {
        expect(course(p.x, p.z), s.id).toBeGreaterThanOrEqual(Math.max(30, 1.1 * s.height));
        for (const b of orbitalTrack.barriers) {
          expect(insidePolygon(p, b.footprint), `${s.id} in ${b.id}`).toBe(false);
          expect(edgeDistance(p, b.footprint), `${s.id} near ${b.id}`).toBeGreaterThan(3);
        }
      }
    }
  });

  it('builds the campus geometry within its sites', () => {
    const g = launchsiteCampus();
    expect(g.vertexCount).toBeGreaterThan(1000);
    for (let i = 0; i < g.positions.length; i += 3) {
      const x = g.positions[i], z = g.positions[i + 2];
      expect(launchsiteCampusSites.some(s => Math.abs(x - s.x) <= s.width / 2 + 20 && Math.abs(z - s.z) <= s.depth / 2 + 20)).toBe(true);
    }
  });

  it('keeps remote launch mounts inside each rocket plinth footprint', () => {
    const g = launchMounts(orbitalTrack);
    for (let i = 0; i < g.positions.length; i += 3) {
      const x = g.positions[i], z = g.positions[i + 2];
      expect(launchsiteRemoteRockets.some(r => Math.abs(x - r.x) <= r.radius * 1.3 + 1e-6 && Math.abs(z - r.z) <= r.radius * 1.3 + 1e-6)).toBe(true);
    }
  });
});
