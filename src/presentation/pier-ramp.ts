import type { TrackJump } from '../core/types';
import { jumpPoint } from '../core/support';
import { Geometry, hex, mix, type Rgb } from './landscape/mesh';
import { pierRampAppearance as art } from './themes';
import {CompositionShapes} from './composition-shapes';

/** A weathered, lifted timber pier end. The driving top follows the exact
 * authored linear ramp; carpentry stays beneath it and never bridges the gap.
 * Vertex colours are multipliers of the existing timber material, so this joins
 * its static batch and reuses the wood map, light and cached shadow draw.
 */
export function pierRampGeometry(jump: TrackJump) {
  const g=new Geometry(), slope=jump.lipHeight/jump.rampLength;
  const point=(along:number,across:number,y:number)=>{const p=jumpPoint(jump,along,across);return[p.x,y,p.z];};
  const quad=(ps:number[][],c:Rgb)=>{const v=ps.map(p=>g.vertex(p[0],p[1],p[2],c));g.triangle(v[0],v[1],v[2]);g.triangle(v[0],v[2],v[3]);};
  const timber=(a:number,b:number,l:number,r:number,thick:number,color:Rgb,offset=art.surfaceOffset)=>{
    const y=(s:number)=>s*slope+offset;
    quad([point(a,l,y(a)),point(a,r,y(a)),point(b,r,y(b)),point(b,l,y(b))],color);
    const dark=mix(color,hex(art.shade),.35);
    quad([point(a,l,y(a)-thick),point(a,l,y(a)),point(a,r,y(a)),point(a,r,y(a)-thick)],dark);
    quad([point(b,l,y(b)),point(b,l,y(b)-thick),point(b,r,y(b)-thick),point(b,r,y(b))],dark);
    quad([point(a,l,y(a)),point(a,l,y(a)-thick),point(b,l,y(b)-thick),point(b,l,y(b))],dark);
    quad([point(a,r,y(a)-thick),point(a,r,y(a)),point(b,r,y(b)),point(b,r,y(b)-thick)],dark);
  };
  const rows=Math.ceil(jump.rampLength/art.plankLength),columns=4;
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const a=row/rows*jump.rampLength+.008,b=(row+1)/rows*jump.rampLength-.008;
    const l=-jump.width/2+col/columns*jump.width+.008,r=-jump.width/2+(col+1)/columns*jump.width-.008;
    const color=hex(art.boards[(row*7+col*3)%art.boards.length]);
    timber(a,b,l,r,.17,color);
    // Short offset grain checks remain neutral wood wear, not takeoff markings.
    if((row+col)%3===0){const c=l+(r-l)*.31,low=a+.06,high=b-.06;quad([point(low,c,low*slope+art.surfaceOffset+.002),point(low,c+.025,low*slope+art.surfaceOffset+.002),point(high,c+.025,high*slope+art.surfaceOffset+.002),point(high,c,high*slope+art.surfaceOffset+.002)],mix(color,hex(art.shade),.18));}
  }
  for(const side of [-1,1])for(let layer=0;layer<3;layer++)timber(0,jump.rampLength,side<0?-jump.width/2:-.16+jump.width/2,side<0?.16-jump.width/2:jump.width/2,.16,hex(art.fascia),art.surfaceOffset-.18-layer*.16);
  for(const across of [-.39,-.13,.13,.39])timber(0,jump.rampLength,across*jump.width-.13,across*jump.width+.13,.40,hex(art.joist),art.surfaceOffset-.22);
  timber(jump.rampLength-.30,jump.rampLength,-jump.width/2,jump.width/2,.28,hex(art.fascia),art.surfaceOffset-.02);
  // Exposed end-grain and bolt heads below the lip give scale without a sign.
  for(let across=-jump.width/2+.6;across<jump.width/2;across+=1.9){
    const at=jump.rampLength+.003,y=jump.lipHeight+art.surfaceOffset-.17;
    quad([point(at,across-.035,y-.035),point(at,across+.035,y-.035),point(at,across+.035,y+.035),point(at,across-.035,y+.035)],hex(art.hardware));
  }
  return g;
}

/** The receiving end is the same timber construction as the takeoff, not a
 * painted concrete pad. All carpentry is on/under supported landing deck. */
export function pierLandingGeometry(jump:TrackJump){
 const g=new CompositionShapes(),start=jump.rampLength+jump.gap,length=Math.min(24,jump.runout),rows=18;
 for(let row=0;row<rows;row++)for(let col=0;col<4;col++){
  const a=start+row/rows*length,b=start+(row+1)/rows*length,l=-jump.width/2+col*jump.width/4,r=l+jump.width/4;
  g.box((a+b)/2,art.surfaceOffset-.095,(l+r)/2,b-a-.022,.19,r-l-.022,art.boards[(row*7+col*3)%art.boards.length]);
 }
 for(const side of[-1,1])g.box(start+length/2,-.16,side*(jump.width/2-.12),length,.46,.24,art.fascia);
 for(const across of[-.39,-.13,.13,.39])g.box(start+length/2,-.36,across*jump.width,length,.55,.28,art.joist);
 g.box(start+.11,-1.13,0,.22,2.48,jump.width,art.fascia);
 for(let across=-jump.width/2+.25;across<jump.width/2;across+=1.3)g.box(start+.24,-1.1,across,.19,2.4,.13,art.joist);
 for(const along of[start+2,start+10,start+20])for(const side of[-1,1])g.beam([along,-2.3,side*(jump.width/2-.9)],[along+2.8,-.2,side*(jump.width/2-.9)],.16,art.joist);
 for(let i=0;i<g.positions.length;i+=3){const p=jumpPoint(jump,g.positions[i],g.positions[i+2]);g.positions[i]=p.x;g.positions[i+2]=p.z;}
 // (along,across) uses a reflected horizontal basis. Restore outward winding
 // before normals/shadow shaders are generated for the shared timber batch.
 for(let i=0;i<g.indices.length;i+=3)[g.indices[i+1],g.indices[i+2]]=[g.indices[i+2],g.indices[i+1]];
 return g;
}
