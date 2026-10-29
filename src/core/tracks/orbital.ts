import { VEHICLE_DIMENSIONS } from '../vehicle-size';
import { roundedCircuit } from '../road-geometry';
import { createStartFinish } from '../start-finish';
import { cumulative, projectToPolyline } from '../geometry';
import type { HopShortcut, Point, TrackDefinition } from '../types';
import { outcrop } from './outcrop';
import { launchsiteVessels } from './venue-parcels';
import { serviceConduit, obstacleRectangle } from './hop-obstacles';

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
/**
 * Solid desert rock formations (v4). Each keeps at least 13 m from the centerline (5 m of run-off
 * beyond the road edge) and its rendered rock stays inside its footprint, so what you see is what
 * you hit. Lines cut through them crash like any wall; distant buttes frame the venue.
 */
const rocks: TrackDefinition['barriers'] = [
  { id: 'launchsite-s-outcrop', height: 2.6, kind: 'rock', footprint: outcrop(-23, 15, 2.2, 1.5, 0.4, 1.7) },
  { id: 'launchsite-west-boulders', height: 3.4, kind: 'rock', footprint: outcrop(-57, -16, 5.4, 7.2, 0.15, 2.4) },
  { id: 'launchsite-north-rocks', height: 3, kind: 'rock', footprint: outcrop(-10, -63, 9, 5, 0.05, 3.1) },
  { id: 'launchsite-east-rocks', height: 4, kind: 'rock', footprint: outcrop(100, -22, 6, 9, 0, 4.2) },
  { id: 'launchsite-west-tor', height: 7, kind: 'rock', footprint: outcrop(-104, -18, 7, 10, 0.1, 5.3) },
  { id: 'launchsite-south-rocks', height: 3.2, kind: 'rock', footprint: outcrop(-40, 72, 10, 5, 0.2, 6.1) },
  { id: 'launchsite-southeast-rocks', height: 3.6, kind: 'rock', footprint: outcrop(55, 62, 8, 5, -0.3, 7.2) },
  { id: 'launchsite-west-butte', height: 22, kind: 'rock', footprint: outcrop(-150, 10, 16, 24, 0.15, 8.4) },
  { id: 'launchsite-east-butte', height: 18, kind: 'rock', footprint: outcrop(138, -30, 12, 20, -0.1, 9.5) },
  { id: 'launchsite-south-mesa', height: 12, kind: 'rock', footprint: outcrop(20, 106, 20, 7, 0.05, 10.6) },
  { id: 'launchsite-north-butte', height: 20, kind: 'rock', footprint: outcrop(-70, -118, 22, 12, 0.2, 11.7) },
  { id: 'launchsite-northeast-butte', height: 16, kind: 'rock', footprint: outcrop(70, -112, 16, 11, -0.2, 12.8) },
  { id: 'launchsite-southwest-butte', height: 14, kind: 'rock', footprint: outcrop(-125, 78, 14, 10, 0.3, 13.9) },
];

/** Flat physical layout; scenery/branding never participate in its rules. */
export const orbitalTrack: TrackDefinition = {
  id: 'orbital-launchyard', version: 9, name: 'Launchsite', centerline, distances, length,
  roadWidth: 16, carWidth: VEHICLE_DIMENSIONS.width, carLength: VEHICLE_DIMENSIONS.length, start: centerline[0], startFinish: createStartFinish(centerline[0], centerline[1], 16),
  barriers: ([
    // Protected utility parcel with low perimeter and separate real-height vessels.
    { id:'utility-storage-tower',kind:'infield',height:1.25,runoffException:'cut-protection',
      footprint:[[-28,0],[-23,-4],[-13,-3],[-12,28],[-10,39],[2,42.4],[6,42.4],
        [6,43.6],[-13,43.6],[-26,32],[-26,24],[-27,17]].map(([x,z])=>({x,z})) },
    ...launchsiteVessels.map(v=>({id:v.id,kind:'building' as const,height:v.height,baseHeight:1.25,runoffException:'cut-protection' as const,
      footprint:Array.from({length:20},(_,i)=>({x:v.x+Math.cos(i/20*Math.PI*2)*v.radius,z:v.z+Math.sin(i/20*Math.PI*2)*v.radius}))})),
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
    { id: 'service-hop-left-end', height: 1, kind: 'infield', footprint: obstacleRectangle(32.2,-16,12,2) },
    { id: 'service-hop-right-end', height: 1, kind: 'infield', runoffException: 'hop-lane', footprint: obstacleRectangle(59.8,-16,4.6,2) },
    { id: 'service-hop-barrier', height: serviceConduit.height, kind: 'service-barrier', runoffException: 'hop-lane',
      footprint: obstacleRectangle(serviceConduit.x,serviceConduit.z,serviceConduit.width,serviceConduit.depth) },
  ] satisfies TrackDefinition['barriers']).map<TrackDefinition['barriers'][number]>(b=>b.id==='assembly-island'?{...b,footprint:b.footprint.map(p=>({x:-8+(p.x+8)*0.96,z:-15+(p.z+15)*0.96}))}:b).concat(rocks),
  hopShortcuts: [serviceHop],
};
