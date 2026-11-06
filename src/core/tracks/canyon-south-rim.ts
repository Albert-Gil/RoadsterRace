import { VEHICLE_DIMENSIONS } from '../vehicle-size';
import { roundedCircuit } from '../road-geometry';
import { cumulative, distance, lerp, projectToPolyline, samplePolyline } from '../geometry';
import { annotateRoad, roadHeight } from '../elevation';
import { createStartFinish } from '../start-finish';
import { outcrop } from './outcrop';
import type { HopShortcut, Point, RoadSection, TrackBarrier, TrackDefinition } from '../types';

/** Separate South Rim candidate: the original Grand Canyon stays registered. */
const path=roundedCircuit([[-50,-74],[-112,-74],[-140,-50],[-153,-10],[-133,28],[-105,0],[118,0],[144,40],[126,78],[77,119],[32,76],[0,76],[0,-74]].map(([x,z])=>({x,z})),22);
const distances=cumulative(path),length=distances.at(-1)!;
const at=(p:Point)=>projectToPolyline(p,path,distances).progress;
const approach=at({x:-85,z:0}),lip=at({x:-15,z:0}),landing=at({x:15,z:0}),mesa=at({x:95,z:0}),descent=at({x:50,z:85}),floor=at({x:0,z:22});
const sections:RoadSection[]=[
 {id:'western-floor',from:0,to:approach,heights:[[0,0],[70,0],[approach-25,10.4],[approach,10.4]],supportWidth:28},
 {id:'upper-approach',from:approach,to:lip,heights:[[0,10.4],[lip-approach-8,10.4],[lip-approach,12]],supportWidth:36,supportWidths:[[0,28],[18,36],[lip-approach-16,36],[lip-approach,24]]},
 {id:'air-crossing',from:lip,to:landing,heights:[[0,12],[landing-lip,10]],supportWidth:16,flight:true},
 {id:'receiving-ledge',from:landing,to:mesa,heights:[[0,10],[mesa-landing,10]],supportWidth:32,supportWidths:[[0,16],[16,20],[50,29],[mesa-landing,32]]},
 {id:'eastern-mesa',from:mesa,to:descent,heights:[[0,10],[descent-mesa,10]],supportWidth:32},
 {id:'descent',from:descent,to:floor,heights:[[0,10],[floor-descent,0]],supportWidth:32,supportWidths:[[0,32],[floor-descent,28]]},
 {id:'lower-crossing',from:floor,to:length,heights:[[0,0],[length-floor,0]],supportWidth:28},
];
const vertex=(x:number,z:number)=>samplePolyline(path,distances,at({x,z}));
const west=roundedCircuit([vertex(-143,-40),{x:-111,z:-20},vertex(-100,0)],17,false);
const east=roundedCircuit([vertex(136,58),{x:101,z:72},vertex(38,82)],18,false);
const hops:HopShortcut[]=[
 {id:'juniper-saddle',branch:west,width:16,obstacleId:'south-rim-west-hop-rock',entryProgress:at(west[0]),exitProgress:at(west.at(-1)!)},
 {id:'redwall-traverse',branch:east,width:16,obstacleId:'south-rim-east-hop-rock',entryProgress:at(east[0]),exitProgress:at(east.at(-1)!)},
];
const barriers:TrackBarrier[]=[
 {id:'upper-cliff-face',kind:'cliff-face',baseHeight:-2.6,height:14.6,sectionId:'upper-approach',footprint:[{x:-15,z:-12},{x:-9,z:-29},{x:-9,z:29},{x:-15,z:12}],slopedFace:{lip:{x:-15,z:0},toe:{x:-9,z:0},lipWidth:24,toeWidth:58,lipHeight:12,toeHeight:-2.6}},
 {id:'receiving-face',kind:'cliff-face',baseHeight:-2.6,height:12.6,sectionId:'receiving-ledge',footprint:[{x:15,z:-8},{x:9,z:-25},{x:9,z:25},{x:15,z:8}],slopedFace:{lip:{x:15,z:0},toe:{x:9,z:0},lipWidth:16,toeWidth:50,lipHeight:10,toeHeight:-2.6}},
];
const rock=(id:string,x:number,z:number,rx:number,rz:number,height:number,base=-2.6):TrackBarrier=>({id:`south-rim-${id}`,kind:'rock',height,baseHeight:base,footprint:outcrop(x,z,rx,rz,.12*Math.sin(x),x*.021+z*.013)});
// Continuous-looking layered rims, with broad feet and clear sight lines.
barriers.push(
 rock('west-temple',-100,-43,10,6,22),rock('east-temple',67,39,23,15,34),
 rock('north-butte',-66,37,27,12,28),rock('west-rim',-183,-9,13,33,33),
 rock('southwest-rim',-143,-105,28,11,25),rock('south-rim',-61,-112,36,11,29),
 rock('east-rim',178,47,13,34,35),rock('north-rim',96,160,35,11,38),
 rock('northeast-temple',159,111,15,19,36),rock('northwest-temple',-130,76,20,19,34),
 rock('floor-terrace',42,-46,13,14,12),rock('south-spire',105,-45,9,13,24),
 rock('north-saddle',-28,123,21,10,23),rock('far-west-wall',-219,-36,17,46,47),
 rock('far-north-wall',-25,161,56,17,48),rock('far-east-wall',222,57,19,48,50),
);
const track:TrackDefinition={id:'canyon-south-rim',name:'Grand Canyon: South Rim',version:1,surface:'packed-dirt',centerline:path,distances,length,roadWidth:16,carWidth:VEHICLE_DIMENSIONS.width,carLength:VEHICLE_DIMENSIONS.length,start:path[0],startFinish:createStartFinish(path[0],path[1],16),sections,barriers,
 jumps:[{id:'south-rim-crossing',kind:'crest',mandatory:true,from:{x:-15,z:0},forward:{x:1,z:0},width:16,rampLength:0,lipHeight:12,takeoffElevation:12,landingElevation:10,launchBoost:29,launchSlope:.05,gap:30,runout:80,corridorLength:110,branch:[{x:-85,z:0},{x:-15,z:0},{x:15,z:0},{x:95,z:0}],entryProgress:approach,exitProgress:mesa}],hopShortcuts:hops,
};
for(const [index,h]of hops.entries()){
 const ds=cumulative(h.branch),s=ds.at(-1)!*.52,p=samplePolyline(h.branch,ds,s),a=samplePolyline(h.branch,ds,s-.5),b=samplePolyline(h.branch,ds,s+.5),d=distance(a,b),forward={x:(b.x-a.x)/d,z:(b.z-a.z)/d};
 const y=roadHeight(track,lerp(h.entryProgress,h.exitProgress,.52));
 const outline=(points:number[][])=>points.map(([u,v])=>({x:p.x+forward.z*u+forward.x*v,z:p.z-forward.x*u+forward.z*v}));
 barriers.push({id:h.obstacleId!,kind:'rock',height:2.8,baseHeight:y,runoffException:'hop-lane',footprint:outline([[-8,-.5],[-6,-1.2],[-3,-.8],[0,-1.3],[3,-.7],[6,-1.2],[8,-.5],[8,.6],[5,1.1],[2,.8],[-1,1.2],[-4,.7],[-7,1.1],[-8,.6]])});
 for(const side of[-1,1])barriers.push({id:`south-rim-${index}-hop-end-${side}`,kind:'rock',height:3.2,baseHeight:y,runoffException:'hop-lane',footprint:outline([[7.8,-.7],[9.5,-1.5],[11,-.7],[10.9,1],[9.4,1.7],[7.8,.8]].map(([u,v])=>[u*side,v]))});
}
track.centerline=annotateRoad(path,track);track.start=track.centerline[0];
for(const h of hops){const ds=cumulative(h.branch),n=ds.at(-1)!;h.branch=annotateRoad(h.branch.map((p,i)=>({...p,courseProgress:lerp(h.entryProgress,h.exitProgress,ds[i]/n)})),track);}
export const canyonSouthRimTrack=track;
