import type {Point,TrackBarrier,TrackDefinition} from '../core/types';
import {rayToEdge} from './landscape/mesh';
import {smoothstep} from './landscape/noise';
import {yosemiteAppearance as art} from './themes';
import {YOSEMITE_FALLS,yosemiteLakes,yosemiteLakePoint,type YosemiteLake} from '../core/tracks/yosemite-water';

export interface WaterfallSite {
 id:string;barrier:TrackBarrier;center:Point;normal:Point;right:Point;
 lip:{x:number;y:number;z:number};impact:{x:number;y:number;z:number};width:number;lake:YosemiteLake;
}
const faceAngles=new Map<string,number[]>();
for(const site of YOSEMITE_FALLS)faceAngles.set(site.barrierId,[...(faceAngles.get(site.barrierId)??[]),site.angle]);
export function waterfallFaceWeight(b:TrackBarrier,angle:number){
 return Math.max(0,...(faceAngles.get(b.id)??[]).map(target=>{const delta=Math.abs(Math.atan2(Math.sin(angle-target),Math.cos(angle-target)));return 1-smoothstep(art.waterfall.halfAngle*.55,art.waterfall.halfAngle,delta);}));
}
/** A recessed face beneath an overhanging lip: water falls through air, clear of the rock. */
export function waterfallCliffRadius(b:TrackBarrier,t:number,angle:number,original:number){
 const weight=waterfallFaceWeight(b,angle);if(!weight)return original;
 const lip=art.waterfall.lipRadius,top=art.waterfall.lipFraction;
 const recess=.72;
 const profile=t<.03?1-(t/.03)*(1-recess):t<.64?recess:t<top-.06?recess+smoothstep(.64,top-.06,t)*(lip-recess):t<=top?lip:lip+(original-lip)*smoothstep(top,.98,t);
 return original+(profile-original)*weight;
}
export function yosemiteWaterfallSites(track:TrackDefinition):WaterfallSite[]{
 const lakes=yosemiteLakes(track);
 return YOSEMITE_FALLS.map(source=>{
  const b=track.barriers.find(b=>b.id===source.barrierId)!,angle=source.angle,lake=lakes.find(l=>l.id===source.lakeId)!;
  const center={x:b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,z:b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length};
  const normal={x:Math.cos(angle),z:Math.sin(angle)},right={x:-normal.z,z:normal.x},radius=rayToEdge(center,angle,b.footprint);
  const lip={x:center.x+normal.x*radius*art.waterfall.waterRadius,y:(b.baseHeight??0)+b.height*art.waterfall.lipFraction,z:center.z+normal.z*radius*art.waterfall.waterRadius};
  const impact='faceImpact'in source?{x:lip.x+normal.x*.25,y:lake.level,z:lip.z+normal.z*.25}:{...lake.center,y:lake.level};
  return{id:source.id,barrier:b,center,normal,right,lip,impact,width:art.waterfall.widths[source.id],lake};
 });
}
/** Gravity-shaped curtain centreline, independent of the road and vehicle simulation. */
export function waterfallPoint(site:WaterfallSite,t:number,across=0){
 const fall=t*t,flutter=Math.sin(t*18+across*2)*Math.sin(Math.PI*t)*.07;
 return{x:site.lip.x+(site.impact.x-site.lip.x)*fall+site.right.x*(across+flutter),y:site.lip.y+(site.impact.y-site.lip.y)*fall,z:site.lip.z+(site.impact.z-site.lip.z)*fall+site.right.z*(across+flutter)};
}
export function waterfallPoolPoint(site:WaterfallSite,angle:number,radius=1){
 const edge=yosemiteLakePoint(site.lake,angle);
 return{x:site.impact.x+(edge.x-site.impact.x)*radius,y:site.lake.level,z:site.impact.z+(edge.z-site.impact.z)*radius};
}
