import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';

/** Bounded, presentation-only tire ribbons: one mesh and a fixed allocation per car. */
export class TireMarks {
  private mesh: Mesh;
  private positions = new Float32Array(128 * 12);
  private cursor = 0;
  private last?: { x: number; z: number; heading: number; time: number };
  constructor(scene: Scene) {
    this.mesh = new Mesh('tire-trails', scene);
    const data = new VertexData(); data.positions = this.positions; data.normals = Array.from({ length: 128 * 4 }, () => [0, 1, 0]).flat();
    data.indices = Array.from({ length: 128 }, (_, i) => [i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3]).flat(); data.applyToMesh(this.mesh, true);
    const material = new StandardMaterial('tire-rubber-trace', scene); material.emissiveColor.setAll(0.025); material.disableLighting = true; material.alpha = 0.19; material.backFaceCulling = false;
    this.mesh.material = material; this.mesh.isPickable = false;
  }
  setEnabled(enabled: boolean) { this.mesh.setEnabled(enabled); }
  clear() { this.positions.fill(0); this.mesh.updateVerticesData(VertexBuffer.PositionKind, this.positions, true); this.last = undefined; this.cursor = 0; }
  update(pose: { x: number; z: number; heading: number }, time: number, active: boolean) {
    if (this.last && time < this.last.time) this.clear();
    if (!active) { this.last = undefined; return; }
    const previous = this.last;
    if (previous && time - previous.time < 0.06) return;
    if (previous && time - previous.time < 0.25 && Math.hypot(pose.x - previous.x, pose.z - previous.z) < 5) {
      for (const side of [-1, 1]) {
        const end = (p: typeof pose, offset: number) => [p.x + Math.cos(p.heading) * offset - Math.sin(p.heading) * 1.5, 0.185, p.z - Math.sin(p.heading) * offset - Math.cos(p.heading) * 1.5];
        this.positions.set([...end(previous, side * 0.98 - 0.13), ...end(previous, side * 0.98 + 0.13), ...end(pose, side * 0.98 + 0.13), ...end(pose, side * 0.98 - 0.13)], this.cursor * 12);
        this.cursor = (this.cursor + 1) % 128;
      }
      this.mesh.updateVerticesData(VertexBuffer.PositionKind, this.positions, true);
    }
    this.last = { ...pose, time };
  }
}
