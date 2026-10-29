import { clamp,lerp,projectToPolyline,samplePolyline } from '../geometry';
import { insideBarrier } from '../barriers';
import type { Point,TerrainSurface,TrackDefinition } from '../types';

const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const tahoeShore=(z:number)=>137+7*Math.sin(z/66)+3*Math.sin(z/23);
export const tahoeLand:Point[]=[{x:-1000,z:-1000},{x:tahoeShore(-300),z:-1000},...Array.from({length:101},(_,i)=>({x:tahoeShore(-300+i*6),z:-300+i*6})),{x:tahoeShore(300),z:1000},{x:-1000,z:1000}];
export const TAHOE_SUMMIT_HEIGHT=60;
export const TAHOE_SKI_CREST=364;
export const TAHOE_CORNICES=[
 {id:'summit-ski-crest',progress:TAHOE_SKI_CREST,rise:.8,runIn:12,runOut:22,launchBoost:8,launchSlope:.10,planningSpeed:24},
 {id:'valley-snow-roll',progress:36,rise:1.1,runIn:12,runOut:26,launchBoost:5.5,launchSlope:.08,planningSpeed:21},
 {id:'lakeside-snow-roll',progress:146,rise:.9,runIn:14,runOut:28,launchBoost:5.5,launchSlope:.08,planningSpeed:21},
] as const;

/** Rounded grades, with a level start, forestry branch and lodge district. */
export function tahoeProfile(length:number,branchExit:number):[number,number][]{
  const from=branchExit+18,top=from+100,down=top+18,end=length-52;
  return Array.from({length:Math.ceil(length/2)+1},(_,i)=>{
    const s=Math.min(length,i*2);
    const base=s<from?0:s<top?TAHOE_SUMMIT_HEIGHT*smooth(from,top,s):s<down?TAHOE_SUMMIT_HEIGHT:s<end?TAHOE_SUMMIT_HEIGHT*(1-smooth(down,end,s)):0;
    // Groomed snow cornice at the summit, blending back into the receiving slope.
    const cornice=TAHOE_CORNICES.reduce((sum,c)=>sum+(s<c.progress-c.runIn?0:s<c.progress?c.rise*((s-c.progress+c.runIn)/c.runIn)**2:c.rise*(1-smooth(c.progress,c.progress+c.runOut,s))),0);
    const y=base+cornice;
    return [s,y];
  });
}

export function buildTahoeTerrain(track:TrackDefinition):TerrainSurface{
  const minX=-320,minZ=-270,cell=3,cols=161,rows=191,roadHeights=tahoeProfile(track.length,track.hopShortcuts![0].exitProgress),heights=new Float32Array(cols*rows);
  const summit=samplePolyline(track.centerline,track.distances,track.hopShortcuts![0].exitProgress+126);
  const roadY=(s:number)=>{const i=Math.min(roadHeights.length-2,Math.floor(s/2)),a=roadHeights[i],b=roadHeights[i+1];return lerp(a[1],b[1],clamp((s-a[0])/(b[0]-a[0]),0,1));};
  const natural=(p:Point)=>{
    const r=projectToPolyline(p,track.centerline,track.distances),shore=tahoeShore(p.z);
    const hill=(cx:number,cz:number,rx:number,rz:number,h:number)=>h*Math.exp(-(((p.x-cx)/rx)**2+((p.z-cz)/rz)**2));
    // A broad mountain behind the summit, rather than a narrow raised ribbon.
    const y=(hill(summit.x-12,summit.z+18,80,80,69)+hill(-155,115,85,90,42)+hill(-245,185,105,100,82)+hill(-35,170,90,70,38))*(1-smooth(90,shore,p.x));
    return lerp(roadY(r.progress),y,smooth(12,48,r.distance));
  };
  for(const b of track.barriers.filter(b=>b.terrainAnchor)){
    const p={x:b.footprint.reduce((s,q)=>s+q.x,0)/b.footprint.length,z:b.footprint.reduce((s,q)=>s+q.z,0)/b.footprint.length};b.baseHeight=natural(p);
  }
  const edge=(p:Point,poly:Point[])=>{let d=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);d=Math.min(d,Math.hypot(p.x-a.x-u*dx,p.z-a.z-u*dz));}return d;};
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){
    const p={x:minX+x*cell,z:minZ+z*cell},shore=tahoeShore(p.z);
    if(p.x>shore){heights[z*cols+x]=-4*smooth(shore,shore+8,p.x);continue;}
    let y=natural(p);
    for(const b of track.barriers){const d=insideBarrier(p,b)?0:edge(p,b.footprint),feather=b.id==='forest-reserve'?30:8;if(d<feather)y=lerp(b.baseHeight??0,y,smooth(0,feather,d));}
    heights[z*cols+x]=y;
  }
  return {minX,minZ,cell,cols,rows,heights,roadHeights,branchHeights:{'forestry-trail':0}};
}
