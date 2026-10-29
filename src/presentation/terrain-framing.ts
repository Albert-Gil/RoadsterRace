import { sampleTerrain } from '../core/terrain';
import { drawingRay } from '../core/elevation';
import type { Point, TrackDefinition } from '../core/types';

/** Visibility only. Never changes the road, input projection or simulation. */
export function hiddenTerrainRoadPoints(track:TrackDefinition,eye:{x:number;y:number;z:number},points:Point[]){
  const grid=track.terrain;if(!grid)return 0;
  let hidden=0;
  for(const p of points){
    const dx=eye.x-p.x,dz=eye.z-p.z,span=Math.hypot(dx,dz),y=(p.y??0)+.05;
    for(let d=1;d<Math.min(span,240);d+=d<5?1:3){
      const t=d/span,x=p.x+dx*t,z=p.z+dz*t;
      if(x<grid.minX||z<grid.minZ||x>grid.minX+(grid.cols-1)*grid.cell||z>grid.minZ+(grid.rows-1)*grid.cell)continue;
      const height=sampleTerrain({x,z},track);
      if(height>y+(eye.y-y)*t+.05){hidden++;break;}
    }
  }
  return hidden;
}

/** Final candidates use the input ray itself, so steep ridges cannot hide a draw point. */
export function terrainDrawingOcclusion(track:TrackDefinition,eye:{x:number;y:number;z:number},points:Point[]){
  let hidden=0;
  for(const p of points){
    const hit=drawingRay({origin:eye,direction:{x:p.x-eye.x,y:(p.y??0)-eye.y,z:p.z-eye.z}},track);
    if(!hit||Math.hypot(hit.x-p.x,hit.z-p.z)>.06)hidden++;
  }
  return hidden;
}
