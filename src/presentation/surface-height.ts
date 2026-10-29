import{terrainSurface}from'../core/elevation';
import{supported}from'../core/support';
import type{Point,TrackDefinition}from'../core/types';
import{snowyTahoeAppearance,yosemiteAppearance}from'./themes';

/** Visible terrain skin; retained export name for existing snow callers. Cosmetics only. */
export function snowSurfaceHeight(p:Point,track:TrackDefinition){
 if(!supported(p,track))return undefined;
 const sample=terrainSurface(p,track),o=(track.id==='capitan-yosemite'?yosemiteAppearance:snowyTahoeAppearance).surfaceOffsets;
 const offset=sample.roadDistance<=track.roadWidth/2?(sample.branchId?o.branch:o.road):sample.roadDistance<=track.roadWidth/2+2?(sample.branchId?o.branchFringe:o.fringe):0;
 return sample.height+offset;
}
