import{fleetRails}from'./fleet-rails';
import{cumulative,projectToPolyline}from'../geometry';
import{roundedCircuit}from'../road-geometry';
import{createStartFinish}from'../start-finish';
import{VEHICLE_DIMENSIONS}from'../vehicle-size';
import type{DeckSurface,Point,TrackBarrier,TrackDefinition,TrackJump,HopShortcut}from'../types';

const rect=(x:number,z:number,w:number,d:number):Point[]=>[{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}];
/** Broad deck sweepers replace the rectangular lap. Every water mouth remains a straight, named crossing. */
const centerline=roundedCircuit([[-55,-90],[16,-90],[58,-103],[95,-84],[95,43],[80,92],[30,83],[-30,100],[-70,95],[-95,85],[-95,-90],[-55,-90]].map(([x,z])=>({x,z})),14);
const gateIndex=centerline.slice(0,-1).reduce((best,p,i)=>Math.hypot(p.x+55,p.z+90)<Math.hypot(centerline[best].x+55,centerline[best].z+90)?i:best,0);
centerline.splice(0,centerline.length,...centerline.slice(gateIndex,-1),...centerline.slice(0,gateIndex),{...centerline[gateIndex]});
const distances=cumulative(centerline),length=distances.at(-1)!,progress=(p:Point)=>projectToPolyline(p,centerline,distances).progress;
const carrier:Point[]=[{x:-133,z:-118},{x:-114,z:-126},{x:80,z:-122},{x:111,z:-110},{x:128,z:-88},{x:111,z:-58},{x:65,z:-58},{x:42,z:-58},{x:-70,z:-58},{x:-126,z:-66}];
// Long, pointed escorts. Only the narrow graded gangways join these bows to the next carrier.
const returnEdge=57+6*Math.SQRT1_2;
const escort:Point[]=[{x:79,z:-48},{x:111,z:-48},{x:117,z:-34},{x:117,z:15},{x:110,z:32},{x:95,z:49},{x:80,z:32},{x:73,z:15},{x:returnEdge+8,z:-8},{x:returnEdge+20,z:-20},{x:79,z:-34}];
const decks:DeckSurface[]=[
 {id:'carrier-a',kind:'carrier',elevation:24,footprint:carrier,vessel:{origin:{x:-8,z:-90},forward:{x:1,z:0}}},
 {id:'destroyer-a',kind:'destroyer',elevation:16,footprint:escort,vessel:{origin:{x:95,z:-4},forward:{x:0,z:1}}},
 {id:'carrier-b',kind:'carrier',elevation:22,footprint:carrier.map(p=>({x:-p.x,z:-p.z})),vessel:{origin:{x:8,z:90},forward:{x:-1,z:0}}},
 {id:'destroyer-b',kind:'destroyer',elevation:16,footprint:escort.map(p=>({x:-p.x,z:-p.z})),vessel:{origin:{x:-95,z:4},forward:{x:0,z:-1}}},
 {id:'east-transfer',kind:'transfer',elevation:16,toElevation:22,from:{x:95,z:27},to:{x:95,z:60},footprint:rect(84,27,22,39)},
 {id:'west-transfer',kind:'transfer',elevation:16,toElevation:24,from:{x:-95,z:-27},to:{x:-95,z:-60},footprint:rect(-106,-66,22,39)},
];
const q=Math.SQRT1_2,lip={x:75-6*q,z:-18};
function clip(poly:Point[],distance:(p:Point)=>number){const out:Point[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b);if(da>=-1e-8)out.push(a);if((da>=0)!==(db>=0)){const u=da/(da-db);out.push({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u});}}return out;}
let boat:Point[]=[{x:-8,z:-44},{x:1,z:-52},{x:58,z:-52},{x:82,z:-31},{x:65,z:-4},{x:12,z:-4},{x:-8,z:-20}];
boat=clip(boat,p=>lip.x+lip.z-p.x-p.z);
decks.push({id:'support-a',kind:'support-ship',elevation:16,footprint:boat,vessel:{origin:{x:30,z:-28},forward:{x:1,z:0}}},{id:'support-b',kind:'support-ship',elevation:16,footprint:boat.map(p=>({x:-p.x,z:-p.z})),vessel:{origin:{x:-30,z:28},forward:{x:-1,z:0}}});
const mainA:TrackJump={id:'carrier-a-crossing',from:{x:95,z:-66},forward:{x:0,z:1},width:16,rampLength:8,lipHeight:1.2,gap:10,runout:60,corridorLength:78,takeoffElevation:24,landingElevation:16,takeoffSurfaceId:'carrier-a',landingSurfaceId:'destroyer-a',mandatory:true,branch:[{x:95,z:-73},{x:95,z:-66},{x:95,z:12}],entryProgress:progress({x:95,z:-73}),exitProgress:progress({x:95,z:12})};
const mainB:TrackJump={...mainA,id:'carrier-b-crossing',from:{x:-95,z:66},forward:{x:0,z:-1},takeoffElevation:22,takeoffSurfaceId:'carrier-b',landingSurfaceId:'destroyer-b',branch:mainA.branch.map(p=>({x:-p.x,z:-p.z})),entryProgress:progress({x:-95,z:73}),exitProgress:progress({x:-95,z:-12})};
const start=projectToPolyline({x:-28,z:-90},centerline,distances).point;
const arc=Array.from({length:25},(_,i)=>{const a=-Math.PI/2+i/24*Math.PI/2;return{x:-4+24*Math.cos(a),z:-66+24*Math.sin(a)};});
const end={x:lip.x-q*16,z:lip.z-q*16},c1={x:24,z:-8},c2={x:end.x-q*18,z:end.z-q*18};
const curve=Array.from({length:81},(_,i)=>{const t=i/80,u=1-t;return{x:u*u*u*20+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*end.x,z:u*u*u*-52+3*u*u*t*c1.z+3*u*t*t*c2.z+t*t*t*end.z};});
const approach=[start,...arc,{x:20,z:-58},...curve,{x:lip.x-q*8,z:lip.z-q*8},lip,{x:95,z:6}];
const enter:TrackJump={id:'support-a-hop',activation:'hop',from:{x:20,z:-58},forward:{x:0,z:1},width:16,rampLength:0,lipHeight:0,gap:6,runout:20,corridorLength:26,takeoffElevation:24,landingElevation:16,takeoffSurfaceId:'carrier-a',landingSurfaceId:'support-a',branch:[{x:20,z:-66},{x:20,z:-58},{x:20,z:-32}],entryProgress:progress(start),exitProgress:progress({x:95,z:6})};
const exit:TrackJump={id:'support-a-return',from:{x:lip.x-q*8,z:lip.z-q*8},forward:{x:q,z:q},width:16,rampLength:8,lipHeight:1.2,gap:6,runout:22,corridorLength:36,takeoffElevation:16,landingElevation:16,takeoffSurfaceId:'support-a',landingSurfaceId:'destroyer-a',branch:[{x:lip.x-q*10,z:lip.z-q*10},{x:lip.x-q*8,z:lip.z-q*8},{x:95,z:6}],entryProgress:enter.entryProgress,exitProgress:enter.exitProgress};
const lane:HopShortcut={id:'support-a-lane',branch:approach,width:16,crossings:[enter.id,exit.id],entryProgress:progress(start),exitProgress:progress(approach.at(-1)!)};
function mirrorJump(j:TrackJump):TrackJump{return{...j,id:j.id.replace('support-a','support-b'),from:{x:-j.from.x,z:-j.from.z},forward:{x:-j.forward.x,z:-j.forward.z},takeoffElevation:j.activation==='hop'?22:16,takeoffSurfaceId:j.takeoffSurfaceId?.replace('carrier-a','carrier-b').replace('support-a','support-b'),landingSurfaceId:j.landingSurfaceId?.replace('support-a','support-b').replace('destroyer-a','destroyer-b'),branch:j.branch.map(p=>({x:-p.x,z:-p.z})),entryProgress:progress({x:-start.x,z:-start.z}),exitProgress:progress({x:-95,z:-(6)})};}
const laneB:HopShortcut={...lane,id:'support-b-lane',branch:approach.map(p=>({x:-p.x,z:-p.z})),crossings:['support-b-hop','support-b-return'],entryProgress:progress({x:-start.x,z:-start.z}),exitProgress:progress({x:-95,z:-(6)})};
laneB.branch[0]=projectToPolyline(laneB.branch[0],centerline,distances).point;laneB.entryProgress=progress(laneB.branch[0]);
const barriers:TrackBarrier[]=[
 ...decks.filter(d=>d.kind!=='transfer').map(d=>({id:`${d.id}-hull`,deckSurfaceId:d.id,kind:'building' as const,baseHeight:-5,height:d.elevation+5,footprint:d.footprint})),
 {id:'carrier-a-island',kind:'building',baseHeight:24,height:22,footprint:rect(-68,-72,36,13.5)},
 {id:'carrier-b-island',kind:'building',baseHeight:22,height:22,footprint:rect(-4,109,36,13)},
];
for(const side of[1,-1])for(const x of[-92,-68,-44,-20,4])barriers.push({id:`parked-aircraft-${side}-${x}`,kind:'building',baseHeight:side===1?24:22,height:4.5,footprint:rect(side*x-8,side*-115-5.5,16,11)});
for(const side of[1,-1]){
 for(const x of[-22,-8])barriers.push({id:`deck-tractor-${side}-${x}`,kind:'building',baseHeight:side===1?24:22,height:2.4,footprint:rect(side*x-3,side*-65-2,6,4)});
 barriers.push({id:'destroyer-bridge-'+side,kind:'building',baseHeight:16,height:12,footprint:rect(side*111.2-3,side*-3-8,6,16)});
 barriers.push({id:'destroyer-turret-'+side,kind:'building',baseHeight:16,height:4,footprint:rect(side*111.2-3,side*-29-5,6,10)});
 barriers.push({id:'support-bridge-'+side,kind:'building',baseHeight:16,height:12,footprint:rect(side*2.5-7.5,side*-32-11,15,22)});
}
/** The harbor is composed on a diagonal; all support, crossing, collider and visual coordinates share this rotation. */
const angle=.24,c=Math.cos(angle),s=Math.sin(angle),rotate=(p:Point):Point=>({...p,x:p.x*c-p.z*s,z:p.x*s+p.z*c});
for(let i=0;i<centerline.length;i++)centerline[i]=rotate(centerline[i]);
for(const d of decks){d.footprint=d.footprint.map(rotate);if(d.from)d.from=rotate(d.from);if(d.to)d.to=rotate(d.to);if(d.vessel)d.vessel={origin:rotate(d.vessel.origin),forward:rotate(d.vessel.forward)};}
for(const b of barriers)b.footprint=b.footprint.map(rotate);
const jumps=[mainA,mainB,enter,exit,mirrorJump(enter),mirrorJump(exit)];
for(const j of jumps){j.from=rotate(j.from);j.forward=rotate(j.forward);j.branch=j.branch.map(rotate);}
for(const h of[lane,laneB])h.branch=h.branch.map(rotate);
barriers.push(...fleetRails);
export const sanDiegoFleetTrack:TrackDefinition={id:'san-diego-fleet',name:'San Diego Fleet',version:2,centerline,distances,length,roadWidth:16,carWidth:VEHICLE_DIMENSIONS.width,carLength:VEHICLE_DIMENSIONS.length,start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),decks,barriers,
 sections:[{id:'fleet-road',from:0,to:length,heights:[[0,24],[length,24]],supportWidth:16}],jumps,hopShortcuts:[lane,laneB]};
