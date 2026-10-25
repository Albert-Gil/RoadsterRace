import { clamp, cumulative, distance, lerp, mix, modulo, projectToPolyline, samplePolyline } from './geometry';
import type { CompiledRoute, DrawSample, Point, RouteResult, TrackDefinition } from './types';
import { cleanDrawnRoute, DRAWING_RULES, projectCourse } from './route-cleanup';
import { canStartDrawing, trimDrawing, joinLap, gateCoordinates, gatePoint } from './start-finish';
import { blockedRouteSection } from './barriers';
import { validateSupports, branchProjection } from './support';
import { validateHopShortcuts } from './hop-shortcuts';
import { annotateRoad } from './elevation';

export const COMPILER_VERSION = 13;
export const PACE_RANGE = Object.freeze({ min: 9, max: 30 });
export const PACE_FILTER = Object.freeze({ gestureRadius: 5, compiledRadius: 8 });

export function paceToSpeed(worldUnitsPerSecond: number, trackLength: number): number {
  const u = clamp((worldUnitsPerSecond / trackLength - 0.015) / 0.245, 0, 1);
  return lerp(PACE_RANGE.min, PACE_RANGE.max, u * u * (3 - 2 * u));
}

function validateGeometry(points: Point[], track: TrackDefinition): RouteResult | null {
  const support = validateSupports(points, track); if (!support.ok) return support;
  const shortcuts = validateHopShortcuts(points, track); if (!shortcuts.ok) return shortcuts;
  const blocked = blockedRouteSection(points, track, shortcuts.obstacles);
  if (blocked) return { ok: false, message: 'Your line crosses an inner barrier. Leave room for the car and redraw this section.', ...blocked };
  let unwrapped = 0, backwards = 0, previous = projectCourse(points[0], track);
  let visitedSectors = 1;
  const roadLimit = (track.roadWidth - track.carWidth) / 2 + track.roadWidth * DRAWING_RULES.runoffRoadWidths;
  const drawnDistances = cumulative(points), drawnLength = drawnDistances.at(-1)!;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], projection = projectCourse(p, track, i ? { point: points[i - 1], progress: previous.progress } : undefined, drawnDistances[i] / drawnLength * track.length);
    if (Math.min(projectToPolyline(p, track.centerline, track.distances).distance, branchProjection(p, track)?.distance ?? Infinity) > roadLimit) return { ok: false, message: 'That line goes too far from the circuit. Stay closer to the road and surrounding sand.', point: p };
    const delta = i ? projection.progress - previous.progress : 0;
    if (delta < 0) backwards -= delta;
    unwrapped += delta;
    if (unwrapped >= 0 && unwrapped < track.length) visitedSectors |= 1 << Math.min(3, Math.floor(unwrapped * 4 / track.length));
    if (i > 0) {
      const steps = Math.ceil(distance(points[i - 1], p) / 2);
      for (let j = 1; j < steps; j++) {
        const probe = mix(points[i - 1], p, j / steps);
        if (Math.min(projectToPolyline(probe, track.centerline, track.distances).distance, branchProjection(probe, track)?.distance ?? Infinity) > roadLimit) return { ok: false, message: 'That line cuts too far across the infield. Follow the circuit through the surrounding sand.', point: probe };
      }
    }
    previous = projection;
  }
  if (backwards > track.length * 0.02) return { ok: false, message: 'Follow the arrows around the circuit. Try drawing the other way.', point: points[0] };
  const sectors = [0, 1, 2, 3].filter(i => visitedSectors & (1 << i)).length;
  if (unwrapped < track.length * DRAWING_RULES.minimumLapProgress || sectors < 3) return { ok: false, message: 'Continue around the circuit before crossing the finish line.', point: points[points.length - 1] };
  if (unwrapped > track.length * 1.08) return { ok: false, message: 'Draw just one lap, then lift near the start.', point: points[points.length - 1] };
  return null;
}

/** Shared live/compiled gesture interpretation; the trailing live window is provisional. */
export function gestureSpeeds(samples: DrawSample[], trackLength: number) {
  const ds = cumulative(samples); let start = 0, end = 0;
  return samples.map((_, i) => {
    while (start < i && ds[start + 1] < ds[i] - PACE_FILTER.gestureRadius) start++;
    while (end < samples.length - 1 && ds[end] < ds[i] + PACE_FILTER.gestureRadius) end++;
    const a = samples[start], b = samples[end];
    return paceToSpeed((ds[end] - ds[start]) / Math.max(0.016, (b.time - a.time) / 1000), trackLength);
  });
}

export function compileRoute(input: DrawSample[], track: TrackDefinition): RouteResult {
  if (input.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(p.time))) return { ok: false, message: 'The drawing was interrupted. Please redraw your lap.' };
  if (input.length < 12) return { ok: false, message: 'Start on the line or just behind it. Draw one lap.' };
  if (!canStartDrawing(input[0], track)) return { ok: false, message: 'Start anywhere across the line or up to 12 metres behind it.', point: track.start };
  if (input.some((p, i) => i > 0 && p.time < input[i - 1].time)) return { ok: false, message: 'The drawing was interrupted. Please redraw your lap.' };
  const trimmed = trimDrawing(input, track);
  if (!trimmed.ok) return trimmed;
  let samples: DrawSample[] = [trimmed.samples[0]];
  for (const p of trimmed.samples.slice(1)) {
    const last = samples.at(-1)!;
    if (p.time - last.time > 2000) return { ok: false, message: 'The drawing was interrupted. Please redraw your lap.', point: p };
    if (distance(p, last) > 0.08) samples.push(p);
  }
  if (samples.length < 12) return { ok: false, message: 'Draw all the way around the circuit.' };
  if (samples.some((p, i) => i > 0 && distance(samples[i - 1], p) > track.roadWidth * 4)) return { ok: false, message: 'Part of your line is missing. Draw one continuous lap.', point: samples[0] };
  if(track.sections) {const rawSupport=validateSupports(samples,track);if(!rawSupport.ok)return rawSupport;samples=annotateRoad(samples,track);}
  const rawDuration = trimmed.samples.at(-1)!.time / 1000;
  const retainedShortcuts = validateHopShortcuts(samples, track); if (!retainedShortcuts.ok) return retainedShortcuts;
  const retainedCrossing = blockedRouteSection(samples, track, retainedShortcuts.obstacles);
  const retainedSupport = validateSupports(samples, track); if (!retainedSupport.ok) return retainedSupport;
  if (retainedCrossing) return { ok: false, message: 'Your line crosses an inner barrier. Leave room for the car and redraw this section.', ...retainedCrossing };
  const cleaned = cleanDrawnRoute(samples, track, true);
  samples = cleaned.samples;
  if (samples.length < 12) return { ok: false, message: 'Follow the arrows and draw one complete lap in the circuit direction.', point: input[0] };
  const rawError = validateGeometry(samples, track);
  if (rawError) return rawError;
  const speeds = gestureSpeeds(samples, track.length);
  const connection = joinLap(samples, track);
  const joinedError = validateGeometry(connection.samples, track); if (joinedError) return joinedError;
  const smoothed = connection.samples.map((p, i) => {
    if (i === 0 || i === samples.length - 1) return p;
    const blended = mix(p, mix(connection.samples[i - 1], connection.samples[i + 1], 0.5), 0.3);
    return { ...blended, time: p.time };
  });
  const positions = smoothed, ds = cumulative(positions), total = ds[ds.length - 1];
  const count = Math.max(120, Math.ceil(total / 0.7));
  let index = 0;
  let points = Array.from({ length: count + 1 }, (_, i) => {
    const s = total * i / count;
    while (index < ds.length - 2 && ds[index + 1] < s) index++;
    const t = clamp((s - ds[index]) / Math.max(1e-6, ds[index + 1] - ds[index]), 0, 1);
    return { ...mix(positions[index], positions[index + 1], t), distance: s, desiredSpeed: lerp(speeds[index], speeds[index + 1], t), curvature: 0 };
  });
  const original = points.map(p => ({ ...p }));
  // Filter tiny direction changes in metres; keep the player's intended line within 0.8 m.
  for (let pass = 0; pass < 3; pass++) {
    const previous = points;
    points = previous.map((p, i) => {
      if (i === 0 || i === count) return p;
      const neighbors = [-3, -1, 1, 3].map(offset => previous[modulo(i + offset, count)]);
      const average = { x: neighbors.reduce((sum, n) => sum + n.x, 0) / 4, z: neighbors.reduce((sum, n) => sum + n.z, 0) / 4 };
      const candidate = mix(p, average, 0.4), gap = distance(candidate, original[i]);
      return { ...p, ...mix(original[i], candidate, Math.min(1, 0.8 / Math.max(1e-9, gap))) };
    });
  }
  // Lock a short forward tangent after filtering, before distance resampling. Otherwise
  // filtering can tilt the two sides differently even though their shared anchor agrees.
  const anchorAcross = gateCoordinates(points[0], track).across;
  points = points.map(p => p.distance < 1.5 || total - p.distance < 1.5
    ? { ...p, ...gatePoint(track, anchorAcross, gateCoordinates(p, track).along) } : p);
  const geometry = points;
  const radius = Math.max(2, Math.round(PACE_FILTER.compiledRadius / (total / count)));
  const filteredSpeeds = points.map((_, i) => {
    let sum = 0, weights = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const weight = radius + 1 - Math.abs(offset);
      sum += original[modulo(i + offset, count)].desiredSpeed * weight; weights += weight;
    }
    return sum / weights;
  });
  // Recompute distances after smoothing so sampling and physical route progress agree.
  const smoothDistances = cumulative(geometry), smoothLength = smoothDistances.at(-1)!;
  index = 0;
  points = Array.from({ length: count + 1 }, (_, i) => {
    const s = smoothLength * i / count;
    while (index < count - 1 && smoothDistances[index + 1] < s) index++;
    const t = clamp((s - smoothDistances[index]) / Math.max(1e-9, smoothDistances[index + 1] - smoothDistances[index]), 0, 1);
    return { ...mix(geometry[index], geometry[index + 1], t), distance: s, desiredSpeed: lerp(filteredSpeeds[index], filteredSpeeds[index + 1], t), curvature: 0 };
  });
  points=annotateRoad(points,track);
  const error = validateGeometry(points, track);
  if (error) return error;
  for (let i = 0; i < count; i++) {
    const a = points[modulo(i - 6, count)], b = points[i], c = points[(i + 6) % count];
    const ab = distance(a, b), bc = distance(b, c), ac = distance(a, c);
    points[i].curvature = 2 * Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) / Math.max(1e-6, ab * bc * ac);
  }
  points[count].curvature = points[0].curvature;
  const seamSpeed = (points[0].desiredSpeed + points[count].desiredSpeed) / 2;
  points[0].desiredSpeed = points[count].desiredSpeed = seamSpeed;
  const support = validateSupports(points, track); if (!support.ok) return support;
  const shortcuts = validateHopShortcuts(points, track); if (!shortcuts.ok) return shortcuts;
  return { ok: true, drawing: { leadIn: trimmed.leadIn, tail: trimmed.tail, joined: connection.joined }, route: { version: COMPILER_VERSION, trackId: track.id, trackVersion: track.version, points, length: smoothLength, drawingDuration: rawDuration, ...(support.jumps.length ? { jumps: support.jumps } : {}), ...(shortcuts.traversals.length ? { hopShortcuts: shortcuts.traversals } : {}), ...(cleaned.removedPoints ? { cleanup: { removedPoints: cleaned.removedPoints, removedSeconds: cleaned.removedSeconds } } : {}) } };
}

export function sampleRoute(route: CompiledRoute, value: number) {
  const s = modulo(value, route.length), index = clamp(Math.floor(s / route.length * (route.points.length - 1)), 0, route.points.length - 2);
  const a = route.points[index], b = route.points[index + 1], t = clamp((s - a.distance) / (b.distance - a.distance || 1), 0, 1);
  return { ...mix(a, b, t), desiredSpeed: lerp(a.desiredSpeed, b.desiredSpeed, t), curvature: lerp(a.curvature, b.curvature, t), heading: Math.atan2(b.x - a.x, b.z - a.z) };
}

/** Used for route fixtures and a clearly labelled optional practice line. */
export function createPracticeSamples(track: TrackDefinition, durationSeconds = 7, jumpBranch: boolean | string = false): DrawSample[] {
  const selected = typeof jumpBranch === 'string' ? track.hopShortcuts?.find(s => s.id === jumpBranch) : jumpBranch ? track.jumps?.[0] : undefined;
  if (selected) {
    const j = selected, a = track.distances.findIndex(d => d >= j.entryProgress), b = track.distances.findIndex(d => d >= j.exitProgress), branchDistances = cumulative(j.branch);
    const branch = Array.from({ length: 78 }, (_, i) => samplePolyline(j.branch, branchDistances, i / 77 * branchDistances.at(-1)!));
    const points = [...track.centerline.slice(0, a), ...branch, ...track.centerline.slice(b)], ds = cumulative(points);
    return annotateRoad(points,track).map((p, i) => ({ ...p, time: ds[i] / ds.at(-1)! * durationSeconds * 1000 }));
  }
  return track.centerline.map((p, i) => ({ ...p, time: track.distances[i] / track.length * durationSeconds * 1000 }));
}
