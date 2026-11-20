import {CompositionShapes} from './composition-shapes';
import {launchsiteRemoteRockets} from '../core/tracks/venue-parcels';
import {projectToPolyline} from '../core/geometry';
import type {TrackDefinition} from '../core/types';
import {launchPadAppearance as art} from './themes';

/**
 * Remote launch mounts (presentation only). Each remote rocket already stands on a 1.25 m
 * plinth whose square footprint (±1.3 × radius) is a protected parcel. Everything here stays
 * inside that footprint: a concrete launch table with a soot ring and flame-deflector slot,
 * hold-down clamps, a yellow safety edge, and a lattice umbilical mast with two service arms in
 * the plinth corner farthest from the course. No collider, support or height rule changes.
 */
export function launchMounts(track:TrackDefinition){
 const g=new CompositionShapes(),top=art.table;
 for(const r of launchsiteRemoteRockets){
  const half=r.radius*1.3,y0=1.25;
  // Launch table and its markings.
  g.box(r.x,y0+top/2,r.z,half*2-.08,top,half*2-.08,art.concrete);
  const deck=y0+top+.006;
  for(const side of[-1,1]){
   flat(g,r.x-half+.04,r.z+side*(half-.04),r.x+half-.04,r.z+side*(half-.3),deck,art.safety);
   flat(g,r.x+side*(half-.04),r.z-half+.04,r.x+side*(half-.3),r.z+half-.04,deck,art.safety);
  }
  // Soot ring around the engines and a flame-deflector slot leading away from the course.
  const corner=farCorner(track,r.x,r.z,half),[cx,cz]=corner;
  const ring=24;
  for(let i=0;i<ring;i++){
   const a0=i/ring*Math.PI*2,a1=(i+1)/ring*Math.PI*2,ri=r.radius*.95,ro=r.radius*1.22;
   g.quad([[r.x+Math.cos(a0)*ro,deck+.002,r.z+Math.sin(a0)*ro],[r.x+Math.cos(a1)*ro,deck+.002,r.z+Math.sin(a1)*ro],[r.x+Math.cos(a1)*ri,deck+.002,r.z+Math.sin(a1)*ri],[r.x+Math.cos(a0)*ri,deck+.002,r.z+Math.sin(a0)*ri]],art.soot);
  }
  const slot=-cx,slotZ=-cz,len=half-r.radius*1.22-.2,w=r.radius*.55;
  if(len>.3){const sx=r.x+slot*(r.radius*1.22+len/2),sz=r.z;g.box(sx,deck-.01,sz,len,.03,w,art.slot);
   const tx=r.x,tz=r.z+slotZ*(r.radius*1.22+len/2);g.box(tx,deck-.01,tz,w,.03,len,art.slot);}
  // Hold-down clamps around the base.
  for(let i=0;i<art.clamps;i++){
   const a=(i+.5)/art.clamps*Math.PI*2,x=r.x+Math.cos(a)*(r.radius+.28),z=r.z+Math.sin(a)*(r.radius+.28);
   g.box(x,deck+.45,z,.42,.9,.42,art.clamp);g.beam([x,deck+.85,z],[r.x+Math.cos(a)*(r.radius-.02),deck+1.35,r.z+Math.sin(a)*(r.radius-.02)],.09,art.clamp,4);
  }
  // Lattice umbilical mast in the far corner, wholly inside the footprint.
  const m=art.mast,mx=r.x+cx*(half-m.width/2-.18),mz=r.z+cz*(half-m.width/2-.18),h=r.height*m.heightRatio,s=m.width/2;
  const legs=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>[mx+u*s,mz+v*s]);
  for(const [x,z] of legs)g.beam([x,deck,z],[x,deck+h,z],.11,m.steel,4);
  const levels=Math.max(2,Math.round(h/m.bay));
  for(let k=0;k<=levels;k++){
   const y=deck+k*h/levels;
   for(let i=0;i<4;i++){const a=legs[i],b=legs[(i+1)%4];g.beam([a[0],y,a[1]],[b[0],y,b[1]],.06,m.steel,4);
    if(k<levels){const y2=deck+(k+1)*h/levels;g.beam(k%2?[a[0],y,a[1]]:[b[0],y,b[1]],k%2?[b[0],y2,b[1]]:[a[0],y2,a[1]],.045,m.steel,4);}}
  }
  g.box(mx,deck+h+.2,mz,m.width+.3,.4,m.width+.3,m.steel);g.beam([mx,deck+h+.4,mz],[mx,deck+h+3,mz],.05,m.steel,4);
  // Service arms reach from the mast to the vehicle skin.
  const dx=r.x-mx,dz=r.z-mz,l=Math.hypot(dx,dz),reach=l-r.radius-.05;
  for(const f of m.arms){
   const y=deck+h*f,ex=mx+dx/l*(s+reach),ez=mz+dz/l*(s+reach);
   g.beam([mx+dx/l*s,y,mz+dz/l*s],[ex,y,ez],.16,m.arm,6);g.box(ex,y,ez,.5,.7,.5,m.arm);
  }
 }
 return g;
}

/** An upward-facing flat rectangle between two corners. */
function flat(g:CompositionShapes,x0:number,z0:number,x1:number,z1:number,y:number,color:string){
 const a=Math.min(x0,x1),b=Math.max(x0,x1),c=Math.min(z0,z1),d=Math.max(z0,z1);
 g.quad([[a,y,c],[b,y,c],[b,y,d],[a,y,d]],color);
}

/** The plinth corner direction (±1, ±1) farthest from the course centreline. */
function farCorner(track:TrackDefinition,x:number,z:number,half:number):[number,number]{
 let best:[number,number]=[1,1],far=-1;
 for(const u of[-1,1])for(const v of[-1,1]){const d=projectToPolyline({x:x+u*half,z:z+v*half},track.centerline,track.distances).distance;if(d>far){far=d;best=[u,v];}}
 return best;
}
