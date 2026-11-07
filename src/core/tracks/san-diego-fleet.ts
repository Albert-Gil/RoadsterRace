import{fleetRails}from'./fleet-rails';
import{cumulative,projectToPolyline,samplePolyline}from'../geometry';
import{roundedCircuit}from'../road-geometry';
import{createStartFinish}from'../start-finish';
import{VEHICLE_DIMENSIONS}from'../vehicle-size';
import type{DeckSurface,Point,TrackBarrier,TrackDefinition,TrackJump,HopShortcut}from'../types';

const rect=(x:number,z:number,w:number,d:number):Point[]=>[{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}];
const mirror=(p:Point):Point=>({x:-p.x,z:-p.z});
/** Staggered carriers and diagonal escorts form a flowing harbor lap, not a box. */
const centerline=roundedCircuit([[-55,-90],[16,-90],[58,-103],[95,-84],[95,43],[80,92],[30,83],[-30,100],[-70,95],[-95,85],[-95,-90],[-55,-90]].map(([x,z])=>({x,z})),20);
const gateIndex=centerline.slice(0,-1).reduce((best,p,i)=>Math.hypot(p.x+55,p.z+90)<Math.hypot(centerline[best].x+55,centerline[best].z+90)?i:best,0);
centerline.splice(0,centerline.length,...centerline.slice(gateIndex,-1),...centerline.slice(0,gateIndex),{...centerline[gateIndex]});
const rawCenterline=centerline.map(p=>({...p})),rawDistances=cumulative(centerline),progress=(p:Point)=>projectToPolyline(p,centerline,rawDistances).progress;
const f={x:Math.sqrt(3)/2,z:.5},entry={x:-10,z:-58},at=(s:number,t=0):Point=>({x:entry.x+f.x*s+f.z*t,z:entry.z+f.z*s-f.x*t});
// These deck-edge mouths meet the exact six-metre unsupported openings, including their full beam.
const returnEdge=57+6*Math.SQRT1_2,landingS=(returnEdge-entry.x-entry.z)/(f.x+f.z),lipS=landingS-6;
const carrier:Point[]=[{x:-133,z:-118},{x:-114,z:-126},{x:80,z:-122},{x:111,z:-110},{x:128,z:-88},{x:111,z:-58},{x:65,z:-58},{x:42,z:-58},at(0,13),at(0,-13),{x:-35,z:-58},{x:-70,z:-58},{x:-126,z:-66}];
const escort:Point[]=[{x:79,z:-48},{x:111,z:-48},{x:117,z:-34},{x:117,z:15},{x:110,z:32},{x:95,z:49},{x:80,z:32},{x:73,z:15},{x:returnEdge+8,z:-8},{x:returnEdge+20,z:-20},{x:79,z:-34}];
const boat=[at(6,11),at(12,13),at(lipS-18,13),at(lipS,9.2),at(lipS,-9.2),at(lipS-18,-13),at(12,-13),at(6,-11)];
const decks:DeckSurface[]=[
 {id:'carrier-a',kind:'carrier',elevation:24,footprint:carrier,vessel:{origin:{x:-8,z:-90},forward:{x:1,z:0}}},
 {id:'destroyer-a',kind:'destroyer',elevation:16,footprint:escort,vessel:{origin:{x:95,z:-4},forward:{x:0,z:1}}},
 {id:'carrier-b',kind:'carrier',elevation:22,footprint:carrier.map(mirror),vessel:{origin:{x:8,z:90},forward:{x:-1,z:0}}},
 {id:'destroyer-b',kind:'destroyer',elevation:16,footprint:escort.map(mirror),vessel:{origin:{x:-95,z:4},forward:{x:0,z:-1}}},
 {id:'east-transfer',kind:'transfer',elevation:16,toElevation:22,from:{x:95,z:27},to:{x:95,z:60},footprint:rect(84,27,22,39)},
 {id:'west-transfer',kind:'transfer',elevation:16,toElevation:24,from:{x:-95,z:-27},to:{x:-95,z:-60},footprint:rect(-106,-66,22,39)},
 {id:'support-a',kind:'support-ship',elevation:16,racingSurface:true,footprint:boat,vessel:{origin:at((6+lipS)/2),forward:f}},
 {id:'support-b',kind:'support-ship',elevation:16,racingSurface:true,footprint:boat.map(mirror),vessel:{origin:mirror(at((6+lipS)/2)),forward:mirror(f)}},
];
const mainA:TrackJump={id:'carrier-a-crossing',from:{x:95,z:-70},forward:{x:0,z:1},width:16,rampLength:12,lipHeight:3,launchSlope:.08,gap:10,runout:60,corridorLength:82,takeoffElevation:24,landingElevation:16,takeoffSurfaceId:'carrier-a',landingSurfaceId:'destroyer-a',mandatory:true,branch:[{x:95,z:-77},{x:95,z:-70},{x:95,z:12}],entryProgress:progress({x:95,z:-77}),exitProgress:progress({x:95,z:12})};
const mainB:TrackJump={...mainA,id:'carrier-b-crossing',from:mirror(mainA.from),forward:mirror(mainA.forward),takeoffElevation:22,takeoffSurfaceId:'carrier-b',landingSurfaceId:'destroyer-b',branch:mainA.branch.map(mirror),entryProgress:progress({x:-95,z:77}),exitProgress:progress({x:-95,z:-12})};
const start=projectToPolyline({x:-46,z:-90},centerline,rawDistances).point,join=at((95-entry.x)/f.x);
// The approach joins a straight working deck; there is no painted branch or activation area.
const approach=[start,{x:-35,z:-90},at(-18),at(-8),at(0),at(6),at(40),at(lipS-12),at(lipS),join];
const enter:TrackJump={id:'support-a-hop',activation:'hop',from:entry,forward:f,width:24,rampLength:0,lipHeight:0,gap:6,runout:20,corridorLength:26,takeoffElevation:24,landingElevation:16,takeoffSurfaceId:'carrier-a',landingSurfaceId:'support-a',branch:[at(-8),at(0),at(26)],entryProgress:progress(start),exitProgress:progress(join)};
const exit:TrackJump={id:'support-a-return',from:at(lipS-12),forward:f,width:16,rampLength:12,lipHeight:3,launchSlope:.08,gap:6,runout:38,corridorLength:56,takeoffElevation:16,landingElevation:16,takeoffSurfaceId:'support-a',landingSurfaceId:'destroyer-a',branch:[at(lipS-14),at(lipS-12),join],entryProgress:enter.entryProgress,exitProgress:enter.exitProgress};
const lane:HopShortcut={id:'support-a-lane',branch:approach,width:24,crossings:[enter.id,exit.id],entryProgress:progress(start),exitProgress:progress(join)};
function mirrorJump(j:TrackJump):TrackJump{return{...j,id:j.id.replace('support-a','support-b'),from:mirror(j.from),forward:mirror(j.forward),takeoffElevation:j.activation==='hop'?22:16,takeoffSurfaceId:j.takeoffSurfaceId?.replace('carrier-a','carrier-b').replace('support-a','support-b'),landingSurfaceId:j.landingSurfaceId?.replace('support-a','support-b').replace('destroyer-a','destroyer-b'),branch:j.branch.map(mirror),entryProgress:progress(mirror(start)),exitProgress:progress(mirror(join))};}
const laneB:HopShortcut={...lane,id:'support-b-lane',branch:approach.map(mirror),crossings:['support-b-hop','support-b-return'],entryProgress:progress(mirror(start)),exitProgress:progress(mirror(join))};
laneB.branch[0]=projectToPolyline(laneB.branch[0],centerline,rawDistances).point;laneB.entryProgress=progress(laneB.branch[0]);
const barriers:TrackBarrier[]=[
 ...decks.filter(d=>d.vessel).map(d=>({id:`${d.id}-hull`,deckSurfaceId:d.id,kind:'building' as const,baseHeight:-5,height:d.elevation+5,footprint:d.footprint})),
 {id:'carrier-a-island',kind:'building',baseHeight:24,height:22,footprint:rect(34,-80,32,13)},
 {id:'carrier-b-island',kind:'building',baseHeight:22,height:22,footprint:rect(-4,109,36,13)},
];
for(const side of[1,-1])for(const x of[-92,-68,-44,-20,4])barriers.push({id:`parked-aircraft-${side}-${x}`,kind:'building',baseHeight:side===1?24:22,height:4.5,footprint:rect(side*x-8,side*-115-5.5,16,11)});
for(const side of[1,-1]){
 for(const x of[70,77])barriers.push({id:`deck-tractor-${side}-${x}`,kind:'building',baseHeight:side===1?24:22,height:2.4,footprint:rect(side*x-3,side*-65-2,6,4)});
 barriers.push({id:'destroyer-bridge-'+side,kind:'building',baseHeight:16,height:12,footprint:rect(side*111.7-3,side*-3-8,6,16)});
 barriers.push({id:'destroyer-turret-'+side,kind:'building',baseHeight:16,height:4,footprint:rect(side*111.7-3,side*-29-5,6,10)});
}
/** A shared affine harbor composition staggers the ships and inclines the escort axes.
 * Recompute distances/progression: unlike a rigid rotation, this changes authored course lengths. */
const jumps=[mainA,mainB,enter,exit,mirrorJump(enter),mirrorJump(exit)];
const angle=.24,c=Math.cos(angle),s=Math.sin(angle),transform=(p:Point):Point=>{const x=p.x+.30*p.z;return{...p,x:x*c-p.z*s,z:x*s+p.z*c};};
const direction=(p:Point)=>{const q=transform(p),scale=Math.hypot(q.x,q.z);return{vector:{x:q.x/scale,z:q.z/scale},scale};};
for(let i=0;i<centerline.length;i++)centerline[i]=transform(centerline[i]);
const distances=cumulative(centerline),length=distances.at(-1)!,remap=(value:number)=>projectToPolyline(transform(samplePolyline(rawCenterline,rawDistances,value)),centerline,distances).progress;
for(const d of decks){d.footprint=d.footprint.map(transform);if(d.from&&d.to){const dx=d.to.x-d.from.x,dz=d.to.z-d.from.z;d.gradeNormal={x:dx*c-(dz-.3*dx)*s,z:dx*s+(dz-.3*dx)*c};}if(d.from)d.from=transform(d.from);if(d.to)d.to=transform(d.to);if(d.vessel)d.vessel={origin:transform(d.vessel.origin),forward:direction(d.vessel.forward).vector};}
for(const b of barriers)b.footprint=b.footprint.map(transform);
for(const j of jumps){const {vector,scale}=direction(j.forward);j.from=transform(j.from);j.forward=vector;j.rampLength*=scale;j.gap*=scale;j.runout*=scale;j.corridorLength*=scale;j.branch=j.branch.map(transform);j.entryProgress=remap(j.entryProgress);j.exitProgress=remap(j.exitProgress);}
for(const h of[lane,laneB]){h.branch=h.branch.map(transform);h.entryProgress=remap(h.entryProgress);h.exitProgress=remap(h.exitProgress);}
// A real, full-width steel wedge supports every automatic launch. Guides across water never do.
for(const j of jumps.filter(j=>j.rampLength>0)){
 const at=(along:number,across:number):Point=>({x:j.from.x+j.forward.x*along+j.forward.z*across,z:j.from.z+j.forward.z*along-j.forward.x*across});
 decks.push({id:j.id+'-ramp',kind:'transfer',rampId:j.id,racingSurface:j.takeoffSurfaceId?.startsWith('support-'),elevation:j.takeoffElevation!,toElevation:j.takeoffElevation!+j.lipHeight,from:j.from,to:at(j.rampLength,0),footprint:[at(0,-j.width/2),at(j.rampLength,-j.width/2),at(j.rampLength,j.width/2),at(0,j.width/2)]});
}
barriers.push(...fleetRails);
export const sanDiegoFleetTrack:TrackDefinition={id:'san-diego-fleet',name:'San Diego Fleet',version:3,centerline,distances,length,roadWidth:16,carWidth:VEHICLE_DIMENSIONS.width,carLength:VEHICLE_DIMENSIONS.length,start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),decks,barriers,
 sections:[{id:'fleet-road',from:0,to:length,heights:[[0,24],[length,24]],supportWidth:16}],jumps,hopShortcuts:[lane,laneB]};
