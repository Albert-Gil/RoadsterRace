import { roundedCircuit } from '../road-geometry';
import { closedSpline, cumulative, samplePolyline, projectToPolyline, distance } from '../geometry';
import { createStartFinish } from '../start-finish';
import type { Point, TrackBarrier, TrackDefinition } from '../types';
import { outcrop } from './outcrop';

// Clockwise city streets, quayside chicane, 88 m bridge and inland return. No road crossings.
const centerline = roundedCircuit([
  [-24,-40],[8,-40],[48,-40],[78,-40],[78,-12],[42,-12],[42,16],
  [78,16],[78,42],[44,42],[14,42],[-14,42],[-44,42],[-78,42],
  [-78,12],[-52,12],[-52,-40],[-40,-40],
].map(([x,z])=>({x:-x,z})));
const distances = cumulative(centerline), length = distances.at(-1)!;
const bridge = { id: 'golden-span', from: { x: -44, z: 42 }, to: { x: 44, z: 42 }, width: 16 };
const rectangle = (id: string, x: number, z: number, w: number, d: number): TrackBarrier => ({ id, height: 1.05, kind: 'infield', footprint: [{ x, z }, { x: x + w, z }, { x: x + w, z: z + d }, { x, z: z + d }].map(p => ({ x: -p.x, z: p.z })).reverse() });
const rails: TrackBarrier[] = [];
const entry = projectToPolyline(bridge.from, centerline, distances).progress, exit = projectToPolyline(bridge.to, centerline, distances).progress;
const path = [entry - 8, entry - 4, entry, exit, exit + 4, exit + 8].map(d => samplePolyline(centerline, distances, d));
for (const side of [-1, 1]) {
  const edge = path.map((p, i) => {
    const a = i === 2 || i === 3 ? bridge.from : path[Math.max(0, i - 1)], b = i === 2 || i === 3 ? bridge.to : path[Math.min(path.length - 1, i + 1)], len = distance(a, b) || 1;
    return { x: p.x - (b.z - a.z) / len * side * 7.825, z: p.z + (b.x - a.x) / len * side * 7.825 };
  });
  for (let i = 1; i < edge.length; i++) {
    const a = edge[i - 1], b = edge[i], len = distance(a, b), nx = -(b.z - a.z) / len * 0.175, nz = (b.x - a.x) / len * 0.175;
    rails.push({ id: `bridge-rail-${side}-${i}`, kind: 'bridge-rail', bridgeId: bridge.id, height: 0.95,
      footprint: [{ x: a.x + nx, z: a.z + nz }, { x: b.x + nx, z: b.z + nz }, { x: b.x - nx, z: b.z - nz }, { x: a.x - nx, z: a.z - nz }] });
  }
}
// Granite park boulders (v4): solid groups 12-14 m beyond the road edge, outside four corners.
const boulders = (id: string, x: number, z: number, rx: number, rz: number, rotation: number, height: number, seed: number): TrackBarrier => ({ id: `park-boulders-${id}`, kind: 'rock', height, footprint: outcrop(x, z, rx, rz, rotation, seed) });
const parkBoulders = [boulders('northwest', -91, 55, 2.6, 2, 0.3, 1.9, 1.7), boulders('northeast', 91, 55, 2.4, 2, -0.3, 1.7, 2.9), boulders('southwest', -97, -46, 2.4, 2, 0.4, 1.8, 4.1), boulders('east', 75, -22, 2.2, 1.8, 0.2, 1.6, 5.3)];
const supports: TrackBarrier[] = [];
for (const x of [-28, 28]) for (const z of [32.5, 51.5]) supports.push({ ...rectangle(`bridge-pier-${x}-${z}`, x - 0.8, z - 0.8, 1.6, 1.6), height: 0.4, kind: 'bridge-support', bridgeId: bridge.id });
export const goldenGateTrack: TrackDefinition = {
  id: 'golden-gate', version: 4, name: 'Golden Gate', centerline, distances, length,
  roadWidth: 16, carWidth: 2.2, carLength: 5.2, start: centerline[0],
  startFinish: createStartFinish(centerline[0], centerline[1], 16), bridges: [bridge],
  barriers: [
    rectangle('civic-block', -36, -23, 23, 29), rectangle('market-block', 2, -23, 22, 13),
    rectangle('waterfront-block', -4, 9, 27, 10), rectangle('east-city-block', 100, -30, 24, 45),
    rectangle('west-city-block', -118, -7, 16, 32), rectangle('distant-city', 70, 66, 45, 38),
    rectangle('inlet-head', -38, 23.65, 76, 0.35),
    ...[-43, 42.65].flatMap((x, side) => [
      { ...rectangle(`inlet-abutment-${side}`, x, 24, 0.35, 11.5), kind: 'bridge-support' as const, bridgeId: bridge.id, height: 0.8 },
      { ...rectangle(`outer-abutment-${side}`, x, 48.5, 0.35, 61.5), kind: 'bridge-support' as const, bridgeId: bridge.id, height: 0.8 },
    ]), ...rails, ...supports, ...parkBoulders,
  ],
};
