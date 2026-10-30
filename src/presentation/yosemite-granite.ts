import type { TrackBarrier } from '../core/types';
import { rayToEdge } from './landscape/mesh';
import { waterfallCliffRadius } from './yosemite-waterfall-shape';
import { smoothstep } from './landscape/noise';

export type YosemiteRockStyle = 'wall' | 'dome' | 'spire' | 'talus';
export function yosemiteRockStyle(b: TrackBarrier): YosemiteRockStyle {
  if (b.id.includes('talus') || b.height < 14) return 'talus';
  if (b.id.includes('spire') || b.id.includes('brothers') || b.id.includes('column')) return 'spire';
  if (b.id.includes('dome') || b.id.includes('rest') || b.id.includes('erratic')) return 'dome';
  return 'wall';
}

/** Shared cliff skin for rock geometry and attached streams; contained by the solid footprint. */
export function yosemiteGranitePoint(b: TrackBarrier, t: number, angle: number) {
  const center = { x: b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length, z: b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length };
  const style = yosemiteRockStyle(b);
  let cap = style === 'dome' ? Math.sqrt(Math.max(0, 1-t*t)) * (1-.08*Math.sin(Math.PI*t))
    : style === 'spire' ? (1-.40*smoothstep(0,.65,t))*Math.sqrt(Math.max(0,1-smoothstep(.62,1,t)))
    : t < .70 ? 1 - .12 * Math.pow(t / .70, .75) : .88 * Math.sqrt(Math.max(0, 1 - ((t-.70)/.30)**2));
  if(style==='wall'&&b.id.startsWith('valley-')){
    // A short talus foot narrows into the glacial face; the individual fallen
    // blocks remain visible above it instead of being buried inside the wall.
    cap=t<.08?1-.16*smoothstep(0,.08,t):t<.70?.84-.015*smoothstep(.08,.70,t):.825*Math.sqrt(Math.max(0,1-((t-.70)/.30)**2));
  }
  const joints = Math.pow(.5 + .5*Math.sin(angle*13 + .22*Math.sin(t*6)), 12);
  const grain = .5 + .5*Math.sin(angle*37 + t*31);
  const erosion = Math.sin(Math.PI*t) * Math.max(0,1-t/.8) * (.012 + joints*.035 + grain*.008);
  const edge = rayToEdge(center,angle,b.footprint);
  // Smooth the crown towards an inscribed dome, avoiding radial folds at the pole.
  const minRadius = Math.min(...b.footprint.map(p=>Math.hypot(p.x-center.x,p.z-center.z))) * .8;
  const blend = smoothstep(style === 'wall' ? .85 : .45, 1, t);
  const original = (edge+(minRadius-edge)*blend*blend*(3-2*blend)) / edge * Math.max(0, cap*(1-erosion));
  // One smooth, sheared face gives the dome its recognizable glacial section.
  const cut = b.id==='half-dome-granite' ? 1-smoothstep(.10,.48,t)*smoothstep(.05,.5,Math.cos(angle+2.2))*.53 : 1;
  const r = edge * waterfallCliffRadius(b,t,angle,original*cut);
  return { x:center.x+Math.cos(angle)*r, y:(b.baseHeight??0)+b.height*t, z:center.z+Math.sin(angle)*r };
}
