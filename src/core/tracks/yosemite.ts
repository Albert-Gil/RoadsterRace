import{roundedCircuit}from'../road-geometry';
import{cumulative,distance,projectToPolyline}from'../geometry';
import{createStartFinish}from'../start-finish';
import{annotateRoad,terrainElevation}from'../elevation';
import{obstacleRectangle as edgeRectangle}from'./hop-obstacles';
import{outcrop}from'./outcrop';
import type{Point,TrackDefinition}from'../types';
import{buildYosemiteTerrain,yosemiteCreek}from'./yosemite-terrain';
const obstacleRectangle=(x:number,z:number,width:number,depth:number)=>edgeRectangle(x-width/2,z,width,depth);

const loop=roundedCircuit([[110,-70],[122,-25],[90,15],[112,65],[72,88],[20,74],[-8,106],[-70,80],[-110,35],[-92,-10],[-110,-70]].map(([x,z])=>({x,z})),20);
const first=loop.slice(0,-1).reduce((best,p,i)=>distance(p,{x:-50,z:-70})<distance(loop[best],{x:-50,z:-70})?i:best,0);
const centerline=[...loop.slice(first,-1),...loop.slice(0,first),loop[first]],distances=cumulative(centerline),length=distances.at(-1)!;
const progress=(p:Point)=>projectToPolyline(p,centerline,distances).progress;
const branch=roundedCircuit([{x:-75,z:76},{x:-65,z:50},{x:-65,z:-12},{x:-105,z:-50}],14,false);
export const yosemiteTrack:TrackDefinition={
 id:'capitan-yosemite',name:'Capitan Yosemite',version:1,surface:'packed-dirt',roadWidth:16,carWidth:2.2,carLength:5.2,
 centerline,distances,length,start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),
 supports:[{id:'valley-land',footprint:obstacleRectangle(0,0,900,900)}],waterOpenings:[{id:'bridalveil-creek',footprint:yosemiteCreek}],
 jumps:[{id:'valley-creek-crest',kind:'crest',mandatory:true,from:{x:10,z:-70},forward:{x:1,z:0},width:16,rampLength:0,lipHeight:0,gap:8,runout:70,corridorLength:82,takeoffElevation:0,landingElevation:0,launchBoost:10,launchSlope:.10,branch:[{x:-8,z:-70},{x:10,z:-70},{x:88,z:-70}],entryProgress:progress({x:-8,z:-70}),exitProgress:progress({x:88,z:-70})}],
 hopShortcuts:[{id:'ranger-timber-trail',branch,width:16,obstacleId:'yosemite-fallen-cedar',entryProgress:progress(branch[0]),exitProgress:progress(branch.at(-1)!)}],
 barriers:[
  {id:'valley-conservation-grove',kind:'infield',height:.7,footprint:[{x:-42,z:-28},{x:-20,z:-25},{x:-13,z:5},{x:-24,z:47},{x:-48,z:40},{x:-49,z:8}]},
  {id:'east-conservation-grove',kind:'infield',height:.7,footprint:[{x:34,z:-27},{x:65,z:-27},{x:66,z:-6},{x:52,z:1},{x:30,z:-9}]},
  {id:'ranger-lodge',kind:'building',height:6.5,footprint:obstacleRectangle(-29,-6,18,12)},
  {id:'ranger-store',kind:'building',height:4.4,footprint:obstacleRectangle(-31,23,12,8)},
  {id:'yosemite-fallen-cedar',kind:'service-barrier',height:1.8,runoffException:'hop-lane',footprint:obstacleRectangle(-65,20,16,1.3)},
  {id:'cedar-west-end',kind:'rock',height:2.5,runoffException:'hop-lane',footprint:outcrop(-75,20,2.1,2.4,0,.6)},
  {id:'cedar-east-end',kind:'rock',height:2.1,runoffException:'hop-lane',footprint:outcrop(-55,20,2.1,2.2,0,1.1)},
  {id:'el-capitan-granite',kind:'rock',height:48,footprint:outcrop(46,29,19,25,.1,2)},
  {id:'half-dome-granite',kind:'rock',height:60,terrainAnchor:true,footprint:outcrop(162,192,36,30,0,3)},
  {id:'bridalveil-granite',kind:'rock',height:17,footprint:outcrop(15,31,13,8,0,1.7)},
  {id:'east-forest-granite',kind:'rock',height:5,terrainAnchor:true,footprint:outcrop(156,-15,10,8,0,4)},
 ],
};
yosemiteTrack.terrain=buildYosemiteTerrain(yosemiteTrack);
yosemiteTrack.jumps![0].takeoffElevation=terrainElevation(yosemiteTrack.jumps![0].from,yosemiteTrack);
yosemiteTrack.centerline=annotateRoad(centerline,yosemiteTrack);yosemiteTrack.start=yosemiteTrack.centerline[0];
yosemiteTrack.hopShortcuts![0].branch=annotateRoad(branch.map(p=>({...p,courseProgress:progress(p)})),yosemiteTrack);
