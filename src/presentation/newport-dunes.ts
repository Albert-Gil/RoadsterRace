import {CompositionShapes} from './composition-shapes';
import {hex,mix} from './landscape/mesh';
import {newportDuneAppearance as art} from './themes';

/**
 * A low vegetated dune hummock under Newport's windswept beach trees (presentation only; the
 * trees stand outside the driving corridor as before). It replaces a dark low-poly sphere: the
 * rim meets the sand in a sand colour, then dune grass and ice plant thicken toward the crown.
 */
export function duneHummock(g:CompositionShapes,x:number,z:number,rx:number,rz:number,seed:number){
 const rings=art.rings,segments=art.segments,sand=hex(art.sand),dry=hex(art.dry),grass=hex(art.grass),lush=hex(art.lush),bloom=hex(art.bloom),rows:number[][]=[[]];
 const height=art.height*(rx+rz)/2;
 for(let r=1;r<=rings;r++){
  const t=r/rings,row:number[]=[];
  for(let i=0;i<segments;i++){
   const a=i/segments*Math.PI*2,wobble=1+art.wobble*Math.sin(3*a+seed)+art.wobble*.6*Math.cos(5*a+seed*1.7),rad=t*wobble;
   const px=x+Math.cos(a)*rx*rad,pz=z+Math.sin(a)*rz*rad,profile=Math.max(0,1-rad*rad)**1.6;
   const noise=.5+.5*Math.sin(px*1.9+seed)*Math.cos(pz*1.6-seed),cover=Math.min(1,Math.max(0,(1-t)*1.6-.15+noise*.35));
   let c=mix(sand,dry,Math.min(1,cover*2));c=mix(c,noise>.55?lush:grass,Math.max(0,cover*1.3-.3));
   if(noise>.9&&t<.6)c=mix(c,bloom,.22);
   row.push(g.vertex(px,art.base+height*profile,pz,c));
  }
  rows.push(row);
 }
 // Fan at the crown, then quads outward; wound so normals face up.
 const top=g.vertex(x,art.base+height,z,mix(grass,lush,.5));
 for(let i=0;i<segments;i++){const j=(i+1)%segments;g.triangle(top,rows[1][i],rows[1][j]);}
 for(let r=1;r<rings;r++)for(let i=0;i<segments;i++){const j=(i+1)%segments;g.triangle(rows[r][i],rows[r+1][j],rows[r][j]);g.triangle(rows[r][i],rows[r+1][i],rows[r+1][j]);}
}
