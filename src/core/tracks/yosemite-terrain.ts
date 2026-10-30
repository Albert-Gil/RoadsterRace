import{clamp,lerp,projectToPolyline}from'../geometry';
import{insideBarrier}from'../barriers';
import type{Point,TerrainSurface,TrackDefinition}from'../types';
import { roundedCircuit, roadEdges } from '../road-geometry';
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
/** A tributary starts inside the valley and crosses only the southern road. */
export const yosemiteCreekPath = roundedCircuit([
 {x:14,z:20},{x:11,z:4},{x:18,z:-15},{x:14,z:-30},{x:14,z:-112},{x:40,z:-164},
], 8, false);
export const yosemiteCreekBanks = roadEdges(yosemiteCreekPath, 8, false);
export const yosemiteCreek:Point[]=[...yosemiteCreekBanks[0],...yosemiteCreekBanks[1].slice().reverse()];
export function buildYosemiteTerrain(track:TrackDefinition):TerrainSurface{
 const minX=-280,minZ=-220,cell=4,cols=146,rows=136,heights=new Float32Array(cols*rows);
 const crest=projectToPolyline(track.jumps![0].from,track.centerline,track.distances).progress;
 const roadHeights:[number,number][]=Array.from({length:Math.ceil(track.length/2)+1},(_,i)=>{const s=Math.min(track.length,i*2),base=s<190?0:s<325?28*smooth(190,325,s):s<355?28:s<455?28*(1-smooth(355,455,s)):0,rise=s<crest-12?0:s<crest?1.2*((s-crest+12)/12)**2:1.2*(1-smooth(crest,crest+8,s));return[s,base+rise];});
 const roadY=(s:number)=>{const i=Math.min(roadHeights.length-2,Math.floor(s/2)),a=roadHeights[i],b=roadHeights[i+1];return lerp(a[1],b[1],clamp((s-a[0])/(b[0]-a[0]),0,1));};
 const natural=(p:Point)=>{const r=projectToPolyline(p,track.centerline,track.distances),hill=(x:number,z:number,rx:number,rz:number,h:number)=>h*Math.exp(-(((p.x-x)/rx)**2+((p.z-z)/rz)**2));return lerp(roadY(r.progress),hill(70,140,110,85,38)+hill(-165,165,90,90,22)+hill(205,225,110,100,25),smooth(12,52,r.distance));};
 for(const b of track.barriers.filter(b=>b.terrainAnchor)){const p={x:b.footprint.reduce((s,q)=>s+q.x,0)/b.footprint.length,z:b.footprint.reduce((s,q)=>s+q.z,0)/b.footprint.length};b.baseHeight=natural(p);}
 const edge=(p:Point,poly:Point[])=>{let d=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);d=Math.min(d,Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t));}return d;};
 // Broad-phase boxes avoid testing every cliff polygon at every grid node. The blend
 // order and exact distances inside these boxes remain identical to the original terrain.
 const boxed=track.barriers.map(b=>({b,blend:b.id.startsWith('valley-')&&b.kind==='rock'||b.id==='half-dome-granite'||b.id==='east-forest-granite'?2:10,minX:Math.min(...b.footprint.map(p=>p.x))-10,maxX:Math.max(...b.footprint.map(p=>p.x))+10,minZ:Math.min(...b.footprint.map(p=>p.z))-10,maxZ:Math.max(...b.footprint.map(p=>p.z))+10}));
 const creekBounds={minX:Math.min(...yosemiteCreek.map(p=>p.x)),maxX:Math.max(...yosemiteCreek.map(p=>p.x)),minZ:Math.min(...yosemiteCreek.map(p=>p.z)),maxZ:Math.max(...yosemiteCreek.map(p=>p.z))};
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){const p={x:minX+x*cell,z:minZ+z*cell};let y=natural(p);for(const box of boxed){if(p.x<box.minX||p.x>box.maxX||p.z<box.minZ||p.z>box.maxZ)continue;const b=box.b,d=insideBarrier(p,b)?0:edge(p,b.footprint);if(d<box.blend)y=lerp(b.baseHeight??0,y,smooth(0,box.blend,d));}if(p.x>=creekBounds.minX&&p.x<=creekBounds.maxX&&p.z>=creekBounds.minZ&&p.z<=creekBounds.maxZ&&insideBarrier(p,{id:'',height:0,footprint:yosemiteCreek}))y=-3;heights[z*cols+x]=y;}
 return{minX,minZ,cell,cols,rows,heights,roadHeights,branchHeights:{'ranger-timber-trail':0}};
}
