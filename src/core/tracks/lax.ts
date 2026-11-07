import { cumulative, distance, projectToPolyline, samplePolyline } from '../geometry';
import { annotateRoad, roadHeight } from '../elevation';
import { roundedCircuit, roadEdges } from '../road-geometry';
import { createStartFinish } from '../start-finish';
import { VEHICLE_DIMENSIONS } from '../vehicle-size';
import type { Point, RoadSection, TrackBarrier, TrackDefinition } from '../types';
import { obstacleRectangle } from './hop-obstacles';

/** Compact terminal streets, short runway sectors and a connecting apron, per owner map. */
export const LAX_LAYOUT={runwayX:82,streetX:26,streetHeight:3,gateZ:40,planeX:58,planeScale:.58,groundVehicleX:102,terminalWidth:11,terminalDepth:18,headWidth:32,headDepth:12};
const loop=roundedCircuit([[-82,-53],[-82,85],[-55,99],[-28,87],[0,101],[28,87],[55,99],[82,85],[82,-53],[26,-53],[26,46],[-26,46],[-26,-53]].map(([x,z])=>({x,z})),16);
const first=loop.slice(0,-1).reduce((a,p,i)=>distance(p,{x:-82,z:40})<distance(loop[a],{x:-82,z:40})?i:a,0);
const centerline=[...loop.slice(first,-1),...loop.slice(0,first),loop[first]],distances=cumulative(centerline),length=distances.at(-1)!;
const progress=(p:Point)=>projectToPolyline(p,centerline,distances).progress;
const p=(x:number,z:number)=>progress({x,z});
const section=(id:string,from:number,to:number,heights:[number,number][],supportWidth:number):RoadSection=>({id,from,to,heights,supportWidth});
const flat=(id:string,from:number,to:number,h:number,w:number)=>section(id,from,to,[[0,h],[to-from,h]],w);
const grade=(id:string,from:number,to:number,a:number,b:number,w=28)=>section(id,from,to,[[0,a],[to-from,b]],w);
const n0=p(-82,64),n1=p(82,64),a=p(82,-25),b=p(26,-33),c=p(26,-25),d=p(26,-19),e=p(-82,-29),f=p(-82,-21),g=p(-82,-15);
const sections:RoadSection[]=[
 flat('west-runway',0,n0,0,100),flat('north-apron',n0,n1,0,70),flat('east-runway',n1,a,0,100),
 grade('east-street-transfer',a,b,0,5),grade('arrivals-ramp',b,c,5,6.2),grade('arrivals-landing-slope',c,d,6.2,3),
 flat('public-horseshoe',d,e,3,28),grade('airfield-ramp',e,f,3,4.2),grade('airfield-landing-slope',f,g,4.2,0),flat('west-runway-return',g,length,0,100),
];
const branch=roundedCircuit([{x:26,z:-5},{x:26,z:6},{x:15,z:16},{x:-15,z:16},{x:-26,z:6},{x:-26,z:-5}],10,false);
const barriers:TrackBarrier[]=[
 {id:'lax-west-terminal-parcel',kind:'infield',height:4.1,footprint:obstacleRectangle(-53,7,14,72)},
 {id:'lax-east-terminal-parcel',kind:'infield',height:4.1,footprint:obstacleRectangle(39,7,14,72)},
 {id:'lax-central-parking',kind:'infield',height:4.1,footprint:obstacleRectangle(-12,-11.5,24,35)},
 {id:'lax-north-garden',kind:'infield',baseHeight:3,height:1.1,footprint:obstacleRectangle(-12,28.5,24,5)},
 {id:'lax-center-way-equipment',kind:'service-barrier',baseHeight:3,height:1.8,runoffException:'hop-lane',footprint:obstacleRectangle(-.65,16,1.3,16)},
 {id:'lax-center-way-south-end',kind:'service-barrier',baseHeight:3,height:1.4,runoffException:'hop-lane',footprint:obstacleRectangle(-2,7,4,2)},
 {id:'lax-center-way-north-end',kind:'service-barrier',baseHeight:3,height:1.4,runoffException:'hop-lane',footprint:obstacleRectangle(-2,25,4,2)},
 {id:'lax-terminal-4',kind:'building',height:8,footprint:obstacleRectangle(-16,66,32,12)},
 {id:'lax-theme-building',kind:'building',baseHeight:3,height:14,footprint:obstacleRectangle(-10,-5,20,20)},
 {id:'lax-control-tower',kind:'building',baseHeight:3,height:24,footprint:obstacleRectangle(-3,-23,6,6)},
];
export const laxTerminals=[[-45.5,-20],[-45.5,6],[-45.5,32],[0,66],[45.5,32],[45.5,6],[45.5,-20]] as const;
export const laxApronAircraft=[[-123,-18,0],[-123,68,0],[123,-18,Math.PI],[123,68,Math.PI]] as const;
export const laxCargoAprons=[145,-111].flatMap(z=>[-67,0,67].map(x=>({x,z,side:z>0?1:-1})));
function aircraftFootprint(x:number,z:number,scale:number,heading:number){
 const half=[[0,-18],[-1.7,-15],[-2,-1],[-11.5,6],[-10,9],[-1.8,6],[-1.2,12],[-4.8,16],[-4.6,18],[0,18]];
 return[...half,...half.slice(1,-1).reverse().map(([x,z])=>[-x,z])].map(([a,b])=>({x:x+(a*Math.cos(heading)+b*Math.sin(heading))*scale,z:z+(-a*Math.sin(heading)+b*Math.cos(heading))*scale}));
}
export const laxPlanting=[
 ...[-1,1].flatMap(side=>[-7,19].map(z=>({x:side*46,z,y:3,height:3.4,radius:1.5,parcel:side<0?'lax-west-terminal-parcel':'lax-east-terminal-parcel'}))),
 ...[-9.5,9.5].flatMap(x=>[-25,-17,1].map(z=>({x,z,y:3,height:3,radius:1.4,parcel:'lax-central-parking'}))),
 ...[-7,7].map(x=>({x,z:28.5,y:3.25,height:2.5,radius:1.1,parcel:'lax-north-garden'})),
];
for(const [i,[x,z]] of laxTerminals.entries())if(i!==3){
 barriers.push({id:`lax-terminal-${i+1}`,kind:'building',height:8,footprint:obstacleRectangle(x-5.5,z,11,18)});
 barriers.push({id:`lax-gate-aircraft-${i+1}`,kind:'building',height:5.8,footprint:aircraftFootprint(Math.sign(x)*58,z,.58,x<0?0:Math.PI)});
}
for(const [i,[x,z,heading]] of laxApronAircraft.entries())barriers.push({id:`lax-apron-aircraft-${i}`,kind:'building',height:10,footprint:aircraftFootprint(x,z,1,heading)});
for(const [i,{x,z,side}] of laxCargoAprons.entries()){
 barriers.push({id:`lax-cargo-airliner-${i}`,kind:'building',height:8,footprint:aircraftFootprint(x,z-side*7,.8,side>0?Math.PI:0)});
 barriers.push({id:`lax-maintenance-hangar-${i}`,kind:'building',height:11,footprint:obstacleRectangle(x-20,z+side*22,40,20.3)});
}
for(const side of[-1,1])for(const z of[-12,22,56])barriers.push({id:`lax-ground-vehicle-${side}-${z}`,kind:'building',height:3.4,footprint:obstacleRectangle(side*LAX_LAYOUT.groundVehicleX-2.6,z,5.2,8)});
export const laxTrack:TrackDefinition={
 id:'lax',name:'LAX',version:2,centerline,distances,length,roadWidth:16,carWidth:VEHICLE_DIMENSIONS.width,carLength:VEHICLE_DIMENSIONS.length,
 start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),sections,barriers,
 bridges:[{id:'lax-departures',from:{x:26,z:-19},to:{x:-82,z:-29},width:28}],
 // Continuous receiving roads. Normal approaches jump between street and apron;
 // very slow cars can descend the physical grade. There is no invisible water gap.
 terrainTakeoffs:[{id:'arrivals-street-takeoff',progress:c},{id:'public-to-airfield-takeoff',progress:f}].map(j=>{const center=samplePolyline(centerline,distances,j.progress),ahead=samplePolyline(centerline,distances,j.progress+1),len=distance(center,ahead);return{...j,center,forward:{x:(ahead.x-center.x)/len,z:(ahead.z-center.z)/len},width:16,launchBoost:6.5,launchSlope:.09,minimumSpeed:6,planningSpeed:26};}),
 hopShortcuts:[{id:'center-way',branch,width:16,obstacleId:'lax-center-way-equipment',entryProgress:progress(branch[0]),exitProgress:progress(branch.at(-1)!)}],
};
const [left,right]=roadEdges(centerline,27),branchDistances=cumulative(branch);
for(const [side,edge] of [left,right].entries())for(let i=0;i<edge.length-1;i+=4){
 const x=edge[i],y=edge[Math.min(i+4,edge.length-1)],s=distances[i];if(s<d||s>e)continue;
 if(projectToPolyline(x,branch,branchDistances).distance<13||projectToPolyline(y,branch,branchDistances).distance<13)continue;
 const dx=y.x-x.x,dz=y.z-x.z,len=Math.hypot(dx,dz),nx=-dz/len*.18,nz=dx/len*.18;
 barriers.push({id:`lax-departures-rail-${side}-${i}`,kind:'bridge-rail',bridgeId:'lax-departures',baseHeight:roadHeight(laxTrack,s),height:1.1,footprint:[{x:x.x+nx,z:x.z+nz},{x:y.x+nx,z:y.z+nz},{x:y.x-nx,z:y.z-nz},{x:x.x-nx,z:x.z-nz}]});
}
laxTrack.centerline=annotateRoad(centerline,laxTrack);laxTrack.start=laxTrack.centerline[0];
laxTrack.hopShortcuts![0].branch=annotateRoad(branch.map((point,i)=>({...point,courseProgress:progress(branch[0])+(progress(branch.at(-1)!)-progress(branch[0]))*i/(branch.length-1)})),laxTrack);
