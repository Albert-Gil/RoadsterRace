import { projectToPolyline } from '../core/geometry';
import type { TrackDefinition } from '../core/types';

/**
 * Hop lanes that run as a road of their own (service lanes, trails) and get a surface, edge lines
 * and worn ground. A lane that only crosses a low divider between two legs of the course
 * (Launchsite's hairpin wing) stays within a few metres of the course and gets none: it is not
 * marked in any way.
 */
export function pavedHopLanes(track: TrackDefinition) {
  return (track.hopShortcuts ?? []).filter(lane => lane.branch.some(p => projectToPolyline(p, track.centerline, track.distances).distance > track.roadWidth / 2 + 6));
}
