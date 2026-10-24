import { roundedCircuit } from '../road-geometry';
import { cumulative, projectToPolyline } from '../geometry';
import { annotateRoad } from '../elevation';
import { createStartFinish } from '../start-finish';
import type { Point, RoadSection, TrackBarrier, TrackDefinition } from '../types';

const path=roundedCircuit([[-55,-52],[-95,-52],[-95,0],[106,0],[106,52],[0,52],[0,-52]].map(([x,z])=>({x,z})),16);
const distances=cumulative(path),length=distances.at(-1)!;
const at=(p:Point)=>projectToPolyline(p,path,distances).progress;
const approach=at({x:-79,z:0}),lip=at({x:-9,z:0}),landing=at({x:9,z:0}),mesa=at({x:89,z:0});
const descent=at({x:30,z:52}),floor=at({x:0,z:18});
const sections:RoadSection[]=[
 {id:'western-floor',from:0,to:approach,heights:[[0,0],[24,0],[approach-8,6.4],[approach,6.4]],supportWidth:28},
 {id:'upper-approach',from:approach,to:lip,heights:[[0,6.4],[lip-approach-8,6.4],[lip-approach,8]],supportWidth:28},
 {id:'air-crossing',from:lip,to:landing,heights:[[0,8],[landing-lip,6]],supportWidth:16,flight:true},
 {id:'receiving-ledge',from:landing,to:mesa,heights:[[0,6],[mesa-landing,6]],supportWidth:16},
 {id:'eastern-mesa',from:mesa,to:descent,heights:[[0,6],[descent-mesa,6]],supportWidth:28},
 {id:'descent',from:descent,to:floor,heights:[[0,6],[floor-descent,0]],supportWidth:28},
 {id:'lower-crossing',from:floor,to:length,heights:[[0,0],[length-floor,0]],supportWidth:28},
];
const rect=(x:number,z:number,w:number,d:number):Point[]=>[{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}];
const circular=(x:number,z:number,from:number,to:number)=>{const n=Math.ceil((to-from)*Math.PI/180*12/1.1);return Array.from({length:n+1},(_,i)=>{const a=(from+(to-from)*i/n)*Math.PI/180;return {x:x+12*Math.cos(a),z:z+12*Math.sin(a)};});};
const a1=circular(90,12,-90,45),a2=circular(62,40,45,90);
const straight=(a:Point,b:Point)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.1);return Array.from({length:n},(_,i)=>({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}));};
const branch=[...a1,...straight(a1.at(-1)!,a2[0]).slice(1),...a2,...straight(a2.at(-1)!,{x:43,z:52}).slice(1),{x:43,z:52}];
const barrierCenter={x:89,z:30},forward={x:-Math.SQRT1_2,z:Math.SQRT1_2};
const acrossBarrier=(offset:number,width:number)=>rect(0,0,width,1).map(p=>({x:barrierCenter.x+forward.z*(p.x-width/2+offset)+forward.x*(p.z-.5),z:barrierCenter.z-forward.x*(p.x-width/2+offset)+forward.z*(p.z-.5)}));
const mesaFootprint=(x:number,z:number,w:number,d:number):Point[]=>[[.06,.12],[.22,0],[.68,.03],[.96,.12],[1,.66],[.86,.96],[.53,1],[.10,.93],[0,.62]].map(([a,b])=>({x:x+a*w,z:z+b*d}));
const barriers:TrackBarrier[]=[
 {id:'western-mesa-rocks',kind:'infield',height:12,baseHeight:0,sectionId:'western-floor',footprint:mesaFootprint(-70,-34,45,18)},
 {id:'eastern-mesa-rocks',kind:'infield',height:9,baseHeight:0,sectionId:'eastern-mesa',footprint:mesaFootprint(20,17,34,17)},
 {id:'canyon-hop-rock',kind:'service-barrier',height:3,baseHeight:6,sectionId:'eastern-mesa',footprint:acrossBarrier(0,16)},
 ...[-1,1].map(side=>({id:`canyon-hop-end-${side}`,kind:'service-barrier' as const,height:3,baseHeight:6,sectionId:'eastern-mesa',footprint:acrossBarrier(side*9,2)})),
];
// Receiving-edge/cliff protection has real height. The approved upper flight can pass above it.
for(const side of [-1,1])barriers.push({id:`receiving-rail-${side}`,kind:'cliff-rail',baseHeight:6,sectionId:'receiving-ledge',height:.8,footprint:rect(10,side*7.9-.18,79,.36)});
barriers.push({id:'upper-cliff-face',kind:'cliff-face',baseHeight:-2.6,height:10.6,sectionId:'upper-approach',footprint:rect(-9.2,-14,.2,28)});
barriers.push({id:'receiving-face',kind:'cliff-face',baseHeight:0,height:6,sectionId:'receiving-ledge',footprint:rect(8.8,-8,.2,16)});
const track:TrackDefinition={id:'grand-canyon',version:1,name:'Grand Canyon',centerline:path,distances,length,roadWidth:16,carWidth:2.2,carLength:5.2,start:path[0],startFinish:createStartFinish(path[0],path[1],16),surface:'packed-dirt',sections,barriers,
 jumps:[{id:'canyon-crest',kind:'crest',from:{x:-9,z:0},forward:{x:1,z:0},width:16,rampLength:0,lipHeight:8,takeoffElevation:8,landingElevation:6,launchBoost:16,launchSlope:.2,gap:18,runout:80,corridorLength:98,branch:[{x:-79,z:0},{x:-9,z:0},{x:9,z:0},{x:89,z:0}],entryProgress:approach,exitProgress:mesa}],
 hopShortcuts:[{id:'mesa-service-trail',branch,width:16,obstacleId:'canyon-hop-rock',entryProgress:at(branch[0]),exitProgress:at(branch.at(-1)!)}],
};
track.centerline=annotateRoad(path,track);track.start=track.centerline[0];
track.hopShortcuts![0].branch=annotateRoad(branch.map(p=>({...p,courseProgress:at(p)})),track);
export const grandCanyonTrack=track;
