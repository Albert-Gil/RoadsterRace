import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coastalTrack } from '../../src/core/track';
import { projectToPolyline } from '../../src/core/geometry';
import { parseProps, propVertexData } from '../../src/presentation/props';
import { harbourRing, newportLayout } from '../../src/presentation/newport';
import { newportHarbour } from '../../src/presentation/themes';

const file = readFileSync('public/assets/models/newport-props.bin'), library = parseProps(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const layout = newportLayout(-0.46);

describe('Newport harbour', () => {
  it('ships a compact prop file with every model the harbour uses', () => {
    expect(file.byteLength).toBeLessThan(500 * 1024);
    const keys = new Set([...layout.placements.map(p => p.key), ...newportHarbour.underWay.map(b => b.key), 'palm-detailed-bend', 'palm-detailed-straight']);
    for (const key of keys) expect(library.has(key), key).toBe(true);
    for (const model of library.values()) { expect(model.indices.length % 3).toBe(0); expect(Math.max(...model.indices)).toBeLessThan(model.positions.length / 3); }
  });
  it('batches into one bounded mesh', () => {
    const data = propVertexData(library, layout.placements, layout.boxes);
    expect(data.indices!.length / 3).toBeLessThan(60000);
    expect(data.colors!.length / 4).toBe(data.positions!.length / 3);
  });
  it('keeps everything in the water, well clear of the drawn course', () => {
    for (const p of [...layout.placements, ...layout.boxes]) {
      expect(harbourRing(p.x, p.z), `${'key' in p ? p.key : 'pier'} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`).toBeGreaterThanOrEqual(0.98);
      expect(projectToPolyline(p, coastalTrack.centerline, coastalTrack.distances).distance).toBeGreaterThan(coastalTrack.roadWidth / 2 + 12);
    }
  });
  it('never stacks boats on top of each other', () => {
    const boats = layout.placements.filter(p => p.key.startsWith('boat'));
    expect(boats.length).toBeGreaterThan(30);
    for (let i = 0; i < boats.length; i++) for (let j = i + 1; j < boats.length; j++) expect(Math.hypot(boats[i].x - boats[j].x, boats[i].z - boats[j].z), `${boats[i].key} / ${boats[j].key}`).toBeGreaterThan(4.2);
  });
  it('keeps boats under way in clear water beyond the moorings and piers', () => {
    const lowest = Math.min(...newportHarbour.underWay.map(b => b.ring));
    const fixed = layout.placements.filter(p => p.key.startsWith('boat'));
    const closest = Math.min(...fixed.map(p => Math.abs(harbourRing(p.x, p.z) - lowest)));
    expect(closest * 62).toBeGreaterThan(3.5);
  });
});
