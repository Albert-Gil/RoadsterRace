import { cumulative, distance, projectToPolyline, samplePolyline } from '../geometry';
import { annotateRoad, roadHeight } from '../elevation';
import { roundedCircuit, roadEdges } from '../road-geometry';
import { createStartFinish } from '../start-finish';
import { VEHICLE_DIMENSIONS } from '../vehicle-size';
import type { Point, RoadSection, TrackBarrier, TrackDefinition } from '../types';
import { obstacleRectangle } from './hop-obstacles';

/** Fictional seven-terminal airport race, following the owner's horseshoe sketch. */
const loop = roundedCircuit([
  [-110,-98],[-110,145],[-76,158],[-42,137],[0,158],[42,137],[77,158],[110,145],
  [110,-98],[36,-98],[36,92],[-36,92],[-36,-98],
].map(([x,z])=>({x,z})),23);
const first=loop.slice(0,-1).reduce((a,p,i)=>distance(p,{x:-110,z:0})<distance(loop[a],{x:-110,z:0})?i:a,0);
const centerline=[...loop.slice(first,-1),...loop.slice(0,first),loop[first]],distances=cumulative(centerline),length=distances.at(-1)!;
const progress=(p:Point)=>projectToPolyline(p,centerline,distances).progress;
const pRight=progress({x:110,z:-60}),pUp=progress({x:36,z:-60}),pDown=progress({x:-36,z:-60}),pLeft=progress({x:-110,z:-60});
const crestLeft=progress({x:-110,z:40}),crestRight=progress({x:110,z:35});
const section=(id:string,from:number,to:number,heights:[number,number][],supportWidth:number):RoadSection=>({id,from,to,heights,supportWidth});
const flatProfile=(from:number,to:number,crest?:number):[number,number][]=>crest===undefined?[[0,0],[to-from,0]]:[[0,0],[crest-from-12,0],[crest-from,1.8],[crest-from+36,0],[to-from,0]];
const sections:RoadSection[]=[
 section('west-runway',0,progress({x:-110,z:110}),flatProfile(0,progress({x:-110,z:110}),crestLeft),100),
 section('north-taxiway',progress({x:-110,z:110}),progress({x:110,z:110}),[[0,0],[progress({x:110,z:110})-progress({x:-110,z:110}),0]],70),
 section('east-runway',progress({x:110,z:110}),pRight,flatProfile(progress({x:110,z:110}),pRight,crestRight),100),
 section('departures-climb',pRight,pUp,[[0,0],[pUp-pRight,6]],30),
 section('terminal-horseshoe',pUp,pDown,[[0,6],[pDown-pUp,6]],28),
 section('departures-descent',pDown,pLeft,[[0,6],[pLeft-pDown,0]],30),
 section('west-return',pLeft,length,[[0,0],[length-pLeft,0]],100),
];
for(const [id,crest] of [['west-runway',crestLeft],['east-runway',crestRight]] as const){
 const s=sections.find(s=>s.id===id)!;
 s.supportWidths=[[0,100],[crest-s.from-12,28],[crest-s.from+36,28],[crest-s.from+48,100],[s.to-s.from,100]];
}
const branch=roundedCircuit([{x:36,z:22},{x:36,z:37},{x:25,z:47},{x:-25,z:47},{x:-36,z:37},{x:-36,z:22}],12,false);
const barriers:TrackBarrier[]=[
 {id:'lax-west-terminal-parcel',kind:'infield',height:1.1,footprint:obstacleRectangle(-73,9.5,24,155)},
 {id:'lax-east-terminal-parcel',kind:'infield',height:1.1,footprint:obstacleRectangle(49,9.5,24,155)},
 {id:'lax-central-parking',kind:'infield',height:6.9,footprint:obstacleRectangle(-21,-32,42,112)},
 {id:'lax-north-garden',kind:'infield',baseHeight:6,height:1.1,footprint:obstacleRectangle(-21,64,42,10)},
 {id:'lax-center-way-equipment',kind:'service-barrier',baseHeight:6,height:1.8,runoffException:'hop-lane',footprint:obstacleRectangle(-.65,47,1.3,16)},
 {id:'lax-center-way-south-end',kind:'service-barrier',baseHeight:6,height:1.4,runoffException:'hop-lane',footprint:obstacleRectangle(-2,31.5,4,15)},
 {id:'lax-center-way-north-end',kind:'service-barrier',baseHeight:6,height:1.4,runoffException:'hop-lane',footprint:obstacleRectangle(-2,57,4,4)},
 {id:'lax-terminal-4',kind:'building',height:10,footprint:obstacleRectangle(-20,115,40,14)},
];
/** Physical airport asset placements, shared with the original procedural artwork. */
export const laxTerminals=[[-60,-52],[-60,0],[-60,52],[0,115],[60,52],[60,0],[60,-52]] as const;
export const laxApronAircraft=[[-184,-57,0],[-184,59,0],[184,35,Math.PI],[184,-72,Math.PI]] as const;
export const laxCargoAprons=[212,-167].flatMap(z=>[-82,0,82].map(x=>({x,z,side:z>0?1:-1})));
function aircraftFootprint(x:number,z:number,scale:number,heading:number){
 const half=[[0,-18],[-1.7,-15],[-2,-1],[-11.5,6],[-10,9],[-1.8,6],[-1.2,12],[-4.8,16],[-4.6,18],[0,18]];
 return[...half,...half.slice(1,-1).reverse().map(([x,z])=>[-x,z])].map(([a,b])=>({x:x+(a*Math.cos(heading)+b*Math.sin(heading))*scale,z:z+(-a*Math.sin(heading)+b*Math.cos(heading))*scale}));
}
export const laxPlanting=[
 ...[-1,1].flatMap(side=>[-26,26,80].map(z=>({x:side*53,z,y:0,height:5,radius:2.8,parcel:side<0?'lax-west-terminal-parcel':'lax-east-terminal-parcel'}))),
 ...[-17.5,17.5].flatMap(x=>[-82,-68,-42,-28,18].map(z=>({x,z,y:6,height:4.2,radius:2.2,parcel:'lax-central-parking'}))),
 ...[-14,-7,7,14].map(x=>({x,z:64,y:6.25,height:3.4,radius:1.7,parcel:'lax-north-garden'})),
];
for(const [i,[x,z]] of laxTerminals.entries())if(i!==3){
 barriers.push({id:`lax-terminal-${i+1}`,kind:'building',height:8,footprint:obstacleRectangle(x-10,z,20,32)});
 barriers.push({id:`lax-gate-aircraft-${i+1}`,kind:'building',height:7.5,footprint:aircraftFootprint(x+Math.sign(x)*23,z,.74,x<0?0:Math.PI)});
}
for(const [i,[x,z,heading]] of laxApronAircraft.entries())barriers.push({id:`lax-apron-aircraft-${i}`,kind:'building',height:12,footprint:aircraftFootprint(x,z,1.2,heading)});
for(const [i,{x,z,side}] of laxCargoAprons.entries()){
 barriers.push({id:`lax-cargo-airliner-${i}`,kind:'building',height:8.8,footprint:aircraftFootprint(x,z-side*7,.88,side>0?Math.PI:0)});
 barriers.push({id:`lax-maintenance-hangar-${i}`,kind:'building',height:13,footprint:obstacleRectangle(x-24.5,z+side*24,49,22.3)});
}
for(const side of[-1,1]){
 barriers.push({id:`lax-cargo-${side}`,kind:'building',height:11,footprint:obstacleRectangle(side*191-20,142,40,35)});
 for(let z=-100;z<110;z+=34)barriers.push({id:`lax-ground-vehicle-${side}-${z}`,kind:'building',height:3.4,footprint:obstacleRectangle(side*132-2.6,z,5.2,8)});
}
barriers.push({id:'lax-theme-building',kind:'building',baseHeight:6,height:18,footprint:obstacleRectangle(-18,-6,36,36)},
 {id:'lax-control-tower',kind:'building',baseHeight:6,height:30,footprint:obstacleRectangle(-4.5,-58,9,8)});
export const laxTrack:TrackDefinition={
 id:'lax',name:'LAX',version:1,centerline,distances,length,roadWidth:16,carWidth:VEHICLE_DIMENSIONS.width,carLength:VEHICLE_DIMENSIONS.length,
 bridges:[{id:'lax-departures',from:{x:36,z:-60},to:{x:-36,z:-60},width:28}],
 start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),sections,barriers,
 terrainTakeoffs:[crestLeft,crestRight].map((p,i)=>{const center=samplePolyline(centerline,distances,p),ahead=samplePolyline(centerline,distances,p+1),d=distance(center,ahead);return{id:i?'east-service-crest':'west-service-crest',center,forward:{x:(ahead.x-center.x)/d,z:(ahead.z-center.z)/d},width:16,progress:p,launchBoost:6.5,launchSlope:.09,minimumSpeed:6,planningSpeed:27};}),
 hopShortcuts:[{id:'center-way',branch,width:16,obstacleId:'lax-center-way-equipment',entryProgress:progress(branch[0]),exitProgress:progress(branch.at(-1)!)}],
};
// Deck-edge rails follow the same derived shoulders; leave the approved cross-connection open.
const [left,right]=roadEdges(centerline,27);
for(const [side,edge] of [left,right].entries())for(let i=0;i<edge.length-1;i+=4){
 const a=edge[i],b=edge[Math.min(i+4,edge.length-1)],s=distances[i];if(s<pUp||s>pDown)continue;
 if(projectToPolyline(a,branch,cumulative(branch)).distance<13||projectToPolyline(b,branch,cumulative(branch)).distance<13)continue;
 const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),nx=-dz/d*.18,nz=dx/d*.18;
 barriers.push({id:`lax-departures-rail-${side}-${i}`,kind:'bridge-rail',bridgeId:'lax-departures',baseHeight:roadHeight(laxTrack,s),height:1.1,footprint:[{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz},{x:a.x-nx,z:a.z-nz}]});
}
laxTrack.centerline=annotateRoad(centerline,laxTrack);laxTrack.start=laxTrack.centerline[0];
laxTrack.hopShortcuts![0].branch=annotateRoad(branch.map((p,i)=>({...p,courseProgress:progress(branch[0])+(progress(branch.at(-1)!)-progress(branch[0]))*i/(branch.length-1)})),laxTrack);
