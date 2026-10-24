import { Color3 } from '@babylonjs/core/Maths/math.color';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { ColdGas } from './cold-gas';
import { ThrustVapor } from './thrust-vapor';
import { thrustEffects, sceneTuning } from './themes';
import type { PresentationTheme } from './themes';
import type { VisualAssets } from './assets';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { softShadowTexture } from './textures';
import { TireMarks } from './tire-marks';
import { buildRoadsterGeometry, type RoadsterPart } from './roadster-geometry.js';
import { assetUrl } from './urls';

const geometries = new Map<string, ReturnType<typeof buildRoadsterGeometry>>();
const sharedMeshes = new WeakMap<Scene, Map<string, Mesh>>();
const sharedMaterials = new WeakMap<Scene, Map<string, PBRMaterial>>();
const SCALE = 2.2 / 2.0201642066907674;
export const vehicleAttachments = { rearJets: [-0.51, -0.185, 0.185, 0.51], jetHeight: 0.60, jetZ: -2.36, width: 2.2, length: 5.2 };

export class VehicleView {
  readonly root: TransformNode;
  private chassis: TransformNode;
  private paint: PBRMaterial;
  private glass: PBRMaterial;
  private tail: PBRMaterial;
  private wheels: { pivot: TransformNode; mesh: Mesh; front: boolean; radius: number }[] = [];
  private jets: Mesh[] = [];
  private shadow: AbstractMesh;
  private dust: Mesh;
  private dustBase: number[];
  private dustPositions: Float32Array;
  private dustMaterial: StandardMaterial;
  private identity: number | null = null;
  private selectedPaint: string | null = null;
  private tireMarks: TireMarks;
  readonly vapor: ThrustVapor;
  private coldGas: ColdGas;
  private landingImpact = false;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private previousTime = 0;
  private wheelDistance = 0;
  private impactUntil = -1;
  readonly triangleCount: number;
  constructor(private scene: Scene, theme: PresentationTheme, readonly detail: 'race' | 'showcase' = 'race') {
    this.root = new TransformNode(`roadster-${detail}`, scene); this.root.scaling.setAll(detail === 'race' ? sceneTuning.vehicle.racingScale : 1); this.chassis = new TransformNode('sprung-body', scene); this.chassis.parent = this.root;
    this.tireMarks = new TireMarks(scene); this.vapor = new ThrustVapor(scene); this.coldGas = new ColdGas(scene);
    let materialCache = sharedMaterials.get(scene); if (!materialCache) { materialCache = new Map(); sharedMaterials.set(scene, materialCache); }
    const pbr = (name: string, color: string, metal: number, roughness: number) => {
      const shared = name !== 'roadster-paint' && name !== 'roadster-tail', previous = shared && materialCache!.get(name); if (previous) return previous;
      const m = new PBRMaterial(name, scene); m.albedoColor = Color3.FromHexString(color).toLinearSpace(); m.metallic = metal; m.roughness = roughness; if (shared) materialCache!.set(name, m); return m;
    };
    this.paint = pbr('roadster-paint', theme.scene.paint, 0.45, 0.23); this.paint.clearCoat.isEnabled = true; this.paint.clearCoat.intensity = 1; this.paint.clearCoat.roughness = 0.09;
    this.glass = pbr('roadster-glass', theme.scene.glass, 0.25, 0.09);
    const carbon = pbr('roadster-carbon', '#151b20', 0.18, 0.53), metal = pbr('roadster-metal', '#909aa4', 0.85, 0.26);
    const front = pbr('roadster-led', '#f2f8ff', 0.2, 0.2); front.emissiveColor = new Color3(0.8, 0.9, 1);
    this.tail = pbr('roadster-tail', '#d91e29', 0.2, 0.25); this.tail.emissiveColor = new Color3(0.5, 0.015, 0.005);
    let g = geometries.get(detail); if (!g) { g = buildRoadsterGeometry(detail); geometries.set(detail, g); }
    let triangles = 0;
    let meshCache = sharedMeshes.get(scene); if (!meshCache) { meshCache = new Map(); sharedMeshes.set(scene, meshCache); }
    const meshFor = (name: string, parts: { part: RoadsterPart; color?: number[] }[], parent: TransformNode, side = 1) => {
      const key = `${detail}:${name}:${side}`, source = meshCache!.get(key);
      if (source) { const clone = source.clone(name, parent, true)!; triangles += clone.getTotalIndices() / 3; return clone; }
      const data = new VertexData(), p: number[] = [], n: number[] = [], colors: number[] = [], indices: number[] = [];
      for (const { part, color } of parts) for (let i = 0; i < part.p.length; i += 3) {
        p.push(part.p[i + 2] * side * SCALE, part.p[i + 1] * SCALE, part.p[i] * SCALE);
        n.push(part.n[i + 2] * side, part.n[i + 1], part.n[i]); colors.push(...(color ?? [1, 1, 1]), 1);
      }
      // RoadsterLAB is right-handed; swapping X/Z already reverses winding for Babylon's left-handed scene.
      for (let i = 0; i < p.length / 3; i += 3) indices.push(i, i + (side === 1 ? 1 : 2), i + (side === 1 ? 2 : 1));
      data.positions = p; data.normals = n; data.indices = indices; data.colors = colors;
      const mesh = new Mesh(name, scene); data.applyToMesh(mesh); mesh.parent = parent; mesh.isPickable = false; triangles += indices.length / 3; meshCache!.set(key, mesh); return mesh;
    };
    const groups = new Map<PBRMaterial, RoadsterPart[]>();
    for (const [name, part] of Object.entries(g.body)) {
      const mat = name === 'paint' ? this.paint : name.startsWith('glass') ? this.glass : name === 'light' || name === 'plate' ? front : name === 'red' || name === 'amber' ? this.tail : name === 'chrome' ? metal : carbon;
      const parts = groups.get(mat) ?? []; parts.push(part); groups.set(mat, parts);
    }
    for (const [mat, parts] of groups) meshFor(mat.name, parts.map(part => ({ part })), this.chassis).material = mat;
    const wheelMat = pbr('roadster-wheel', '#ffffff', 0.3, 0.45);
    g.mounts.forEach((mount, i) => { for (const side of [-1, 1]) {
      const pivot = new TransformNode('wheel-steering-pivot', scene); pivot.parent = this.root; pivot.position.set(mount.z * side * SCALE, mount.y * SCALE, mount.x * SCALE);
      const parts = [...Object.entries(g!.wheels[i].spin), ...Object.entries(g!.wheels[i].fixed)].map(([name, part]) => ({ part, color: g!.wheelMaterials[name].c }));
      const mesh = meshFor(`machined-wheel-${i}`, parts, pivot, side); mesh.material = wheelMat;
      this.wheels.push({ pivot, mesh, front: i === 0, radius: mount.r * SCALE });
    } });
    this.triangleCount = triangles;
    const jet = new StandardMaterial('cold-gas-thrust', scene); jet.disableLighting = true; jet.emissiveColor = Color3.FromHexString(thrustEffects.coreColor); jet.alpha = thrustEffects.coreOpacity;
    for (const x of vehicleAttachments.rearJets) {
      const plume = MeshBuilder.CreateCylinder('expanding-thrust', { height: 3, diameterTop: 0.08, diameterBottom: 0.7, tessellation: 8 }, scene);
      plume.rotation.x = Math.PI / 2; plume.position.set(x, vehicleAttachments.jetHeight, -3.7); plume.parent = this.root; plume.material = jet; plume.isVisible = false; this.jets.push(plume);
    }
    const shadowMat = new StandardMaterial('car-contact', scene); shadowMat.emissiveColor.setAll(1); shadowMat.alpha = 0.5; shadowMat.disableLighting = true; shadowMat.diffuseTexture = softShadowTexture(scene); shadowMat.useAlphaFromDiffuseTexture = true;
    this.shadow = MeshBuilder.CreateGround('car-shadow', { width: 3.5, height: 6.8 }, scene); this.shadow.material = shadowMat;
    this.dustMaterial = new StandardMaterial('sand-dust', scene); this.dustMaterial.disableLighting = true; this.dustMaterial.alpha = 0.28;
    // Keep the same six puffs in one bounded draw instead of six transparent meshes.
    const puff = MeshBuilder.CreateSphere('dust-template', { diameter: 1, segments: 3 }, scene);
    this.dustBase = Array.from(puff.getVerticesData(VertexBuffer.PositionKind)!);
    const puffNormals = Array.from(puff.getVerticesData(VertexBuffer.NormalKind)!), puffIndices = Array.from(puff.getIndices()!), vertices = puff.getTotalVertices();
    this.dustPositions = new Float32Array(this.dustBase.length * 6);
    const dustData = new VertexData(); dustData.positions = this.dustPositions;
    dustData.normals = Array.from({ length: 6 }, () => puffNormals).flat();
    dustData.indices = Array.from({ length: 6 }, (_, i) => puffIndices.map(index => index + vertices * i)).flat(); puff.dispose();
    this.dust = new Mesh('sand-puff-cloud', scene); dustData.applyToMesh(this.dust, true); this.dust.material = this.dustMaterial;
    this.dust.isPickable = false; this.dust.isVisible = false; this.dust.alwaysSelectAsActiveMesh = true;
    this.setTheme(theme);
  }
  impact(time: number, landing = false) { this.impactUntil = time + sceneTuning.vehicle.impactDuration; this.landingImpact = landing; }
  setIdentity(player: number | null, theme: PresentationTheme) { this.identity = player; this.setTheme(theme); }
  setEnabled(enabled: boolean) { this.root.setEnabled(enabled); this.shadow.setEnabled(enabled); this.coldGas.mesh.setEnabled(enabled && this.detail === 'race'); this.vapor.setEnabled(enabled && this.detail === 'race'); this.tireMarks.setEnabled(enabled && this.detail === 'race'); this.dust.setEnabled(enabled); }
  clearEffects() { this.vapor.clear(); this.coldGas.mesh.isVisible = false; this.tireMarks.clear(); this.previousTime = 0; this.wheelDistance = 0; this.impactUntil = -1; }
  setPaint(color: string) { this.selectedPaint = color; this.paint.albedoColor = Color3.FromHexString(color).toLinearSpace(); }
  setTheme(theme: PresentationTheme) { this.paint.albedoColor = Color3.FromHexString(this.selectedPaint ?? (this.identity === null ? theme.scene.paint : theme.players[this.identity])).toLinearSpace(); this.glass.albedoColor = Color3.FromHexString(theme.scene.glass).toLinearSpace(); this.dustMaterial.emissiveColor = Color3.FromHexString(theme.scene.terrain); }
  update(position: { x: number; z: number; heading: number; y?: number; pitch?: number; airborne?: boolean; shadowY?: number; hopAge?: number; supportY?: number; surfaceAt?: (x: number, z: number) => number | undefined }, speed = 0, thrust = false, time = 0, sandAmount = 0, drifting = false, steeringRate = 0, acceleration = 0) {
    const reduced = this.reducedMotion.matches, dt = Math.max(0, Math.min(0.1, time - this.previousTime)); this.previousTime = time;
    this.root.position.set(position.x, 0.13 + (position.y ?? 0), position.z); this.root.rotation.y = position.heading; this.root.rotation.x = -(position.pitch ?? 0);
    const blend = 1 - Math.exp(-12 * dt);
    this.chassis.rotation.z += ((reduced ? 0 : Math.max(-0.045, Math.min(0.045, -steeringRate * speed * 0.0016))) - this.chassis.rotation.z) * blend;
    this.chassis.rotation.x += ((reduced ? 0 : Math.max(-0.035, Math.min(0.035, acceleration * 0.004))) - this.chassis.rotation.x) * blend;
    this.tail.emissiveColor.set(acceleration < -0.8 ? 2.5 : 0.5, 0.015, 0.005);
    this.chassis.position.y = !reduced && time < this.impactUntil ? -(this.landingImpact ? sceneTuning.vehicle.landingCompression : sceneTuning.vehicle.contactCompression) * Math.sin((this.impactUntil - time) / sceneTuning.vehicle.impactDuration * Math.PI) : 0;
    const shadowY = position.airborne ? position.shadowY ?? 0 : position.y ?? 0, clearance = Math.max(0, (position.y ?? 0) - shadowY);
    this.shadow.position.set(position.x + 0.15, (this.detail === 'showcase' ? 0.135 : 0.125) + shadowY, position.z); this.shadow.rotation.y = position.heading;
    this.shadow.scaling.setAll((this.detail === 'race' ? sceneTuning.vehicle.racingScale : 1) * (1 + clearance * 0.08)); (this.shadow.material as StandardMaterial).alpha = 0.5 / (1 + clearance * 0.2);
    this.tireMarks.update(position, time, this.detail === 'race' && !position.airborne && !reduced && drifting && sandAmount < 0.2 && speed > 4);
    this.wheelDistance += speed * dt;
    for (const w of this.wheels) { w.mesh.rotation.x = this.wheelDistance / w.radius; w.pivot.rotation.y = w.front ? Math.max(-0.43, Math.min(0.43, steeringRate * 2.8 / Math.max(5, speed))) : 0; }
    if (this.detail === 'race') { this.vapor.update(position, speed, thrust, dt, reduced); this.coldGas.update(position, reduced); }
    this.jets.forEach((j, i) => { j.isVisible = thrust; j.scaling.y = 1 + (reduced ? 0 : Math.sin(time * 55 + i) * 0.14); });
    const impact = time < this.impactUntil;
    this.dustMaterial.alpha = impact ? 0.6 : sandAmount * 0.28;
    this.dust.isVisible = !position.airborne && !reduced && ((sandAmount > 0.08 && speed > 2) || impact);
    if (this.dust.isVisible) {
      for (let i = 0; i < 6; i++) {
        const age = (time * 2 + i / 6) % 1, back = impact ? -1 : 2 + age * 5, side = Math.sin(i * 3.7) * (0.5 + age);
        const x = position.x - Math.sin(position.heading) * back + Math.cos(position.heading) * side;
        const z = position.z - Math.cos(position.heading) * back - Math.sin(position.heading) * side;
        const size = (impact ? 0.3 : 0.7) + age * 1.4, offset = i * this.dustBase.length;
        for (let j = 0; j < this.dustBase.length; j += 3) {
          this.dustPositions[offset + j] = x + this.dustBase[j] * size;
          this.dustPositions[offset + j + 1] = 0.4 + age * 0.5 + this.dustBase[j + 1] * size;
          this.dustPositions[offset + j + 2] = z + this.dustBase[j + 2] * size;
        }
      }
      this.dust.updateVerticesData(VertexBuffer.PositionKind, this.dustPositions);
    }
  }
  async loadAsset(asset: VisualAssets['vehicle']) {
    if (asset.kind === 'procedural') return;
    try {
      await import('@babylonjs/loaders/glTF'); const { ImportMeshAsync } = await import('@babylonjs/core/Loading/sceneLoader'); const imported = await ImportMeshAsync(assetUrl(asset.url), this.scene);
      this.chassis.setEnabled(false); this.wheels.forEach(w => w.pivot.setEnabled(false));
      const model = new TransformNode('imported-vehicle-adapter', this.scene); model.parent = this.root; model.scaling.setAll(asset.scale); model.rotation.y = asset.rotationY;
      for (const mesh of imported.meshes) if (!mesh.parent) mesh.parent = model;
    } catch (error) { console.warn('Optional vehicle artwork unavailable; using the built-in roadster.', error); }
  }
}
