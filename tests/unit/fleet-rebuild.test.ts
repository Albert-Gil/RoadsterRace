import { expect, test } from 'vitest';
import { sanDiegoFleetTrack as track } from '../../src/core/tracks/san-diego-fleet';
import { fleetGeometry } from '../../src/presentation/fleet';
import { navalHull, navalProp } from '../../src/presentation/fleet-model';
import { CompositionShapes } from '../../src/presentation/composition-shapes';
import { onDeck, deckAt } from '../../src/core/decks';
import { drawingStartBounds } from '../../src/core/start-finish';
import { jumpPoint, groundHeight } from '../../src/core/support';
import { minimumRadius } from '../../src/core/road-geometry';
import { sceneryFinishes, fleetCamera } from '../../src/presentation/themes';
import { createTournament } from '../../src/core/tournament';
import { parseTournament } from '../../src/presentation/tournament-storage';

test('revised fleet has taller stationary ship decks, a clear gate and bounded sweeping bends', () => {
 expect(track.version).toBe(6); expect(track.roadWidth).toBe(16); expect(track.length).toBeGreaterThan(700); expect(track.length).toBeLessThan(780);
 expect(track.decks!.filter(d => d.vessel)).toHaveLength(6); expect(track.decks!.filter(d => d.vessel).every(d => d.elevation >= 16)).toBe(true); expect(minimumRadius(track.centerline)).toBeGreaterThan(12);
 for (const p of drawingStartBounds(track).corners) expect(deckAt(p, track)?.id).toBe('carrier-a');
});
test('each crossing has a real open-water gap ending on its named receiving vessel', () => {
 for (const j of track.jumps!) {
  expect(deckAt(jumpPoint(j, j.rampLength + j.gap / 2), track), j.id).toBeUndefined();
  expect(deckAt(jumpPoint(j, j.rampLength + j.gap - .02), track), j.id).toBeUndefined();
  expect(deckAt(jumpPoint(j, j.rampLength + j.gap + .02), track)?.id, j.id).toBe(j.landingSurfaceId);
 }
});
test('all four main transfers are ramp launches over real water, without a connecting deck',()=>{
 expect(track.jumps!.filter(j=>j.mandatory)).toHaveLength(4);
 expect(track.decks!.filter(d=>d.kind==='transfer'&&!d.rampId)).toHaveLength(0);
 for(const j of track.jumps!){expect(j.gap).toBeGreaterThanOrEqual(j.activation==='hop'?8:12);for(let s=j.rampLength+.2;s<j.rampLength+j.gap;s+=.25)expect(deckAt(jumpPoint(j,s),track),j.id).toBeUndefined();}
});

test('superstructures, larger aircraft and tractors are supported and stay inside their physical envelopes', () => {
 for (const b of track.barriers.filter(b => !b.deckSurfaceId && !b.id.startsWith('fleet-rail'))) {
  const support = track.decks!.find(d => d.vessel && Math.abs(d.elevation - b.baseHeight!) < .01 && b.footprint.every(p => onDeck(p, d)));
  expect(support, b.id).toBeDefined();
  const g = new CompositionShapes(), radar = new CompositionShapes(); navalProp(b, g, radar);
  for (let i = 0; i < g.positions.length; i += 3) {
   expect(g.positions[i + 1], b.id).toBeGreaterThanOrEqual(b.baseHeight! - .01); expect(g.positions[i + 1], b.id).toBeLessThanOrEqual(b.baseHeight! + b.height + .01);
   // Every part follows the same actual transformed rectangle, including mirrored vessels.
   expect(onDeck({ x: g.positions[i], z: g.positions[i + 2] }, { ...support!, footprint: b.footprint }), b.id).toBe(true);
  }
 }
});
test('hulls have deep keels, outward-facing steel sides and remain within the static triangle budget', () => {
 const deck = track.decks!.find(d => d.id === 'carrier-a')!, hull = new CompositionShapes(); navalHull(deck, hull, new CompositionShapes(), new CompositionShapes());
 expect(Math.min(...hull.positions.filter((_, i) => i % 3 === 1))).toBeLessThan(-5);
 const normal = hull.toVertexData().normals!, dx = hull.positions[0] - deck.vessel!.origin.x, dz = hull.positions[2] - deck.vessel!.origin.z;
 expect(normal[0] * dx + normal[2] * dz).toBeGreaterThan(0);
 const geometry = fleetGeometry(track); expect(Object.values(geometry).reduce((n, g) => n + g.triangleCount, 0)).toBeLessThan(120000);
 expect(Object.values(geometry).every(g => g.positions.every(Number.isFinite) && Array.from(g.toVertexData().normals!).every(Number.isFinite))).toBe(true);
 expect(sceneryFinishes.naval!.terrain.kind).toBe('water'); expect(fleetCamera.phoneElevation).toBeLessThan(75);
});
test('Fleet v1 championships invalidate without changing the ordinary save format', () => {
 const rounds = [{ circuitId: track.id, trackVersion: 1 }, { circuitId: 'golden-gate', trackVersion: 8 }];
 const state = createTournament(rounds, 2, 1); expect(parseTournament(JSON.stringify({ state, drivers: [{ name: 'A', paint: 'glacier' }, { name: 'B', paint: 'crimson' }] }))).toBeNull();
});
