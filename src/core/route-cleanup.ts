import { clamp, cumulative, distance, lerp, mix } from './geometry';
import type { DrawSample, Point, TrackDefinition } from './types';

export const DRAWING_RULES = Object.freeze({ runoffRoadWidths: 1, backwardTolerance: 0.08, localLoopRoadWidths: 2.5 });

/** Keep course association continuous when a wide line passes near another part of a hairpin. */
export function projectCourse(point: Point, track: TrackDefinition, previous?: { point: Point; progress: number }) {
  let best = { distance: Infinity, progress: 0, score: Infinity };
  const movement = previous ? distance(point, previous.point) : 0;
  for (let i = 0; i < track.centerline.length - 1; i++) {
    const a = track.centerline[i], b = track.centerline[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const gap = distance(point, mix(a, b, t));
    let progress = lerp(track.distances[i], track.distances[i + 1], t);
    if (previous) progress += Math.round((previous.progress - progress) / track.length) * track.length;
    const jump = previous ? Math.max(0, Math.abs(progress - previous.progress) - movement * 1.75 - 2) : 0;
    const score = gap + jump * 0.65;
    if (score < best.score) best = { distance: gap, progress, score };
  }
  return best;
}

interface Node { point: DrawSample; progress: number; index: number }
function intersection(a: Point, b: Point, c: Point, d: Point) {
  const ax = b.x - a.x, az = b.z - a.z, bx = d.x - c.x, bz = d.z - c.z;
  const determinant = ax * bz - az * bx;
  if (Math.abs(determinant) < 1e-8) return null;
  const cx = c.x - a.x, cz = c.z - a.z;
  const t = (cx * bz - cz * bx) / determinant, u = (cx * az - cz * ax) / determinant;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { point: mix(a, b, t), t, u };
}

/** Erase backward hooks and local self-crossing loops without dragging the retained line onto asphalt. */
export function cleanDrawnRoute(samples: DrawSample[], track: TrackDefinition, gateTrimmed = false) {
  const first = projectCourse(samples[0], track), spatial: Node[] = [{ point: samples[0], progress: 0, index: 0 }];
  let previous = { point: samples[0], progress: first.progress }, repairs = 0;
  const rawDistances = cumulative(samples), loopWindow = track.roadWidth * DRAWING_RULES.localLoopRoadWidths;
  for (let index = 1; index < samples.length; index++) {
    const point = samples[index], projection = projectCourse(point, track, previous);
    previous = { point, progress: projection.progress };
    const progress = projection.progress - first.progress;
    // Returning to a point also catches a radial out-and-back spur (collinear segments).
    // Do this before course-direction pruning, which can otherwise remove the spur's anchor.
    let joined = false;
    for (let i = spatial.length - 2; i >= 0; i--) {
      if (Math.abs(progress - spatial[i].progress) > loopWindow) break;
      const travelled = rawDistances[index] - rawDistances[Math.floor(spatial[i].index)];
      if (distance(point, spatial[i].point) < 0.4 && travelled > 1.5) {
        spatial.splice(i + 1); repairs++; joined = true; break;
      }
    }
    // A small loop can cross an old segment between samples rather than hit an old point.
    if (!joined && spatial.length >= 3) {
      const tail = spatial.at(-1)!;
      for (let i = spatial.length - 3; i >= 0; i--) {
        if (Math.abs(progress - spatial[i].progress) > loopWindow) break;
        const hit = intersection(spatial[i].point, spatial[i + 1].point, tail.point, point);
        if (!hit) continue;
        const old = spatial[i], next = spatial[i + 1];
        spatial.splice(i + 1);
        spatial.push({ point: { ...hit.point, time: lerp(tail.point.time, point.time, hit.u) }, progress: lerp(old.progress, next.progress, hit.t), index: lerp(tail.index, index, hit.u) });
        repairs++; break;
      }
    }
    if (distance(point, spatial.at(-1)!.point) > 0.08) spatial.push({ point, progress, index });
    else if (spatial.length > 1) spatial[spatial.length - 1] = { point, progress, index };
  }
  const nodes: Node[] = [spatial[0]];
  for (const node of spatial.slice(1)) {
    if (node.progress < -DRAWING_RULES.backwardTolerance) { repairs++; continue; }
    while (nodes.length > 1 && nodes.at(-1)!.progress > node.progress + DRAWING_RULES.backwardTolerance) { nodes.pop(); repairs++; }
    if (distance(node.point, nodes.at(-1)!.point) > 0.08) nodes.push(node);
    else if (nodes.length > 1) nodes[nodes.length - 1] = node;
  }
  // Lifting just beyond the finish must not create a backward segment when the lap is closed.
  // A genuinely extra whole lap is left intact here so validation can reject it.
  const finalProgress = nodes.at(-1)!.progress;
  if (!gateTrimmed && finalProgress > track.length + DRAWING_RULES.backwardTolerance && finalProgress <= track.length + 7.5) {
    const crossing = nodes.findIndex(node => node.progress >= track.length);
    if (crossing > 0) {
      const a = nodes[crossing - 1], b = nodes[crossing], t = clamp((track.length - a.progress) / (b.progress - a.progress), 0, 1);
      nodes.splice(crossing, nodes.length - crossing, { point: { ...mix(a.point, b.point, t), time: lerp(a.point.time, b.point.time, t) }, progress: track.length, index: lerp(a.index, b.index, t) });
      repairs++;
    }
  }
  if (!repairs) return { samples, removedPoints: 0, removedSeconds: 0 };

  const localPace = (index: number) => {
    const i = Math.round(index), a = Math.max(0, i - 2), b = Math.min(samples.length - 1, i + 2);
    return (rawDistances[b] - rawDistances[a]) / Math.max(1, samples[b].time - samples[a].time);
  };
  let time = samples[0].time;
  const cleaned = nodes.map((node, i) => {
    if (i) {
      const before = nodes[i - 1];
      // Preserve recorded time on retained sections; deleted loops must not become a braking pause.
      const consecutive = node.index === before.index + 1;
      time += consecutive ? node.point.time - before.point.time : distance(before.point, node.point) / Math.max(0.001, (localPace(before.index) + localPace(node.index)) / 2);
    }
    return { ...node.point, time };
  });
  return { samples: cleaned, removedPoints: Math.max(1, samples.length - cleaned.length), removedSeconds: Math.max(0, (samples.at(-1)!.time - cleaned.at(-1)!.time) / 1000) };
}
