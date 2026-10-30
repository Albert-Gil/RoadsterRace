import { describe, expect, it } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { cumulative, projectToPolyline } from '../../src/core/geometry';
import { insideBarrier } from '../../src/core/barriers';
import { groundHeight, supported, jumpCoordinates } from '../../src/core/support';
import { gateCoordinates, startGate } from '../../src/core/start-finish';
import { roadsideGeometry } from '../../src/presentation/roadside-geometry';
import { edgeDistance } from '../../src/presentation/landscape/mesh';
import { roadsideAppearance } from '../../src/presentation/themes';
import { onCityLand } from '../../src/content/golden-city';

describe.each(circuits)('$id visible roadside dressing', ({ track, scenery }) => {
  it('keeps soft plants clear of every road, obstacle, touch gate and hidden ability lane', () => {
    const before = JSON.stringify(track);
    const { plants, geometry, edgeMarks, props } = roadsideGeometry(track, scenery, roadsideAppearance.palettes[scenery], roadsideAppearance);
    const paths = [track.centerline, ...(track.hopShortcuts ?? []).map(h => h.branch), ...(track.jumps ?? []).map(j => j.branch)]
      .map(points => ({ points, distances: cumulative(points) }));
    const gate = startGate(track);
    expect(plants.length).toBeGreaterThan(30);
    expect(edgeMarks).toBeGreaterThan(50);
    expect(geometry.triangleCount).toBeLessThan(15000);
    expect(geometry.positions.every(Number.isFinite)).toBe(true);
    expect(geometry.toVertexData().normals!.every(Number.isFinite)).toBe(true);
    for (const p of plants) {
      const distance = Math.min(...paths.map(path => projectToPolyline(p, path.points, path.distances).distance));
      expect(distance - p.radius - track.roadWidth / 2).toBeGreaterThanOrEqual(2);
      expect(p.height).toBeLessThan(.7);
      expect(supported(p, track)).toBe(true);
      for (let i = 0; i < 8; i++) {
        const edge = { ...p, x: p.x + p.radius * Math.cos(i * Math.PI / 4), z: p.z + p.radius * Math.sin(i * Math.PI / 4) };
        expect(supported(edge, track)).toBe(true);
        if (scenery === 'bay') expect(onCityLand(edge)).toBe(true);
      }
      expect(p.y).toBeCloseTo(groundHeight(p, track) + .08, 6);
      const q = gateCoordinates(p, track);
      expect(q.along > -gate.leadIn - 2 && q.along < 10 && Math.abs(q.across) < gate.width / 2 + 10).toBe(false);
      for (const b of track.barriers) {
        expect(insideBarrier(p, b)).toBe(false);
        expect(edgeDistance(p, b.footprint)).toBeGreaterThan(p.radius);
      }
      for (const h of track.hopShortcuts ?? []) expect(projectToPolyline(p, h.branch, cumulative(h.branch)).distance).toBeGreaterThanOrEqual(h.width / 2 + 5);
      for (const j of track.jumps ?? []) {
        const c = jumpCoordinates(p, j);
        expect(c.along > -12 && c.along < j.rampLength + j.gap + 14 && Math.abs(c.across) < j.width / 2 + 6).toBe(false);
      }
    }
    // Furniture has no independent collider: its complete footprint must remain
    // inside an existing protected parcel/building, rather than on drivable runoff.
    for (const p of props) {
      const parcel = track.barriers.find(b => b.id === p.parcelId)!;
      expect(parcel).toBeDefined();
      expect(parcel.kind).toBe(p.roof ? 'building' : 'infield');
      expect(parcel.runoffException).not.toBe('hop-lane');
      expect(edgeDistance(p, parcel.footprint)).toBeGreaterThanOrEqual(p.radius);
      for (let i = 0; i < 16; i++) expect(insideBarrier({ x: p.x + p.radius * Math.cos(i * Math.PI / 8), z: p.z + p.radius * Math.sin(i * Math.PI / 8) }, parcel)).toBe(true);
      if (p.roof) expect(p.y).toBeCloseTo((parcel.baseHeight ?? 0) + parcel.height + (scenery === 'bay' ? .40 : .02), 6);
      else expect(p.y).toBeCloseTo((parcel.id === 'utility-storage-tower' ? (parcel.baseHeight ?? 0) + parcel.height : groundHeight(p, track) + .15) + .03, 6);
    }
    expect(JSON.stringify(track)).toBe(before);
  });
});
