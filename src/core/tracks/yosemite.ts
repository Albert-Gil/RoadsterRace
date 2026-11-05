import { VEHICLE_DIMENSIONS } from '../vehicle-size';
import{roundedCircuit}from'../road-geometry';
import{cumulative,distance,projectToPolyline,samplePolyline}from'../geometry';
import{createStartFinish}from'../start-finish';
import{annotateRoad,terrainElevation}from'../elevation';
import{obstacleRectangle as edgeRectangle}from'./hop-obstacles';
import{outcrop}from'./outcrop';
import type{Point,TrackDefinition,TrackJump}from'../types';
import{buildYosemiteTerrain,yosemiteRivers}from'./yosemite-terrain';
import { yosemiteValleyRocks } from './yosemite-rocks';
import { yosemiteLakes } from './yosemite-water';
const obstacleRectangle=(x:number,z:number,width:number,depth:number)=>edgeRectangle(x-width/2,z,width,depth);

const loop=roundedCircuit([[110,-70],[122,-25],[90,15],[112,65],[72,88],[20,74],[-8,106],[-70,80],[-117,33],[-96,-12],[-110,-70]].map(([x,z])=>({x,z})),20);
const first=loop.slice(0,-1).reduce((best,p,i)=>distance(p,{x:-50,z:-70})<distance(loop[best],{x:-50,z:-70})?i:best,0);
const centerline=[...loop.slice(first,-1),...loop.slice(0,first),loop[first]],distances=cumulative(centerline),length=distances.at(-1)!;
const progress=(p:Point)=>projectToPolyline(p,centerline,distances).progress;
const branch=roundedCircuit([{x:-25,z:98.87},{x:-65,z:50},{x:-65,z:-12},{x:-105,z:-50}],18,false);
// A small natural crest before each real creek. Heights are resolved after the terrain.
const creekJump=(id:string,near:Point,gap:number,boost:number,runout:number):TrackJump=>{
 const s=progress(near),from=samplePolyline(centerline,distances,s),a=samplePolyline(centerline,distances,s-.25),b=samplePolyline(centerline,distances,s+.25),d=distance(a,b);
 return{id,kind:'crest',mandatory:true,from,forward:{x:(b.x-a.x)/d,z:(b.z-a.z)/d},width:16,rampLength:0,lipHeight:0,gap,runout,corridorLength:gap+runout,takeoffElevation:0,landingElevation:0,launchBoost:boost,launchSlope:.1,branch:[samplePolyline(centerline,distances,s-16),from,samplePolyline(centerline,distances,s+gap+runout)],entryProgress:s-16,exitProgress:s+gap+runout};
};
export const yosemiteTrack:TrackDefinition={
 id:'capitan-yosemite',name:'Capitan Yosemite',version:5,surface:'packed-dirt',roadWidth:16,carWidth: VEHICLE_DIMENSIONS.width,carLength: VEHICLE_DIMENSIONS.length,
 centerline,distances,length,start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),
 supports:[{id:'valley-land',footprint:obstacleRectangle(0,0,900,900)}],
 jumps:[creekJump('valley-creek-crest',{x:10,z:-70},8,10,55),creekJump('sentinel-creek-crest',{x:60,z:-70},6,9,46),creekJump('cathedral-creek-crest',{x:-106,z:10},6,9,32)],
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
  {id:'half-dome-granite',kind:'rock',height:25,terrainAnchor:true,footprint:outcrop(113.738,108.067,24.48,20.4,0,3)},
  {id:'bridalveil-granite',kind:'rock',height:24,footprint:outcrop(15,31,13,8,0,1.7)},
  {id:'east-forest-granite',kind:'rock',height:5,terrainAnchor:true,footprint:outcrop(144.315,-17.985,10,8,0,4)},
  ...yosemiteValleyRocks().map(b=>{
   let dx=b.id.includes('west-')||b.id==='valley-south-cathedral-foot'||['valley-talus-1','valley-talus-2','valley-talus-3','valley-talus-19','valley-talus-20'].includes(b.id)?-8:0,dz=0;
   // Talus belongs beside the new channels, not across their mouths.
   if(b.id==='valley-talus-1')dx-=12;if(b.id==='valley-talus-3')dx-=24;
   if(b.id==='valley-talus-13'){dx=-18;dz=-24;}if(b.id==='valley-talus-14')dz=-12;
   return dx||dz?{...b,footprint:b.footprint.map(p=>({...p,x:p.x+dx,z:p.z+dz}))}:b;
  }),
 ],
};
yosemiteTrack.waterOpenings=[...yosemiteRivers(yosemiteTrack),...yosemiteLakes(yosemiteTrack)].map(r=>({id:r.id,footprint:r.footprint}));
yosemiteTrack.terrain=buildYosemiteTerrain(yosemiteTrack);
for(const j of yosemiteTrack.jumps!){j.takeoffElevation=terrainElevation(j.from,yosemiteTrack);j.lipHeight=j.takeoffElevation;j.landingElevation=terrainElevation({x:j.from.x+j.forward.x*j.gap,z:j.from.z+j.forward.z*j.gap},yosemiteTrack);}
yosemiteTrack.centerline=annotateRoad(centerline,yosemiteTrack);yosemiteTrack.start=yosemiteTrack.centerline[0];
yosemiteTrack.hopShortcuts![0].branch=annotateRoad(branch.map(p=>({...p,courseProgress:progress(p)})),yosemiteTrack);
