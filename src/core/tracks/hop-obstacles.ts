import type { Point } from '../types';

/** Compact authored obstacles; geometry is shared with their visual parts. */
export const serviceConduit = { x: 44, z: -16, width: 16, depth: .85, height: 1 } as const;
export const backlotCases = { x: -70, z: 7, width: 16, depth: 1.25, height: 1.4, count: 4, gap: .4 } as const;
export const hopPropIds: readonly string[] = ['service-hop-barrier','service-hop-left-end','service-hop-right-end',
  'backlot-service-divider','backlot-west-wing','backlot-east-wing'];

export const obstacleRectangle = (x: number,z: number,width: number,depth: number): Point[] =>
  [{x,z:z-depth/2},{x:x+width,z:z-depth/2},{x:x+width,z:z+depth/2},{x,z:z+depth/2}];

/** The gaps are narrower than a car; the four cases form one full-capsule obstruction. */
export function backlotCaseParts() {
  const r=backlotCases, width=(r.width-(r.count-1)*r.gap)/r.count;
  return Array.from({length:r.count},(_,i)=>({x:r.x+i*(width+r.gap),z:r.z,width,depth:r.depth,height:r.height}));
}
