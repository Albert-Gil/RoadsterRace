import { roundedCircuit } from '../road-geometry';
import { cumulative, projectToPolyline } from '../geometry';
import { createStartFinish } from '../start-finish';
import type { Point, TrackBarrier, TrackDefinition, TrackJump, HopShortcut } from '../types';

export const laRectangle = (x: number, z: number, w: number, d: number): Point[] =>
  [{ x, z }, { x: x + w, z }, { x: x + w, z: z + d }, { x, z: z + d }];
const centerline = roundedCircuit([
  [-24,-50],[20,-50],[20,-8],[54,-8],[54,-40],[98,-40],[98,-8],
  [150,-8],[150,36],[124,60],[-110,60],[-110,-50],[-65,-50],
].map(([x,z]) => ({x,z})), 14);
const distances = cumulative(centerline), length = distances.at(-1)!;
const progress = (p: Point) => projectToPolyline(p, centerline, distances).progress;
const jump: TrackJump = {
  id: 'channel-crossing', from: {x:54,z:-8}, forward:{x:1,z:0}, width:16,
  rampLength:8, lipHeight:1.2, gap:10, runout:60, corridorLength:78,
  branch:[{x:20,z:-8},{x:54,z:-8},{x:136,z:-8}],
  entryProgress:progress({x:20,z:-8}),exitProgress:progress({x:136,z:-8}),
};
const arc = (x: number,z: number,a:number,b:number) => Array.from({length:25},(_,i)=>({x:x+Math.cos(a+(b-a)*i/24)*12,z:z+Math.sin(a+(b-a)*i/24)*12}));
const branch = [...arc(-50,48,Math.PI/2,Math.PI), ...Array.from({length:85},(_,i)=>({x:-62,z:47-i})), ...arc(-50,-38,Math.PI,Math.PI*1.5)];
const hop: HopShortcut = {id:'backlot-alley',branch,width:16,obstacleId:'backlot-service-divider',entryProgress:progress(branch[0]),exitProgress:progress(branch.at(-1)!)};
const solid = (id:string,x:number,z:number,w:number,d:number,height=1.1,kind:TrackBarrier['kind']='infield'):TrackBarrier => ({id,height,kind,footprint:laRectangle(x,z,w,d)});
export const laNightsTrack: TrackDefinition = {
  id:'la-nights',version:1,name:'LA nights',centerline,distances,length,
  roadWidth:16,carWidth:2.2,carLength:5.2,start:centerline[0],startFinish:createStartFinish(centerline[0],centerline[1],16),
  supports:[{id:'city-ground',footprint:laRectangle(-500,-500,1000,1000)}],
  waterOpenings:[{id:'storm-channel',footprint:laRectangle(62,-27,10,37)}],jumps:[jump],hopShortcuts:[hop],
  barriers:[
    solid('downtown-block',-41,-34,46,69),
    solid('studio-block',-96,12,20,28),
    solid('arts-block',42,10,78,34),
    solid('channel-utility',77,-25,6,3),
    solid('skyline-block',-140,98,320,28),
    solid('backlot-service-divider',-70,6.5,16,1,2.5,'service-barrier'),
    solid('backlot-west-wing',-97,6.5,27,1,2.5,'service-barrier'),
    solid('backlot-east-wing',-54,6.5,13,1,2.5,'service-barrier'),
    solid('channel-landing-face',71.8,-16,.2,16,2.4,'pier-rail'),
    solid('channel-north-bank',62,-27,10,.3,1,'pier-rail'),
    solid('channel-south-bank',62,9.7,10,.3,1,'pier-rail'),
  ].map(b=>b.id==='channel-landing-face'?{...b,baseHeight:-2.4}:b),
};
