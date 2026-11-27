import {CompositionShapes} from './composition-shapes';
import {hex,mix,type Rgb} from './landscape/mesh';
import {edgeDistance,insidePolygon} from './landscape/mesh';
import {cumulative,projectToPolyline} from '../core/geometry';
import type {Point,TrackDefinition} from '../core/types';
import {fleetHarbourAppearance as art} from './themes';

/**
 * San Diego Fleet harbour life (presentation only): tugs, patrol boats, sailboats and channel
 * buoys in the open water around the moored fleet, with wakes, plus scattered wind ripples.
 * Nothing floats near a ship: every vessel stays at least `art.clearance` metres from every deck
 * and barrier footprint, the course, Hop lanes and automatic-crossing corridors
 * (tests/unit/fleet-harbour.test.ts). Two meshes: vessels (opaque) and ripples/wakes (foam).
 */
export interface HarbourVessel{kind:'tug'|'patrol'|'sail'|'buoy';x:number;z:number;heading:number}

export function harbourClearance(track:TrackDefinition){
 const polygons=[...(track.decks??[]).map(d=>d.footprint),...track.barriers.map(b=>b.footprint)];
 const lines=[{line:track.centerline,d:track.distances},...(track.hopShortcuts??[]).map(h=>({line:h.branch,d:cumulative(h.branch)})),
  ...(track.jumps??[]).map(j=>{const line=[j.from,{x:j.from.x+j.forward.x*j.corridorLength,z:j.from.z+j.forward.z*j.corridorLength}];return{line,d:cumulative(line)};})];
 return (p:Point)=>Math.min(...polygons.map(f=>insidePolygon(p,f)?0:edgeDistance(p,f)),...lines.map(l=>projectToPolyline(p,l.line,l.d).distance));
}

export function harbourVessels(track:TrackDefinition):HarbourVessel[]{
 const clear=harbourClearance(track),out:HarbourVessel[]=[];
 for(const v of art.vessels){if(clear(v)>=art.clearance)out.push(v);}
 return out;
}

export function fleetHarbour(track:TrackDefinition,water:number){
 const solid=new CompositionShapes(),foam=new CompositionShapes(),F=hex(art.foam);
 const vessels=harbourVessels(track);
 // Vessels are authored at roughly 1:2.4 and scaled by `k` (art.scale) about the waterline.
 let k=1;
 const frame=(v:HarbourVessel)=>{const c=Math.cos(v.heading),s=Math.sin(v.heading);return (u:number,w:number):[number,number]=>[v.x+(u*c+w*s)*k,v.z+(-u*s+w*c)*k];};
 // Oriented box in a vessel frame (u across, w along); y is the box centre.
 const obox=(g:CompositionShapes,v:HarbourVessel,u:number,y:number,width:number,h:number,len:number,color:string|Rgb,w=0)=>{
  const to=frame(v),c=typeof color==='string'?hex(color):color,lo=water+(y-water-h/2)*k,hi=water+(y-water+h/2)*k,corners=[[-width/2,-len/2],[width/2,-len/2],[width/2,len/2],[-width/2,len/2]].map(([a,b])=>to(u+a,w+b));
  const side=(i:number,j:number,col:Rgb)=>g.quad([[corners[i][0],lo,corners[i][1]],[corners[j][0],lo,corners[j][1]],[corners[j][0],hi,corners[j][1]],[corners[i][0],hi,corners[i][1]]],col);
  side(0,1,mix(c,[0,0,0],.12));side(1,2,c);side(2,3,mix(c,[0,0,0],.12));side(3,0,c);
  g.quad([[corners[0][0],hi,corners[0][1]],[corners[1][0],hi,corners[1][1]],[corners[2][0],hi,corners[2][1]],[corners[3][0],hi,corners[3][1]]],mix(c,[1,1,1],.06));
 };
 const flat=(v:HarbourVessel,u:number,w:number,width:number,len:number,alpha:number)=>{
  const to=frame(v),ids=[[-width/2,-len/2],[width/2,-len/2],[width/2,len/2],[-width/2,len/2]].map(([a,b])=>{const [x,z]=to(u+a,w+b),i=foam.vertex(x,water+art.foamLift,z,F);foam.colors[i*4+3]=alpha;return i;});
  foam.triangle(ids[0],ids[1],ids[2]);foam.triangle(ids[0],ids[2],ids[3]);
 };
 // Bow wave and a V wake trailing behind (w is forward).
 const wake=(v:HarbourVessel,len:number,beam:number,speed:number)=>{
  flat(v,0,len/2+.4,beam*.9,1.2,.55*speed);
  // Short, faint wakes keep the eye on the course (art.wake); the V still shows each boat's heading.
  for(let k=0;k<art.wake.segments;k++){const back=-len/2-2-k*art.wake.spacing,spread=beam/2+k*1.3*speed;for(const side of[-1,1])flat({...v,heading:v.heading+side*.32},side*spread*.94,back,.55,art.wake.length,(.45-k*.09)*speed);}
  flat(v,0,-len/2-4,beam*.6,art.wake.trail,.25*speed);
 };
 for(const v of vessels){
  const y=water;k=art.scale[v.kind];
  if(v.kind==='tug'){
   const t=art.tug;obox(solid,v,0,y+.2,4.6,1.6,11,t.hull);obox(solid,v,0,y+1.1,4.7,.2,11.1,t.fender);obox(solid,v,0,y+1.25,4.2,.1,10.4,t.deck);
   obox(solid,v,0,y+2.3,3.2,2,4.2,t.house);obox(solid,v,0,y+3.7,2.6,.9,2.6,t.wheel);obox(solid,v,0,y+3.85,2.65,.35,2.65,t.glass);
   obox(solid,v,0,y+4.9,.7,1.5,.7,t.stack);obox(solid,v,0,y+5.75,.75,.2,.75,t.band);wake(v,11,4.6,.8);
  }else if(v.kind==='patrol'){
   const p=art.patrol;obox(solid,v,0,y+.15,3.2,1,10,p.hull);obox(solid,v,0,y+.15,1.8,.8,1.6,p.hull);obox(solid,v,0,y+.75,3.3,.35,10.1,p.tube);
   obox(solid,v,0,y+1.4,2,1.2,3,p.console);obox(solid,v,0,y+1.75,2.05,.4,1.2,p.glass);obox(solid,v,0,y+2.6,.12,1.2,.12,p.console);wake(v,10,3.2,1.4);
  }else if(v.kind==='sail'){
   const s=art.sail,to=frame(v);obox(solid,v,0,y+.2,2.2,1,7,s.hull);obox(solid,v,0,y+.78,2,.12,6.6,s.deck);obox(solid,v,0,y+1.1,1.3,.5,2,s.hull);
   obox(solid,v,0,y+5,.14,8.4,.14,s.mast);
   const tip=to(0,.6),boom=to(0,-2.6),bow=to(0,3.3),base=to(0,.6),C=hex(s.cloth);
   for(const [a,b,c] of [[base,tip,boom],[bow,tip,base]] as const){
    for(const face of[0,1]){const ia=solid.vertex(a[0],y+1.3*k,a[1],C),ib=solid.vertex(b[0],y+9*k,b[1],C),ic=solid.vertex(c[0],y+1.3*k,c[1],mix(C,[0,0,0],.08));if(face)solid.triangle(ia,ic,ib);else solid.triangle(ia,ib,ic);}
   }
   wake(v,7,2.2,.5);
  }else{
   const b=art.buoy,col=v.heading>0?b.red:b.green;obox(solid,v,0,y+.5,1.3,1.6,1.3,col);obox(solid,v,0,y+1.7,.5,.9,.5,col);obox(solid,v,0,y+2.25,.22,.25,.22,b.light);
   flat(v,0,0,2.6,2.6,.35);
  }
 }
 // Wind ripples: short pale streaks across open water, clear of the fleet.
 k=1;
 const clear=harbourClearance(track);let seed=art.ripples.seed;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0,made=0;i<art.ripples.tries&&made<art.ripples.count;i++){
  const p={x:art.ripples.extent[0]+rnd()*(art.ripples.extent[1]-art.ripples.extent[0]),z:art.ripples.extent[2]+rnd()*(art.ripples.extent[3]-art.ripples.extent[2])};
  if(clear(p)<art.ripples.clearance)continue;made++;
  flat({kind:'buoy',x:p.x,z:p.z,heading:art.ripples.wind+(rnd()-.5)*.3},0,0,.35+rnd()*.4,3+rnd()*6,.18+rnd()*.22);
 }
 return {solid,foam,vessels};
}
