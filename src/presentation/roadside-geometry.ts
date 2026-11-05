import type { Point, TrackDefinition } from '../core/types';
import { cumulative } from '../core/geometry';
import { projectToPolylineNear as projectToPolyline } from '../core/nearest';
import { insideBarrier } from '../core/barriers';
import { groundHeight, supported, jumpCoordinates } from '../core/support';
import { gateCoordinates, startGate } from '../core/start-finish';
import { Geometry, hex, mix, edgeDistance, type Rgb } from './landscape/mesh';
import { random } from './landscape/noise';
import { cityBuildings, onCityLand } from '../content/golden-city';
import { venueFurniture } from './venue-furniture';
import { venueFinish } from './themes';

export interface RoadsidePalette { plant:string; tip:string; flower:string; trim:string; timber:string; metal:string; surface:string; }
export interface RoadsideConfig { spacing:number; plantingOffset:number; plantHeight:number; maxFurniture:number; }
export interface RoadsidePlant extends Point { height:number; radius:number; }
export interface RoadsideProp extends Point { parcelId:string; radius:number; height:number; roof:boolean; kind?:string; }

/** Small details placed against the actual course, not a distant scenery envelope.
 * Low soft vegetation is cosmetic. Substantial furniture/equipment stays inside
 * existing protected parcels; no collision or course definition is changed.
 */
export function roadsideGeometry(track:TrackDefinition,style:string,palette:RoadsidePalette,cfg:RoadsideConfig){
 const g=new Geometry(),plants:RoadsidePlant[]=[],props:RoadsideProp[]=[],rnd=random(731+track.id.length*97),gate=startGate(track);
 const paths=[{p:track.centerline,d:track.distances},...(track.hopShortcuts??[]).map(h=>({p:h.branch,d:cumulative(h.branch)})),...(track.jumps??[]).map(h=>({p:h.branch,d:cumulative(h.branch)}))];
 const hopPaths=(track.hopShortcuts??[]).map(h=>({h,d:cumulative(h.branch)}));
 const furnitureTemplates=new Map<string,ReturnType<typeof venueFurniture>>();
 const gap=(p:Point)=>Math.min(...paths.map(path=>projectToPolyline(p,path.p,path.d).distance));
 // Golden Gate intentionally has no water-support rules in the flat simulation.
 // Its cosmetic planting must still stand on the actual city land, not the sea.
 const plantSupported=(p:Point,r:number)=>Array.from({length:9},(_,i)=>i===0?p:{...p,x:p.x+Math.cos(i*Math.PI/4)*r,z:p.z+Math.sin(i*Math.PI/4)*r})
  .every(q=>supported(q,track)&&(style!=='bay'||onCityLand(q)));
 const safeGate=(p:Point,margin:number)=>{const q=gateCoordinates(p,track);return !(q.along>-gate.leadIn-margin&&q.along<8+margin&&Math.abs(q.across)<gate.width/2+8+margin);};
 const hiddenLane=(p:Point)=> hopPaths.some(({h,d})=>projectToPolyline(p,h.branch,d).distance<h.width/2+5)
  ||(track.jumps??[]).some(j=>{const q=jumpCoordinates(p,j);return q.along>-12&&q.along<j.rampLength+j.gap+14&&Math.abs(q.across)<j.width/2+6;});
 const quad=(ps:number[][],color:Rgb)=>{const v=ps.map(p=>g.vertex(p[0],p[1],p[2],color));g.triangle(v[0],v[1],v[2]);g.triangle(v[0],v[2],v[3]);};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:string)=>{const a=x-w/2,b=x+w/2,e=z-d/2,f=z+d/2,lo=y,hi=y+h,color=hex(c);
  quad([[a,lo,e],[b,lo,e],[b,hi,e],[a,hi,e]],mix(color,hex('#182329'),.15));quad([[b,lo,f],[a,lo,f],[a,hi,f],[b,hi,f]],color);
  quad([[a,lo,f],[a,lo,e],[a,hi,e],[a,hi,f]],mix(color,hex('#182329'),.22));quad([[b,lo,e],[b,lo,f],[b,hi,f],[b,hi,e]],color);quad([[a,hi,e],[b,hi,e],[b,hi,f],[a,hi,f]],mix(color,hex('#ffffff'),.14));};
 const plant=(p:Point,h:number,r:number,seed:number)=>{const y=p.y??groundHeight(p,track),root=hex(palette.plant),tip=hex(seed%7===0?palette.flower:palette.tip),fern=style==='yosemite',desert=style==='spaceport'||style==='canyon';
  // A small supported soil/litter rosette grounds the larger soft crowns. It
  // adds no hard stones, support or collision to the generous runoff.
  const ground=hex(venueFinish[style as keyof typeof venueFinish]?.ground??palette.trim),soil=mix(root,ground,.83),center=g.vertex(p.x,y-.025,p.z,soil),rim:number[]=[];
  for(let j=0;j<7;j++){const a=j/7*Math.PI*2,q={...p,x:p.x+Math.cos(a)*r*.88,z:p.z+Math.sin(a)*r*.88};rim.push(g.vertex(q.x,groundHeight(q,track)+.055,q.z,mix(soil,ground,.72)));}
  for(let j=0;j<7;j++)g.triangle(center,rim[j],rim[(j+1)%7]);
  for(let j=0;j<7;j++){const a=j/7*Math.PI*2+seed*.37,dx=Math.cos(a)*r,dz=Math.sin(a)*r,w=fern?.30:desert?.20:.15,lean=(fern?.64:.48)+.16*Math.sin(j*2.7+seed),rise=fern?.62:desert?.96:.8;
   const base=g.vertex(p.x,y,p.z,mix(root,hex('#273328'),.22)),l=g.vertex(p.x+dx*lean-dz*w,y+h*(rise+(1-rise)*Math.sin(j+seed)**2),p.z+dz*lean+dx*w,root),rr=g.vertex(p.x+dx*lean+dz*w,y+h*(rise+(1-rise)*Math.sin(j+seed)**2),p.z+dz*lean-dx*w,root),end=g.vertex(p.x+dx,y+h*(desert?.42:.18),p.z+dz,tip);
   g.triangle(base,l,rr);g.triangle(l,end,rr);
  }
 };
 let next=0,edgeMarks=0;
 for(let i=1;i<track.centerline.length;i++){
  if(track.distances[i]<next)continue;next=track.distances[i]+cfg.spacing;
  const p=track.centerline[i],a=track.centerline[i-1],dx=p.x-a.x,dz=p.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
  for(const side of[-1,1]){
   const q:Point={x:p.x+nx*side*(track.roadWidth/2+cfg.plantingOffset+(rnd()-.5)*1.1),z:p.z+nz*side*(track.roadWidth/2+cfg.plantingOffset+(rnd()-.5)*1.1),courseProgress:track.distances[i]},r=.58+rnd()*.40,h=cfg.plantHeight*(.5+rnd()*.5);
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
   const y=(b.id==='utility-storage-tower'?(b.baseHeight??0)+b.height:groundHeight(p,track)+.15)+.03;
   const height=Math.min(1.3,Math.max(.3,b.height-.18)),key=`${local%6}/${height}`;
   let cluster=furnitureTemplates.get(key);
   if(!cluster){cluster=venueFurniture(style,palette,local,height);furnitureTemplates.set(key,cluster);}
   g.instance(cluster.geometry,{x,y,z,heading:Math.atan2(track.centerline[0].x-x,track.centerline[0].z-z)});
   props.push({...p,y,parcelId:b.id,radius,height,roof:false,kind:cluster.kind});local++;
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
