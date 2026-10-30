import type {Point,TrackBarrier,TrackDefinition} from '../core/types';
import {rayToEdge} from './landscape/mesh';
import {smoothstep} from './landscape/noise';
import {yosemiteAppearance as art} from './themes';

export interface WaterfallSite {
 id:string;barrier:TrackBarrier;center:Point;normal:Point;right:Point;
 lip:{x:number;y:number;z:number};impact:{x:number;y:number;z:number};width:number;
}
export function waterfallFaceWeight(b:TrackBarrier,angle:number){
 const target=b.id==='el-capitan-granite'?art.waterfall.angle:b.id==='bridalveil-granite'?-Math.PI/2:NaN;
 const delta=Math.abs(Math.atan2(Math.sin(angle-target),Math.cos(angle-target)));
 return Number.isFinite(target)?1-smoothstep(art.waterfall.halfAngle*.55,art.waterfall.halfAngle,delta):0;
}
/** A recessed face beneath an overhanging lip: water falls through air, clear of the rock. */
export function waterfallCliffRadius(b:TrackBarrier,t:number,angle:number,original:number){
 const weight=waterfallFaceWeight(b,angle);if(!weight)return original;
 const lip=art.waterfall.lipRadius,top=art.waterfall.lipFraction;
 const recess=.77;
 const profile=t<.03?1-(t/.03)*(1-recess):t<.64?recess:t<top-.06?recess+smoothstep(.64,top-.06,t)*(lip-recess):t<=top?lip:lip+(original-lip)*smoothstep(top,.98,t);
 return original+(profile-original)*weight;
}
export function yosemiteWaterfallSites(track:TrackDefinition):WaterfallSite[]{
 return ['el-capitan-granite','bridalveil-granite'].map((id,index)=>{
  const b=track.barriers.find(b=>b.id===id)!,angle=index===0?art.waterfall.angle:-Math.PI/2;
  const center={x:b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,z:b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length};
  const normal={x:Math.cos(angle),z:Math.sin(angle)},right={x:-normal.z,z:normal.x},radius=rayToEdge(center,angle,b.footprint);
  const lip={x:center.x+normal.x*radius*art.waterfall.waterRadius,y:(b.baseHeight??0)+b.height*art.waterfall.lipFraction,z:center.z+normal.z*radius*art.waterfall.waterRadius};
  const impact=index===0?{x:lip.x+normal.x*.25,y:(b.baseHeight??0)+art.waterfall.basinHeight,z:lip.z+normal.z*.25}:{x:15,y:-2.36,z:19.5};
  return{id:index===0?'granite-falls':'creek-falls',barrier:b,center,normal,right,lip,impact,width:index===0?art.waterfall.curtainWidth:3.4};
 });
}
/** Gravity-shaped curtain centreline, independent of the road and vehicle simulation. */
export function waterfallPoint(site:WaterfallSite,t:number,across=0){
 const fall=t*t,flutter=Math.sin(t*18+across*2)*Math.sin(Math.PI*t)*.07;
 return{x:site.lip.x+(site.impact.x-site.lip.x)*fall+site.right.x*(across+flutter),y:site.lip.y+(site.impact.y-site.lip.y)*fall,z:site.lip.z+(site.impact.z-site.lip.z)*fall+site.right.z*(across+flutter)};
}
export function waterfallPoolPoint(site:WaterfallSite,angle:number,radius=1){
 const side=Math.cos(angle)*art.waterfall.basinWidth/2*radius,forward=Math.sin(angle)*art.waterfall.basinDepth/2*radius;
 const p={x:site.impact.x+site.right.x*side+site.normal.x*forward,y:site.impact.y,z:site.impact.z+site.right.z*side+site.normal.z*forward};
 if(site.id==='granite-falls'){
  const b=site.barrier,c=site.center,a=Math.atan2(p.z-c.z,p.x-c.x),r=Math.hypot(p.x-c.x,p.z-c.z),limit=rayToEdge(c,a,b.footprint)-.2;
  if(r>limit){p.x=c.x+Math.cos(a)*limit;p.z=c.z+Math.sin(a)*limit;}
 }
 return p;
}
