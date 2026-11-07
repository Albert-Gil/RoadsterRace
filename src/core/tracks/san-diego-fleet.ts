import{fleetRails}from'./fleet-rails';
import{cumulative,projectToPolyline}from'../geometry';
import{roundedCircuit}from'../road-geometry';
import{createStartFinish}from'../start-finish';
import{VEHICLE_DIMENSIONS}from'../vehicle-size';
import type{DeckSurface,Point,TrackBarrier,TrackDefinition,TrackJump,HopShortcut}from'../types';

const angle=.24,c=Math.cos(angle),s=Math.sin(angle);
const world=(p:Point):Point=>{const x=p.x+.3*p.z;return{x:x*c-p.z*s,z:x*s+p.z*c};};
const unit=(p:Point)=>{const q=world(p),n=Math.hypot(q.x,q.z);return{x:q.x/n,z:q.z/n};};
const mirror=(p:Point):Point=>({x:-p.x,z:-p.z});
const at=(p:Point,f:Point,along:number,across=0):Point=>({x:p.x+f.x*along+f.z*across,z:p.z+f.z*along-f.x*across});
const box=(x:number,z:number,w:number,d:number)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]].map(([x,z])=>world({x,z}));
/** Every mouth is perpendicular to the final world-space driving axis, after harbor composition. */
function clip(poly:Point[],origin:Point,f:Point,keepForward:boolean){const sign=keepForward?1:-1,dist=(p:Point)=>sign*((p.x-origin.x)*f.x+(p.z-origin.z)*f.z),out:Point[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=dist(a),db=dist(b);if(da>=-1e-8)out.push(a);if((da>=0)!==(db>=0)){const u=da/(da-db);out.push({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u});}}return out;}
const centerline=roundedCircuit([[-55,-90],[16,-90],[58,-106],[95,-96],[95,100],[30,83],[-30,100],[-70,95],[-95,85],[-95,-90],[-55,-90]].map(([x,z])=>world({x,z})),20);
const gate=world({x:-55,z:-90}),gateIndex=centerline.slice(0,-1).reduce((best,p,i)=>Math.hypot(p.x-gate.x,p.z-gate.z)<Math.hypot(centerline[best].x-gate.x,centerline[best].z-gate.z)?i:best,0);
centerline.splice(0,centerline.length,...centerline.slice(gateIndex,-1),...centerline.slice(0,gateIndex),{...centerline[gateIndex]});
const distances=cumulative(centerline),length=distances.at(-1)!,project=(p:Point)=>projectToPolyline(p,centerline,distances),progress=(p:Point)=>project(p).progress;
const forward=unit({x:0,z:1}),hopForward=unit({x:Math.sqrt(3)/2,z:.5}),hopLip=world({x:-10,z:-58});
const mainLip=world({x:95,z:-58}),mainLanding=at(mainLip,forward,14),returnLip=world({x:95,z:54}),returnLanding=world({x:95,z:66});
const oldReturnEdge=57+6*Math.SQRT1_2,rawLandingS=(oldReturnEdge+68)/(Math.sqrt(3)/2+.5),oldLanding=world({x:-10+Math.sqrt(3)/2*rawLandingS,z:-58+.5*rawLandingS});
const supportLanding=at(oldLanding,hopForward,7),supportBow=at(supportLanding,hopForward,-12),supportLength=(supportBow.x-hopLip.x)*hopForward.x+(supportBow.z-hopLip.z)*hopForward.z;
const carrierRaw=[[-133,-118],[-114,-126],[80,-122],[111,-110],[128,-88],[111,-58],[65,-58],[42,-58]];
let carrier=[...carrierRaw.map(([x,z])=>world({x,z})),at(hopLip,hopForward,0,14),at(hopLip,hopForward,0,-14),world({x:-35,z:-58}),world({x:-70,z:-58}),at(mirror(returnLanding),mirror(forward),0,-10),at(mirror(returnLanding),mirror(forward),0,10),world({x:-126,z:-66})];
carrier=clip(carrier,mainLip,forward,false);
// Fine foredecks and a native port-side receiving shoulder; no connecting platform.
const escort=[at(mainLanding,forward,0,-13),at(mainLanding,forward,0,13),world({x:115,z:-30}),world({x:115,z:22}),at(returnLip,forward,0,8.6),at(returnLip,forward,0,-8.6),world({x:75,z:22}),at(supportLanding,hopForward,0,-10),at(supportLanding,hopForward,0,10),world({x:76,z:-30})];
const support=[at(hopLip,hopForward,8,-12.5),at(hopLip,hopForward,17,-15.5),at(hopLip,hopForward,supportLength-19,-15.5),at(hopLip,hopForward,supportLength,-8.6),at(hopLip,hopForward,supportLength,8.6),at(hopLip,hopForward,supportLength-19,15.5),at(hopLip,hopForward,17,15.5),at(hopLip,hopForward,8,12.5)];
const decks:DeckSurface[]=[
 {id:'carrier-a',kind:'carrier',racingSurface:true,elevation:24,footprint:carrier,vessel:{origin:world({x:-8,z:-90}),forward:unit({x:1,z:0})}},
 {id:'destroyer-a',kind:'destroyer',racingSurface:true,elevation:16,footprint:escort,vessel:{origin:world({x:101,z:-4}),forward}},
 {id:'carrier-b',kind:'carrier',racingSurface:true,elevation:22,footprint:carrier.map(mirror),vessel:{origin:world({x:8,z:90}),forward:unit({x:-1,z:0})}},
 {id:'destroyer-b',kind:'destroyer',racingSurface:true,elevation:16,footprint:escort.map(mirror),vessel:{origin:world({x:-101,z:4}),forward:mirror(forward)}},
 {id:'support-a',kind:'support-ship',elevation:24,racingSurface:true,footprint:support,vessel:{origin:at(hopLip,hopForward,(8+supportLength)/2),forward:hopForward}},
 {id:'support-b',kind:'support-ship',elevation:22,racingSurface:true,footprint:support.map(mirror),vessel:{origin:mirror(at(hopLip,hopForward,(8+supportLength)/2)),forward:mirror(hopForward)}},
];
function crossing(id:string,lip:Point,f:Point,landing:Point,takeoffSurfaceId:string,landingSurfaceId:string,boost:number,slope:number,mandatory=false):TrackJump{
 const from=at(lip,f,-16),gap=(landing.x-lip.x)*f.x+(landing.z-lip.z)*f.z,source=decks.find(d=>d.id===takeoffSurfaceId)!,target=decks.find(d=>d.id===landingSurfaceId)!;
 return{id,from,forward:f,width:16,rampLength:16,lipHeight:3,launchBoost:boost,launchSlope:slope,gap,runout:50,corridorLength:16+gap+50,takeoffElevation:source.elevation,landingElevation:target.elevation,takeoffSurfaceId,landingSurfaceId,mandatory,branch:[at(from,f,-4),from,lip,landing,at(landing,f,10)],entryProgress:progress(at(from,f,-4)),exitProgress:progress(at(landing,f,10))};
}
const mainA=crossing('carrier-a-crossing',mainLip,forward,mainLanding,'carrier-a','destroyer-a',8,.08,true);
const upA=crossing('destroyer-a-return',returnLip,forward,returnLanding,'destroyer-a','carrier-b',20,.03,true);
const mainB=crossing('carrier-b-crossing',mirror(mainLip),mirror(forward),mirror(mainLanding),'carrier-b','destroyer-b',8,.08,true);
const upB=crossing('destroyer-b-return',mirror(returnLip),mirror(forward),mirror(returnLanding),'destroyer-b','carrier-a',26,.03,true);
upA.planningSpeed=18.5;upB.planningSpeed=18.5;
const start=project(world({x:-46,z:-90})).point,join=world({x:95,z:-58+.5*(105/(Math.sqrt(3)/2))});
const approach=[start,world({x:-35,z:-90}),at(hopLip,hopForward,-18),at(hopLip,hopForward,-8),hopLip,at(hopLip,hopForward,10),at(hopLip,hopForward,45),at(supportBow,hopForward,-16),supportBow,join];
const enter:TrackJump={id:'support-a-hop',activation:'hop',from:hopLip,forward:hopForward,width:24,rampLength:0,lipHeight:0,gap:8,runout:50,corridorLength:58,takeoffElevation:24,landingElevation:24,takeoffSurfaceId:'carrier-a',landingSurfaceId:'support-a',branch:[at(hopLip,hopForward,-8),hopLip,at(hopLip,hopForward,60)],entryProgress:progress(start),exitProgress:progress(join)};
const exit=crossing('support-a-return',supportBow,hopForward,supportLanding,'support-a','destroyer-a',8,-.1);exit.entryProgress=enter.entryProgress;exit.exitProgress=enter.exitProgress;
const lane:HopShortcut={id:'support-a-lane',branch:approach,width:24,crossings:[enter.id,exit.id],entryProgress:enter.entryProgress,exitProgress:enter.exitProgress};
const enterB:TrackJump={...enter,id:'support-b-hop',from:mirror(hopLip),forward:mirror(hopForward),takeoffElevation:22,landingElevation:22,takeoffSurfaceId:'carrier-b',landingSurfaceId:'support-b',branch:enter.branch.map(mirror),entryProgress:progress(mirror(start)),exitProgress:progress(mirror(join))};
const exitB=crossing('support-b-return',mirror(supportBow),mirror(hopForward),mirror(supportLanding),'support-b','destroyer-b',8,-.1);exitB.entryProgress=enterB.entryProgress;exitB.exitProgress=enterB.exitProgress;
const laneB:HopShortcut={...lane,id:'support-b-lane',branch:approach.map(mirror),crossings:[enterB.id,exitB.id],entryProgress:enterB.entryProgress,exitProgress:enterB.exitProgress};laneB.branch[0]=project(laneB.branch[0]).point;laneB.entryProgress=progress(laneB.branch[0]);
const jumps=[mainA,upA,mainB,upB,enter,exit,enterB,exitB];
const barriers:TrackBarrier[]=decks.map(d=>({id:d.id+'-hull',deckSurfaceId:d.id,kind:'building',baseHeight:-5,height:d.elevation+5,footprint:d.footprint}));
for(const side of[1,-1]){
 const owner=side===1?'a':'b',base=side===1?24:22;
 const add=(id:string,vessel:string,x:number,z:number,w:number,d:number,height:number,equipmentKind?:TrackBarrier['equipmentKind'])=>barriers.push({id,vesselSurfaceId:vessel,sectionId:'fleet-road',runoffException:'naval-deck',kind:'building',baseHeight:vessel.startsWith('destroyer')?16:base,height,footprint:side===1?box(x,z,w,d):box(x,z,w,d).map(mirror),...(equipmentKind?{equipmentKind}:{})});
 add('carrier-'+owner+'-island','carrier-'+owner,32,side===1?-80:-78,50,side===1?18:16,48);
 add('carrier-'+owner+'-island-annex','carrier-'+owner,20,-77,12,12,22,'command-annex');
 add(`parked-aircraft-${side}--92`,'carrier-'+owner,-125,-116,18,14,6);
 add(`parked-aircraft-${side}-4`,'carrier-'+owner,-4,-120.5,16,11,4.5);
 add(`parked-aircraft-${side}-36`,'carrier-'+owner,24,-122,22,10,5.5);
 add(`parked-aircraft-${side}--91`,'carrier-'+owner,-100,-121,18,11,5);
 add('fleet-engine-spares-'+owner,'carrier-'+owner,0,-79,14,6,3.6,'engine-rack');
 add('fleet-hawkeye-'+owner,'carrier-'+owner,-72,-122.5,28,16,6.5,'early-warning-aircraft');
 add('fleet-transport-'+owner,'carrier-'+owner,-28,-123,22,15,7,'transport-helicopter');
 add('fleet-crane-'+owner,'carrier-'+owner,-65,-71,20,12,13,'deck-crane');
 add('fleet-crash-truck-'+owner,'carrier-'+owner,-77,-70,10,6,4,'crash-truck');
 add('fleet-workshop-'+owner,'carrier-'+owner,-125,-78,18,9,6.5,'deck-workshop');
 add('fleet-fuel-bowser-'+owner,'carrier-'+owner,-44,-71,12,6,4.2,'fuel-bowser');
 add('fleet-mooring-winch-'+owner,'carrier-'+owner,111,-98,8,7,4.5,'cable-winch');
 add('fleet-blast-deflector-'+owner,'carrier-'+owner,-42,-106,13,3,3.5,'jet-deflector');
 for(const x of[56,65])add(`deck-tractor-${side}-${x}`,'carrier-'+owner,x-3,-120,6,4,2.4);
 add('destroyer-bridge-'+side,'destroyer-'+owner,105.5,-10,9,30,36);
 add('destroyer-turret-'+side,'destroyer-'+owner,107.1,-37,5,10,6);
 add('fleet-launch-cells-'+owner,'destroyer-'+owner,78.5,12,6,14,3.2,'missile-launcher');
 add('fleet-escort-bowser-'+owner,'destroyer-'+owner,106,-25,7,8,4.2,'fuel-bowser');
 add('fleet-escort-winch-'+owner,'destroyer-'+owner,106,24,5,6,4.5,'cable-winch');
 const ps=[at(hopLip,hopForward,24,10.05),at(hopLip,hopForward,58,10.05),at(hopLip,hopForward,58,15.25),at(hopLip,hopForward,24,15.25)];
 const rack=[at(hopLip,hopForward,60,-13.85),at(hopLip,hopForward,78,-13.85),at(hopLip,hopForward,78,-10.05),at(hopLip,hopForward,60,-10.05)];
 barriers.push({id:'fleet-support-rack-'+side,equipmentKind:'engine-rack',vesselSurfaceId:'support-'+owner,sectionId:'fleet-road',runoffException:'naval-deck',kind:'building',baseHeight:base,height:3.6,footprint:side===1?rack:rack.map(mirror)});
 const winch=[at(hopLip,hopForward,29,-15.25),at(hopLip,hopForward,43,-15.25),at(hopLip,hopForward,43,-10.05),at(hopLip,hopForward,29,-10.05)];
 barriers.push({id:'fleet-support-winch-'+side,equipmentKind:'cable-winch',vesselSurfaceId:'support-'+owner,sectionId:'fleet-road',runoffException:'naval-deck',kind:'building',baseHeight:base,height:4.5,footprint:side===1?winch:winch.map(mirror)});
 barriers.push({id:'support-bridge-'+side,vesselSurfaceId:'support-'+owner,sectionId:'fleet-road',runoffException:'naval-deck',kind:'building',baseHeight:base,height:28,footprint:side===1?ps:ps.map(mirror)});
}
for(const j of jumps.filter(j=>j.rampLength>0)){
 const point=(along:number,across=0)=>at(j.from,j.forward,along,across);
 decks.push({id:j.id+'-ramp',kind:'transfer',rampId:j.id,racingSurface:true,elevation:j.takeoffElevation!,toElevation:j.takeoffElevation!+j.lipHeight,from:j.from,to:point(j.rampLength),footprint:[point(0,-8),point(j.rampLength,-8),point(j.rampLength,8),point(0,8)]});
}
barriers.push(...fleetRails);
export const sanDiegoFleetTrack:TrackDefinition={id:'san-diego-fleet',name:'San Diego Fleet',version:6,centerline,distances,length,roadWidth:16,carWidth:VEHICLE_DIMENSIONS.width,carLength:VEHICLE_DIMENSIONS.length,start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),decks,barriers,sections:[{id:'fleet-road',from:0,to:length,heights:[[0,24],[length,24]],supportWidth:16}],jumps,hopShortcuts:[lane,laneB]};
