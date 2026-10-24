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
import { finishVenue } from './venue-polish';
import { buildCanyon } from './canyon';
import { dressVenue } from './venue-detail';

export interface SceneryRuntime {
  shadowCasterMaterials: Set<StandardMaterial>;
  update(time: number, reducedMotion: boolean): void;
}
export function buildScenery(id: SceneryId, scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>): SceneryRuntime {
  if(id==='canyon')return buildCanyon(scene,track,theme,materials);
  let runtime: SceneryRuntime;
  if (id === 'sunset') runtime = buildSantaMonica(scene, track, theme, materials);
  else if (id === 'bay') runtime = buildBay(scene, track, theme, materials);
  else if (id === 'spaceport') runtime = buildSpaceport(scene, track, theme, materials);
  else {
    const result = buildCoast(scene, track, theme, materials);
    runtime = { shadowCasterMaterials: result.shadowCasterMaterials, update(time, reduced) {
      result.waterTexture.uOffset = reduced ? 0 : time * 0.003;
      result.foamMaterial.alpha = reduced ? 0.65 : 0.62 + Math.sin(time * 0.8) * 0.12;
    } };
  }
  buildCircuitDetails(scene, track, theme, materials, runtime.shadowCasterMaterials, id === 'coastal');
  finishVenue(id, scene, track, theme, materials);
  dressVenue(id, scene, materials);
  return runtime;
}
