import {Geometry,hex,mix,type Rgb} from './landscape/mesh';

/** Native, flat-shaded forms. Every surface shares the venue's existing batches. */
export class CompositionShapes extends Geometry {
 quad(points:number[][],color:string|Rgb){const c=typeof color==='string'?hex(color):color,ids=points.map(p=>this.vertex(p[0],p[1],p[2],c));this.triangle(ids[0],ids[1],ids[2]);this.triangle(ids[0],ids[2],ids[3]);}
 panelZ(x:number,y:number,z:number,w:number,h:number,color:string|Rgb,side:number){const p=[[x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z]];this.quad(side<0?p:p.reverse(),color);}
 panelX(x:number,y:number,z:number,w:number,h:number,color:string|Rgb,side:number){const p=[[x,y-h/2,z+w/2],[x,y-h/2,z-w/2],[x,y+h/2,z-w/2],[x,y+h/2,z+w/2]];this.quad(side<0?p:p.reverse(),color);}
 box(x:number,y:number,z:number,w:number,h:number,d:number,color:string|Rgb){
  const c=typeof color==='string'?hex(color):color,a=x-w/2,b=x+w/2,f=z-d/2,k=z+d/2,lo=y-h/2,hi=y+h/2,dark=mix(c,[0,0,0],.15);
  this.quad([[a,lo,f],[b,lo,f],[b,hi,f],[a,hi,f]],c);this.quad([[b,lo,k],[a,lo,k],[a,hi,k],[b,hi,k]],dark);
  this.quad([[a,lo,k],[a,lo,f],[a,hi,f],[a,hi,k]],dark);this.quad([[b,lo,f],[b,lo,k],[b,hi,k],[b,hi,f]],c);this.quad([[a,hi,f],[b,hi,f],[b,hi,k],[a,hi,k]],mix(c,[1,1,1],.06));
 }
 beam(a:number[],b:number[],radius:number,color:string|Rgb,segments=6){
  const c=typeof color==='string'?hex(color):color,dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz)||1,h=Math.hypot(dx,dz),ux=h>1e-8?dz/h:1,uz=h>1e-8?-dx/h:0,vx=dy*uz/l,vy=(dz*ux-dx*uz)/l,vz=-dy*ux/l;
  const rows=[a,b].map(p=>Array.from({length:segments},(_,i)=>{const t=i/segments*Math.PI*2;return this.vertex(p[0]+radius*(ux*Math.cos(t)+vx*Math.sin(t)),p[1]+radius*vy*Math.sin(t),p[2]+radius*(uz*Math.cos(t)+vz*Math.sin(t)),c);}));
  for(let i=0;i<segments;i++){const j=(i+1)%segments;this.triangle(rows[0][i],rows[1][j],rows[0][j]);this.triangle(rows[0][i],rows[1][i],rows[1][j]);}
 }
 hipRoof(x:number,z:number,w:number,d:number,eave:number,top:number,color:string){
  const a=x-w/2,b=x+w/2,c=z-d/2,f=z+d/2,inset=Math.min(w,d)*.28,col=hex(color);
  this.quad([[a,eave,c],[b,eave,c],[b-inset,top,c+inset],[a+inset,top,c+inset]],col);
  this.quad([[b,eave,f],[a,eave,f],[a+inset,top,f-inset],[b-inset,top,f-inset]],mix(col,[0,0,0],.12));
  this.quad([[a,eave,f],[a,eave,c],[a+inset,top,c+inset],[a+inset,top,f-inset]],mix(col,[0,0,0],.18));
  this.quad([[b,eave,c],[b,eave,f],[b-inset,top,f-inset],[b-inset,top,c+inset]],col);
  this.quad([[a+inset,top,c+inset],[b-inset,top,c+inset],[b-inset,top,f-inset],[a+inset,top,f-inset]],mix(col,[1,1,1],.1));
 }
 palm(x:number,y:number,z:number,height:number,radius:number,trunk:string,leaf:string){
  this.beam([x,y,z],[x+.18,y+height,z],.16,trunk,7);
  for(let i=0;i<9;i++){
   const a=i/9*Math.PI*2,side={x:-Math.sin(a),z:Math.cos(a)},tip={x:x+Math.cos(a)*radius,z:z+Math.sin(a)*radius},mid={x:x+Math.cos(a)*radius*.52,z:z+Math.sin(a)*radius*.52},h=y+height;
   this.quad([[x,h,z],[mid.x-side.x*.45,h+.3,mid.z-side.z*.45],[tip.x,h-.8,tip.z],[mid.x+side.x*.45,h+.3,mid.z+side.z*.45]],i%3?leaf:mix(hex(leaf),hex('#e4d69b'),.22));
  }
 }
}
