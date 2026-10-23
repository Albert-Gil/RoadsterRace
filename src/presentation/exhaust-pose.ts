import { hopEffects, sceneTuning } from './themes';

export interface ExhaustPose {
  x: number; z: number; heading: number; y?: number; pitch?: number;
  hopAge?: number; supportY?: number;
  surfaceAt?: (x: number, z: number) => number | undefined;
}

/** Match the pitched underbody mount, then query support at that outlet, not at the car centre. */
export function hopOutlet(pose: ExhaustPose, mount: { x: number; z: number }) {
  const scale = sceneTuning.vehicle.racingScale, c = Math.cos(pose.heading), s = Math.sin(pose.heading);
  const along = mount.z * scale, side = mount.x * scale, pitch = pose.pitch ?? 0;
  const x = pose.x + c * side + s * along * Math.cos(pitch);
  const z = pose.z - s * side + c * along * Math.cos(pitch);
  return { x, z, y: (pose.y ?? 0) + hopEffects.nozzleHeight + Math.sin(pitch) * along,
    supportY: pose.surfaceAt ? pose.surfaceAt(x, z) : pose.supportY };
}
