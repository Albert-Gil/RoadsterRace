import { distance, modulo } from './geometry';
import type { Point } from './types';

/** Circular corner transitions and exact straights, without spline overshoot. */
export function roundedCircuit(controls: Point[], radius = 12, closed = true): Point[] {
  controls = controls.filter((p,i,a) => i===0 || (!closed && i===a.length-1) || Math.abs((p.x-a[i-1].x)*(a[(i+1)%a.length].z-p.z)-(p.z-a[i-1].z)*(a[(i+1)%a.length].x-p.x))>1e-6);
  const result: Point[] = [];
  for (let i = 0; i < controls.length; i++) {
    if (!closed && (i===0 || i===controls.length-1)) { result.push({...controls[i]}); continue; }
    const a = controls[modulo(i - 1, controls.length)], p = controls[i], b = controls[(i + 1) % controls.length];
    const da = distance(a,p), db = distance(p,b), ux = (p.x-a.x)/da, uz = (p.z-a.z)/da, vx = (b.x-p.x)/db, vz = (b.z-p.z)/db;
    const turn = Math.atan2(ux*vz-uz*vx, ux*vx+uz*vz), half = Math.tan(Math.abs(turn)/2);
    if (half < 1e-5) { result.push({...p}); continue; }
    const tangent = Math.min(radius*half, da*0.49, db*0.49), r = tangent/half, side = Math.sign(turn);
    const entry = { x:p.x-ux*tangent, z:p.z-uz*tangent }, center = { x:entry.x-uz*r*side, z:entry.z+ux*r*side };
    const start = Math.atan2(entry.z-center.z,entry.x-center.x), steps = Math.max(4,Math.ceil(r*Math.abs(turn)/1.2));
    for(let n=0;n<=steps;n++){ const angle=start+turn*n/steps; result.push({x:center.x+Math.cos(angle)*r,z:center.z+Math.sin(angle)*r}); }
  }
  // Densify exact straights as well, keeping course association local.
  const dense: Point[] = [];
  for(let i=0;i<result.length-(closed?0:1);i++){ const a=result[i], b=result[(i+1)%result.length], n=Math.max(1,Math.ceil(distance(a,b)/1.2)); for(let j=0;j<n;j++)dense.push({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n}); }
  return [...dense,{...(closed?dense[0]:result.at(-1)!)}];
}

/** Shared bounded offset used by asphalt, markings, supports and camera fitting. */
export function roadEdges(path: readonly Point[], width: number, closed = true): [Point[], Point[]] {
  const count = closed ? path.length - 1 : path.length;
  const edges = [-1, 1].map(side => path.map((p, index) => {
    const i = closed ? index % count : index;
    if(!closed&&(i===0||i===count-1)){
      const a=path[i===0?0:i-1],b=path[i===0?1:i],d=distance(a,b)||1;
      return {x:p.x-(b.z-a.z)/d*width/2*side,z:p.z+(b.x-a.x)/d*width/2*side};
    }
    const a = path[closed ? modulo(i - 1, count) : Math.max(0, i - 1)];
    const b = path[closed ? (i + 1) % count : Math.min(count - 1, i + 1)];
    const da = distance(a, p) || 1, db = distance(p, b) || 1;
    let nx = -(p.z - a.z) / da - (b.z - p.z) / db;
    let nz = (p.x - a.x) / da + (b.x - p.x) / db;
    const length = Math.hypot(nx, nz) || 1; nx /= length; nz /= length;
    const dot = Math.abs(nx * -(b.z - p.z) / db + nz * (b.x - p.x) / db);
    const r = width / 2 * side / Math.max(0.8, dot);
    return { x: p.x + nx * r, z: p.z + nz * r };
  }));
  return edges as [Point[], Point[]];
}

export function minimumRadius(path: readonly Point[]) {
  let radius = Infinity;
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1], b = path[i], c = path[i + 1];
    const cross = Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x));
    if (cross > 1e-8) radius = Math.min(radius, distance(a,b)*distance(b,c)*distance(a,c)/(2*cross));
  }
  return radius;
}
