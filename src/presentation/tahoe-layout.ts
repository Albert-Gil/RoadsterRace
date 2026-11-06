import type { TrackDefinition } from '../core/types';
import { insideBarrier } from '../core/barriers';
import { terrainElevation, locateRoad } from '../core/elevation';
import { supported } from '../core/support';
import { courseDistance } from './landscape/terrain-fields';
import { snowyTahoeAppearance as art,landmarkShowcase } from './themes';
import {samplePolyline} from '../core/geometry';
import {gateCoordinates} from '../core/start-finish';

/** Placement is cosmetic; the road, runoff, buildings and hillside share core ground heights. */
export function tahoeLayout(track:TrackDefinition){
  const D=courseDistance(track,art.extent,4),height=(x:number,z:number)=>terrainElevation({x,z},track);
  let seed=173;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const trees:{x:number;z:number;height:number;authored:boolean;roadside?:boolean}[]=[];
  for(let tries=0;tries<10000&&trees.length<art.treeCount-art.nearTreeCount;tries++){
    const x=-205+random()*340,z=-145+random()*340,h=10+random()*8,p={x,z};
    if(!supported(p,track)||D(x,z)<34+h*1.1||track.barriers.some(b=>insideBarrier(p,b)))continue;
    const road=locateRoad(p,track),above=h+Math.max(0,height(x,z)-road.height);
    if(D(x,z)<track.roadWidth/2+above*1.1)continue;
    // Leave the lift cable and its station approaches legible.
    if(x>-173&&x<-146&&z>-66&&z<148)continue;
    trees.push({x,z,height:h,authored:false});
  }
  const reserve=track.barriers.find(b=>b.id==='forest-reserve')!;
  for(let x=-53;x<34;x+=6.8)for(let z=-17;z<29;z+=7.4){
    const p={x:x+(random()-.5)*4,z:z+(random()-.5)*4},h=5.8+random()*2;
    if(!insideBarrier(p,reserve)||D(p.x,p.z)<17)continue;
    const radius=h*.24;
    if(landmarkShowcase.tahoe.clearings.some(b=>p.x>b.x-radius&&p.x<b.x+b.width+radius&&p.z>b.z-radius&&p.z<b.z+b.depth+radius))continue;
    if(Array.from({length:8},(_,i)=>({x:p.x+Math.cos(i*Math.PI/4)*radius,z:p.z+Math.sin(i*Math.PI/4)*radius})).some(q=>!insideBarrier(q,reserve)))continue;
    if(track.barriers.filter(b=>b.kind==='building').some(b=>{const xs=b.footprint.map(q=>q.x),zs=b.footprint.map(q=>q.z);return p.x>Math.min(...xs)-2&&p.x<Math.max(...xs)+2&&p.z>Math.min(...zs)-2&&p.z<Math.max(...zs)+2;}))continue;
    trees.push({...p,height:h,authored:true});
  }
  let near=0;
  for(let s=3;s<track.length&&near<art.nearTreeCount;s+=3.2)for(const side of[-1,1]){
    const a=samplePolyline(track.centerline,track.distances,s),b=samplePolyline(track.centerline,track.distances,s+.5),len=Math.hypot(b.x-a.x,b.z-a.z),offset=art.nearTreeOffset[0]+random()*(art.nearTreeOffset[1]-art.nearTreeOffset[0]);
    const p={x:a.x-(b.z-a.z)/len*side*offset,z:a.z+(b.x-a.x)/len*side*offset},h=art.nearTreeHeight[0]+random()*(art.nearTreeHeight[1]-art.nearTreeHeight[0]),radius=h*.26,q=gateCoordinates(p,track);
    if(near>=art.nearTreeCount||!supported(p,track)||D(p.x,p.z)<track.roadWidth/2+5+radius||q.along> -35&&q.along<14&&Math.abs(q.across)<22)continue;
    if(track.barriers.some(v=>insideBarrier(p,v)||v.footprint.some(v=>Math.hypot(v.x-p.x,v.z-p.z)<radius+3)))continue;
    const road=locateRoad(p,track),above=h+Math.max(0,height(p.x,p.z)-road.height);
    if(D(p.x,p.z)<track.roadWidth/2+above*1.1||trees.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<(t.height+h)*.22))continue;
    if((track.hopShortcuts??[]).some(l=>{const path=l.branch;return path.some(v=>Math.hypot(v.x-p.x,v.z-p.z)<l.width/2+radius+6);}))continue;
    trees.push({...p,height:h,authored:true,roadside:true});near++;
  }
  return{distance:D,height,trees};
}

