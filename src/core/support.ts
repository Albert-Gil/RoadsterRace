import { clamp, cumulative, distance, lerp, mix, projectToPolyline } from './geometry';
import { insideBarrier } from './barriers';
import { annotateRoad, locateRoad, roadHeight, roadSupported, sectionAt,terrainElevation } from './elevation';
import type { Point, RaceState, TrackDefinition, TrackJump } from './types';
import { VEHICLE_DIMENSIONS } from './vehicle-size';

export const FLIGHT_RULES = Object.freeze({ gravity: 36, hopGravity: 72, rampLaunchBoost: 8, carHeight: VEHICLE_DIMENSIONS.height, waterHeight: -2.4 });
/** A manual hop keeps its gravity even when crossing an automatic ramp lip. */
export const flightGravity = (origin: RaceState['flightOrigin']) => origin === 'hop' ? FLIGHT_RULES.hopGravity : FLIGHT_RULES.gravity;
const footprintBounds = new WeakMap<Point[], { x0: number; x1: number; z0: number; z1: number }>();
export const inFootprint = (p: Point, footprint: Point[]) => {
  let bounds = footprintBounds.get(footprint);
  if (!bounds) { bounds = { x0: Math.min(...footprint.map(p => p.x)), x1: Math.max(...footprint.map(p => p.x)), z0: Math.min(...footprint.map(p => p.z)), z1: Math.max(...footprint.map(p => p.z)) }; footprintBounds.set(footprint, bounds); }
  return p.x >= bounds.x0 && p.x <= bounds.x1 && p.z >= bounds.z0 && p.z <= bounds.z1 && insideBarrier(p, { id: '', height: 0, footprint });
};
export function jumpCoordinates(p: Point, jump: TrackJump) {
  const dx = p.x - jump.from.x, dz = p.z - jump.from.z;
  return { along: dx * jump.forward.x + dz * jump.forward.z, across: dx * jump.forward.z - dz * jump.forward.x };
}
export function jumpPoint(jump: TrackJump, along: number, across = 0): Point {
  return { x: jump.from.x + jump.forward.x * along + jump.forward.z * across, z: jump.from.z + jump.forward.z * along - jump.forward.x * across };
}
export function rampAt(p: Point, track: TrackDefinition) {
  return track.jumps?.find(j => { const c = jumpCoordinates(p, j); return j.kind!=='crest' && c.along >= 0 && c.along <= j.rampLength && Math.abs(c.across) <= j.width / 2; });
}
export function groundHeight(p: Point, track: TrackDefinition) {
  if(track.terrain)return terrainElevation(p,track);
  if(track.sections)return roadHeight(track,locateRoad(p,track).progress);
  const ramp = rampAt(p, track);
  return ramp ? clamp(jumpCoordinates(p, ramp).along / ramp.rampLength, 0, 1) * ramp.lipHeight : 0;
}
export function supported(p: Point, track: TrackDefinition) {
  if(track.sections)return roadSupported(p,track);
  if (!track.supports) return true;
  return !track.waterOpenings?.some(s => inFootprint(p, s.footprint)) && track.supports.some(s => inFootprint(p, s.footprint));
}
/** Four footprint probes prevent a sideways car hanging safely over a deck edge. */
export function vehicleSupported(p: Point, heading: number, track: TrackDefinition) {
  if(track.sections){const half=track.carLength/2-.15,side=track.carWidth/2-.1;return [-1,1].every(f=>[-1,1].every(s=>supported({...p,x:p.x+Math.sin(heading)*half*f+Math.cos(heading)*side*s,z:p.z+Math.cos(heading)*half*f-Math.sin(heading)*side*s},track)));}
  if (!track.supports) return true;
  const half = track.carLength / 2 - 0.15, side = track.carWidth / 2 - 0.1;
  return [-1, 1].every(f => [-1, 1].every(s => supported({ x: p.x + Math.sin(heading) * half * f + Math.cos(heading) * side * s, z: p.z + Math.cos(heading) * half * f - Math.sin(heading) * side * s }, track)));
}
/** Forward takeoff is interpolated inside the substep, including sparse/high-speed movement. */
export function takeoffCrossing(a: Point, b: Point, track: TrackDefinition) {
  for (const jump of track.jumps ?? []) {
    if(jump.kind==='crest'&&Math.abs((a.courseProgress??0)-jump.entryProgress)>track.roadWidth+70)continue;
    const aa = jumpCoordinates(a, jump), bb = jumpCoordinates(b, jump);
    if (aa.along <= jump.rampLength && bb.along > jump.rampLength && bb.along > aa.along) {
      const t = (jump.rampLength - aa.along) / (bb.along - aa.along), across = lerp(aa.across, bb.across, t);
      if (Math.abs(across) <= (jump.width - track.carWidth) / 2) return { jump, t };
    }
  }
  return null;
}
/** Authored ski crests launch only forward, on the same supported main road. */
export function terrainTakeoffCrossing(a:Point,b:Point,track:TrackDefinition){
  for(const launch of track.terrainTakeoffs??[]){
    if(Math.abs((a.courseProgress??launch.progress)-launch.progress)>30)continue;
    const coords=(p:Point)=>{const x=p.x-launch.center.x,z=p.z-launch.center.z;return{along:x*launch.forward.x+z*launch.forward.z,across:x*launch.forward.z-z*launch.forward.x};};
    const aa=coords(a),bb=coords(b);
    if(aa.along<=0&&bb.along>0){const t=-aa.along/(bb.along-aa.along),across=lerp(aa.across,bb.across,t);if(Math.abs(across)<=(launch.width-track.carWidth)/2)return{launch,t,point:mix(a,b,t)};}
  }
  return null;
}
/** Heading along a point list at index i, from its neighbours. */
const headingAt = (points: Point[], i: number) => { const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]; return Math.atan2(b.x - a.x, b.z - a.z); };

/** A forward pass from the ramp entry to beyond the landing, inside the corridor at both ends. */
function rampTraversal(points: Point[], jump: TrackJump, track: TrackDefinition) {
  const half = (jump.width - track.carWidth) / 2, c = points.map(p => jumpCoordinates(p, jump));
  const entry = c.findIndex((p, i) => i > 0 && c[i - 1].along <= 0 && p.along > 0 && Math.abs(p.across) <= half);
  if (entry < 0) return false;
  const exit = c.findIndex((p, i) => i > entry && p.along >= jump.rampLength + jump.gap + track.carLength / 2 && Math.abs(p.across) <= half);
  return exit > 0 && c.slice(entry, exit + 1).every((p, i, all) => i === 0 || p.along >= all[i - 1].along - 0.5);
}
/** The natural crest: enter and leave the flight section inside its corridor, moving forward. */
function crestTraversal(located: Point[], track: TrackDefinition) {
  const jump = track.jumps?.find(j => j.kind === 'crest'); if (!jump) return false;
  const half = (jump.width - track.carWidth) / 2, flight = located.map(p => !!sectionAt(track, p.courseProgress ?? 0)?.flight);
  const first = flight.indexOf(true), last = flight.lastIndexOf(true);
  if (first < 0) return false;
  const inside = (p: Point) => Math.abs(jumpCoordinates(p, jump).across) <= half;
  return inside(located[first]) && inside(located[last]) && located.slice(first, last + 1).every((p, i, all) => i === 0 || p.courseProgress! >= all[i - 1].courseProgress! - 0.5);
}

/**
 * Where the drawn line leaves physical support. Nothing here rejects a line: unsupported
 * points become hazards (the car falls and is reset past them). Authored jumps the line
 * takes forward inside their corridor are approved and excused over their gap.
 */
export function assessSupports(points: Point[], track: TrackDefinition): { jumps: string[]; unsupported: boolean[] } {
  if (track.sections) {
    const located = annotateRoad(points, track), crest = crestTraversal(located, track), jump = track.jumps?.find(j => j.kind === 'crest');
    const unsupported = located.map((p, i) => {
      const r = locateRoad(p, track);
      if (points[i].sectionId && points[i].sectionId !== p.sectionId && Math.abs((points[i].y ?? r.height) - r.height) > .75) return true;
      if (r.section?.flight) return !crest;
      const heading = headingAt(located, i);
      for (const f of [-1, 1]) for (const side of [-1, 1]) {
        const probe = { ...p, x: p.x + Math.sin(heading) * (track.carLength / 2 - .1) * f + Math.cos(heading) * track.carWidth / 2 * side, z: p.z + Math.cos(heading) * (track.carLength / 2 - .1) * f - Math.sin(heading) * track.carWidth / 2 * side };
        const q = locateRoad(probe, track), edgeFlight = q.section?.flight && jump && Math.abs(jumpCoordinates(probe, jump).across) <= (track.roadWidth - track.carWidth) / 2;
        if (!(q.section && !q.section.flight && q.distance <= q.supportWidth / 2 + 1e-6) && !edgeFlight) return true;
      }
      return false;
    });
    return { jumps: crest && jump ? [jump.id] : [], unsupported };
  }
  if (!track.supports) return { jumps: [], unsupported: points.map(() => false) };
  const approved = (track.jumps ?? []).filter(j => rampTraversal(points, j, track));
  const unsupported = points.map((p, i) => {
    if (vehicleSupported(p, headingAt(points, i), track)) return false;
    return !approved.some(j => { const c = jumpCoordinates(p, j); return c.along >= -track.carLength && c.along <= j.corridorLength && Math.abs(c.across) <= (j.width - track.carWidth) / 2; });
  });
  return { jumps: approved.map(j => j.id), unsupported };
}

/** Both branches share the same entry/exit distance for checkpoints and standings. */
export function branchProjection(p: Point, track: TrackDefinition) {
  let best: (ReturnType<typeof projectToPolyline> & { manualHop: boolean }) | undefined;
  for (const j of [...(track.jumps ?? []), ...(track.hopShortcuts ?? [])]) {
    const ds = cumulative(j.branch), projection = projectToPolyline(p, j.branch, ds);
    const along = projection.progress / ds.at(-1)!;
    const candidate = { ...projection, progress: lerp(j.entryProgress, j.exitProgress, along), manualHop: 'obstacleId' in j };
    if (!best || candidate.distance < best.distance) best = candidate;
  }
  return best;
}
