import { roundedCircuit } from './road-geometry';
import { createStartFinish } from './start-finish';
import { closedSpline, cumulative, samplePolyline } from './geometry';
import type { TrackDefinition } from './types';

const centerline = roundedCircuit([
  { x: -18, z: -30 }, { x: 16, z: -30 }, { x: 48, z: -26 },
  { x: 57, z: -10 }, { x: 44, z: 4 }, { x: 17, z: 4 },
  { x: 17, z: 32 }, { x: -2, z: 38 }, { x: -27, z: 31 },
  { x: -49, z: 20 }, { x: -55, z: -1 }, { x: -43, z: -30 },
]);
const distances = cumulative(centerline);
const length = distances[distances.length - 1];
export const coastalTrack: TrackDefinition = {
  id: 'coastal-launch', version: 3, name: 'Coastal Launch', centerline, distances, length,
  roadWidth: 16, carWidth: 2.2, carLength: 5.2, start: centerline[0], startFinish: createStartFinish(centerline[0], centerline[1], 16),
  // Authored infield islands: all faces are also used by the visible retaining walls.
  barriers: [
    { id: 'gantry-support', height: 7, footprint: [{ x: -18.35, z: -48.35 }, { x: -17.65, z: -48.35 }, { x: -17.65, z: -47.65 }, { x: -18.35, z: -47.65 }] },
    { id: 'grandstand', height: 7, footprint: [{ x: -29, z: 52 }, { x: 1, z: 52 }, { x: 1, z: 63 }, { x: -29, z: 63 }] },
    { id: 'coastal-gardens', height: 0.95, footprint: [
      { x: -37, z: -12 }, { x: -27, z: -17 }, { x: -7, z: -17 },
      { x: 0, z: -13 }, { x: 0, z: -3 }, { x: 0, z: 10 },
      { x: -6, z: 18 }, { x: -26, z: 17 }, { x: -38, z: 9 }, { x: -41, z: -2 },
    ] },
    { id: 'apex-rocks', height: 1.1, footprint: [
      { x: 28, z: -17 }, { x: 35, z: -16 }, { x: 35, z: -14 },
      { x: 30, z: -14 },
    ] },
  ].map(b=>{if(!['coastal-gardens','apex-rocks'].includes(b.id))return b;const cx=b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,cz=b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length;return {...b,footprint:b.footprint.map(p=>({x:cx+(p.x-cx)*0.86,z:cz+(p.z-cz)*0.86+(b.id==='apex-rocks'?4:0)}))};}),
  checkpoints: Array.from({ length: 8 }, (_, i) => samplePolyline(centerline, distances, i * length / 8)),
};
