import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { Point } from '../core/types';

/** Eight bounded cosmetic ripples share one mesh and one draw call. */
export class JumpFeedback {
  private mesh: Mesh;
  private positions = new Float32Array(8 * 24 * 4 * 3);
  private colors = new Float32Array(8 * 24 * 4 * 4);
  private pulses: { point: Point; age: number; splash: boolean }[] = [];
  private previous = 0;
  constructor(scene: Scene) {
    const indices: number[] = [];
    for (let i = 0; i < 8 * 24; i++) { const b = i * 4; indices.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    const data = new VertexData(); data.positions = this.positions; data.colors = this.colors; data.indices = indices;
    this.mesh = new Mesh('pooled-jump-feedback', scene); data.applyToMesh(this.mesh, true); this.mesh.hasVertexAlpha = true; this.mesh.isPickable = false; this.mesh.alwaysSelectAsActiveMesh = true; this.mesh.isVisible = false;
    const mat = new StandardMaterial('jump-ripple', scene); mat.disableLighting = true; mat.emissiveColor.set(0.8, 0.93, 1); mat.backFaceCulling = false; mat.disableDepthWrite = true; this.mesh.material = mat;
  }
  emit(point: Point, splash: boolean) { if (this.pulses.length >= 8) this.pulses.shift(); this.pulses.push({ point: { ...point }, age: 0, splash }); }
  update(time: number, reduced: boolean) {
    const dt = Math.min(0.1, Math.max(0, time - this.previous)); this.previous = time;
    this.pulses.forEach(p => p.age += dt); this.pulses = this.pulses.filter(p => p.age < 0.85);
    this.mesh.isVisible = this.pulses.length > 0 && !reduced; if (!this.mesh.isVisible) return;
    this.colors.fill(0);
    this.pulses.forEach((p, slot) => {
      const r = 0.6 + p.age * (p.splash ? 7 : 3.5), y = p.splash ? -2.35 : 0.18;
      for (let i = 0; i < 24; i++) for (let v = 0; v < 4; v++) {
        const a = (i + (v === 1 || v === 2 ? 1 : 0)) / 24 * Math.PI * 2, radius = r + (v < 2 ? -0.18 : 0.18);
        const at = (slot * 96 + i * 4 + v) * 3, c = (slot * 96 + i * 4 + v) * 4;
        this.positions[at] = p.point.x + Math.cos(a) * radius; this.positions[at + 1] = y; this.positions[at + 2] = p.point.z + Math.sin(a) * radius;
        this.colors[c] = this.colors[c + 1] = this.colors[c + 2] = 1; this.colors[c + 3] = (1 - p.age / 0.85) * 0.8;
      }
    });
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, this.positions); this.mesh.updateVerticesData(VertexBuffer.ColorKind, this.colors);
  }
}
