import { describe, expect, it } from 'vitest';
import { santaMonicaTrack as track } from '../../src/core/tracks/santa-monica';
import { santaBeachFootprint, santaBeachStructures } from '../../src/core/tracks/santa-monica-beach';
import { cumulative, projectToPolyline } from '../../src/core/geometry';
import { insideBarrier } from '../../src/core/barriers';
import { jumpCoordinates, supported } from '../../src/core/support';
import { GATE_RULES, gateCoordinates, startGate } from '../../src/core/start-finish';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { SANTA, santaLayout } from '../../src/presentation/santa-monica-landscape';
import { santaBeachLife } from '../../src/presentation/santa-monica-beach-life';
import { edgeDistance, insidePolygon } from '../../src/presentation/landscape/mesh';
import type { Point } from '../../src/core/types';

const layout = santaLayout(track), life = santaBeachLife(track, layout), g = life.geometry;
const paths = [{ p: track.centerline, d: track.distances }, ...(track.jumps ?? []).map(j => ({ p: j.branch, d: cumulative(j.branch) }))];
const fromRoad = (p: Point) => Math.min(...paths.map(path => projectToPolyline(p, path.p, path.d).distance)) - track.roadWidth / 2;
const vertices = (group: { start: number; end: number }) => Array.from({ length: group.end - group.start }, (_, k) => {
  const i = group.start + k; return { x: g.positions[i * 3], y: g.positions[i * 3 + 1], z: g.positions[i * 3 + 2] };
});
const inside = (p: Point, footprint: Point[]) => insidePolygon(p, footprint) || edgeDistance(p, footprint) < 0.005;
const gate = startGate(track), touch = (p: Point) => { const q = gateCoordinates(p, track); return q.along > -gate.leadIn - 2 && q.along < GATE_RULES.startBeyond + 2 && Math.abs(q.across) < gate.width / 2 + GATE_RULES.lateralTolerance + 2; };

describe('Santa Monica v4 beach structures', () => {
  it('are solid buildings on beach land, outside the loop, 6+ m beyond the road and clear of the start zone', () => {
    expect(track.version).toBe(5);
    for (const s of santaBeachStructures) {
      const b = track.barriers.find(b => b.id === s.id)!;
      expect(b, s.id).toBeDefined(); expect(b.kind).toBe('building'); expect(b.height).toBe(s.height); expect(s.height).toBeLessThanOrEqual(4);
      expect(b.footprint).toEqual(santaBeachFootprint(s).map(p => ({ x: p.x, z: -p.z })));
      for (let x = s.x - s.width / 2; x <= s.x + s.width / 2 + 1e-9; x += 0.5) for (let z = -s.z - s.depth / 2; z <= -s.z + s.depth / 2 + 1e-9; z += 0.5) {
        const p = { x, z };
        expect(fromRoad(p), `${s.id} runoff at ${x}, ${z}`).toBeGreaterThanOrEqual(6);
        expect(supported(p, track), s.id).toBe(true); expect(layout.onLand(p)).toBe(true);
        expect(insidePolygon(p, track.centerline), `${s.id} inside the loop`).toBe(false); expect(touch(p), s.id).toBe(false);
        expect(track.barriers.filter(o => o !== b && o.kind !== 'infield').some(o => insideBarrier(p, o)), s.id).toBe(false);
      }
    }
  });
  it('leave the ordinary and jump practice lines hazard-free', () => {
    for (const jump of [false, true]) {
      const r = compileRoute(createPracticeSamples(track, 7, jump), track);
      expect(r.ok).toBe(true); if (r.ok) expect(r.route.hazards ?? []).toEqual([]);
    }
  });
});

describe('Santa Monica beach life', () => {
  it('keeps every structure, its pad and its people inside the collision rectangle and below its height', () => {
    const structures = life.groups.filter(q => q.kind === 'structure');
    expect(structures.map(q => q.id)).toEqual(santaBeachStructures.map(s => s.id));
    for (const q of structures) {
      expect(q.end - q.start, q.id).toBeGreaterThan(300);
      for (const v of vertices(q)) {
        expect(inside(v, q.footprint!), `${q.id} ${v.x.toFixed(2)}, ${v.z.toFixed(2)}`).toBe(true);
        expect(v.y, q.id).toBeLessThanOrEqual(q.height! + 1e-6); expect(v.y, q.id).toBeGreaterThanOrEqual(SANTA.level - 1e-6);
      }
    }
  });
  it('keeps the pier crowd inside the protected amusement footprint and lamp posts inside their rails', () => {
    const fun = track.barriers.find(b => b.id === 'amusement-protected')!, crowd = life.groups.find(q => q.kind === 'amusement')!;
    expect(crowd.footprint).toBe(fun.footprint);
    for (const v of vertices(crowd)) { expect(inside(v, fun.footprint), `${v.x.toFixed(2)}, ${v.z.toFixed(2)}`).toBe(true); expect(v.y).toBeGreaterThanOrEqual(fun.height); }
    const lamps = life.groups.filter(q => q.kind === 'lamp');
    expect(lamps.length).toBeGreaterThanOrEqual(8);
    for (const q of lamps) for (const v of vertices(q)) expect(inside(v, q.footprint!), q.id).toBe(true);
  });
  it('floats boats, boards and swimmers in open water away from the decks, the jump loop and the groyne', () => {
    const water = life.groups.filter(q => q.kind === 'water'), count = (id: string) => water.filter(q => q.id === id).length;
    expect(count('sailboat')).toBeGreaterThanOrEqual(4); expect(count('kayak')).toBeGreaterThanOrEqual(3); expect(count('paddleboard')).toBeGreaterThanOrEqual(3);
    expect(count('swimmer')).toBeGreaterThanOrEqual(6); expect(count('surfer')).toBe(3); expect(count('swim-buoy')).toBe(8);
    const decks = track.supports!.filter(s => s.id !== 'beach-land'), jump = track.jumps![0];
    for (const q of water) {
      for (const s of decks) expect(edgeDistance(q, s.footprint), `${q.id} at ${q.x}, ${q.z} near ${s.id}`).toBeGreaterThan(6);
      for (const v of vertices(q)) {
        expect(layout.onLand(v), q.id).toBe(false); expect(v.x - layout.shoreX(v.z), q.id).toBeGreaterThan(5);
        expect(decks.some(s => insidePolygon(v, s.footprint) || edgeDistance(v, s.footprint) < 1.5), q.id).toBe(false);
        const j = jumpCoordinates(v, jump); expect(j.along > -12 && j.along < jump.corridorLength + 12 && Math.abs(j.across) < jump.width / 2 + 6, q.id).toBe(false);
        expect(v.y).toBeLessThan(SANTA.water + 7);
      }
    }
  });
  it('lays only flat towels on the beach side of the road, 2+ m beyond its edge, clear of the gate, jump and footprints', () => {
    const towels = life.groups.filter(q => q.kind === 'towel');
    expect(towels.length).toBeGreaterThanOrEqual(10);
    for (const q of towels) for (const v of vertices(q)) {
      expect(v.y, 'towel height').toBeLessThanOrEqual(SANTA.level + 0.07); expect(fromRoad(v)).toBeGreaterThanOrEqual(2);
      expect(insidePolygon(v, track.centerline)).toBe(false); expect(touch(v)).toBe(false); expect(layout.onLand(v)).toBe(true);
      expect(track.barriers.some(b => insideBarrier(v, b))).toBe(false);
    }
  });
  it('keeps everyone else on the beach at least 24 m from the course and outside every footprint', () => {
    const beach = life.groups.filter(q => q.kind === 'beach'), exact = layout.D.exact;
    expect(beach.filter(q => q.id === 'sunbathers').length).toBeGreaterThanOrEqual(12);
    for (const q of beach) for (const v of vertices(q)) {
      expect(exact(v.x, v.z), `${q.id} at ${v.x.toFixed(1)}, ${v.z.toFixed(1)}`).toBeGreaterThanOrEqual(SANTA.corridor);
      expect(layout.onLand(v)).toBe(true); expect(track.barriers.some(b => insideBarrier(v, b)), q.id).toBe(false);
    }
    expect(life.people).toBeGreaterThan(250); expect(g.vertexCount).toBeLessThan(80000);
  });
});
