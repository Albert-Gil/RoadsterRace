import { roundedCircuit } from '../road-geometry';
import { cumulative, projectToPolyline } from '../geometry';
import { annotateRoad } from '../elevation';
import { createStartFinish } from '../start-finish';
import { outcrop } from './outcrop';
import type { Point, RoadSection, TrackBarrier, TrackDefinition } from '../types';

// Keep 70 m of straight approach and 80 m of receiving road around the wider natural opening.
const path=roundedCircuit([[-55,-52],[-104,-52],[-104,0],[114,0],[114,52],[0,52],[0,-52]].map(([x,z])=>({x,z})),19);
const distances=cumulative(path),length=distances.at(-1)!;
const at=(p:Point)=>projectToPolyline(p,path,distances).progress;
const approach=at({x:-85,z:0}),lip=at({x:-15,z:0}),landing=at({x:15,z:0}),mesa=at({x:95,z:0});
const descent=at({x:30,z:52}),floor=at({x:0,z:18});
const sections:RoadSection[]=[
 {id:'western-floor',from:0,to:approach,heights:[[0,0],[24,0],[approach-8,6.4],[approach,6.4]],supportWidth:30},
 {id:'upper-approach',from:approach,to:lip,heights:[[0,6.4],[lip-approach-8,6.4],[lip-approach,8]],supportWidth:36,supportWidths:[[0,30],[18,36],[lip-approach-18,36],[lip-approach,24]]},
 {id:'air-crossing',from:lip,to:landing,heights:[[0,8],[landing-lip,6]],supportWidth:16,flight:true},
 {id:'receiving-ledge',from:landing,to:mesa,heights:[[0,6],[mesa-landing,6]],supportWidth:30,supportWidths:[[0,16],[12,18],[45,26],[mesa-landing,30]]},
 {id:'eastern-mesa',from:mesa,to:descent,heights:[[0,6],[descent-mesa,6]],supportWidth:30},
 {id:'descent',from:descent,to:floor,heights:[[0,6],[floor-descent,0]],supportWidth:30},
 {id:'lower-crossing',from:floor,to:length,heights:[[0,0],[length-floor,0]],supportWidth:30},
];
const rect=(x:number,z:number,w:number,d:number):Point[]=>[{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}];
const circular=(x:number,z:number,from:number,to:number)=>{const n=Math.ceil((to-from)*Math.PI/180*12/1.1);return Array.from({length:n+1},(_,i)=>{const a=(from+(to-from)*i/n)*Math.PI/180;return {x:x+12*Math.cos(a),z:z+12*Math.sin(a)};});};
const a1=circular(95,12,-90,45),a2=circular(62,40,45,90);
const straight=(a:Point,b:Point)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.1);return Array.from({length:n},(_,i)=>({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}));};
const branch=[...a1,...straight(a1.at(-1)!,a2[0]).slice(1),...a2,...straight(a2.at(-1)!,{x:43,z:52}).slice(1),{x:43,z:52}];
const barrierCenter={x:92,z:30},forward={x:-Math.SQRT1_2,z:Math.SQRT1_2};
// Irregular, overlapping rock-pile footprints rather than a straight service wall.
// u runs across the lane, v along it. Protected end piles meet the jumpable centre.
const rockOutline=(outline:number[][])=>outline.map(([u,v])=>({x:barrierCenter.x+forward.z*u+forward.x*v,z:barrierCenter.z-forward.x*u+forward.z*v}));
const hopRock=rockOutline([[-8,-1],[-6.8,-1.8],[-5,-1.35],[-3.2,-2],[-.4,-1.1],[1.8,-1.8],[4,-1.25],[6.5,-1.7],[8,-.9],[8,1.1],[6.6,1.7],[4.2,1.25],[2,2],[0,1.35],[-2.2,1.8],[-4.7,1.2],[-6.8,1.7],[-8,.9]]);
const endRock=(side:number)=>rockOutline([[7.8,-1],[9,-1.7],[10.7,-1.2],[11.1,.3],[10.2,1.8],[8.8,1.5],[7.8,.9]].map(([u,v])=>[u*side,v]));
const mesaFootprint=(x:number,z:number,w:number,d:number):Point[]=>[[.06,.12],[.22,0],[.68,.03],[.96,.12],[1,.66],[.86,.96],[.53,1],[.10,.93],[0,.62]].map(([a,b])=>({x:x+a*w,z:z+b*d}));
const barriers:TrackBarrier[]=[
 {id:'western-mesa-rocks',kind:'infield',height:12,baseHeight:0,sectionId:'western-floor',footprint:mesaFootprint(-70,-34,45,18)},
 {id:'eastern-mesa-rocks',kind:'infield',height:9,baseHeight:0,sectionId:'eastern-mesa',footprint:mesaFootprint(20,17,34,17)},
 {id:'canyon-hop-rock',kind:'rock',height:3,baseHeight:6,sectionId:'eastern-mesa',runoffException:'hop-lane',footprint:hopRock},
 ...[-1,1].map(side=>({id:`canyon-hop-end-${side}`,kind:'rock' as const,height:3,baseHeight:6,sectionId:'eastern-mesa',runoffException:'hop-lane' as const,footprint:endRock(side)})),
];
// Receiving-edge/cliff protection has real height. The approved upper flight can pass above it.
for(const side of [-1,1]){
 const outer=[[16,8+1/12],[27,9],[60,13],[95,15]].map(([x,w])=>({x,z:side*(w-.18)}));
 const inner=outer.map(p=>({...p,z:p.z-side*.36}));
 barriers.push({id:`receiving-rail-${side}`,kind:'cliff-rail',baseHeight:6,sectionId:'receiving-ledge',height:.8,footprint:[...outer,...inner.reverse()]});
}
barriers.push({id:'upper-cliff-face',kind:'cliff-face',baseHeight:-2.6,height:10.6,sectionId:'upper-approach',
 footprint:[{x:-15,z:-12},{x:-9,z:-29},{x:-9,z:29},{x:-15,z:12}],
 slopedFace:{lip:{x:-15,z:0},toe:{x:-9,z:0},lipWidth:24,toeWidth:58,lipHeight:8,toeHeight:-2.6}});
barriers.push({id:'receiving-face',kind:'cliff-face',baseHeight:-2.6,height:8.6,sectionId:'receiving-ledge',
 footprint:[{x:15,z:-8},{x:9,z:-23},{x:9,z:23},{x:15,z:8}],
 slopedFace:{lip:{x:15,z:0},toe:{x:9,z:0},lipWidth:16,toeWidth:46,lipHeight:6,toeHeight:-2.6}});
/**
 * Solid canyon rock (v3): floor buttes and mesas, low ledges and tall walls stand on the canyon floor
 * (-2.6 m) well clear of the supported trails; three boulder piles sit on the outer rim of the lower
 * crossing, at least 5 m beyond its road edge. Rendered inside these footprints (presentation).
 */
const canyonFloor=-2.6;
const rock=(id:string,x:number,z:number,rx:number,rz:number,rotation:number,height:number,seed:number):TrackBarrier=>({id:`canyon-${id}`,kind:'rock',baseHeight:canyonFloor,height,footprint:outcrop(x,z,rx,rz,rotation,seed)});
const canyonRock:TrackBarrier[]=[
 rock('west-butte',-138,32,9,12,.2,12,1.1),rock('south-mesa',52,-32,11,7,-.1,7,2.2),rock('east-butte',152,22,8,12,.1,14,3.3),rock('north-mesa',-52,46,14,9,.05,10,4.4),rock('west-spire',-140,-40,5,6,0,15,5.5),
 rock('south-ledge-1',-150,-86,20,6,.1,9,6.1),rock('south-ledge-2',-60,-88,22,6,-.05,10,6.2),rock('south-ledge-3',40,-86,18,6,.08,9,6.3),rock('south-ledge-4',120,-88,20,6,-.1,10,6.4),
 rock('north-ledge-1',-130,84,20,6,.08,9,7.1),rock('north-ledge-2',-40,86,22,6,-.06,10,7.2),rock('north-ledge-3',60,86,20,6,.05,9,7.3),rock('north-ledge-4',150,84,18,6,-.1,10,7.4),
 rock('south-wall-1',-200,-118,30,12,.1,22,8.1),rock('south-wall-2',-120,-116,32,12,-.05,24,8.2),rock('south-wall-3',-35,-120,34,13,.05,24,8.3),rock('south-wall-4',55,-118,30,12,-.08,22,8.4),rock('south-wall-5',140,-116,32,12,.1,24,8.5),
 rock('north-wall-1',-195,118,30,12,-.08,24,9.1),rock('north-wall-2',-115,120,32,12,.06,26,9.2),rock('north-wall-3',-30,116,34,12,-.04,24,9.3),rock('north-wall-4',60,120,30,13,.08,26,9.4),rock('north-wall-5',145,118,32,12,-.06,24,9.5),
 rock('west-mesa',-175,15,14,20,.1,22,10.1),rock('east-mesa',165,-25,12,16,-.1,20,10.2),rock('northeast-mesa',178,45,14,20,.15,22,10.3),
 rock('far-south-1',-150,-178,28,16,.2,36,11.1),rock('far-south-2',-10,-192,32,16,0,40,11.2),rock('far-south-3',130,-182,28,16,-.15,38,11.3),
 rock('far-north-1',-120,176,28,16,-.1,36,12.1),rock('far-north-2',70,186,32,16,.1,40,12.2),
 // Rim boulder piles on the lower crossing's outer edge (base on the canyon floor, top 1.7 m above the road).
 rock('rim-1',15.4,-32,1.8,3,0,4.3,13.1),rock('rim-2',6,-58.4,2.2,1.8,.78,4.3,13.2),rock('rim-3',-20,-67.4,3,1.8,0,4.3,13.3),
];
const track:TrackDefinition={id:'grand-canyon',version:5,name:'Grand Canyon',centerline:path,distances,length,roadWidth:16,carWidth:2.2,carLength:5.2,start:path[0],startFinish:createStartFinish(path[0],path[1],16),surface:'packed-dirt',sections,barriers:[...barriers,...canyonRock],
 jumps:[{id:'canyon-crest',kind:'crest',from:{x:-15,z:0},forward:{x:1,z:0},width:16,rampLength:0,lipHeight:8,takeoffElevation:8,landingElevation:6,launchBoost:29,launchSlope:.05,gap:30,runout:80,corridorLength:110,branch:[{x:-85,z:0},{x:-15,z:0},{x:15,z:0},{x:95,z:0}],entryProgress:approach,exitProgress:mesa}],
 hopShortcuts:[{id:'mesa-service-trail',branch,width:16,obstacleId:'canyon-hop-rock',entryProgress:at(branch[0]),exitProgress:at(branch.at(-1)!)}],
};
track.centerline=annotateRoad(path,track);track.start=track.centerline[0];
track.hopShortcuts![0].branch=annotateRoad(branch.map(p=>({...p,courseProgress:at(p)})),track);
export const grandCanyonTrack=track;
