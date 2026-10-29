import { jumpCoordinates } from '../core/support';
import type { Point, TrackDefinition } from '../core/types';
import { locateRoad,terrainElevation } from '../core/elevation';

/** Planning guide across the opening, never a physical supporting surface. */
export function planningHeight(p: Point, track: TrackDefinition) {
  if(track.terrain)return p.y??terrainElevation(p,track);
  if(track.sections)return p.y??locateRoad(p,track).height;
  for (const j of track.jumps ?? []) {
    const c = jumpCoordinates(p, j);
    if (Math.abs(c.across) <= j.width / 2 && c.along >= 0 && c.along <= j.rampLength + j.gap) return c.along <= j.rampLength ? c.along / j.rampLength * j.lipHeight : (1 - (c.along - j.rampLength) / j.gap) * j.lipHeight;
  }
  return 0;
}
