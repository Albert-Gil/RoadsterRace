import { roundedCircuit } from '../road-geometry';
import { createStartFinish } from '../start-finish';
import { cumulative, projectToPolyline, samplePolyline } from '../geometry';
import type { HopShortcut, Point, TrackDefinition } from '../types';

const centerline = roundedCircuit([
  { x: -38, z: -40 }, { x: -4, z: -40 }, { x: 48, z: -40 },
  { x: 76, z: -26 }, { x: 76, z: -4 }, { x: 48, z: 8 },
  { x: 12, z: 8 }, { x: -2, z: 8 }, { x: -2, z: 34 },
  { x: 18, z: 34 }, { x: 18, z: 56 }, { x: -18, z: 52 }, { x: -38, z: 36 },
  { x: -35, z: 17 }, { x: -60, z: 12 }, { x: -78, z: -4 },
  { x: -78, z: -40 }, { x: -62, z: -40 },
]);
const distances = cumulative(centerline), length = distances.at(-1)!;
const arc = (x: number, z: number, start: number, end: number) => Array.from({ length: 25 }, (_, i) => ({ x: x + Math.cos(start + (end - start) * i / 24) * 12, z: z + Math.sin(start + (end - start) * i / 24) * 12 }));
const branch: Point[] = [
  ...arc(40, -28, -Math.PI / 2, 0),
  ...Array.from({ length: 24 }, (_, i) => ({ x: 52, z: -27 + i })),
  ...arc(40, -4, 0, Math.PI / 2).slice(1),
];
const serviceHop: HopShortcut = { id: 'service-hop', branch, width: 16, obstacleId: 'service-hop-barrier',
  entryProgress: projectToPolyline(branch[0], centerline, distances).progress,
  exitProgress: projectToPolyline(branch.at(-1)!, centerline, distances).progress };
const rect = (x: number, z: number, w: number, d: number) => [{ x, z }, { x: x + w, z }, { x: x + w, z: z + d }, { x, z: z + d }];

/** Flat physical layout; scenery/branding never participate in its rules. */
export const orbitalTrack: TrackDefinition = {
  id: 'orbital-launchyard', version: 3, name: 'Launchsite', centerline, distances, length,
  roadWidth: 16, carWidth: 2.2, carLength: 5.2, start: centerline[0], startFinish: createStartFinish(centerline[0], centerline[1], 16),
  barriers: [
    { id: 'assembly-island', height: 1.05, footprint: [
      { x: -47, z: -23 }, { x: -30, z: -26 }, { x: 30, z: -26 },
      { x: 34, z: -20 }, { x: 34, z: -5 }, { x: 12, z: -5 },
      { x: -3, z: -3 }, { x: -19, z: -2 }, { x: -33, z: -6 }, { x: -48, z: -9 },
    ] },
    { id: 'utilities-island', height: 1.1, footprint: [
      { x: -23, z: 25 }, { x: -20, z: 25 }, { x: -20, z: 28 }, { x: -23, z: 28 },
    ] },
    { id: 'launch-complex', height: 1.2, footprint: [
      { x: 87, z: 6 }, { x: 110, z: 6 }, { x: 110, z: 35 }, { x: 87, z: 35 },
    ] },
    { id: 'service-divider', height: 1.05, kind: 'service-barrier', footprint: rect(64, -20, 0.4, 8) },
    { id: 'service-hop-left-end', height: 1, kind: 'service-barrier', footprint: rect(32.2, -16.5, 11.8, 1) },
    { id: 'service-hop-right-end', height: 1, kind: 'service-barrier', footprint: rect(60, -16.5, 4.4, 1) },
    { id: 'service-hop-barrier', height: 1, kind: 'service-barrier', footprint: rect(44, -16.5, 16, 1) },
  ].map(b=>b.id==='assembly-island'?{...b,footprint:b.footprint.map(p=>({x:-8+(p.x+8)*0.96,z:-15+(p.z+15)*0.96}))}:b) as TrackDefinition['barriers'],
  hopShortcuts: [serviceHop],
  checkpoints: Array.from({ length: 8 }, (_, i) => samplePolyline(centerline, distances, i * length / 8)),
};
