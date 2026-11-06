import{fleetRails}from'./fleet-rails';
import{cumulative,projectToPolyline,samplePolyline}from'../geometry';
import{roundedCircuit}from'../road-geometry';
import{createStartFinish}from'../start-finish';
import{VEHICLE_DIMENSIONS}from'../vehicle-size';
import type{DeckSurface,Point,TrackBarrier,TrackDefinition,TrackJump,HopShortcut}from'../types';

const rect=(x:number,z:number,w:number,d:number):Point[]=>[{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}];
const centerline=roundedCircuit([[-55,-90],[95,-90],[95,90],[-95,90],[-95,-90],[-55,-90]].map(([x,z])=>({x,z})),12);
const distances=cumulative(centerline),length=distances.at(-1)!,progress=(p:Point)=>projectToPolyline(p,centerline,distances).progress;
const dd:Point[]=[{x:86,z:-48},{x:115,z:-48},{x:115,z:45},{x:69,z:45},{x:69,z:-7.757359313},{x:86,z:-24.757359313}];
const decks:DeckSurface[]=[
 {id:'carrier-a',kind:'carrier',elevation:12,footprint:rect(-130,-122,249,64)},
 {id:'destroyer-a',kind:'destroyer',elevation:8,footprint:dd},
 {id:'carrier-b',kind:'carrier',elevation:10,footprint:rect(-119,58,249,64)},
 {id:'destroyer-b',kind:'destroyer',elevation:8,footprint:dd.map(p=>({x:-p.x,z:-p.z}))},
 {id:'east-transfer',kind:'transfer',elevation:8,toElevation:10,from:{x:95,z:27},to:{x:95,z:58},footprint:rect(83,27,24,31)},
 {id:'west-transfer',kind:'transfer',elevation:8,toElevation:12,from:{x:-95,z:-27},to:{x:-95,z:-58},footprint:rect(-107,-58,24,31)},
];
const q=Math.SQRT1_2,lip={x:75-6*q,z:-18};
/** Clip a vessel's convex deck to its real launch/landing gates. */
function clip(poly:Point[],distance:(p:Point)=>number){const out:Point[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b);if(da>=-1e-8)out.push(a);if((da>=0)!==(db>=0)){const u=da/(da-db);out.push({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u});}}return out;}
let boat=[{x:2,z:-52},{x:70,z:-52},{x:80,z:-30},{x:67,z:-4},{x:12,z:-4},{x:2,z:-30}];
boat=clip(boat,p=>lip.x+lip.z-p.x-p.z);
decks.push({id:'support-a',kind:'support-ship',elevation:8,footprint:boat},{id:'support-b',kind:'support-ship',elevation:8,footprint:boat.map(p=>({x:-p.x,z:-p.z}))});
const mainA:TrackJump={id:'carrier-a-crossing',from:{x:95,z:-66},forward:{x:0,z:1},width:16,rampLength:8,lipHeight:1.2,gap:10,runout:60,corridorLength:78,takeoffElevation:12,landingElevation:8,takeoffSurfaceId:'carrier-a',landingSurfaceId:'destroyer-a',mandatory:true,branch:[{x:95,z:-70},{x:95,z:-66},{x:95,z:12}],entryProgress:progress({x:95,z:-70}),exitProgress:progress({x:95,z:12})};
const mainB:TrackJump={...mainA,id:'carrier-b-crossing',from:{x:-95,z:66},forward:{x:0,z:-1},takeoffElevation:10,takeoffSurfaceId:'carrier-b',landingSurfaceId:'destroyer-b',branch:mainA.branch.map(p=>({x:-p.x,z:-p.z})),entryProgress:progress({x:-95,z:70}),exitProgress:progress({x:-95,z:-12})};
const start=projectToPolyline({x:-28,z:-90},centerline,distances).point;
const arc=Array.from({length:25},(_,i)=>{const a=-Math.PI/2+i/24*Math.PI/2;return{x:-4+24*Math.cos(a),z:-66+24*Math.sin(a)};});
const end={x:lip.x-q*16,z:lip.z-q*16},c1={x:24,z:-8},c2={x:end.x-q*18,z:end.z-q*18};
const curve=Array.from({length:81},(_,i)=>{const t=i/80,u=1-t;return{x:u*u*u*20+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*end.x,z:u*u*u*-52+3*u*u*t*c1.z+3*u*t*t*c2.z+t*t*t*end.z};});
const approach=[start,...arc,{x:20,z:-58},...curve,{x:lip.x-q*8,z:lip.z-q*8},lip,{x:95,z:6}];
const enter:TrackJump={id:'support-a-hop',activation:'hop',from:{x:20,z:-58},forward:{x:0,z:1},width:16,rampLength:0,lipHeight:0,gap:6,runout:20,corridorLength:26,takeoffElevation:12,landingElevation:8,takeoffSurfaceId:'carrier-a',landingSurfaceId:'support-a',branch:[{x:20,z:-66},{x:20,z:-58},{x:20,z:-32}],entryProgress:progress(start),exitProgress:progress({x:95,z:6})};
const exit:TrackJump={id:'support-a-return',from:{x:lip.x-q*8,z:lip.z-q*8},forward:{x:q,z:q},width:16,rampLength:8,lipHeight:1.2,gap:6,runout:22,corridorLength:36,takeoffElevation:8,landingElevation:8,takeoffSurfaceId:'support-a',landingSurfaceId:'destroyer-a',branch:[{x:lip.x-q*10,z:lip.z-q*10},{x:lip.x-q*8,z:lip.z-q*8},{x:95,z:6}],entryProgress:enter.entryProgress,exitProgress:enter.exitProgress};
const lane:HopShortcut={id:'support-a-lane',branch:approach,width:16,crossings:[enter.id,exit.id],entryProgress:progress(start),exitProgress:progress(approach.at(-1)!)};
function mirrorJump(j:TrackJump):TrackJump{return{...j,id:j.id.replace('support-a','support-b'),from:{x:-j.from.x,z:-j.from.z},forward:{x:-j.forward.x,z:-j.forward.z},takeoffElevation:j.activation==='hop'?10:8,takeoffSurfaceId:j.takeoffSurfaceId?.replace('carrier-a','carrier-b').replace('support-a','support-b'),landingSurfaceId:j.landingSurfaceId?.replace('support-a','support-b').replace('destroyer-a','destroyer-b'),branch:j.branch.map(p=>({x:-p.x,z:-p.z})),entryProgress:progress({x:-start.x,z:-start.z}),exitProgress:progress({x:-95,z:-6})};}
const laneB:HopShortcut={...lane,id:'support-b-lane',branch:approach.map(p=>({x:-p.x,z:-p.z})),crossings:['support-b-hop','support-b-return'],entryProgress:progress({x:-start.x,z:-start.z}),exitProgress:progress({x:-95,z:-6})};
const barriers:TrackBarrier[]=[
 ...decks.filter(d=>d.kind!=='transfer').map(d=>({id:`${d.id}-hull`,deckSurfaceId:d.id,kind:'building' as const,baseHeight:-5,height:d.elevation+5,footprint:d.footprint})),
 {id:'carrier-a-island',kind:'building',baseHeight:12,height:12,footprint:rect(20,-118,10,14)},
 {id:'carrier-b-island',kind:'building',baseHeight:10,height:12,footprint:rect(-30,104,10,14)},
];
// Parked aircraft/equipment have their own finite, dimension-matched envelopes.
for(const side of[1,-1])for(const x of[-72,-57,-42,-27,-12])barriers.push({id:`parked-aircraft-${side}-${x}`,kind:'building',baseHeight:side===1?12:10,height:2.6,footprint:rect(side*x-4,side*-113-3.5,8,7)});
for(const side of[1,-1])barriers.push({id:'destroyer-bridge-'+side,kind:'building',baseHeight:8,height:4,footprint:rect(side*111-3,side*24-6,6,12)});
for(const side of[1,-1])barriers.push({id:'support-bridge-'+side,kind:'building',baseHeight:8,height:4,footprint:rect(side*7-3,side*-29-6,6,12)});
// Derived offline: importing a venue must not scan all route segments on startup.
barriers.push(...fleetRails);
export const sanDiegoFleetTrack:TrackDefinition={id:'san-diego-fleet',name:'San Diego Fleet',version:1,centerline,distances,length,roadWidth:16,carWidth:VEHICLE_DIMENSIONS.width,carLength:VEHICLE_DIMENSIONS.length,start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),decks,barriers,
 sections:[{id:'fleet-road',from:0,to:length,heights:[[0,12],[length,12]],supportWidth:16}],jumps:[mainA,mainB,enter,exit,mirrorJump(enter),mirrorJump(exit)],hopShortcuts:[lane,laneB]};
