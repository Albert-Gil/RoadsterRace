import { closedSpline, cumulative, distance, projectToPolyline, samplePolyline } from '../geometry';
import { createStartFinish } from '../start-finish';
import type { Point, SupportSurface, TrackBarrier, TrackDefinition, TrackJump } from '../types';

export const rectangle = (x: number, z: number, width: number, depth: number): Point[] => [{ x, z }, { x: x + width, z }, { x: x + width, z: z + depth }, { x, z: z + depth }];
export function strip(a: Point, b: Point, width: number): Point[] {
  const len = distance(a, b), nx = -(b.z - a.z) / len * width / 2, nz = (b.x - a.x) / len * width / 2;
  return [{ x: a.x + nx, z: a.z + nz }, { x: b.x + nx, z: b.z + nz }, { x: b.x - nx, z: b.z - nz }, { x: a.x - nx, z: a.z - nz }];
}
// The ordinary route bends around the water opening. The straight fork is optional.
const centerline = closedSpline([
  [-10, -38], [20, -38], [34, -31], [30, -13], [30, 8], [38, 12],
  [44, 0], [52, -11], [63, -1], [70, 12], [90, 12], [118, 12],
  [132, 20], [138, 32], [130, 46], [116, 50], [86, 50], [58, 50],
  [30, 50], [10, 38], [-8, 22], [-25, 30], [-42, 34], [-55, 22],
  [-56, 0], [-56, -25], [-52, -35], [-36, -38],
].map(([x, z]) => ({ x, z }))).map(p => ({ ...p, z: p.z < -37 ? -38 : p.x >= 76 && p.x <= 118 && p.z < 16 && p.z > 7 ? 12 : p.x >= 58 && p.x <= 116 && p.z > 48 ? 50 : p.z }));
const distances = cumulative(centerline), length = distances.at(-1)!;
const project = (p: Point) => projectToPolyline(p, centerline, distances).progress;
const jump: TrackJump = {
  id: 'pacific-hop', from: { x: 42, z: 12 }, forward: { x: 1, z: 0 }, width: 12,
  rampLength: 8, lipHeight: 1.2, gap: 10, runout: 60, corridorLength: 78,
  branch: [{ x: 30, z: 8 }, { x: 38, z: 12 }, { x: 76, z: 12 }],
  entryProgress: project({ x: 30, z: 8 }), exitProgress: project({ x: 76, z: 12 }),
};
const supports: SupportSurface[] = [
  { id: 'beach-land', footprint: [{ x: -350, z: -300 }, ...Array.from({ length: 66 }, (_, i) => ({ x: 32 + 2.5 * Math.sin((-300 + i * 10) / 29), z: -300 + i * 10 })), { x: -350, z: 350 }] },
  { id: 'amusement-deck', footprint: rectangle(75, 22, 42, 18) },
  { id: 'jump-launch-deck', footprint: rectangle(30, 6, 20, 12) },
  { id: 'jump-landing-deck', footprint: rectangle(60, 6, 62, 12) },
  { id: 'amusement-walkway', footprint: rectangle(93, 38, 4, 8) },
];
// Road strips are authoritative support; these same footprints become visible pier decks.
for (let i = 1; i < centerline.length; i++) if (Math.max(centerline[i - 1].x, centerline[i].x) > 24) {
  const a = centerline[i - 1], b = centerline[i], dx = b.x - a.x, dz = b.z - a.z, len = distance(a, b);
  supports.push({ id: `pier-road-${i}`, footprint: strip({ x: a.x - dx / len * 0.25, z: a.z - dz / len * 0.25 }, { x: b.x + dx / len * 0.25, z: b.z + dz / len * 0.25 }, 12.6) });
}
const barriers: TrackBarrier[] = [
  { id: 'boulevard-gardens', height: 0.8, footprint: rectangle(-35, -24, 38, 23), kind: 'infield' },
  { id: 'beach-shops', height: 1, footprint: rectangle(-37, 0, 8, 10), kind: 'infield' },
  { id: 'amusement-protected', height: 0.8, footprint: rectangle(76, 24, 39, 14), kind: 'pier-rail' },
];
// Exterior sides are railed at the fork; the branch mouths stay open.
for (const [name, path, side] of [
  ['outbound', centerline.slice(6 * 18, 12 * 18 + 1), -1],
  ['return', centerline.slice(12 * 18, 18 * 18 + 1), -1],
] as const) for (let i = 1; i < path.length; i += 3) {
  const a = path[i - 1], b = path[Math.min(path.length - 1, i + 2)], len = distance(a, b), nx = -(b.z - a.z) / len * side * 6.05, nz = (b.x - a.x) / len * side * 6.05;
  barriers.push({ id: `${name}-rail-${i}`, kind: 'pier-rail', height: 0.85, baseHeight: 0.05, footprint: strip({ x: a.x + nx, z: a.z + nz }, { x: b.x + nx, z: b.z + nz }, 0.35) });
}
for (const side of [-1, 1]) barriers.push({ id: `jump-rail-${side}`, kind: 'pier-rail', height: 0.8, footprint: rectangle(76, 12 + side * 5.825 - 0.175, 45, 0.35) });
barriers.push({ id: 'inbound-inner-rail', kind: 'pier-rail', height: 0.85, footprint: rectangle(76, 44, 40, 0.35) });
barriers.push({ id: 'landing-edge', kind: 'pier-rail', baseHeight: -2.4, height: 2.4, footprint: rectangle(59.8, 6, 0.2, 12) });
const authoredTrack: TrackDefinition = {
  id: 'santa-monica', version: 1, name: 'Santa Monica', centerline, distances, length,
  roadWidth: 12, carWidth: 2.2, carLength: 5.2, start: centerline[0], startFinish: createStartFinish(centerline[0], centerline[1], 12),
  supports, waterOpenings: [{ id: 'pacific-gap', footprint: rectangle(50, 6, 10, 12) }], jumps: [jump], barriers,
  checkpoints: Array.from({ length: 8 }, (_, i) => samplePolyline(centerline, distances, i * length / 8)),
};

/** Reflect the authored venue once so its start-to-pier loop runs clockwise. */
export function reflectSantaVenue(track: TrackDefinition): TrackDefinition {
  const point = (p: Point): Point => ({ x: p.x, z: -p.z });
  return { ...track, centerline: track.centerline.map(point), start: point(track.start), checkpoints: track.checkpoints.map(point),
    startFinish: track.startFinish ? { ...track.startFinish, center: point(track.startFinish.center), forward: point(track.startFinish.forward) } : undefined,
    barriers: track.barriers.map(b => ({ ...b, footprint: b.footprint.map(point) })),
    supports: track.supports?.map(s => ({ ...s, footprint: s.footprint.map(point) })), waterOpenings: track.waterOpenings?.map(s => ({ ...s, footprint: s.footprint.map(point) })),
    jumps: track.jumps?.map(j => ({ ...j, from: point(j.from), forward: point(j.forward), branch: j.branch.map(point) })),
  };
}
export const santaMonicaTrack = reflectSantaVenue(authoredTrack);
