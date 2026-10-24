import { clamp, cumulative, distance, lerp, modulo } from './geometry';
import type { HopShortcut, Point, RoadSection, TrackDefinition } from './types';
const branchCache=new WeakMap<HopShortcut,number[]>();
function branchDistances(h:HopShortcut){let ds=branchCache.get(h);if(!ds){ds=cumulative(h.branch);branchCache.set(h,ds);}return ds;}
type Segment={a:Point;b:Point;from:number;to:number;branchId?:string};
const segmentCache=new WeakMap<TrackDefinition,{all:Segment[];bins:Map<number,Segment[]>}>();
function segments(track:TrackDefinition){
 let result=segmentCache.get(track);if(result)return result;
 const all:Segment[]=[],bins=new Map<number,Segment[]>();
 for(let i=1;i<track.centerline.length;i++)all.push({a:track.centerline[i-1],b:track.centerline[i],from:track.distances[i-1],to:track.distances[i]});
 for(const h of track.hopShortcuts??[]){const ds=branchDistances(h),n=ds.at(-1)!;for(let i=1;i<h.branch.length;i++)all.push({a:h.branch[i-1],b:h.branch[i],from:lerp(h.entryProgress,h.exitProgress,ds[i-1]/n),to:lerp(h.entryProgress,h.exitProgress,ds[i]/n),branchId:h.id});}
 for(const segment of all)for(let i=Math.floor(segment.from/16);i<=Math.floor(segment.to/16);i++){const bin=bins.get(i)??[];bin.push(segment);bins.set(i,bin);}
 result={all,bins};segmentCache.set(track,result);return result;
}

export function sectionAt(track: TrackDefinition, progress: number): RoadSection | undefined {
  const p = modulo(progress, track.length);
  return track.sections?.find(s => p >= s.from - 1e-6 && p < s.to - 1e-6) ?? track.sections?.[0];
}
export function roadHeight(track: TrackDefinition, progress: number) {
  const section = sectionAt(track, progress); if (!section) return 0;
  const p = clamp(modulo(progress, track.length) - section.from, 0, section.to - section.from), h = section.heights;
  for (let i = 1; i < h.length; i++) if (p <= h[i][0]) return lerp(h[i-1][1], h[i][1], clamp((p-h[i-1][0])/(h[i][0]-h[i-1][0] || 1),0,1));
  return h.at(-1)![1];
}
export function roadGrade(track: TrackDefinition, progress: number) { return (roadHeight(track, progress + .15) - roadHeight(track, progress - .15)) / .3; }

/** Ordered association, including both visits to an x/z crossing. Never selects by height alone. */
export function locateRoad(p: Point, track: TrackDefinition, previous?: number, window = 12) {
  const hint = previous ?? p.courseProgress;
  let best: {distance:number;progress:number;score:number;point:Point;branchId?:string} = { distance: Infinity, progress: 0, score: Infinity, point: track.centerline[0] };
  const consider = (a: Point, b: Point, from: number, to: number, branchId?:string) => {
    if(hint!==undefined){const middle=(from+to)/2,near=middle+Math.round((hint-middle)/track.length)*track.length;if(Math.abs(near-hint)>window+track.roadWidth*2+(to-from)/2)return;}
    const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
    const point={x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t)}, gap=distance(p,point);
    let progress=lerp(from,to,t); if(hint!==undefined) progress+=Math.round((hint-progress)/track.length)*track.length;
    const delta=hint===undefined?0:Math.abs(progress-hint);
    const score=gap+Math.max(0,delta-window)*2;
    if(score<best.score)best={distance:gap,progress,score,point,branchId};
  };
  const cached=segments(track);
  if(hint===undefined){for(const s of cached.all)consider(s.a,s.b,s.from,s.to,s.branchId);}
  else {const near=modulo(hint,track.length),span=window+track.roadWidth*2;for(const shift of [-track.length,0,track.length])for(let i=Math.floor((near-span+shift)/16);i<=Math.floor((near+span+shift)/16);i++)for(const s of cached.bins.get(i)??[])consider(s.a,s.b,s.from,s.to,s.branchId);}
  const section=sectionAt(track,best.progress);
  const branch=track.hopShortcuts?.find(h=>h.id===best.branchId);
  return {...best,section,height:roadHeight(track,best.progress),supportWidth:branch?branch.width+2:section?.supportWidth??0};
}
export function roadPoint(p: Point, track: TrackDefinition, previous?: number): Point {
  if(!track.sections)return p;
  const location=locateRoad(p,track,previous);
  return {...p,y:location.height,sectionId:location.section!.id,courseProgress:location.progress};
}
export function annotateRoad<T extends Point>(points: T[], track: TrackDefinition): T[] {
  if(!track.sections)return points;
  let progress=points[0]?.courseProgress ?? 0;
  return points.map((p,i)=>{const r=locateRoad(p,track,progress,i?Math.max(12,distance(p,points[i-1])*1.75+2):12);progress=r.progress;return {...p,y:r.height,sectionId:r.section!.id,courseProgress:progress};});
}
export function roadSupported(p: Point, track: TrackDefinition) {
  const r=locateRoad(p,track);
  return !!r.section && !r.section.flight && r.distance <= r.supportWidth/2 + 1e-6;
}
/** Highest physical trail beneath the car; excludes the invisible flight planning surface. */
export function supportBelow(p:Point,elevation:number,track:TrackDefinition){
 let height:number|undefined;
 for(let i=1;i<track.centerline.length;i++){
  const a=track.centerline[i-1],b=track.centerline[i],dx=b.x-a.x,dz=b.z-a.z,raw=((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1);if(raw<0||raw>1)continue;
  const t=clamp(raw,0,1),progress=lerp(track.distances[i-1],track.distances[i],t),s=sectionAt(track,progress);
  if(!s||s.flight||Math.hypot(p.x-lerp(a.x,b.x,t),p.z-lerp(a.z,b.z,t))>s.supportWidth/2)continue;
  const y=roadHeight(track,progress);if(y<=elevation+.05&&(height===undefined||y>height))height=y;
 }
 if(roadSupported(p,track)){const y=locateRoad(p,track).height;if(y<=elevation+.05&&(height===undefined||y>height))height=y;}
 return height;
}

/** Inverse projection onto the next connected road/flight guide, including the lower visit. */
export function drawingRay(ray:{origin:{x:number;y:number;z:number};direction:{x:number;y:number;z:number}},track:TrackDefinition,previous?:Point):Point|null{
 const hint=previous?.courseProgress??0;let best:{score:number;point:Point}|undefined;
 const candidate=(a:Point,b:Point,from:number,to:number)=>{
  let middle=(from+to)/2;middle+=Math.round((hint-middle)/track.length)*track.length;if(Math.abs(middle-hint)>64)return;
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,ha=roadHeight(track,from),hb=roadHeight(track,to),grade=(hb-ha)/len;
  const nx=-grade*dx/len,nz=-grade*dz/len,den=nx*ray.direction.x+ray.direction.y+nz*ray.direction.z;if(Math.abs(den)<1e-8)return;
  const hit=(nx*(a.x-ray.origin.x)+ha-ray.origin.y+nz*(a.z-ray.origin.z))/den;if(hit<0)return;
  const p={x:ray.origin.x+ray.direction.x*hit,z:ray.origin.z+ray.direction.z*hit};
  const t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(len*len),0,1),gap=Math.hypot(p.x-lerp(a.x,b.x,t),p.z-lerp(a.z,b.z,t));
  let progress=lerp(from,to,t);progress+=Math.round((hint-progress)/track.length)*track.length;
  const budget=previous?distance(p,previous)*1.75+2:16,score=gap+Math.max(0,Math.abs(progress-hint)-budget)*.8;
  if(!best||score<best.score)best={score,point:{...p,y:roadHeight(track,progress),courseProgress:progress,sectionId:sectionAt(track,progress)!.id}};
 };
 for(let i=1;i<track.centerline.length;i++)candidate(track.centerline[i-1],track.centerline[i],track.distances[i-1],track.distances[i]);
 for(const h of track.hopShortcuts??[]){const ds=cumulative(h.branch),n=ds.at(-1)!;for(let i=1;i<h.branch.length;i++)candidate(h.branch[i-1],h.branch[i],lerp(h.entryProgress,h.exitProgress,ds[i-1]/n),lerp(h.entryProgress,h.exitProgress,ds[i]/n));}
 return best?.point??null;
}
