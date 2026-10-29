import type { TrackBarrier } from '../core/types';
import { rayToEdge } from './landscape/mesh';

/** Shared cliff skin for rock geometry and attached streams; contained by the solid footprint. */
export function yosemiteGranitePoint(b: TrackBarrier, t: number, angle: number) {
  const center = { x: b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length, z: b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length };
  const cap = t < .70 ? 1 - .12 * Math.pow(t / .70, .75) : .88 * Math.sqrt(Math.max(0, 1 - ((t-.70)/.30)**2));
  const joints = Math.pow(.5 + .5*Math.sin(angle*13 + .22*Math.sin(t*6)), 12);
  const grain = .5 + .5*Math.sin(angle*37 + t*31);
  const erosion = Math.sin(Math.PI*t) * Math.max(0,1-t/.8) * (.012 + joints*.035 + grain*.008);
  const edge = rayToEdge(center,angle,b.footprint);
  // Smooth the crown towards an inscribed dome, avoiding radial folds at the pole.
  const minRadius = Math.min(...b.footprint.map(p=>Math.hypot(p.x-center.x,p.z-center.z))) * .8;
  const blend = Math.max(0,Math.min(1,(t-.45)/.5));
  const r = (edge+(minRadius-edge)*blend*blend*(3-2*blend)) * Math.max(0, cap*(1-erosion));
  return { x:center.x+Math.cos(angle)*r, y:(b.baseHeight??0)+b.height*t, z:center.z+Math.sin(angle)*r };
}
