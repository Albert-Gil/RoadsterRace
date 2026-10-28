import { describe, expect, it } from 'vitest';
import { grandCanyonTrack as track } from '../../src/core/tracks/grand-canyon';
import { roadHeight, roadSupportWidth } from '../../src/core/elevation';
import { canyonTrails, canyonBankGeometry, canyonBankToes, canyonTrailEdges, canyonShoulderGeometry, canyonRoadGeometry } from '../../src/presentation/canyon-earthwork';
import { distance } from '../../src/core/geometry';
import { roadEdges } from '../../src/core/road-geometry';
import { buildFormation } from '../../src/presentation/landscape/rocks';
import { barrierContact } from '../../src/core/barriers';
import { insidePolygon, edgeDistance } from '../../src/presentation/landscape/mesh';
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
  it('uses sloping physical cliff faces, with clear low toes and protected higher rock', () => {
    const lower = track.sections!.find(s => s.id === 'lower-crossing')!;
    for (const side of [-1, 1]) {
      const onRoad = { x: side * 7.8, z: 0, y: 0, sectionId: lower.id };
      expect(barrierContact(onRoad, 0, track, 0, 0, true)).toBeNull();
      const inRock = { ...onRoad, x: side * 12 };
      expect(barrierContact(inRock, 0, track, 0, 0, true)?.barrier.kind).toBe('cliff-face');
      expect(barrierContact(inRock, 0, track, 0, 8, true)?.barrier.kind).toBe('cliff-face');
    }
    for (const face of track.barriers.filter(b => b.slopedFace)) {
      const slope = face.slopedFace!;
      expect(distance(slope.lip, slope.toe)).toBeGreaterThanOrEqual(6);
      expect(slope.toeWidth).toBeGreaterThan(slope.lipWidth);
    }
  });
  it('widens hillside feet substantially and varies the natural rim without folding inside bends', () => {
    const approach = trails.find(t => t.id === 'upper-approach')!, edges = canyonTrailEdges(approach), toes = canyonBankToes(approach);
    const i = Math.floor(approach.path.length / 2), c = approach.path[i];
    for (const side of [0, 1]) expect(distance(toes[side][i], c) - distance(edges[side][i], c)).toBeGreaterThan(8);
    const east = trails.find(t => t.id === 'eastern-mesa')!, rim = canyonTrailEdges(east), regular = roadEdges(east.path, east.width, false);
    expect(Math.max(...rim.flatMap((side, k) => side.map((p, j) => distance(p, regular[k][j]))))).toBeGreaterThan(0.25);
    // Top and toe strips keep the same orientation through every tight inside corner.
    for (const trail of trails) for (const strip of [canyonTrailEdges(trail), canyonBankToes(trail)]) {
      for (let j = 0; j < trail.path.length - 1; j++) {
        const a = strip[0][j], b = strip[0][j + 1], c = strip[1][j], d = strip[1][j + 1];
        for (const [p, q, r] of [[a, b, c], [b, d, c]]) expect((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x), `${trail.id} edge ${j}`).toBeGreaterThanOrEqual(-0.001);
      }
    }
  });
  it('feathers irregular dirt edges into the shoulder while respecting narrow supports', () => {
    const road = canyonRoadGeometry(trails, track.roadWidth, '#805d43', '#b58b62');
    expect(road.positions.every(Number.isFinite)).toBe(true);
    expect(road.triangleCount + banks.triangleCount + shoulders.triangleCount).toBeLessThan(90000);
    const landing = trails.find(t => t.id === 'receiving-ledge')!;
    for (const edge of canyonTrailEdges(landing, track.roadWidth, canyonIntegration.roadRoughness)) for (let i = 0; i < edge.length; i++) {
      expect(distance(edge[i], landing.path[i])).toBeLessThanOrEqual(track.roadWidth / 2 + 1);
    }
    expect(Math.max(...road.colors)).toBeGreaterThan(1.1); // light, diffuse shoulder fringe
  });
  it('widens the landing shoulders continuously into the turn, with the same physical support', () => {
    const landing = trails.find(t => t.id === 'receiving-ledge')!, section = landing.section!;
    expect(landing.widths![0]).toBe(16); expect(landing.widths!.at(-1)).toBe(30);
    for (let i = 0; i < landing.path.length; i++) {
      expect(landing.widths![i]).toBe(roadSupportWidth(track, landing.path[i].courseProgress!, section));
      if (i) expect(Math.abs(landing.widths![i] - landing.widths![i - 1])).toBeLessThan(0.4);
    }
    for (let i = 1; i < trails.length - 1; i++) {
      const a = trails[i - 1], b = trails[i];
      if (distance(a.path.at(-1)!, b.path[0]) < 0.001) expect(a.widths!.at(-1)).toBe(b.widths![0]);
    }
  });
  it('renders the jumpable obstruction and protected ends as grounded irregular boulders', () => {
    const layout = canyonLayout(track);
    for (const b of track.barriers.filter(b => b.id.startsWith('canyon-hop-'))) {
      const f = layout.formations.find(f => f.id === b.id)!;
      expect(b.kind).toBe('rock'); expect(f.style).toBe('boulder-row'); expect(f.base).toBe(6); expect(f.height).toBe(3);
      expect(b.footprint.length).toBeGreaterThan(4);
      const rock = buildFormation(f, CANYON.rock, null).geometry;
      for (let i = 0; i < rock.vertexCount; i++) {
        const p = { x: rock.positions[i * 3], z: rock.positions[i * 3 + 2] };
        expect(insidePolygon(p, b.footprint) || edgeDistance(p, b.footprint) < 0.01, b.id).toBe(true);
        expect(rock.positions[i * 3 + 1]).toBeGreaterThanOrEqual(6);
        expect(rock.positions[i * 3 + 1]).toBeLessThanOrEqual(9.001);
      }
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
