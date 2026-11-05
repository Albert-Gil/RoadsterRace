import type { TrackJump } from '../core/types';
import { jumpPoint } from '../core/support';
import { Geometry, hex, type Rgb } from './landscape/mesh';
import { urbanRampAppearance as art } from './themes';

/** A paved flood-channel maintenance approach, not a freestanding stunt ramp.
 * The top follows the unchanged authoritative 8 m / 1.2 m launch surface exactly.
 * All raised detail stays within its supported wedge; no rails or new obstacles.
 */
export function urbanRampGeometry(jump:TrackJump) {
 const g=new Geometry(), concrete=hex(art.concrete),edge=hex(art.edge),paving=hex(art.paving);
 const point=(d:number,s:number,y:number)=>{const p=jumpPoint(jump,d,s);return[p.x,y,p.z];};
 const quad=(points:number[][],color:Rgb)=>{const ids=points.map(p=>g.vertex(p[0],p[1],p[2],color));g.triangle(ids[0],ids[1],ids[2]);g.triangle(ids[0],ids[2],ids[3]);};
 const h=(d:number)=>art.surfaceOffset+jump.lipHeight*d/jump.rampLength,half=jump.width/2;
 // Broad supported pavement, divided into ordinary concrete pours with flush seams.
 for(let d=0;d<jump.rampLength;d+=1){const end=Math.min(jump.rampLength,d+1);
  for(let s=-half;s<half;s+=2){const side=Math.min(half,s+2);
   quad([point(d,side,h(d)),point(end,side,h(end)),point(end,s,h(end)),point(d,s,h(d))],paving);
  }
  for(const side of[-1,1])quad([point(d,side*half,0),point(end,side*half,0),point(end,side*half,h(end)),point(d,side*half,h(d))],edge);
 }
 // The exposed leading edge is a real concrete causeway footing above the channel.
 quad([point(jump.rampLength,-half,0),point(jump.rampLength,half,0),point(jump.rampLength,half,h(jump.rampLength)),point(jump.rampLength,-half,h(jump.rampLength))],concrete);
 // Small drainage slots and mineral streaks baked into the existing batch.
 for(const side of[-1,1])for(let d=.5;d<jump.rampLength-.3;d+=.55){const s=side*(half-.28),w=.11;
  quad([point(d,s-w,h(d)+.008),point(d+.16,s-w,h(d+.16)+.008),point(d+.16,s+w,h(d+.16)+.008),point(d,s+w,h(d)+.008)],hex(art.drain));
 }
 return g;
}
