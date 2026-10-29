import { clamp,lerp,modulo } from './geometry';
import type { Point,TrackDefinition } from './types';

export function terrainRoadHeight(track:TrackDefinition,progress:number){
  const h=track.terrain!.roadHeights,p=modulo(progress,track.length);
  for(let i=1;i<h.length;i++)if(p<=h[i][0])return lerp(h[i-1][1],h[i][1],(p-h[i-1][0])/(h[i][0]-h[i-1][0]));
  return h.at(-1)![1];
}
export function sampleTerrain(p:Point,track:TrackDefinition){
  const t=track.terrain!;
  const x=clamp((p.x-t.minX)/t.cell,0,t.cols-1.000001),z=clamp((p.z-t.minZ)/t.cell,0,t.rows-1.000001),ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz,i=iz*t.cols+ix;
  return lerp(lerp(t.heights[i],t.heights[i+1],u),lerp(t.heights[i+t.cols],t.heights[i+t.cols+1],u),v);
}
