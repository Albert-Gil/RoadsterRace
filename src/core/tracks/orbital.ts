import { roundedCircuit } from '../road-geometry';
import { createStartFinish } from '../start-finish';
import { closedSpline, cumulative, samplePolyline } from '../geometry';
import type { TrackDefinition } from '../types';

const centerline = roundedCircuit([
  { x: -38, z: -40 }, { x: -4, z: -40 }, { x: 48, z: -40 },
  { x: 70, z: -26 }, { x: 70, z: -4 }, { x: 48, z: 8 },
  { x: 12, z: 8 }, { x: -2, z: 8 }, { x: -2, z: 34 },
  { x: 18, z: 34 }, { x: 18, z: 56 }, { x: -18, z: 52 }, { x: -38, z: 36 },
  { x: -35, z: 17 }, { x: -60, z: 12 }, { x: -78, z: -4 },
  { x: -78, z: -40 }, { x: -62, z: -40 },
]);
const distances = cumulative(centerline), length = distances.at(-1)!;

/** Flat physical layout; scenery/branding never participate in its rules. */
export const orbitalTrack: TrackDefinition = {
  id: 'orbital-launchyard', version: 2, name: 'Launchsite', centerline, distances, length,
  roadWidth: 16, carWidth: 2.2, carLength: 5.2, start: centerline[0], startFinish: createStartFinish(centerline[0], centerline[1], 16),
  barriers: [
    { id: 'assembly-island', height: 1.05, footprint: [
      { x: -47, z: -23 }, { x: -30, z: -26 }, { x: 30, z: -26 },
      { x: 46, z: -20 }, { x: 43, z: -5 }, { x: 12, z: -5 },
      { x: -3, z: -3 }, { x: -19, z: -2 }, { x: -33, z: -6 }, { x: -48, z: -9 },
    ] },
    { id: 'utilities-island', height: 1.1, footprint: [
      { x: -23, z: 25 }, { x: -20, z: 25 }, { x: -20, z: 28 }, { x: -23, z: 28 },
    ] },
    { id: 'launch-complex', height: 1.2, footprint: [
      { x: 87, z: 6 }, { x: 110, z: 6 }, { x: 110, z: 35 }, { x: 87, z: 35 },
    ] },
  ].map(b=>b.id==='assembly-island'?{...b,footprint:b.footprint.map(p=>({x:-8+(p.x+8)*0.96,z:-15+(p.z+15)*0.96}))}:b),
  checkpoints: Array.from({ length: 8 }, (_, i) => samplePolyline(centerline, distances, i * length / 8)),
};
