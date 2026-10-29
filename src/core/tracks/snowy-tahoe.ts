import { roundedCircuit } from '../road-geometry';
import { cumulative, distance, projectToPolyline,samplePolyline } from '../geometry';
import { createStartFinish } from '../start-finish';
import type { Point, TrackDefinition } from '../types';
import { obstacleRectangle } from './hop-obstacles';
import { buildTahoeTerrain,tahoeLand,TAHOE_CORNICES } from './tahoe-terrain';
import { annotateRoad } from '../elevation';

const loop = roundedCircuit([
  [50,-55],[94,-34],[102,16],[70,45],[30,45],[30,73],[-12,86],[-68,63],[-98,24],[-92,-29],[-68,-55],
].map(([x,z])=>({x,z})),18);
const startIndex=loop.slice(0,-1).reduce((best,p,i)=>distance(p,{x:-25,z:-55})<distance(loop[best],{x:-25,z:-55})?i:best,0);
const centerline=[...loop.slice(startIndex,-1),...loop.slice(0,startIndex),loop[startIndex]],distances=cumulative(centerline),length=distances.at(-1)!;
const branch=roundedCircuit([{x:58,z:-51},{x:68,z:-32},{x:68,z:24},{x:52,z:45}],16,false);
const progress=(p:Point)=>projectToPolyline(p,centerline,distances).progress;
const takeoffs=TAHOE_CORNICES.map(j=>{const center=samplePolyline(centerline,distances,j.progress),ahead=samplePolyline(centerline,distances,j.progress+1),len=distance(center,ahead);return{id:j.id,center,forward:{x:(ahead.x-center.x)/len,z:(ahead.z-center.z)/len},width:16,progress:j.progress,launchBoost:j.launchBoost,launchSlope:j.launchSlope,minimumSpeed:6,planningSpeed:j.planningSpeed};});

export const snowyTahoeTrack: TrackDefinition = {
  id:'snowy-tahoe',version:5,name:'Snowy Tahoe',surface:'packed-snow',centerline,distances,length,
  roadWidth:16,carWidth:2.2,carLength:5.2,start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),
  supports:[{id:'alpine-land',footprint:tahoeLand}],
  terrainTakeoffs:takeoffs,
  hopShortcuts:[{id:'forestry-trail',branch,width:16,obstacleId:'fallen-timber',entryProgress:progress(branch[0]),exitProgress:progress(branch.at(-1)!)}],
  barriers:[
    {id:'forest-reserve',kind:'infield',height:.85,footprint:[{x:-45,z:-25},{x:25,z:-25},{x:42,z:-8},{x:38,z:18},{x:10,z:31},{x:-40,z:34},{x:-63,z:15},{x:-63,z:-8}]},
    {id:'alpine-lodge',kind:'building',height:6.8,footprint:obstacleRectangle(-37,9,27,16)},
    {id:'fallen-timber',kind:'service-barrier',height:1.25,runoffException:'hop-lane',footprint:obstacleRectangle(60,0,16,1.4)},
    {id:'forestry-west-rocks',kind:'rock',height:2.8,runoffException:'hop-lane',footprint:[{x:55,z:-3},{x:59.8,z:-3},{x:60,z:3},{x:56,z:3.5},{x:55.2,z:1}]},
    {id:'forestry-east-rocks',kind:'rock',height:2.5,runoffException:'hop-lane',footprint:[{x:76,z:-3},{x:80,z:-3.5},{x:81.1,z:0},{x:81,z:3},{x:76,z:3}]},
    {id:'east-chalet',kind:'building',height:5.6,footprint:obstacleRectangle(14,6,10,8)},
    {id:'west-chalet',kind:'building',height:5.2,footprint:obstacleRectangle(-53,-12,10,8)},
    {id:'snow-groomer',kind:'building',height:2.8,footprint:obstacleRectangle(19,21,6,4)},
    {id:'mountain-rescue-hut',kind:'building',height:4.4,footprint:obstacleRectangle(-2,10,10,7)},
    {id:'ski-rental-chalet',kind:'building',height:3.8,footprint:obstacleRectangle(-29,-17,11,6)},
    {id:'lower-lift-station',terrainAnchor:true,kind:'building',baseHeight:5,height:6,footprint:obstacleRectangle(-167,-53,14,10)},
    {id:'upper-lift-station',terrainAnchor:true,kind:'building',baseHeight:24,height:7.5,footprint:obstacleRectangle(-162,132,16,12)},
    {id:'lift-pylon-1',terrainAnchor:true,kind:'building',baseHeight:12,height:9,footprint:obstacleRectangle(-159,8,2,2)},
    {id:'lift-pylon-2',terrainAnchor:true,kind:'building',baseHeight:20,height:9,footprint:obstacleRectangle(-157,70,2,2)},
    {id:'west-granite',terrainAnchor:true,kind:'rock',baseHeight:6,height:4,footprint:obstacleRectangle(-131,55,12,8)},
    {id:'summit-granite',terrainAnchor:true,kind:'rock',baseHeight:14,height:5,footprint:obstacleRectangle(-70,119,12,9)},
    {id:'east-granite',terrainAnchor:true,kind:'rock',baseHeight:4,height:3.5,footprint:obstacleRectangle(45,105,10,7)},
  ],
};
snowyTahoeTrack.terrain=buildTahoeTerrain(snowyTahoeTrack);
snowyTahoeTrack.centerline=annotateRoad(centerline,snowyTahoeTrack);
snowyTahoeTrack.start=snowyTahoeTrack.centerline[0];
snowyTahoeTrack.hopShortcuts![0].branch=annotateRoad(branch.map(p=>({...p,courseProgress:progress(p)})),snowyTahoeTrack);
