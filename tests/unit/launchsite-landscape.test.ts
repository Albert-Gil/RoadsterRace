import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { orbitalTrack } from '../../src/core/tracks/orbital';
import { projectToPolyline } from '../../src/core/geometry';
import { insideBarrier } from '../../src/core/barriers';
import { parseProps } from '../../src/presentation/props';
import { LAUNCHSITE, launchsiteLayout } from '../../src/presentation/launchsite';
import { buildFormation } from '../../src/presentation/landscape/rocks';
import { edgeDistance, insidePolygon } from '../../src/presentation/landscape/mesh';
import { courseDistance } from '../../src/presentation/landscape/terrain';

const file = readFileSync('public/assets/models/launchsite-props.bin'), library = parseProps(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const layout = launchsiteLayout(orbitalTrack), rocks = orbitalTrack.barriers.filter(b => b.kind === 'rock');
const exact = courseDistance(orbitalTrack, LAUNCHSITE.extent).exact;

describe('Launchsite landscape', () => {
  it('ships every scanned rock it places, in one compact file', () => {
    expect(file.byteLength).toBeLessThan(200 * 1024);
    const keys = ['scan-namaqualand-boulder-02', 'scan-namaqualand-boulder-03', 'scan-namaqualand-boulder-04', 'scan-namaqualand-boulder-05', ...Object.values(LAUNCHSITE.formations).flatMap(f => f.relief ? [f.relief.key] : [])];
    for (const key of keys) expect(library.has(key), key).toBe(true);
    expect([...library.keys()].filter(k => k.endsWith('-lo')).length).toBeGreaterThanOrEqual(3);
  });

  it('gives every solid rock a style, clear of the road by at least 5 m of run-off', () => {
    expect(rocks).toHaveLength(13);
    for (const b of rocks) {
      expect(LAUNCHSITE.formations[b.id], b.id).toBeDefined();
      for (const p of b.footprint) expect(projectToPolyline(p, orbitalTrack.centerline, orbitalTrack.distances).distance, b.id).toBeGreaterThanOrEqual(orbitalTrack.roadWidth / 2 + (b.runoffException ? orbitalTrack.carWidth : 5));
    }
  });

  it('draws every formation inside its collision footprint and no taller than it', () => {
    for (const spec of layout.formations) {
      const g = buildFormation(spec, LAUNCHSITE.rock, library).geometry;
      expect(g.triangleCount, spec.id).toBeLessThan(16000);
      let top = -Infinity;
      for (let i = 0; i < g.vertexCount; i++) {
        const p = { x: g.positions[i * 3], z: g.positions[i * 3 + 2] }; top = Math.max(top, g.positions[i * 3 + 1]);
        // What you see is what you hit: vertices stay within the footprint (5 cm tolerance).
        if (!insidePolygon(p, spec.footprint)) expect(edgeDistance(p, spec.footprint), `${spec.id} at ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`).toBeLessThan(0.05);
      }
      expect(top, spec.id).toBeLessThan(spec.height + 0.6);
      expect(top, spec.id).toBeGreaterThan(spec.height * 0.7);
    }
  });

  it('keeps the drivable ground level and loose scenery out of the planning corridor', () => {
    for (let i = 0; i < orbitalTrack.centerline.length; i += 7) {
      const c = orbitalTrack.centerline[i];
      for (const offset of [-22, -12, 0, 12, 22]) expect(layout.height(c.x + offset, c.z)).toBe(0);
    }
    const { loose, plants } = layout.scatter();
    expect(loose.length).toBeGreaterThan(400); expect(plants.length).toBeGreaterThan(600);
    expect(plants.filter(p => p.kind === 'joshua').length).toBeGreaterThan(10);
    for (const item of [...loose, ...plants]) {
      expect(exact(item.x, item.z), `${'kind' in item ? item.kind : ''} at ${item.x.toFixed(1)}, ${item.z.toFixed(1)}`).toBeGreaterThanOrEqual(LAUNCHSITE.corridor);
      for (const b of orbitalTrack.barriers) expect(insideBarrier(item, b), `${item.x.toFixed(1)}, ${item.z.toFixed(1)} in ${b.id}`).toBe(false);
    }
  });

  it('keeps Joshua trees far enough out that they never hide the road', () => {
    // A tree of height h hides about 1.1 h of ground behind it from the 42-degree camera.
    for (const p of layout.scatter().plants.filter(p => p.kind === 'joshua')) expect(exact(p.x, p.z)).toBeGreaterThan(orbitalTrack.roadWidth / 2 + 1.1 * p.size * 1.3);
  });
});
