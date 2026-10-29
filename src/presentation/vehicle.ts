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
import { thrustEffects, sceneTuning, vehicleMaterials, paintFinishes, defaultPaintId } from './themes';
import type { PresentationTheme } from './themes';
import type { VisualAssets } from './assets';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { softShadowTexture } from './textures';
import { TireMarks } from './tire-marks';
import { buildRoadsterGeometry, type RoadsterPart } from './roadster-geometry.js';
import { assetUrl } from './urls';
import { fitVehicleToSurface,type ContactPoint } from './vehicle-grounding';
import{ContactShadow}from'./contact-shadow';
import type{RenderedSurface}from'./rendered-surface';
import{Texture}from'@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';

const geometries = new Map<string, ReturnType<typeof buildRoadsterGeometry>>();
const sharedMeshes = new WeakMap<Scene, Map<string, Mesh>>();
const sharedMaterials = new WeakMap<Scene, Map<string, PBRMaterial>>();
const brushedTextures = new WeakMap<Scene, RawTexture>();
/** Small deterministic normal map; no external texture, custom shader or additional draw. */
function steelBrushing(scene: Scene) {
  let texture = brushedTextures.get(scene); if (texture) return texture;
  const size = 128, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, grain = Math.sin(y * 2.47) * 11 + Math.sin(y * .73 + x * .04) * 4;
    pixels[i] = 128; pixels[i + 1] = Math.round(128 + grain); pixels[i + 2] = 254; pixels[i + 3] = 255;
  }
  // RGBA is supported by both WebGL 2 and WebGPU (RGB-only textures are not).
  texture = RawTexture.CreateRGBATexture(pixels, size, size, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  texture.name = 'satin-steel-micro-brushing'; texture.gammaSpace = false;
  texture.uScale = 3; texture.vScale = 5; brushedTextures.set(scene, texture); return texture;
}
const SCALE = 2.2 / 2.0201642066907674;
export const vehicleAttachments = { rearJets: [-0.51, -0.185, 0.185, 0.51], jetHeight: 0.60, jetZ: -2.36, width: 2.2, length: 5.2 };

export class VehicleView {
  readonly root: TransformNode;
  private chassis: TransformNode;
  private paint: PBRMaterial;
  private glass: PBRMaterial;
  private tail: PBRMaterial;
  private wheels: { pivot: TransformNode; mesh: Mesh; front: boolean; radius: number;restY:number }[] = [];
  private brakes: Mesh;
  private brakePositions: Float32Array;
  private brakeNormals: Float32Array;
  private brakeRest: Float32Array;
  private brakeRestNormals: Float32Array;
  private brakeRanges: { from: number; to: number; x: number; z: number; wheel: number }[] = [];
  private tyreContacts:ContactPoint[]=[];
  private jets: Mesh[] = [];
  private shadow: AbstractMesh;
  private shadowView:ContactShadow;
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
    this.paint = pbr('roadster-paint', theme.scene.paint, .5, .23); this.paint.clearCoat.isEnabled = true;
    this.glass = pbr('roadster-glass', vehicleMaterials.glass.color, vehicleMaterials.glass.metallic, vehicleMaterials.glass.roughness);
    this.glass.clearCoat.isEnabled = true; this.glass.clearCoat.intensity = vehicleMaterials.glass.coat;
    const carbon = pbr('roadster-carbon', vehicleMaterials.carbon.color, vehicleMaterials.carbon.metallic, vehicleMaterials.carbon.roughness), metal = pbr('roadster-metal', vehicleMaterials.metal.color, vehicleMaterials.metal.metallic, vehicleMaterials.metal.roughness);
    metal.clearCoat.isEnabled = true; metal.clearCoat.intensity = vehicleMaterials.steel.coat; metal.clearCoat.roughness = vehicleMaterials.steel.coatRoughness;
    metal.bumpTexture = steelBrushing(scene); metal.bumpTexture.level = vehicleMaterials.steel.brushing;
    const front = pbr('roadster-led', '#f2f8ff', 0.2, 0.2); front.emissiveColor = new Color3(0.8, 0.9, 1);
    this.tail = pbr('roadster-tail', '#d91e29', 0.2, 0.25); this.tail.emissiveColor = new Color3(0.5, 0.015, 0.005);
    let g = geometries.get(detail); if (!g) { g = buildRoadsterGeometry(detail); geometries.set(detail, g); }
    let triangles = 0;
    let meshCache = sharedMeshes.get(scene); if (!meshCache) { meshCache = new Map(); sharedMeshes.set(scene, meshCache); }
    const meshFor = (name: string, parts: { part: RoadsterPart; color?: number[] }[], parent: TransformNode, side = 1) => {
      const key = `${detail}:${name}:${side}`, source = meshCache!.get(key);
      if (source) { const clone = source.clone(name, parent, true)!; triangles += clone.getTotalIndices() / 3; return clone; }
      const data = new VertexData(), p: number[] = [], n: number[] = [], colors: number[] = [], indices: number[] = [], uvs: number[] = [];
      for (const { part, color } of parts) for (let i = 0; i < part.p.length; i += 3) {
        p.push(part.p[i + 2] * side * SCALE, part.p[i + 1] * SCALE, part.p[i] * SCALE);
        n.push(part.n[i + 2] * side, part.n[i + 1], part.n[i]); colors.push(...(color ?? [1, 1, 1]), 1);
        uvs.push(part.p[i] * .22, part.p[i + 2] * .5);
      }
      // RoadsterLAB is right-handed; swapping X/Z already reverses winding for Babylon's left-handed scene.
      for (let i = 0; i < p.length / 3; i += 3) indices.push(i, i + (side === 1 ? 1 : 2), i + (side === 1 ? 2 : 1));
      data.positions = p; data.normals = n; data.indices = indices; data.colors = colors; data.uvs = uvs;
      const mesh = new Mesh(name, scene); data.applyToMesh(mesh); mesh.parent = parent; mesh.isPickable = false; triangles += indices.length / 3; meshCache!.set(key, mesh); return mesh;
    };
    const groups = new Map<PBRMaterial, RoadsterPart[]>();
    for (const [name, part] of Object.entries(g.body)) {
      const mat = name === 'paint' ? this.paint : name.startsWith('glass') ? this.glass : name === 'light' || name === 'plate' ? front : name === 'red' || name === 'amber' ? this.tail : name === 'chrome' || name === 'steel' ? metal : carbon;
      const parts = groups.get(mat) ?? []; parts.push(part); groups.set(mat, parts);
    }
    for (const [mat, parts] of groups) meshFor(mat.name, parts.map(part => ({ part })), this.chassis).material = mat;
    const wheelMat = pbr('roadster-wheel', '#ffffff', vehicleMaterials.wheels.metallic, vehicleMaterials.wheels.roughness);
    const brakeParts: { part: RoadsterPart; color: number[] }[] = []; let brakeOffset = 0;
    g.mounts.forEach((mount, i) => { for (const side of [-1, 1]) {
      const pivot = new TransformNode('wheel-steering-pivot', scene); pivot.parent = this.root; pivot.position.set(mount.z * side * SCALE, mount.y * SCALE, mount.x * SCALE);
      const parts = Object.entries(g!.wheels[i].spin).map(([name, part]) => ({ part, color: g!.wheelMaterials[name].c }));
      const mesh = meshFor(`machined-wheel-${i}`, parts, pivot, side); mesh.material = wheelMat;
      const from = brakeOffset;
      for (const [name, part] of Object.entries(g!.wheels[i].fixed)) {
        const p: number[] = [], n: number[] = [];
        for (let j = 0; j < part.p.length; j += 9) for (const k of side === 1 ? [0, 3, 6] : [0, 6, 3]) {
          p.push(part.p[j+k]+mount.x, part.p[j+k+1]+mount.y, (part.p[j+k+2]+mount.z)*side);
          n.push(part.n[j+k], part.n[j+k+1], part.n[j+k+2]*side);
        }
        brakeParts.push({ part: { p, n }, color: g!.wheelMaterials[name].c }); brakeOffset += p.length;
      }
      this.brakeRanges.push({ from, to: brakeOffset, x: mount.z*side*SCALE, z: mount.x*SCALE, wheel: this.wheels.length });
      this.wheels.push({ pivot, mesh, front: i === 0, radius: mount.r * SCALE,restY:pivot.position.y });
      const visual=detail==='race'?sceneTuning.vehicle.racingScale:1;
      this.tyreContacts.push({x:mount.z*side*SCALE*visual,y:(mount.y-mount.r)*SCALE*visual,z:mount.x*SCALE*visual});
    } });
    // Four fixed assemblies, one draw. Each range follows its wheel's steering/suspension,
    // never wheel spin. Independent buffers prevent one car steering another's brakes.
    this.brakes = meshFor('fixed-brakes', brakeParts, this.root); this.brakes.material = wheelMat;
    this.brakes.makeGeometryUnique(); this.brakes.metadata = { fixedWheelAssemblies: 4 };
    this.brakeRest = new Float32Array(brakeParts.flatMap(({part}) => Array.from({length:part.p.length/3},(_,i)=>[part.p[i*3+2]*SCALE,part.p[i*3+1]*SCALE,part.p[i*3]*SCALE]).flat()));
    this.brakeRestNormals = new Float32Array(brakeParts.flatMap(({part}) => Array.from({length:part.n.length/3},(_,i)=>[part.n[i*3+2],part.n[i*3+1],part.n[i*3]]).flat()));
    this.brakePositions = this.brakeRest.slice(); this.brakeNormals = this.brakeRestNormals.slice();
    this.brakes.setVerticesData(VertexBuffer.PositionKind, this.brakePositions, true);
    this.brakes.setVerticesData(VertexBuffer.NormalKind, this.brakeNormals, true);
    this.triangleCount = triangles;
    const jet = new StandardMaterial('cold-gas-thrust', scene); jet.disableLighting = true; jet.emissiveColor = Color3.FromHexString(thrustEffects.coreColor); jet.alpha = thrustEffects.coreOpacity;
    const cores: Mesh[] = [];
    for (const x of vehicleAttachments.rearJets) {
      const plume = MeshBuilder.CreateCylinder('expanding-thrust', { height: 3, diameterTop: 0.08, diameterBottom: 0.7, tessellation: 8 }, scene);
      plume.rotation.x = Math.PI / 2; plume.position.x = x; plume.material = jet; cores.push(plume);
    }
    // Bake the four local nozzle shapes before parenting, avoiding doubled vehicle scale.
    const plume = Mesh.MergeMeshes(cores, true, true)!; plume.name = 'four-forward-thrust-cores';
    plume.position.set(0, vehicleAttachments.jetHeight, -3.7); plume.parent = this.root;
    plume.isPickable = false; plume.isVisible = false; plume.metadata = { boundedCores: 4 }; this.jets.push(plume);
    const shadowMat = new StandardMaterial('car-contact', scene); shadowMat.emissiveColor.setAll(1); shadowMat.alpha = 0.5; shadowMat.disableLighting = true; shadowMat.diffuseTexture = softShadowTexture(scene); shadowMat.useAlphaFromDiffuseTexture = true;
    shadowMat.diffuseTexture.wrapU=shadowMat.diffuseTexture.wrapV=Texture.CLAMP_ADDRESSMODE;shadowMat.backFaceCulling=false;
    this.shadowView=new ContactShadow(scene,shadowMat,sceneTuning.vehicle.shadowTriangles);this.shadow=this.shadowView.mesh;
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
  private applyPaint(color: string) {
    const steel = color.toLowerCase() === paintFinishes.find(p => p.id === defaultPaintId)!.color.toLowerCase();
    const finish = steel ? vehicleMaterials.steel : vehicleMaterials.painted;
    this.paint.albedoColor = Color3.FromHexString(color).toLinearSpace();
    this.paint.metallic = finish.metallic; this.paint.roughness = finish.roughness;
    this.paint.clearCoat.intensity = finish.coat; this.paint.clearCoat.roughness = finish.coatRoughness;
    this.paint.bumpTexture = steel ? steelBrushing(this.scene) : null;
    if (this.paint.bumpTexture) this.paint.bumpTexture.level = vehicleMaterials.steel.brushing;
  }
  setPaint(color: string) { this.selectedPaint = color; this.applyPaint(color); }
  setTheme(theme: PresentationTheme) { this.applyPaint(this.selectedPaint ?? (this.identity === null ? theme.scene.paint : theme.players[this.identity])); this.glass.albedoColor = Color3.FromHexString(vehicleMaterials.glass.color).toLinearSpace(); this.dustMaterial.emissiveColor = Color3.FromHexString(theme.scene.terrain); }
  update(position: { x: number; z: number; heading: number; y?: number; pitch?: number;roll?:number;alignToSurface?:boolean; airborne?: boolean; shadowY?: number; hopAge?: number; supportY?: number; surfaceAt?: (x: number, z: number) => number | undefined;tyreSurfaceAt?:(x:number,z:number)=>number|undefined;renderedSurface?:RenderedSurface }, speed = 0, thrust = false, time = 0, sandAmount = 0, drifting = false, steeringRate = 0, acceleration = 0) {
    const reduced = this.reducedMotion.matches, dt = Math.max(0, Math.min(0.1, time - this.previousTime)); this.previousTime = time;
    const visibleSurface=position.tyreSurfaceAt??position.surfaceAt;
    const fit=position.alignToSurface&&!position.airborne&&visibleSurface?fitVehicleToSurface(position,this.tyreContacts,visibleSurface,position.tyreSurfaceAt?sceneTuning.vehicle.contactGap:sceneTuning.vehicle.groundLift,sceneTuning.vehicle.suspensionTravel):null;
    const renderPose=fit?{...position,y:fit.y-sceneTuning.vehicle.groundLift,pitch:fit.pitch,roll:fit.roll}:position;
    this.root.position.set(position.x, sceneTuning.vehicle.groundLift + (renderPose.y ?? 0), position.z); this.root.rotation.y = position.heading; this.root.rotation.x = -(renderPose.pitch ?? 0);this.root.rotation.z=renderPose.roll??0;
    const blend = 1 - Math.exp(-12 * dt);
    this.chassis.rotation.z += ((reduced ? 0 : Math.max(-0.045, Math.min(0.045, -steeringRate * speed * 0.0016))) - this.chassis.rotation.z) * blend;
    this.chassis.rotation.x += ((reduced ? 0 : Math.max(-0.035, Math.min(0.035, acceleration * 0.004))) - this.chassis.rotation.x) * blend;
    this.tail.emissiveColor.set(acceleration < -0.8 ? 2.5 : 0.5, 0.015, 0.005);
    this.chassis.position.y = !reduced && time < this.impactUntil ? -(this.landingImpact ? sceneTuning.vehicle.landingCompression : sceneTuning.vehicle.contactCompression) * Math.sin((this.impactUntil - time) / sceneTuning.vehicle.impactDuration * Math.PI) : 0;
    const shadowY = position.airborne ? position.shadowY ?? 0 : position.y ?? 0, clearance = Math.max(0, (position.y ?? 0) - shadowY);
    const groundShadow=fit??(position.alignToSurface&&visibleSurface?fitVehicleToSurface({...position,pitch:0,roll:0},this.tyreContacts,visibleSurface,0,0):null);
    const shadowLift=groundShadow&&position.tyreSurfaceAt?sceneTuning.vehicle.shadowGap:this.detail==='showcase'?.135:.125;
    const shadowScale=(this.detail==='race'?sceneTuning.vehicle.racingScale:1)*Math.min(sceneTuning.vehicle.shadowMaxScale,1+clearance*.08);
    this.shadowView.update(position,groundShadow?.surfaceY??shadowY,groundShadow?.pitch??0,groundShadow?.roll??0,shadowScale,shadowLift,position.renderedSurface);this.shadow.metadata={surfaceProjected:!!position.renderedSurface};
    (this.shadow.material as StandardMaterial).alpha = 0.5 / (1 + clearance * 0.2);
    this.tireMarks.update({...position,surfaceAt:position.tyreSurfaceAt??position.surfaceAt,trailLift:position.tyreSurfaceAt?sceneTuning.vehicle.projectedMarkLift:undefined}, time, this.detail === 'race' && !position.airborne && !reduced && drifting && sandAmount < 0.2 && speed > 4);
    this.wheelDistance += speed * dt;
    for (const [i,w] of this.wheels.entries()) { w.pivot.position.y=w.restY+(fit?.suspension[i]??0)/(this.detail==='race'?sceneTuning.vehicle.racingScale:1);w.mesh.rotation.x = this.wheelDistance / w.radius; w.pivot.rotation.y = w.front ? Math.max(-0.43, Math.min(0.43, steeringRate * 2.8 / Math.max(5, speed))) : 0; }
    for (const range of this.brakeRanges) {
      const wheel = this.wheels[range.wheel], angle = wheel.pivot.rotation.y, c = Math.cos(angle), s = Math.sin(angle), dy = wheel.pivot.position.y-wheel.restY;
      for (let i = range.from; i < range.to; i += 3) {
        const x = this.brakeRest[i]-range.x, z = this.brakeRest[i+2]-range.z;
        this.brakePositions[i] = range.x+c*x+s*z; this.brakePositions[i+1] = this.brakeRest[i+1]+dy; this.brakePositions[i+2] = range.z-s*x+c*z;
        this.brakeNormals[i] = c*this.brakeRestNormals[i]+s*this.brakeRestNormals[i+2]; this.brakeNormals[i+1] = this.brakeRestNormals[i+1]; this.brakeNormals[i+2] = -s*this.brakeRestNormals[i]+c*this.brakeRestNormals[i+2];
      }
    }
    this.brakes.updateVerticesData(VertexBuffer.PositionKind, this.brakePositions); this.brakes.updateVerticesData(VertexBuffer.NormalKind, this.brakeNormals);
    if (this.detail === 'race') { this.vapor.update(renderPose, speed, thrust, dt, reduced); this.coldGas.update(renderPose, reduced); }
    this.jets.forEach((j, i) => { j.isVisible = thrust; j.scaling.z = 1 + (reduced ? 0 : Math.sin(time * 55 + i) * 0.14); });
    const impact = time < this.impactUntil;
    this.dustMaterial.alpha = impact ? 0.6 : sandAmount * 0.28;
    this.dust.isVisible = !position.airborne && !reduced && ((sandAmount > 0.08 && speed > 2) || impact);
    if (this.dust.isVisible) {
      for (let i = 0; i < 6; i++) {
        const age = (time * 2 + i / 6) % 1, back = impact ? -1 : 2 + age * 5, side = Math.sin(i * 3.7) * (0.5 + age);
        const x = position.x - Math.sin(position.heading) * back + Math.cos(position.heading) * side;
        const z = position.z - Math.cos(position.heading) * back - Math.sin(position.heading) * side;
        const size = (impact ? 0.3 : 0.7) + age * 1.4, offset = i * this.dustBase.length,ground=visibleSurface?.(x,z)??position.y??0;
        for (let j = 0; j < this.dustBase.length; j += 3) {
          this.dustPositions[offset + j] = x + this.dustBase[j] * size;
          this.dustPositions[offset + j + 1] = ground + 0.4 + age * 0.5 + this.dustBase[j + 1] * size;
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
