import { CreateGreasedLine } from '@babylonjs/core/Meshes/Builders/greasedLineBuilder';
import { GreasedLineMeshMaterialType } from '@babylonjs/core/Materials/GreasedLine/greasedLineMaterialInterfaces';
import type { GreasedLineMesh } from '@babylonjs/core/Meshes/GreasedLine/greasedLineMesh';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector2 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Point } from '../core/types';
import type { PresentationTheme } from './themes';
import { planningHeight } from './planning-height';
import type { TrackDefinition } from '../core/types';
import { PACE_RANGE } from '../core/route';

export function pacePalette(theme: PresentationTheme) {
  return [theme.pace.slow, theme.pace.medium, theme.pace.fast].map(c => Color3.FromHexString(c));
}
export function paceColorToRef(speed: number, palette: Color3[], out: Color3) {
  const t = Math.max(0, Math.min(1, (speed - PACE_RANGE.min) / (PACE_RANGE.max - PACE_RANGE.min))) * 2;
  const band = t < 1 ? 0 : 1;
  Color3.LerpToRef(palette[band], palette[band + 1], t - band, out);
  return out;
}
export class PaceLine {
  readonly meshes: GreasedLineMesh[];
  constructor(private scene: Scene, points: Point[], speeds: number[], private theme: PresentationTheme, player = 0, private racing = false, error = false, ignored = false, track?: TrackDefinition) {
    const heights = points.map(p => (track ? planningHeight(p, track) : 0) + 0.32 + player * 0.012);
    const palette = pacePalette(theme);
    this.meshes = [true, false].map(outline => {
      const mesh = CreateGreasedLine('pace-route', { points: points.flatMap((p,i) => [p.x, heights[i] + (outline ? 0 : 0.005), p.z]) }, {
        materialType: GreasedLineMeshMaterialType.MATERIAL_TYPE_STANDARD,
        sizeAttenuation: true, width: outline ? theme.pace.outlineWidth : theme.pace.width,
        color: outline ? Color3.FromHexString('#111820') : ignored ? Color3.FromHexString('#aebdc5') : error ? Color3.FromHexString('#ff6ce1') : undefined,
        colors: outline || error || ignored ? undefined : speeds.map(speed => paceColorToRef(speed, palette, new Color3())), useColors: !outline && !error && !ignored,
        useDash: ignored || racing && player > 0, dashCount: ignored ? 22 : player === 1 ? 28 : player === 2 ? 54 : 85, dashRatio: ignored ? 0.45 : player === 3 ? 0.7 : 0.25,
      }, scene) as GreasedLineMesh;
      // The simple shader can be ready/active yet draw no pixels on desktop ANGLE. The standard
      // plugin supports both renderer paths; unlit color keeps pace independent of venue lighting.
      const material=mesh.material as StandardMaterial;
      material.disableLighting=true;material.emissiveColor=Color3.White();
      material.metadata = { roadsterOverlay: true };
      const pre=scene.prePassRenderer;
      // The new-material observer runs before the metadata is assigned above.
      if(pre&&!pre.excludedMaterials.includes(material))pre.excludedMaterials.push(material);
      // Both layers use the transparent queue so the outline cannot paint over colored joins.
      mesh.isPickable = false; mesh.alphaIndex = outline ? 0 : 1;
      mesh.material!.alpha = ignored ? outline ? 0.35 : 0.65 : racing ? outline ? 0.35 : 0.66 : outline ? 0.7 : 0.999;
      mesh.material!.disableDepthWrite = true;
      return mesh;
    }); this.resize();
  }
  resize() {
    const engine = this.scene.getEngine(), canvas = engine.getRenderingCanvas()!, scale = engine.getRenderWidth() / canvas.clientWidth;
    const viewport = this.scene.activeCamera!.viewport;
    // The shader's NDC expansion is half a pixel per width unit; use the actual camera viewport.
    this.meshes.forEach((mesh, i) => { const m = mesh.greasedLineMaterial!; m.width = (i ? this.racing ? this.theme.pace.racingWidth : this.theme.pace.width : this.racing ? this.theme.pace.racingOutlineWidth : this.theme.pace.outlineWidth) * scale * 2; m.resolution = new Vector2(engine.getRenderWidth() * viewport.width, engine.getRenderHeight() * viewport.height); });
  }
  get cssWidths() {
    const engine = this.scene.getEngine(), scale = engine.getRenderWidth() / engine.getRenderingCanvas()!.clientWidth;
    return this.meshes.map(mesh => mesh.greasedLineMaterial!.width / (scale * 2));
  }
  dispose() {
    const excluded = this.scene.prePassRenderer?.excludedMaterials;
    for (const mesh of this.meshes) {
      const index = excluded && mesh.material ? excluded.indexOf(mesh.material) : -1;
      if (index >= 0) excluded!.splice(index, 1);
      mesh.dispose(false, true);
    }
  }
}
