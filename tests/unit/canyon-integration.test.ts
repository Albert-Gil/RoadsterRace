import { describe, expect, it } from 'vitest';
import { grandCanyonTrack as track } from '../../src/core/tracks/grand-canyon';
import { roadHeight } from '../../src/core/elevation';
import { canyonTrails, canyonBankGeometry, canyonShoulderGeometry } from '../../src/presentation/canyon-earthwork';
import { CANYON, canyonLayout } from '../../src/presentation/canyon-landscape';
import { canyonIntegration } from '../../src/presentation/themes';

const trails = canyonTrails(track), banks = canyonBankGeometry(trails), shoulders = canyonShoulderGeometry(trails);
describe('Grand Canyon trail integration', () => {
  it('retains exact physical section endpoints, widths and surface heights', () => {
    for (const section of track.sections!.filter(s => !s.flight)) {
      const trail = trails.find(t => t.id === section.id)!;
      expect(trail.width).toBe(section.supportWidth);
      expect(trail.path[0].courseProgress).toBe(section.from);
      expect(trail.path.at(-1)!.courseProgress).toBe(section.to);
      for (const p of trail.path) expect(p.y).toBeCloseTo(roadHeight(track, p.courseProgress!), 7);
    }
    expect(trails.some(t => t.section?.flight)).toBe(false);
  });
  it('keeps the automatic crossing physically open and the lower road unobstructed', () => {
    for (const geometry of [banks, shoulders]) for (let i = 0; i < geometry.vertexCount; i++) {
      const [x, y, z] = geometry.positions.slice(i * 3, i * 3 + 3);
      if (Math.abs(x) < 8.8 && Math.abs(z) < 7.8) expect(y).toBeLessThanOrEqual(0.031);
    }
    for (let i = 0; i < banks.indices.length; i += 3) {
      const v = banks.indices.slice(i, i + 3), x = v.reduce((n, j) => n + banks.positions[j * 3], 0) / 3;
      const y = v.reduce((n, j) => n + banks.positions[j * 3 + 1], 0) / 3, z = v.reduce((n, j) => n + banks.positions[j * 3 + 2], 0) / 3;
      if (Math.abs(x) < 8.8 && Math.abs(z) < 7.8) expect(y).toBeLessThanOrEqual(0.031);
    }
  });
  it('grounds the existing inner mesas without raising their collision silhouette', () => {
    const layout = canyonLayout(track);
    for (const b of track.barriers.filter(b => b.kind === 'infield')) {
      const f = layout.formations.find(f => f.id === b.id)!;
      expect(f.base).toBe(CANYON.floor);
      expect(f.base! + f.height).toBe(b.height + (b.baseHeight ?? 0));
      expect(f.footprint).toBe(b.footprint);
    }
  });
  it('keeps foreground terrain below the lower trail sight line and rock faces exposed', () => {
    const layout = canyonLayout(track);
    for (let x = -220; x <= 180; x += 8) for (let z = -160; z <= 120; z += 8) {
      const d = layout.D(x, z), h = layout.height(x, z);
      if (d < 22) expect(h).toBe(CANYON.floor);
      expect(h - CANYON.floor).toBeLessThanOrEqual(Math.max(0, (d - track.roadWidth / 2) / 1.45) + 1e-6);
    }
    for (const b of track.barriers.filter(b => b.kind === 'rock')) {
      const p = b.footprint[0];
      expect(layout.height(p.x, p.z)).toBeLessThanOrEqual(CANYON.floor + b.height * 0.18 + 0.6);
    }
  });
  it('batches bounded, finite cosmetic geometry with a closed base-to-rim profile', () => {
    expect(banks.triangleCount + shoulders.triangleCount).toBeLessThan(60000);
    for (const g of [banks, shoulders]) {
      expect(g.positions.every(Number.isFinite)).toBe(true);
      expect(g.indices.every(i => i >= 0 && i < g.vertexCount)).toBe(true);
    }
    const heights = banks.positions.filter((_, i) => i % 3 === 1);
    expect(Math.min(...heights)).toBe(canyonIntegration.floor);
    expect(Math.max(...heights)).toBeCloseTo(8.03, 5);
    expect(new Set(banks.colors.map(v => v.toFixed(2))).size).toBeGreaterThan(50);
  });
});
