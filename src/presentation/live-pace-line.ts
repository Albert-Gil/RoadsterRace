import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import { PACE_RANGE } from '../core/route';
import type { Point, TrackDefinition } from '../core/types';
import { PaceLine, paceColorToRef, pacePalette } from './pace-line';
import { planningHeight } from './planning-height';
import type { PresentationTheme } from './themes';

/** Same screen-space stroke material as preview. Only the populated prefix is drawn. */
export class LivePaceLine extends PaceLine {
  private positions: Float32Array;
  private previous: Float32Array;
  private next: Float32Array;
  private lengths: Float64Array;
  private colors?: Uint8Array;
  private palette: Color3[];
  private color = new Color3();
  private minimum = new Vector3();
  private maximum = new Vector3();

  constructor(scene: Scene, readonly capacity: number, readonly appearance: PresentationTheme, ignored: boolean) {
    // The builder supplies strip indices, side widths and color indices once per capacity.
    super(scene, Array.from({ length: capacity }, (_, x) => ({ x, z: 0 })), Array(capacity).fill(PACE_RANGE.min),
      appearance, 0, false, false, ignored);
    this.palette = pacePalette(appearance);
    this.positions = new Float32Array(capacity * 6);
    this.previous = new Float32Array(capacity * 8);
    this.next = new Float32Array(capacity * 8);
    this.lengths = new Float64Array(capacity);
    const texture = this.meshes[1].greasedLineMaterial!.colorsTexture;
    if (!ignored && texture) {
      const { width, height } = texture.getSize();
      this.colors = new Uint8Array(width * height * 4).fill(255);
    }
    for (const mesh of this.meshes) {
      mesh.setVerticesData('position', this.positions, true, 3);
      mesh.setVerticesData('grl_previousAndSide', this.previous, true, 4);
      mesh.setVerticesData('grl_nextAndCounters', this.next, true, 4);
    }
    this.meshes[1].position.y = 0.005;
  }

  update(points: Point[], speeds: number[], track: TrackDefinition) {
    const count = points.length, pos = this.positions;
    let total = 0;
    this.minimum.setAll(Infinity);
    this.maximum.setAll(-Infinity);
    for (let i = 0; i < count; i++) {
      const p = points[i], y = planningHeight(p, track) + 0.32, k = i * 6;
      pos[k] = pos[k+3] = p.x; pos[k+1] = pos[k+4] = y; pos[k+2] = pos[k+5] = p.z;
      this.minimum.minimizeInPlaceFromFloats(p.x, y, p.z);
      this.maximum.maximizeInPlaceFromFloats(p.x, y, p.z);
      if (i) total += Math.hypot(pos[k]-pos[k-6], pos[k+1]-pos[k-5], pos[k+2]-pos[k-4]);
      this.lengths[i] = total;
      if (this.colors) {
        paceColorToRef(speeds[i], this.palette, this.color);
        this.colors[i*4] = this.color.r * 255; this.colors[i*4+1] = this.color.g * 255; this.colors[i*4+2] = this.color.b * 255;
      }
    }
    const last = (count-1)*6;
    const closed = pos[0] === pos[last] && pos[1] === pos[last+1] && pos[2] === pos[last+2];
    for (let i = 0; i < count; i++) {
      const before = (i ? i-1 : closed ? count-2 : 0)*6;
      const after = (i+1 < count ? i+1 : closed ? 1 : count-1)*6;
      for (let side = 0; side < 2; side++) {
        const k = i*8 + side*4;
        this.previous[k] = pos[before]; this.previous[k+1] = pos[before+1]; this.previous[k+2] = pos[before+2];
        this.previous[k+3] = side ? -1 : 1;
        this.next[k] = pos[after]; this.next[k+1] = pos[after+1]; this.next[k+2] = pos[after+2];
        this.next[k+3] = this.lengths[i] / (total || 1);
      }
    }
    for (const mesh of this.meshes) {
      mesh.updateVerticesData('position', pos);
      mesh.updateVerticesData('grl_previousAndSide', this.previous);
      mesh.updateVerticesData('grl_nextAndCounters', this.next);
      mesh.subMeshes[0].indexCount = (count-1)*6;
      const bounds = mesh.getBoundingInfo();
      bounds.reConstruct(this.minimum, this.maximum, mesh.getWorldMatrix());
      mesh.subMeshes[0].setBoundingInfo(bounds);
    }
    if (this.colors) this.meshes[1].greasedLineMaterial!.colorsTexture!.update(this.colors);
  }
}
