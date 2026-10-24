import { clamp, cumulative, distance, lerp, mix, projectToPolyline } from './geometry';
import { insideBarrier } from './barriers';
import { annotateRoad, locateRoad, roadHeight, roadSupported } from './elevation';
import type { Point, RaceState, TrackDefinition, TrackJump } from './types';

export const FLIGHT_RULES = Object.freeze({ gravity: 36, hopGravity: 72, rampLaunchBoost: 8, carHeight: 1.05, waterHeight: -2.4 });
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
/** Water is legal only through a complete, forward authored ramp-to-landing traversal. */
export function validateSupports(points: Point[], track: TrackDefinition): { ok: true; jumps: string[] } | { ok: false; point: Point; message: string } {
  if(track.sections){
    const located=annotateRoad(points,track),traversals=new Set<string>();
    for(let i=0;i<located.length;i++){
      const p=located[i],r=locateRoad(p,track);
      if(points[i].sectionId && points[i].sectionId!==p.sectionId && Math.abs((points[i].y??r.height)-r.height)>.75)return {ok:false,point:p,message:'The line switches to a different road level.'};
      if(r.section?.flight){const j=track.jumps!.find(j=>j.kind==='crest')!,c=jumpCoordinates(p,j);if(Math.abs(c.across)>(j.width-track.carWidth)/2-.12 || i&&p.courseProgress!<located[i-1].courseProgress!-.1)return {ok:false,point:p,message:'Keep the crossing straight and leave room for the car.'};traversals.add(j.id);}
      else {
        const a=located[Math.max(0,i-1)],b=located[Math.min(located.length-1,i+1)],heading=Math.atan2(b.x-a.x,b.z-a.z);
        for(const f of [-1,1])for(const side of [-1,1]){
          const probe={...p,x:p.x+Math.sin(heading)*(track.carLength/2-.1)*f+Math.cos(heading)*track.carWidth/2*side,z:p.z+Math.cos(heading)*(track.carLength/2-.1)*f-Math.sin(heading)*track.carWidth/2*side};
          const q=locateRoad(probe,track),edgeFlight=q.section?.flight&&Math.abs(jumpCoordinates(probe,track.jumps![0]).across)<=(track.roadWidth-track.carWidth)/2;
          if(!(q.section&&!q.section.flight&&q.distance<=q.supportWidth/2+1e-6)&&!edgeFlight)return {ok:false,point:p,message:'Leave room for the car on the supported canyon trail.'};
        }
      }
    }
    return {ok:true,jumps:[...traversals]};
  }
  if (!track.supports) return { ok: true, jumps: [] };
  const traversals = new Set<string>();
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], heading = Math.atan2(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(distance(a, b) / 0.4));
    for (let n = 0; n <= steps; n++) {
      const p = mix(a, b, n / steps);
      const corridor = track.jumps?.find(j => {
        const c = jumpCoordinates(p, j);
        return c.along >= -track.carLength && c.along <= j.corridorLength && Math.abs(c.across) <= (j.width - track.carWidth) / 2 - 0.12;
      });
      if (!vehicleSupported(p, heading, track)) {
        if (!corridor || (b.x - a.x) * corridor.forward.x + (b.z - a.z) * corridor.forward.z <= 0) return { ok: false, point: p, message: 'The line crosses unsupported water. Stay on the pier or enter the ramp straight.' };
        traversals.add(corridor.id);
      }
    }
  }
  for (const id of traversals) {
    const j = track.jumps!.find(j => j.id === id)!;
    const entry = points.findIndex((p, i) => i > 0 && jumpCoordinates(points[i - 1], j).along <= 0 && jumpCoordinates(p, j).along > 0 && Math.abs(jumpCoordinates(p, j).across) <= (j.width - track.carWidth) / 2);
    const exit = points.findIndex((p, i) => i > entry && jumpCoordinates(p, j).along >= j.rampLength + j.gap + track.carLength / 2 && Math.abs(jumpCoordinates(p, j).across) <= (j.width - track.carWidth) / 2);
    if (entry < 0 || exit < 0 || points.slice(entry, exit + 1).some((p, i, all) => {
      const c = jumpCoordinates(p, j); return Math.abs(c.across) > (j.width - track.carWidth) / 2 - 0.12 || i > 0 && c.along < jumpCoordinates(all[i - 1], j).along - 0.01;
    })) return { ok: false, point: j.from, message: 'Enter the ramp straight and leave room for the car on the landing deck.' };
  }
  return { ok: true, jumps: [...traversals] };
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
