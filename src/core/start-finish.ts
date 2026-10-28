import { clamp, cumulative, distance, lerp, mix } from './geometry';
import { DRAWING_RULES } from './route-cleanup';
import type { DrawSample, Point, StartFinishGate, TrackDefinition } from './types';

export const GATE_RULES = Object.freeze({ leadIn: 30, longitudinalTolerance: 1, lateralTolerance: 8, startBeyond: 8, finishLateral: 24, closeDistance: 40, blendDistance: 20 });
export function createStartFinish(center: Point, next: Point, width: number): StartFinishGate {
  const length = distance(center, next) || 1;
  return { center: { ...center }, forward: { x: (next.x - center.x) / length, z: (next.z - center.z) / length }, width, leadIn: GATE_RULES.leadIn };
}
export const startGate = (track: TrackDefinition) => track.startFinish ?? createStartFinish(track.start, track.centerline[1], track.roadWidth);
export function gateCoordinates(point: Point, track: TrackDefinition) {
  const g = startGate(track), dx = point.x - g.center.x, dz = point.z - g.center.z;
  return { along: dx * g.forward.x + dz * g.forward.z, across: dx * g.forward.z - dz * g.forward.x };
}
export function gatePoint(track: TrackDefinition, across: number, along = 0): Point {
  const g = startGate(track);
  return { x: g.center.x + g.forward.x * along + g.forward.z * across, z: g.center.z + g.forward.z * along - g.forward.x * across };
}
/** Full touchdown rectangle, shared by acceptance, the dashed guide and fixed-camera fitting. */
export function drawingStartBounds(track: TrackDefinition) {
  const g = startGate(track), halfWidth = g.width / 2 + GATE_RULES.lateralTolerance;
  return { halfWidth, from: -g.leadIn, to: GATE_RULES.startBeyond,
    corners: [-halfWidth, halfWidth].flatMap(across => [-g.leadIn, GATE_RULES.startBeyond].map(along => gatePoint(track, across, along))) };
}
export function canStartDrawing(point: Point, track: TrackDefinition) {
  const p = gateCoordinates(point, track), g = startGate(track);
  return p.along >= -g.leadIn - 0.001 && p.along <= GATE_RULES.startBeyond + 0.001 && Math.abs(p.across) <= g.width / 2 + GATE_RULES.lateralTolerance + 0.001;
}
function projectSample(p: DrawSample, track: TrackDefinition): DrawSample {
  return { ...gatePoint(track, clamp(gateCoordinates(p, track).across, -startGate(track).width / 2, startGate(track).width / 2)), time: p.time };
}
/** Forward crossing of the gate line. The finish also counts a crossing on the runoff beside the road. */
function crossing(a: DrawSample, b: DrawSample, track: TrackDefinition, lateral: number = GATE_RULES.lateralTolerance) {
  const aa = gateCoordinates(a, track), bb = gateCoordinates(b, track);
  if (aa.along > 1e-7 || bb.along < -1e-7 || bb.along - aa.along <= 1e-7) return null;
  const t = clamp(-aa.along / (bb.along - aa.along), 0, 1), point = { ...mix(a, b, t), time: lerp(a.time, b.time, t) };
  if (Math.abs(gateCoordinates(point, track).across) > startGate(track).width / 2 + lateral) return null;
  return projectSample(point, track);
}
/** Shared by live coloring and compilation: no pre-gate timing enters the counted stroke. */
export function drawingStart(samples: DrawSample[], track: TrackDefinition) {
  if (!samples.length || !canStartDrawing(samples[0], track)) return null;
  if (gateCoordinates(samples[0], track).along >= -1e-7) return { sample: projectSample(samples[0], track), next: 1, leadIn: [samples[0]] };
  for (let i = 1; i < samples.length; i++) {
    const hit = crossing(samples[i - 1], samples[i], track);
    if (hit) return { sample: hit, next: i, leadIn: [...samples.slice(0, i), hit] };
  }
  return null;
}
export function trimDrawing(samples: DrawSample[], track: TrackDefinition) {
  const start = drawingStart(samples, track);
  if (!start) return { ok: false as const, message: 'Cross the start line in the direction of the arrows.', point: track.start };
  const lap = [start.sample]; let tail: DrawSample[] = [];
  let travelled = 0, ended = false;
  for (let i = start.next; i < samples.length; i++) {
    const p = samples[i];
    const before = lap.at(-1)!, hit = crossing(before, p, track, GATE_RULES.finishLateral);
    travelled += distance(before, p);
    if (travelled >= track.length * DRAWING_RULES.minimumPhysicalLap && hit) {
      lap.push(hit); tail = [hit, ...samples.slice(i)]; ended = true; break;
    }
    // Retain stationary timestamps so pause handling is identical at every event rate.
    lap.push(p);
  }
  if (!ended) {
    // Lifting a little before the line still finishes: the lap closes straight onto the gate
    // at the pace of the last few metres. Lap coverage is validated afterwards.
    const last = lap.at(-1)!, at = gateCoordinates(last, track);
    if (travelled < track.length * DRAWING_RULES.minimumPhysicalLap || at.along < -GATE_RULES.closeDistance || at.along > GATE_RULES.longitudinalTolerance || Math.abs(at.across) > startGate(track).width / 2 + GATE_RULES.finishLateral) return { ok: false as const, message: 'Complete one lap and finish anywhere across the start/finish line.', point: last };
    if (at.along >= -GATE_RULES.longitudinalTolerance) lap[lap.length - 1] = projectSample(last, track);
    else {
      let k = lap.length - 1; while (k > 0 && distance(lap[k], last) < 10) k--;
      const pace = distance(lap[k], last) / Math.max(1, last.time - lap[k].time), end = projectSample(last, track);
      lap.push({ ...end, time: last.time + distance(last, end) / Math.max(0.004, pace) });
    }
  }
  // The first forward finish crossing ends the lap. Any later movement is display-only,
  // including a long detour, pause, reversal or another lap before the pointer is lifted.
  const time = lap[0].time;
  return { ok: true as const, samples: lap.map(p => ({ ...p, time: p.time - time })), leadIn: start.leadIn, tail };
}
/** Adjust only the first/last 20 m. Zero lateral derivative at the gate gives a forward seam. */
export function joinLap(samples: DrawSample[], track: TrackDefinition) {
  const ds = cumulative(samples), total = ds.at(-1)!, first = gateCoordinates(samples[0], track), last = gateCoordinates(samples.at(-1)!, track);
  const across = (first.across + last.across) / 2, anchor = gatePoint(track, across), g = startGate(track);
  const span = Math.min(GATE_RULES.blendDistance, total / 4);
  const shift = (p: DrawSample, amount: number) => ({ ...p, x: p.x + g.forward.z * amount, z: p.z - g.forward.x * amount });
  const points = samples.map((p, i) => {
    const fromStart = ds[i], toEnd = total - ds[i];
    if (i === 0 || i === samples.length - 1) return { ...p, ...anchor };
    if (fromStart < span) { const u = fromStart / span, w = 1 - u * u * (3 - 2 * u); return shift(p, (across - first.across) * w); }
    if (toEnd < span) { const u = toEnd / span, w = 1 - u * u * (3 - 2 * u); return shift(p, (across - last.across) * w); }
    return { ...p };
  });
  // Align the immediate seam with the gate while retaining timestamps and the rest of the line.
  for (const [i, sign] of [[1, 1], [points.length - 2, -1]] as const) {
    if (points.length < 4) break;
    const along = Math.min(1, distance(points[i], anchor));
    points[i] = { ...points[i], ...gatePoint(track, across, along * sign) };
  }
  return { samples: points, joined: distance(samples[0], samples.at(-1)!) > 0.15 || Math.abs(first.along) > 0.1 || Math.abs(last.along) > 0.1 };
}
