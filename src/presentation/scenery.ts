import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TrackDefinition } from '../core/types';
import type { SceneryId } from '../content/circuits';
import type { PresentationTheme } from './themes';
import { buildBay } from './bay';
import { buildCoast } from './coast';
import { buildSpaceport } from './spaceport';
import { buildCircuitDetails } from './circuit-details';
import { buildSantaMonica } from './santa-monica';

export interface SceneryRuntime {
  shadowCasterMaterials: Set<StandardMaterial>;
  update(time: number, reducedMotion: boolean): void;
}
export function buildScenery(id: SceneryId, scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>): SceneryRuntime {
  if (id === 'sunset') { const result = buildSantaMonica(scene, track, theme, materials); buildCircuitDetails(scene, track, theme, materials, result.shadowCasterMaterials, false); return result; }
  if (id === 'bay') { const result = buildBay(scene, track, theme, materials); buildCircuitDetails(scene, track, theme, materials, result.shadowCasterMaterials, false); return result; }
  if (id === 'spaceport') {
    const result = buildSpaceport(scene, track, theme, materials);
    buildCircuitDetails(scene, track, theme, materials, result.shadowCasterMaterials, false); return result;
  }
  const result = buildCoast(scene, track, theme, materials);
  buildCircuitDetails(scene, track, theme, materials, result.shadowCasterMaterials);
  return { shadowCasterMaterials: result.shadowCasterMaterials, update(time, reduced) {
    result.waterTexture.uOffset = reduced ? 0 : time * 0.003;
    result.foamMaterial.alpha = reduced ? 0.65 : 0.62 + Math.sin(time * 0.8) * 0.12;
  } };
}
