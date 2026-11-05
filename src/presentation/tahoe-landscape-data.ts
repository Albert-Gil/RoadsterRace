import type { TrackDefinition } from '../core/types';
import { terrainArrays, type TerrainArrays } from './landscape/terrain-fields';
import { arrayBuffers, geometryArrays, type MeshArrays } from './landscape/mesh-arrays';
import { hex, mix } from './landscape/mesh';
import { fbm2, smoothstep } from './landscape/noise';
import { snowyTahoeAppearance as art } from './themes';
import { tahoeForest } from './tahoe-forest';
import { tahoeLayout } from './tahoe-layout';
import {alpineGroundColor} from './mountain-composition';

export interface TahoeLandscapeData { hills: TerrainArrays; forest: MeshArrays }
export const tahoeTransferables = (data: TahoeLandscapeData) => arrayBuffers(data.hills, data.forest);

/**
 * Snowy Tahoe's snow-laden fir forest and snow hills as plain arrays (no Babylon scene). Pure and
 * deterministic, so it runs in a scenery worker (tahoe-landscape.worker.ts) or inline.
 */
export function tahoeLandscapeData(track: TrackDefinition, layout = tahoeLayout(track)): TahoeLandscapeData {
  const forest = geometryArrays(tahoeForest(layout.trees, layout.height));
  // Branch and bough undersides face up, as the forest has always been lit.
  for (let i = 0; i < forest.normals.length; i += 3) if (forest.normals[i + 1] < 0) { forest.normals[i] *= -1; forest.normals[i + 1] *= -1; forest.normals[i + 2] *= -1; }
  const hills = terrainArrays({ extent: art.extent, cell: 3, height(x, z) {
    // Keep the hidden substrate just below the road skin; this avoids
    // competing triangles between the world grid and the curved ribbon.
    return layout.height(x, z) - 1 * (1 - smoothstep(7, 10, layout.distance(x, z)));
  }, color(x, z, h, slope) {
    return alpineGroundColor(x,z,h,slope,layout.distance(x,z));
  } });
  return { hills, forest };
}
