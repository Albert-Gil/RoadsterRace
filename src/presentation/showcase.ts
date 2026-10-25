import { Scene } from '@babylonjs/core/scene';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { createReflectionSky, loadSky } from './environment';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import { VehicleView } from './vehicle';
import { showcaseSky, type PresentationTheme } from './themes';

/** A second scene shares the WebGL context; only menus render this detailed car. */
export class VehicleShowcase {
  readonly scene: Scene;
  readonly camera: FreeCamera;
  readonly car: VehicleView;
  private studio: BaseTexture;
  private photoStudio?: BaseTexture;
  private photoFailed = false;
  private podium: PBRMaterial;
  constructor(engine: AbstractEngine, theme: PresentationTheme) {
    this.scene = new Scene(engine); this.scene.autoClear = false; this.scene.clearColor = new Color4(0, 0, 0, 0);
    this.studio = createReflectionSky(this.scene, true); this.scene.environmentTexture = this.studio; this.scene.environmentIntensity = 1.3;
    const fill = new HemisphericLight('studio-fill', new Vector3(0, 1, 0), this.scene); fill.intensity = 1; fill.diffuse = Color3.FromHexString('#c4d8ed');
    const sun = new DirectionalLight('studio-strip', new Vector3(-0.6, -1, -0.4), this.scene); sun.intensity = 2.1; sun.diffuse = Color3.FromHexString('#fff0dd');
    this.camera = new FreeCamera('showcase-camera', new Vector3(7, 3.5, 9), this.scene); this.camera.fov = 0.48; this.camera.minZ = 0.1; this.camera.setTarget(new Vector3(0, 0.6, 0));
    this.car = new VehicleView(this.scene, theme, 'showcase'); this.car.update({ x: 0, z: 0, heading: -0.1 });
    const stage = MeshBuilder.CreateCylinder('presentation-plinth', { diameter: 6.5, height: 0.10, tessellation: 64 }, this.scene); stage.position.y = 0.08;
    const material = new PBRMaterial('satin-podium', this.scene); material.albedoColor = Color3.FromHexString('#202c36').toLinearSpace(); material.metallic = 0.5; material.roughness = 0.36; stage.material = material; this.podium = material;
  }
  resize() {
    const { width, height } = this.scene.getEngine().getRenderingCanvas()!.getBoundingClientRect();
    if (!width || !height) return;
    const portrait = height > width, compact = height < 650;
    this.camera.viewport = portrait ? new Viewport(0, 0.45, 1, 0.43) : new Viewport(0.36, compact ? 0.13 : 0.18, 0.64, 0.74);
    const aspect = width * this.camera.viewport.width / (height * this.camera.viewport.height);
    const distance = 11.5 * Math.max(1, 1.6 / aspect);
    this.camera.position.set(distance * 0.58, distance * 0.30, distance * 0.76); this.camera.setTarget(new Vector3(0, 0.5, 0));
  }
  setTheme(theme: PresentationTheme) { this.car.setTheme(theme); }
  /** Photographic studio reflections (CC0 HDRI) on capable tiers; the small procedural studio otherwise. */
  setSkyLighting(enabled: boolean) {
    if (enabled && !this.photoFailed) {
      // Turn the brightest softbox behind the car, opposite the camera, so the hood and glass reflect it.
      this.photoStudio ??= loadSky(this.scene, showcaseSky.file, this.camera.position.normalizeToNew().multiplyByFloats(1, -1, 1), () => { this.photoFailed = true; this.setSkyLighting(false); });
      this.scene.environmentTexture = this.photoStudio; this.scene.environmentIntensity = showcaseSky.intensity;
      // A satin metal plinth would mirror the softbox; keep it a dark, mostly diffuse stage.
      this.podium.metallic = 0.12; this.podium.roughness = 0.62;
    } else { this.scene.environmentTexture = this.studio; this.scene.environmentIntensity = 1.3; this.podium.metallic = 0.5; this.podium.roughness = 0.36; }
  }
  get projectionMetrics() {
    const engine = this.scene.getEngine(), canvas = engine.getRenderingCanvas()!, rect = canvas.getBoundingClientRect(), viewport = this.camera.viewport;
    const projection = this.scene.getProjectionMatrix().m;
    return { cssWidth: rect.width, cssHeight: rect.height, renderWidth: engine.getRenderWidth(true), renderHeight: engine.getRenderHeight(true), viewport: { x: viewport.x, y: viewport.y, width: viewport.width, height: viewport.height }, aspect: projection[5] / projection[0], expectedAspect: rect.width * viewport.width / (rect.height * viewport.height) };
  }
  inspectView(view: 'front' | 'side' | 'rear') {
    const views = { front: [1, 2.4, 13], side: [13, 2.4, 0], rear: [-1, 2.4, -13] };
    this.camera.position.copyFromFloats(...views[view] as [number, number, number]); this.camera.setTarget(new Vector3(0, 0.6, 0));
  }
  render(time: number) { this.car.update({ x: 0, z: 0, heading: -0.12 }, 0, false, time); this.scene.render(); }
  dispose() { this.scene.dispose(); }
}
