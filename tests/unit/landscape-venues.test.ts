import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { insideBarrier } from '../../src/core/barriers';
import { grandCanyonTrack } from '../../src/core/tracks/grand-canyon';
import { parseProps } from '../../src/presentation/props';
import { CANYON, canyonLayout } from '../../src/presentation/canyon-landscape';
import { goldenGateTrack } from '../../src/core/tracks/golden-gate';
import { GOLDEN, goldenLayout } from '../../src/presentation/golden-gate-landscape';
import { santaMonicaTrack } from '../../src/core/tracks/santa-monica';
import { SANTA, santaLayout } from '../../src/presentation/santa-monica-landscape';
import { coastalTrack } from '../../src/core/track';
import { NEWPORT, newportLandscapeLayout } from '../../src/presentation/newport-landscape';
import { laNightsTrack } from '../../src/core/tracks/la-nights';
import { LA, laLayout } from '../../src/presentation/la-landscape';
import { buildFormation } from '../../src/presentation/landscape/rocks';
import { edgeDistance, insidePolygon } from '../../src/presentation/landscape/mesh';
import { courseDistance } from '../../src/presentation/landscape/terrain';
import type { TrackDefinition } from '../../src/core/types';
import type { FormationSpec, RockPalette, LooseRock } from '../../src/presentation/landscape/rocks';
import type { Plant } from '../../src/presentation/landscape/plants';
import type { Extent } from '../../src/presentation/landscape/terrain';

const file = readFileSync('public/assets/models/launchsite-props.bin'), library = parseProps(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
interface Venue { name: string; track: TrackDefinition; extent: Extent; corridor: number; rock: RockPalette; formations: readonly FormationSpec[]; scatter(): { loose: readonly LooseRock[]; plants: readonly Plant[] }; ground(x: number, z: number): number; level: number; minimum?: { loose: number; plants: number } }
const canyon = canyonLayout(grandCanyonTrack), golden = goldenLayout(goldenGateTrack), santa = santaLayout(santaMonicaTrack);
const venues: Venue[] = [
  { name: 'Grand Canyon', track: grandCanyonTrack, extent: CANYON.extent, corridor: CANYON.corridor, rock: CANYON.rock, formations: canyon.formations, scatter: canyon.scatter, ground: canyon.height, level: CANYON.floor },
  // Golden Gate's land is flat boxes; over the inlet the bridge carries the road (checked below).
  // Santa Monica's beach is the terrain; its pier decks stand over the sea (checked below).
  { name: 'Santa Monica', track: santaMonicaTrack, extent: SANTA.extent, corridor: SANTA.corridor, rock: SANTA.rock, formations: santa.formations, scatter: santa.scatter, ground: (x, z) => santa.onLand({ x, z }) ? santa.height(x, z) : SANTA.level, level: SANTA.level, minimum: { loose: 120, plants: 300 } },
  { name: 'Golden Gate', track: goldenGateTrack, extent: GOLDEN.extent, corridor: GOLDEN.corridor, rock: GOLDEN.rock, formations: golden.formations, scatter: golden.scatter, ground: (x, z) => golden.onLand({ x, z }) ? golden.height(x, z) : GOLDEN.level, level: GOLDEN.level },
];

describe.each(venues)('$name landscape', venue => {
  const exact = courseDistance(venue.track, venue.extent).exact;
  it('draws every formation inside its footprint, from its base up to its height', () => {
    expect(venue.formations.length).toBeGreaterThan(0);
    for (const spec of venue.formations) {
      const g = buildFormation(spec, venue.rock, library).geometry, base = spec.base ?? 0;
      expect(g.triangleCount, spec.id).toBeLessThan(16000);
      let top = -Infinity;
      for (let i = 0; i < g.vertexCount; i++) {
        const p = { x: g.positions[i * 3], z: g.positions[i * 3 + 2] }; top = Math.max(top, g.positions[i * 3 + 1]);
        if (!insidePolygon(p, spec.footprint)) expect(edgeDistance(p, spec.footprint), `${spec.id} at ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`).toBeLessThan(0.05);
      }
      expect(top, spec.id).toBeLessThan(base + spec.height + 0.6);
      expect(top, spec.id).toBeGreaterThan(base + spec.height * 0.7);
    }
  });
  it('keeps the ground level beside the course and loose scenery out of the corridor and every footprint', () => {
    for (let i = 0; i < venue.track.centerline.length; i += 9) {
      const c = venue.track.centerline[i];
      for (const offset of [-18, 0, 18]) expect(venue.ground(c.x + offset, c.z)).toBeCloseTo(venue.level, 5);
    }
    const { loose, plants } = venue.scatter();
    expect(loose.length).toBeGreaterThan(venue.minimum?.loose ?? 200); expect(plants.length).toBeGreaterThan(venue.minimum?.plants ?? 300);
    for (const item of [...loose, ...plants]) {
      expect(exact(item.x, item.z), `${item.x.toFixed(1)}, ${item.z.toFixed(1)}`).toBeGreaterThanOrEqual(venue.corridor);
      for (const b of venue.track.barriers) expect(insideBarrier(item, b), `${item.x.toFixed(1)}, ${item.z.toFixed(1)} in ${b.id}`).toBe(false);
    }
    for (const p of plants.filter(p => ['juniper', 'cypress', 'palm', 'joshua'].includes(p.kind))) expect(exact(p.x, p.z), `${p.kind} ${p.size.toFixed(1)} m`).toBeGreaterThan(8 + 1.5 * p.size);
  });
});

describe('Golden Gate shore', () => {
  it('keeps the seabed under the water around the city, the beach to the south shore and the headlands across the bay', () => {
    const exact = courseDistance(goldenGateTrack, GOLDEN.extent).exact;
    for (let x = -150; x <= 150; x += 5) for (let z = -84; z <= 135; z += 5) {
      if (golden.onLand({ x, z })) continue;
      expect(golden.shoreHeight(x, z), `${x}, ${z}`).toBeLessThan(GOLDEN.water - 0.3);
    }
    for (let x = -100; x <= 100; x += 10) expect(exact(x, -88)).toBeGreaterThan(40);
    for (let x = -300; x <= 300; x += 20) expect(golden.shoreHeight(x, 200)).toBeGreaterThan(GOLDEN.water);
  });
  it('puts riprap in the water at the seawalls and plants on land or the beach', () => {
    const { loose, plants } = golden.scatter();
    for (const r of loose.filter(r => r.y < GOLDEN.water + 1)) { expect(golden.onLand(r), `${r.x.toFixed(1)}, ${r.z.toFixed(1)}`).toBe(false); expect(Math.min(golden.fromSea(r), golden.fromQuay(r))).toBeLessThan(7); }
    for (const p of plants) expect(golden.onLand(p) || (p.kind === 'dunegrass' && p.y > GOLDEN.water + 0.5), `${p.kind} ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`).toBe(true);
  });
});

describe('Santa Monica beach', () => {
  it('keeps the beach support level to its shoreline, then slopes under the sea beneath the pier', () => {
    for (let z = -220; z <= 220; z += 7) {
      const x = santa.shoreX(z);
      expect(santa.height(x - 0.5, z)).toBeCloseTo(SANTA.level, 5);
      expect(santa.height(x + 8, z)).toBeLessThan(SANTA.water);
    }
    // Every pier deck stands above the ground below it.
    for (const s of santaMonicaTrack.supports!.filter(s => s.id !== 'beach-land')) for (const p of s.footprint) expect(santa.height(p.x, p.z), s.id).toBeLessThanOrEqual(SANTA.level + 1e-6);
  });
  it('builds the groyne root from the rock barrier and runs its arm out to sea', () => {
    const { loose } = santa.scatter(), arm = loose.filter(r => r.size > 1.4);
    expect(santa.formations.map(f => f.style)).toEqual(['riprap']);
    expect(arm.length).toBeGreaterThan(60);
    expect(Math.max(...arm.map(r => r.x))).toBeGreaterThan(60);
    for (const r of arm) expect(santa.onLand(r)).toBe(false);
  });
});

describe('Newport island (visual only)', () => {
  const piers = [0.16, -0.22, Math.PI - 0.2, Math.PI + 0.16, Math.PI + 0.48, -1.3];
  const newport = newportLandscapeLayout(coastalTrack, piers), { loose, plants } = newport.scatter(), exact = courseDistance(coastalTrack, NEWPORT.extent).exact;
  it('keeps the course and its footprints untouched', () => {
    expect(coastalTrack.version).toBe(3);
    expect(coastalTrack.barriers.some(b => b.kind === 'rock')).toBe(false);
  });
  it('puts shore boulders and the jetty at the waterline and plants on the upper beach, all beyond the corridor', () => {
    expect(loose.length).toBeGreaterThan(100); expect(plants.length).toBeGreaterThan(40);
    for (const item of [...loose, ...plants]) {
      expect(exact(item.x, item.z), `${item.x.toFixed(1)}, ${item.z.toFixed(1)}`).toBeGreaterThanOrEqual(NEWPORT.corridor);
      for (const b of coastalTrack.barriers) expect(insideBarrier(item, b), b.id).toBe(false);
    }
    for (const r of loose) { expect(newport.ring(r)).toBeGreaterThan(0.93); expect(newport.ring(r)).toBeLessThan(1.25); }
    for (const p of plants) expect(newport.ring(p)).toBeLessThan(0.95);
  });
});

describe('LA nights streets (visual only)', () => {
  const la = laLayout(laNightsTrack), { plants, cars } = la.scatter(), exact = courseDistance(laNightsTrack, LA.extent).exact;
  it('lines the avenues with palms that stand far enough out never to hide the road', () => {
    expect(plants.length).toBeGreaterThan(60);
    for (const p of plants) {
      expect(p.kind).toBe('palm');
      expect(exact(p.x, p.z), `${p.x.toFixed(1)}, ${p.z.toFixed(1)}`).toBeGreaterThan(Math.max(LA.corridor + 6, 8 + 1.5 * p.size));
      expect(la.inStreet(p)).toBe(false);
    }
  });
  it('parks cars beyond the corridor, outside every footprint', () => {
    expect(cars.length).toBeGreaterThan(40);
    for (const car of cars) {
      expect(exact(car.x, car.z)).toBeGreaterThanOrEqual(LA.corridor + 4);
      for (const b of laNightsTrack.barriers) expect(insideBarrier(car, b), b.id).toBe(false);
    }
  });
});
