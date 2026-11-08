import { cumulative, distance, projectToPolyline, samplePolyline } from '../geometry';
import { annotateRoad, roadHeight } from '../elevation';
import { roundedCircuit, roadEdges } from '../road-geometry';
import { createStartFinish } from '../start-finish';
import { VEHICLE_DIMENSIONS } from '../vehicle-size';
import type { Point, RoadSection, TrackBarrier, TrackDefinition } from '../types';
import { obstacleRectangle } from './hop-obstacles';

/** Compact terminal streets, short runway sectors and a connecting apron, per owner map. */
export const LAX_LAYOUT={runwayX:82,wideRunwayX:96,runwayWidth:44,runwayCenterZ:65,runwayLength:450,lowerTurnZ:-80,apronEntryZ:162,horseshoeZ:145,hopZ:108,themeZ:35,towerZ:-32,parkingZ:21,parkingDepth:154,gardenZ:124,gardenDepth:12,apronBarrierWidth:.8,apronBarrierHeight:1.35,apronBarrierRunoff:5.2,streetX:26,streetHeight:3,gateZ:40,planeX:58,planeScale:.58,groundVehicleX:126,outerAircraftX:144,terminalWidth:11,terminalDepth:36,headWidth:32,headDepth:12};
/** Exactly two continuous paved runway strips; the reference racing sectors stay put. */
export const laxRunways=[-1,1].map(side=>({x:side*LAX_LAYOUT.wideRunwayX,z:LAX_LAYOUT.runwayCenterZ,width:LAX_LAYOUT.runwayWidth,length:LAX_LAYOUT.runwayLength,number:side<0?25:7}));
/** Public roads continue outside the course; curved closures turn traffic back onto the race. */
export const laxStreetExtensions=[-1,1].map(side=>({x:side*LAX_LAYOUT.streetX,fromZ:LAX_LAYOUT.lowerTurnZ+16,toZ:LAX_LAYOUT.lowerTurnZ-79,width:16}));
// Separate radii keep the deeper apron bends open on their inside edges.
const upper=roundedCircuit([[-82,162],[-82,185],[-48,225],[0,178],[48,225],[82,185],[82,162]].map(([x,z])=>({x,z})),20,false);
const lower=roundedCircuit([[82,162],[82,-80],[26,-80],[26,145],[-26,145],[-26,-80],[-82,-80],[-82,162]].map(([x,z])=>({x,z})),16,false);
const loop=[...upper.slice(0,-1),...lower];
const first=loop.slice(0,-1).reduce((a,p,i)=>distance(p,{x:-82,z:40})<distance(loop[a],{x:-82,z:40})?i:a,0);
const centerline=[...loop.slice(first,-1),...loop.slice(0,first),loop[first]],distances=cumulative(centerline),length=distances.at(-1)!;
const progress=(p:Point)=>projectToPolyline(p,centerline,distances).progress;
const p=(x:number,z:number)=>progress({x,z});
const section=(id:string,from:number,to:number,heights:[number,number][],supportWidth:number):RoadSection=>({id,from,to,heights,supportWidth});
const flat=(id:string,from:number,to:number,h:number,w:number)=>section(id,from,to,[[0,h],[to-from,h]],w);
const grade=(id:string,from:number,to:number,a:number,b:number,w=28)=>section(id,from,to,[[0,a],[to-from,b]],w);
const n0=p(-82,162),n1=p(82,162),a=p(82,-52),b=p(26,-60),c=p(26,-52),d=p(26,-46),e=p(-82,-56),f=p(-82,-48),g=p(-82,-42);
const sections:RoadSection[]=[
 flat('west-runway',0,n0,0,100),flat('north-apron',n0,n1,0,70),flat('east-runway',n1,a,0,100),
 grade('east-street-transfer',a,b,0,5),grade('arrivals-ramp',b,c,5,6.2),grade('arrivals-landing-slope',c,d,6.2,3),
 flat('public-horseshoe',d,e,3,28),grade('airfield-ramp',e,f,3,4.2),grade('airfield-landing-slope',f,g,4.2,0),flat('west-runway-return',g,length,0,100),
];
const branch=roundedCircuit([{x:26,z:87},{x:26,z:98},{x:15,z:108},{x:-15,z:108},{x:-26,z:98},{x:-26,z:87}],10,false);
const barriers:TrackBarrier[]=[
 {id:'lax-west-terminal-parcel',kind:'infield',height:4.1,footprint:obstacleRectangle(-53,45,14,194)},
 {id:'lax-east-terminal-parcel',kind:'infield',height:4.1,footprint:obstacleRectangle(39,45,14,194)},
 {id:'lax-central-parking',kind:'infield',height:4.1,footprint:obstacleRectangle(-12,LAX_LAYOUT.parkingZ,24,LAX_LAYOUT.parkingDepth)},
 {id:'lax-north-garden',kind:'infield',baseHeight:3,height:1.1,footprint:obstacleRectangle(-12,LAX_LAYOUT.gardenZ,24,LAX_LAYOUT.gardenDepth)},
 {id:'lax-center-way-equipment',kind:'service-barrier',baseHeight:3,height:1.8,runoffException:'hop-lane',footprint:obstacleRectangle(-.65,LAX_LAYOUT.hopZ,1.3,16)},
 {id:'lax-center-way-south-end',kind:'service-barrier',baseHeight:3,height:1.4,runoffException:'hop-lane',footprint:obstacleRectangle(-2,LAX_LAYOUT.hopZ-9,4,2)},
 {id:'lax-center-way-north-end',kind:'service-barrier',baseHeight:3,height:1.4,runoffException:'hop-lane',footprint:obstacleRectangle(-2,LAX_LAYOUT.hopZ+9,4,2)},
 {id:'lax-terminal-4',kind:'building',height:8,footprint:obstacleRectangle(-16,165,32,12)},
 {id:'lax-theme-building',kind:'building',baseHeight:3,height:14,footprint:obstacleRectangle(-10,LAX_LAYOUT.themeZ,20,20)},
 {id:'lax-control-tower',kind:'building',baseHeight:3,height:24,footprint:obstacleRectangle(-3,LAX_LAYOUT.towerZ,6,6)},
];
export const laxTerminals=[[-45.5,-25],[-45.5,45],[-45.5,115],[0,165],[45.5,115],[45.5,45],[45.5,-25]] as const;
export const laxApronAircraft=[-1,1].flatMap(side=>[-25,140].map(z=>[side*LAX_LAYOUT.outerAircraftX,z,side<0?0:Math.PI] as const));
export const laxRouteAircraft=[{x:-48,z:183,scale:.68,heading:Math.PI/2},{x:48,z:183,scale:.68,heading:-Math.PI/2}];
export const laxApronEquipment=[{x:-15,z:219,width:6,depth:5,height:3.1},{x:15,z:219,width:6,depth:5,height:3.1}];
export const laxCargoAprons=[275,-155].flatMap(z=>[-48,0,48].map(x=>({x,z,side:z>0?1:-1})));
export const laxGroundVehicles=[-1,1].flatMap(side=>[-28,48,124,200].map(z=>({x:side*LAX_LAYOUT.groundVehicleX,z})));
export const laxParkingCars=[-45,-29,-13,3,19,51,67,83];
function aircraftFootprint(x:number,z:number,scale:number,heading:number){
 const half=[[0,-18],[-1.7,-15],[-2,-1],[-11.5,6],[-10,9],[-1.8,6],[-1.2,12],[-4.8,16],[-4.6,18],[0,18]];
 return[...half,...half.slice(1,-1).reverse().map(([x,z])=>[-x,z])].map(([a,b])=>({x:x+(a*Math.cos(heading)+b*Math.sin(heading))*scale,z:z+(-a*Math.sin(heading)+b*Math.cos(heading))*scale}));
}
export const laxPlanting=[
 ...[-1,1].flatMap(side=>[10,80].map(z=>({x:side*46,z,y:3,height:3.4,radius:1.5,parcel:side<0?'lax-west-terminal-parcel':'lax-east-terminal-parcel'}))),
 ...[-9.5,9.5].flatMap(x=>[-37,-21,-5,11,59,75,91].map(z=>({x,z,y:3,height:3,radius:1.4,parcel:'lax-central-parking'}))),
 ...[-7,7].flatMap(x=>[121,127].map(z=>({x,z,y:3.25,height:2.5,radius:1.1,parcel:'lax-north-garden'}))),
];
for(const [i,[x,z]] of laxTerminals.entries())if(i!==3){
 barriers.push({id:`lax-terminal-${i+1}`,kind:'building',height:8,footprint:obstacleRectangle(x-LAX_LAYOUT.terminalWidth/2,z,LAX_LAYOUT.terminalWidth,LAX_LAYOUT.terminalDepth)});
 barriers.push({id:`lax-gate-aircraft-${i+1}`,kind:'building',height:5.8,footprint:aircraftFootprint(Math.sign(x)*58,z,.58,x<0?0:Math.PI)});
}
for(const [i,[x,z,heading]] of laxApronAircraft.entries())barriers.push({id:`lax-apron-aircraft-${i}`,kind:'building',height:10,footprint:aircraftFootprint(x,z,1,heading)});
for(const [i,a] of laxRouteAircraft.entries())barriers.push({id:`lax-taxi-aircraft-${i}`,kind:'building',height:10*a.scale,footprint:aircraftFootprint(a.x,a.z,a.scale,a.heading)});
for(const [i,a] of laxApronEquipment.entries())barriers.push({id:`lax-taxi-equipment-${i}`,kind:'building',height:a.height,footprint:obstacleRectangle(a.x-a.width/2,a.z,a.width,a.depth)});
for(const [i,{x,z,side}] of laxCargoAprons.entries()){
 barriers.push({id:`lax-cargo-airliner-${i}`,kind:'building',height:8,footprint:aircraftFootprint(x,z-side*7,.8,side>0?Math.PI:0)});
 barriers.push({id:`lax-maintenance-hangar-${i}`,kind:'building',height:11,footprint:obstacleRectangle(x-20,z+side*22,40,20.3)});
}
for(const {x,z} of laxGroundVehicles)barriers.push({id:`lax-ground-vehicle-${x}-${z}`,kind:'building',height:3.4,footprint:obstacleRectangle(x-2.6,z,5.2,8)});
export const laxTrack:TrackDefinition={
 id:'lax',name:'LAX',version:6,centerline,distances,length,roadWidth:16,carWidth:VEHICLE_DIMENSIONS.width,carLength:VEHICLE_DIMENSIONS.length,
 start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),sections,barriers,
 // The whole 44 m width of both visible runways grips like the road (v6). Elsewhere off-road remains loose.
 pavedAreas:laxRunways.map(r=>obstacleRectangle(r.x-r.width/2,r.z,r.width,r.length)),
 bridges:[{id:'lax-departures',from:{x:26,z:-46},to:{x:-82,z:-56},width:28}],
 // Continuous receiving roads. Normal approaches jump between street and apron;
 // very slow cars can descend the physical grade. There is no invisible water gap.
 terrainTakeoffs:[{id:'arrivals-street-takeoff',progress:c},{id:'public-to-airfield-takeoff',progress:f}].map(j=>{const center=samplePolyline(centerline,distances,j.progress),ahead=samplePolyline(centerline,distances,j.progress+1),len=distance(center,ahead);return{...j,center,forward:{x:(ahead.x-center.x)/len,z:(ahead.z-center.z)/len},width:16,launchBoost:6.5,launchSlope:.09,minimumSpeed:6,planningSpeed:26};}),
 hopShortcuts:[{id:'center-way',branch,width:16,obstacleId:'lax-center-way-equipment',entryProgress:progress(branch[0]),exitProgress:progress(branch.at(-1)!)}],
};
// Two continuous, solid apron perimeters, divided into small broad-phase parcels.
// Adjacent parcels share the exact same cross-section; there are no collision gaps.
const apronPath=[samplePolyline(centerline,distances,n0),...centerline.filter((_,i)=>distances[i]>n0+1e-6&&distances[i]<n1-1e-6),samplePolyline(centerline,distances,n1)];
const apronOffset=16/2+LAX_LAYOUT.apronBarrierRunoff+LAX_LAYOUT.apronBarrierWidth/2;
for(const [side,path] of roadEdges(apronPath,apronOffset*2,false).entries()){
 const [a,b]=roadEdges(path,LAX_LAYOUT.apronBarrierWidth,false);
 for(let i=0;i<path.length-1;i+=5){const end=Math.min(i+5,path.length-1);barriers.push({id:`lax-apron-edge-${side}-${i}`,kind:'infield',height:LAX_LAYOUT.apronBarrierHeight,footprint:[...a.slice(i,end+1),...b.slice(i,end+1).reverse()]});}
}
for(const [i,street] of laxStreetExtensions.entries()){
 const side=Math.sign(street.x),path=Array.from({length:21},(_,n)=>{const across=16+n;return{x:side*across,z:street.fromZ-Math.sqrt(29.5**2-(42-across)**2)};}),edges=roadEdges(path,1,false),footprint=[...edges[0],...edges[1].slice().reverse()];
 barriers.push({id:`lax-public-street-closure-${i}`,kind:'bridge-rail',bridgeId:'lax-departures',baseHeight:Math.min(...footprint.map(p=>roadHeight(laxTrack,progress(p)))),height:1.4,footprint});
}
const [left,right]=roadEdges(centerline,27),branchDistances=cumulative(branch);
for(const [side,edge] of [left,right].entries())for(let i=0;i<edge.length-1;i+=4){
 const x=edge[i],y=edge[Math.min(i+4,edge.length-1)],s=distances[i];if(s<d||s>e)continue;
 if(projectToPolyline(x,branch,branchDistances).distance<13||projectToPolyline(y,branch,branchDistances).distance<13)continue;
 const dx=y.x-x.x,dz=y.z-x.z,len=Math.hypot(dx,dz),nx=-dz/len*.18,nz=dx/len*.18;
 barriers.push({id:`lax-departures-rail-${side}-${i}`,kind:'bridge-rail',bridgeId:'lax-departures',baseHeight:roadHeight(laxTrack,s),height:1.1,footprint:[{x:x.x+nx,z:x.z+nz},{x:y.x+nx,z:y.z+nz},{x:y.x-nx,z:y.z-nz},{x:x.x-nx,z:x.z-nz}]});
}
laxTrack.centerline=annotateRoad(centerline,laxTrack);laxTrack.start=laxTrack.centerline[0];
laxTrack.hopShortcuts![0].branch=annotateRoad(branch.map((point,i)=>({...point,courseProgress:progress(branch[0])+(progress(branch.at(-1)!)-progress(branch[0]))*i/(branch.length-1)})),laxTrack);
