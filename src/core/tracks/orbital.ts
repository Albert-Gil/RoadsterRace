import { createStartFinish } from '../start-finish';
import { closedSpline, cumulative, samplePolyline } from '../geometry';
import type { TrackDefinition } from '../types';

const centerline = closedSpline([
  { x: -46, z: -40 }, { x: -4, z: -40 }, { x: 48, z: -40 },
  { x: 70, z: -28 }, { x: 70, z: -4 }, { x: 48, z: 8 },
  { x: 12, z: 8 }, { x: 0, z: 22 }, { x: 18, z: 35 },
  { x: 13, z: 50 }, { x: -18, z: 52 }, { x: -38, z: 36 },
  { x: -35, z: 17 }, { x: -60, z: 12 }, { x: -78, z: -4 },
  { x: -73, z: -27 },
]);
const distances = cumulative(centerline), length = distances.at(-1)!;

/** Flat physical layout; scenery/branding never participate in its rules. */
export const orbitalTrack: TrackDefinition = {
  id: 'orbital-launchyard', version: 1, name: 'Launchsite', centerline, distances, length,
  roadWidth: 11.5, carWidth: 2.2, carLength: 5.2, start: centerline[0], startFinish: createStartFinish(centerline[0], centerline[1], 11.5),
  barriers: [
    { id: 'assembly-island', height: 1.05, footprint: [
      { x: -47, z: -23 }, { x: -30, z: -28 }, { x: 30, z: -28 },
      { x: 46, z: -20 }, { x: 43, z: -5 }, { x: 12, z: -5 },
      { x: -3, z: -3 }, { x: -19, z: -2 }, { x: -33, z: -6 }, { x: -48, z: -9 },
    ] },
    { id: 'utilities-island', height: 1.1, footprint: [
      { x: -22, z: 24 }, { x: -17, z: 21 }, { x: -12, z: 25 },
      { x: -12, z: 33 }, { x: -19, z: 37 }, { x: -26, z: 32 },
    ] },
    { id: 'launch-complex', height: 1.2, footprint: [
      { x: 87, z: 6 }, { x: 110, z: 6 }, { x: 110, z: 35 }, { x: 87, z: 35 },
    ] },
  ],
  checkpoints: Array.from({ length: 8 }, (_, i) => samplePolyline(centerline, distances, i * length / 8)),
};
