import type { Point, TrackDefinition } from '../core/types';
import { cumulative, projectToPolyline } from '../core/geometry';
import { insideBarrier } from '../core/barriers';
import { groundHeight, supported, jumpCoordinates } from '../core/support';
import { gateCoordinates, startGate } from '../core/start-finish';
import { Geometry, hex, mix, edgeDistance, type Rgb } from './landscape/mesh';
import { random } from './landscape/noise';
import { cityBuildings, onCityLand } from '../content/golden-city';

export interface RoadsidePalette { plant:string; tip:string; flower:string; trim:string; timber:string; metal:string; surface:string; }
export interface RoadsideConfig { spacing:number; plantingOffset:number; plantHeight:number; maxFurniture:number; }
export interface RoadsidePlant extends Point { height:number; radius:number; }
export interface RoadsideProp extends Point { parcelId:string; radius:number; height:number; roof:boolean; }

/** Small details placed against the actual course, not a distant scenery envelope.
 * Low soft vegetation is cosmetic. Substantial furniture/equipment stays inside
 * existing protected parcels; no collision or course definition is changed.
 */
export function roadsideGeometry(track:TrackDefinition,style:string,palette:RoadsidePalette,cfg:RoadsideConfig){
 const g=new Geometry(),plants:RoadsidePlant[]=[],props:RoadsideProp[]=[],rnd=random(731+track.id.length*97),gate=startGate(track);
 const paths=[{p:track.centerline,d:track.distances},...(track.hopShortcuts??[]).map(h=>({p:h.branch,d:cumulative(h.branch)})),...(track.jumps??[]).map(h=>({p:h.branch,d:cumulative(h.branch)}))];
 const gap=(p:Point)=>Math.min(...paths.map(path=>projectToPolyline(p,path.p,path.d).distance));
 // Golden Gate intentionally has no water-support rules in the flat simulation.
 // Its cosmetic planting must still stand on the actual city land, not the sea.
 const plantSupported=(p:Point,r:number)=>Array.from({length:9},(_,i)=>i===0?p:{...p,x:p.x+Math.cos(i*Math.PI/4)*r,z:p.z+Math.sin(i*Math.PI/4)*r})
  .every(q=>supported(q,track)&&(style!=='bay'||onCityLand(q)));
 const safeGate=(p:Point,margin:number)=>{const q=gateCoordinates(p,track);return !(q.along>-gate.leadIn-margin&&q.along<8+margin&&Math.abs(q.across)<gate.width/2+8+margin);};
 const hiddenLane=(p:Point)=> (track.hopShortcuts??[]).some(h=>projectToPolyline(p,h.branch,cumulative(h.branch)).distance<h.width/2+5)
  ||(track.jumps??[]).some(j=>{const q=jumpCoordinates(p,j);return q.along>-12&&q.along<j.rampLength+j.gap+14&&Math.abs(q.across)<j.width/2+6;});
 const quad=(ps:number[][],color:Rgb)=>{const v=ps.map(p=>g.vertex(p[0],p[1],p[2],color));g.triangle(v[0],v[1],v[2]);g.triangle(v[0],v[2],v[3]);};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:string)=>{const a=x-w/2,b=x+w/2,e=z-d/2,f=z+d/2,lo=y,hi=y+h,color=hex(c);
  quad([[a,lo,e],[b,lo,e],[b,hi,e],[a,hi,e]],mix(color,hex('#182329'),.15));quad([[b,lo,f],[a,lo,f],[a,hi,f],[b,hi,f]],color);
  quad([[a,lo,f],[a,lo,e],[a,hi,e],[a,hi,f]],mix(color,hex('#182329'),.22));quad([[b,lo,e],[b,lo,f],[b,hi,f],[b,hi,e]],color);quad([[a,hi,e],[b,hi,e],[b,hi,f],[a,hi,f]],mix(color,hex('#ffffff'),.14));};
 const plant=(p:Point,h:number,r:number,seed:number)=>{const y=p.y??groundHeight(p,track),root=hex(palette.plant),tip=hex(seed%7===0?palette.flower:palette.tip);
  for(let j=0;j<7;j++){const a=j/7*Math.PI*2+seed*.37,dx=Math.cos(a)*r,dz=Math.sin(a)*r,w=style==='spaceport'?.15:.07;
   const base=g.vertex(p.x,y,p.z,root),l=g.vertex(p.x+dx*.55-dz*w,y+h,p.z+dz*.55+dx*w,root),rr=g.vertex(p.x+dx*.55+dz*w,y+h,p.z+dz*.55-dx*w,root),end=g.vertex(p.x+dx,y+h*.35,p.z+dz,tip);
   g.triangle(base,l,rr);g.triangle(l,end,rr);
  }
 };
 let next=0,edgeMarks=0;
 for(let i=1;i<track.centerline.length;i++){
  if(track.distances[i]<next)continue;next=track.distances[i]+cfg.spacing;
  const p=track.centerline[i],a=track.centerline[i-1],dx=p.x-a.x,dz=p.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
  for(const side of[-1,1]){
   const q:Point={x:p.x+nx*side*(track.roadWidth/2+cfg.plantingOffset+(rnd()-.5)*1.1),z:p.z+nz*side*(track.roadWidth/2+cfg.plantingOffset+(rnd()-.5)*1.1),courseProgress:track.distances[i]},r=.45+rnd()*.35,h=cfg.plantHeight*(.5+rnd()*.5);
   if(rnd()>.18&&plantSupported(q,r)&&gap(q)>track.roadWidth/2+r+2&&safeGate(q,2)&&!hiddenLane(q)&&!track.barriers.some(b=>insideBarrier(q,b)||edgeDistance(q,b.footprint)<r+.3)){
    q.y=groundHeight(q,track)+.08;plant(q,h,r,i);plants.push({...q,height:h,radius:r});
   }
   // Flat grit, worn seams or groomer traces live on the edge of the supported lane.
   // They follow each surface vertex; no raised stones or changes to physical support.
   const mark={x:p.x+nx*side*(track.roadWidth/2-.65),z:p.z+nz*side*(track.roadWidth/2-.65),courseProgress:track.distances[i]};
   if(!supported(mark,track)||!safeGate(mark,1)||hiddenLane(mark))continue;
   const long=.3+rnd()*.65,wide=.06+rnd()*.10;const points=[[-long,-wide],[long,-wide],[long,wide],[-long,wide]].map(([along,across])=>{const v={x:mark.x+dx/l*along+nx*across,z:mark.z+dz/l*along+nz*across,courseProgress:mark.courseProgress};return[v.x,groundHeight(v,track)+.148,v.z];});quad(points,hex(palette.surface));edgeMarks++;
  }
 }
 const protectedGround=track.barriers.filter(b=>b.kind==='infield'&&b.runoffException!=='hop-lane'&&b.height<2.6&&!/hop|wing|trail|cedar/.test(b.id));
 for(const b of protectedGround){
  const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z);let local=0;
  for(let x=Math.min(...xs)+2;x<Math.max(...xs)-2;x+=4.6)for(let z=Math.min(...zs)+2;z<Math.max(...zs)-2;z+=4.6){
   const p={x,z},radius=1.5;if(props.length>=cfg.maxFurniture||local>=16||gap(p)<track.roadWidth/2+6||gap(p)>32||!safeGate(p,2)||hiddenLane(p))continue;
   if(!insideBarrier(p,b)||edgeDistance(p,b.footprint)<radius||track.barriers.some(other=>other!==b&&other.kind!=='infield'&&(insideBarrier(p,other)||edgeDistance(p,other.footprint)<radius)))continue;
   if(style==='bay'&&cityBuildings.some(building=>Math.abs(x-building.x)<building.width/2+radius&&Math.abs(z-building.z)<building.depth/2+radius))continue;
   const y=(b.id==='utility-storage-tower'?(b.baseHeight??0)+b.height:groundHeight(p,track)+.15)+.03,kind=local%3;
   if(style==='spaceport'){
    box(x,y,z,1.6,1.18,1.1,palette.trim);box(x,y+1.2,z,1.74,.1,1.2,palette.metal);
    for(let k=0;k<5;k++)box(x-.55+k*.27,y+.24,z+.56,.10,.63,.035,palette.metal);
   }else{
    // Planter and slatted bench/lounger: coastal, urban and alpine palettes differ.
    if(kind===0){box(x,y,z,2.1,.54,1.05,palette.trim);box(x,y+.54,z,1.85,.05,.82,palette.surface);for(const side of[-1,1])plant({x:x+side*.52,y:y+.61,z},.45,.48,local);}
    else{
     box(x,y+.45,z,2.4,.14,.62,palette.timber);box(x,y+.67,z+.27,2.4,.48,.09,palette.timber);
     for(const side of[-1,1])box(x+side*.86,y,z,.16,.47,.53,palette.metal);
     for(let k=0;k<5;k++)box(x-.95+k*.47,y+.60,z,.025,.02,.55,palette.metal);
    }
   }
   props.push({...p,y,parcelId:b.id,radius,height:1.3,roof:false});local++;
  }
 }
 // Inset flat-roof hardware makes the nearby city/industrial blocks read at game scale.
 if(['night-city','bay','sunset'].includes(style))for(const b of track.barriers.filter(b=>b.kind==='building'&&b.height>4&&!/wing|hop/.test(b.id))){
  const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,p={x,z};
  if(gap(p)>43||!insideBarrier(p,b)||edgeDistance(p,b.footprint)<2.5)continue;
  const y=(b.baseHeight??0)+b.height+(style==='bay'?.40:.02);
  box(x,y,z,2.8,.48,1.6,palette.metal);box(x,y+.48,z,2.95,.08,1.7,palette.trim);
  for(const side of[-1,1])for(let k=0;k<5;k++)box(x-.95+k*.47,y+.14,z+side*.81,.22,.17,.025,palette.surface);
  props.push({...p,y,parcelId:b.id,radius:1.8,height:.6,roof:true});
 }
 return{geometry:g,plants,props,edgeMarks};
}
