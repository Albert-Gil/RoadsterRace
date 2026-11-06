import { annotateRoad } from '../../src/core/elevation';
import { cumulative, samplePolyline } from '../../src/core/geometry';
import type { DrawSample, Point, TrackDefinition } from '../../src/core/types';

/** Recorded-like complete stroke across every authored support vessel, with uniform physical timing. */
export function fleetExplorerSamples(track: TrackDefinition, seconds = 7): DrawSample[] {
  const points: Point[] = []; let cursor = 0;
  for (const lane of [...track.hopShortcuts!].sort((a, b) => a.entryProgress - b.entryProgress)) {
    const a = track.distances.findIndex(d => d >= lane.entryProgress), b = track.distances.findIndex(d => d >= lane.exitProgress);
    points.push(...track.centerline.slice(cursor, a));
    const ds = cumulative(lane.branch);
    points.push(...Array.from({ length: 78 }, (_, i) => samplePolyline(lane.branch, ds, i / 77 * ds.at(-1)!)));
    cursor = b;
  }
  points.push(...track.centerline.slice(cursor));
  const ds = cumulative(points);
  return annotateRoad(points, track).map((p, i) => ({ ...p, time: ds[i] / ds.at(-1)! * seconds * 1000 }));
}
