import type { Point, TrackDefinition } from './types';
export function bridgeAt(point: Point, track: TrackDefinition, margin = 0) {
  return track.bridges?.find(b => {
    const dx = b.to.x - b.from.x, dz = b.to.z - b.from.z, length = Math.hypot(dx, dz), x = point.x - b.from.x, z = point.z - b.from.z;
    const along = (x * dx + z * dz) / length, across = Math.abs((x * dz - z * dx) / length);
    return along >= -margin && along <= length + margin && across <= b.width / 2 + margin;
  });
}
