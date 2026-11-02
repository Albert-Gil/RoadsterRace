import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TrackDefinition } from '../core/types';
import { terrainMesh } from './landscape/terrain';
import { arraysMesh } from './landscape/arrays-mesh';
import { yosemiteAppearance as art } from './themes';
import type { RenderedSurface } from './rendered-surface';
import { yosemiteLandscapeData, type YosemiteLandscapeData } from './yosemite-landscape-data';

/**
 * Native, vertex-coloured cliffs and forest. Their arrays are generated off the main thread
 * (yosemite-landscape.worker.ts) when possible, or here; this only makes the meshes.
 */
export function buildYosemiteLandscape(scene: Scene, track: TrackDefinition, m: { meadow: StandardMaterial; stone: StandardMaterial; forest: StandardMaterial; detail: StandardMaterial }, surface: RenderedSurface, data: YosemiteLandscapeData = yosemiteLandscapeData(track)) {
  const land = terrainMesh('yosemite-valley-hills', scene, data.land, m.meadow);
  m.meadow.diffuseColor.setAll(1);
  surface.setGrid({ p: data.land.positions, indices: data.land.indices, minX: art.extent.minX, minZ: art.extent.minZ, cell: 4, cols: data.land.cols, rows: data.land.rows }); land.isPickable = false; land.receiveShadows = true; land.freezeWorldMatrix();
  const cliffs = arraysMesh('weathered-yosemite-granite', scene, data.cliffs, m.stone);
  const woods = arraysMesh('yosemite-ponderosa-forest', scene, data.forest, m.forest); woods.metadata = { treeCount: data.trees.length, roadClearance: 24, placements: data.trees };
  const flowers = arraysMesh('yosemite-meadow-wildflowers', scene, data.flowers, m.detail);
  land.metadata = { authoritativeTerrain: true, cosmeticMeadowPatches: true }; cliffs.metadata = { formations: track.barriers.filter(b => b.kind === 'rock').length, weatheredSkin: true };
  return [cliffs, woods, flowers];
}
