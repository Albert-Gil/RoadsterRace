import { hopEffects, sceneTuning } from './themes';
import {rotateContact}from'./vehicle-grounding';

export interface ExhaustPose {
  x: number; z: number; heading: number; y?: number; pitch?: number;roll?:number;
  hopAge?: number; supportY?: number;
  surfaceAt?: (x: number, z: number) => number | undefined;
}

/** Match the pitched underbody mount, then query support at that outlet, not at the car centre. */
export function hopOutlet(pose: ExhaustPose, mount: { x: number; z: number }) {
  const scale = sceneTuning.vehicle.racingScale,p=rotateContact({x:mount.x*scale,y:0,z:mount.z*scale},pose.heading,pose.pitch,pose.roll);
  const x=pose.x+p.x,z=pose.z+p.z;
  return { x, z, y: (pose.y ?? 0) + hopEffects.nozzleHeight + p.y,
    supportY: pose.surfaceAt ? pose.surfaceAt(x, z) : pose.supportY };
}
