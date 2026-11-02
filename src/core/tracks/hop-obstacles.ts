import type { Point } from '../types';

/** Compact authored obstacles; geometry is shared with their visual parts. */
export const serviceConduit = { x: 44, z: -16, width: 16, depth: .85, height: 1 } as const;
export const backlotCases = { x: -70, z: 7, width: 16, depth: 1.25, height: 1.4, count: 4, gap: .4 } as const;
/** Launchsite v10: the hairpin wing, a 1.25 m concrete curb carrying a low pipe (top 1.65 m). */
export const utilityWing: { footprint: Point[]; curb: number; height: number } = {
  footprint: [{x:-10,z:39},{x:2,z:42.4},{x:6,z:42.4},{x:6,z:43.6},{x:-10,z:43.6}], curb: 1.25, height: 1.65 };
/** Launchsite v10: the rocket yard's low tip inside the S, a pipe rack on a curb (1.3 m). */
export const rocketYardTip: { footprint: Point[]; height: number } = {
  footprint: [{x:8.2,z:22.6},{x:26,z:22.6},{x:26,z:25},{x:8.2,z:25}], height: 1.3 };
export const hopPropIds: readonly string[] = ['service-hop-barrier','service-hop-left-end','service-hop-right-end',
  'backlot-service-divider','backlot-west-wing','backlot-east-wing','utility-wing-hop-barrier','rocket-yard-tip-hop-barrier'];

export const obstacleRectangle = (x: number,z: number,width: number,depth: number): Point[] =>
  [{x,z:z-depth/2},{x:x+width,z:z-depth/2},{x:x+width,z:z+depth/2},{x,z:z+depth/2}];

/** The gaps are narrower than a car; the four cases form one full-capsule obstruction. */
export function backlotCaseParts() {
  const r=backlotCases, width=(r.width-(r.count-1)*r.gap)/r.count;
  return Array.from({length:r.count},(_,i)=>({x:r.x+i*(width+r.gap),z:r.z,width,depth:r.depth,height:r.height}));
}
