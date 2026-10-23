import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { thrustEffects, sceneTuning } from './themes';

const shared = new WeakMap<Scene, StandardMaterial>();
interface Puff { age: number; x: number; y: number; z: number; vx: number; vz: number; size: number }
/** One preallocated billboard mesh per car. Cosmetic time/randomness never enter the race state. */
export class ThrustVapor {
  readonly mesh: Mesh;
  private particles: Puff[] = Array.from({ length: thrustEffects.capacity }, () => ({ age: 99, x: 0, y: 0, z: 0, vx: 0, vz: 0, size: 1 }));
  private positions = new Float32Array(thrustEffects.capacity * 12);
  private colors = new Float32Array(thrustEffects.capacity * 16);
  private cursor = 0;
  private emission = 0;
  private enabled = true;
  private seed = 12345;
  get liveCount() { return this.particles.filter(p => p.age < thrustEffects.lifetime).length; }
  constructor(private scene: Scene) {
    let material = shared.get(scene);
    if (!material) {
      const texture = new DynamicTexture('soft-vapor', 64, scene, false), ctx = texture.getContext() as CanvasRenderingContext2D;
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31); gradient.addColorStop(0, 'rgba(255,255,255,0.95)'); gradient.addColorStop(0.45, 'rgba(255,255,255,0.65)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.clearRect(0, 0, 64, 64); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64); texture.hasAlpha = true; texture.update();
      material = new StandardMaterial('thrust-vapor', scene); material.diffuseTexture = texture; material.useAlphaFromDiffuseTexture = true; material.disableLighting = true; material.emissiveColor = Color3.FromHexString(thrustEffects.color); material.backFaceCulling = false; material.disableDepthWrite = true; shared.set(scene, material);
    }
    const indices: number[] = [], uvs: number[] = [];
    for (let i = 0; i < thrustEffects.capacity; i++) { const b = i * 4; indices.push(b, b + 1, b + 2, b, b + 2, b + 3); uvs.push(0, 0, 1, 0, 1, 1, 0, 1); }
    const data = new VertexData(); data.positions = this.positions; data.colors = this.colors; data.indices = indices; data.uvs = uvs;
    this.mesh = new Mesh('pooled-thrust-vapor', scene); data.applyToMesh(this.mesh, true); this.mesh.material = material; this.mesh.hasVertexAlpha = true; this.mesh.isPickable = false; this.mesh.alwaysSelectAsActiveMesh = true; this.mesh.isVisible = false;
  }
  clear() { this.particles.forEach(p => p.age = 99); this.emission = 0; this.mesh.isVisible = false; }
  setEnabled(value: boolean) { this.enabled = value; if (!value) this.clear(); }
  update(pose: { x: number; z: number; heading: number; y?: number }, speed: number, firing: boolean, dt: number, reduced: boolean) {
    if (!this.enabled) return;
    const lifetime = thrustEffects.lifetime, dx = Math.sin(pose.heading), dz = Math.cos(pose.heading);
    for (const p of this.particles) if (p.age < lifetime) { p.age += dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += 0.45 * dt; }
    if (firing) this.emission += dt * thrustEffects.emission * (reduced ? 0.35 : 1); else this.emission = 0;
    while (this.emission >= 1) {
      this.emission--; const slot = this.cursor++ % this.particles.length, p = this.particles[slot], outlet = [-0.51, -0.185, 0.185, 0.51][this.cursor % 4];
      this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; const jitter = this.seed / 4294967296 - 0.5;
      Object.assign(p, { age: reduced ? 0.35 : 0, x: pose.x - dx * 2.5 * sceneTuning.vehicle.racingScale + dz * outlet * sceneTuning.vehicle.racingScale, y: 0.13 + 0.6 * sceneTuning.vehicle.racingScale + (pose.y ?? 0), z: pose.z - dz * 2.5 * sceneTuning.vehicle.racingScale - dx * outlet * sceneTuning.vehicle.racingScale, vx: dx * (speed * 0.8 - thrustEffects.exhaustSpeed) + dz * jitter * 1.7, vz: dz * (speed * 0.8 - thrustEffects.exhaustSpeed) - dx * jitter * 1.7, size: 0.85 + jitter * 0.3 });
    }
    const camera = this.scene.activeCamera; if (!camera) return;
    const right = camera.getDirection(Vector3.Right()), up = camera.getDirection(Vector3.Up());
    let live = 0;
    this.particles.forEach((p, i) => {
      const t = Math.min(1, p.age / lifetime), active = p.age < lifetime, size = (thrustEffects.startSize + t * thrustEffects.expansion) * p.size;
      if (active) live++;
      for (let v = 0; v < 4; v++) {
        const x = (v === 0 || v === 3 ? -1 : 1) * size / 2, y = (v < 2 ? -1 : 1) * size / 2, at = i * 12 + v * 3, color = i * 16 + v * 4;
        this.positions[at] = p.x + right.x * x + up.x * y; this.positions[at + 1] = p.y + right.y * x + up.y * y; this.positions[at + 2] = p.z + right.z * x + up.z * y;
        this.colors[color] = this.colors[color + 1] = this.colors[color + 2] = 1; this.colors[color + 3] = active ? thrustEffects.opacity * (1 - t) ** 1.2 : 0;
      }
    });
    this.mesh.isVisible = live > 0; this.mesh.updateVerticesData(VertexBuffer.PositionKind, this.positions); this.mesh.updateVerticesData(VertexBuffer.ColorKind, this.colors);
  }
}
