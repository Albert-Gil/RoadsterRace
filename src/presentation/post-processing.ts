import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Scene } from '@babylonjs/core/scene';
import type { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Observer } from '@babylonjs/core/Misc/observable';
import { Constants } from '@babylonjs/core/Engines/constants';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import { SSRRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssrRenderingPipeline';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent';
import '@babylonjs/core/Rendering/prePassRendererSceneComponent';
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent';
import { postEffects, type GraphicsTier } from './themes';

/**
 * Screen-space passes for the world camera. Materials keep applying tone mapping and exposure
 * (the pipeline runs in LDR), so route colors and HUD-adjacent visuals keep their tuned values;
 * the passes add anti-aliasing, ambient occlusion, reflections, bloom and sharpening on top.
 */
export class PostEffects {
  private pipeline?: DefaultRenderingPipeline;
  private ssao?: SSAO2RenderingPipeline;
  private ssr?: SSRRenderingPipeline;
  private observers: Observer<Material>[] = [];
  constructor(private scene: Scene, private camera: Camera) {}
  apply(tier: GraphicsTier, sky: CubeTexture | null) {
    this.dispose();
    const ao = tier.ambientOcclusion, post = tier.postProcessing;
    if (ao) {
      const ssao = new SSAO2RenderingPipeline('ambient-occlusion', this.scene, { ssaoRatio: ao.ratio, blurRatio: Math.min(1, ao.ratio * 2) }, [this.camera], false, Constants.TEXTURETYPE_HALF_FLOAT);
      ssao.samples = ao.samples; ssao.radius = ao.radius; ssao.totalStrength = ao.strength; ssao.base = 0.12;
      ssao.expensiveBlur = true; ssao.minZAspect = 0.3; ssao.maxZ = this.camera.maxZ; ssao.epsilon = 0.02;
      this.ssao = ssao;
    }
    if (tier.screenReflections) {
      const ssr = new SSRRenderingPipeline('screen-reflections', this.scene, [this.camera], false, Constants.TEXTURETYPE_UNSIGNED_BYTE);
      ssr.inputTextureColorIsInGammaSpace = true; ssr.generateOutputInGammaSpace = true;
      ssr.strength = postEffects.ssrStrength; ssr.maxDistance = postEffects.ssrMaxDistance; ssr.step = 1; ssr.thickness = 0.5; ssr.maxSteps = 200;
      ssr.reflectivityThreshold = 0.12; ssr.reflectionSpecularFalloffExponent = 2; ssr.roughnessFactor = 0.1; ssr.useFresnel = true;
      ssr.attenuateScreenBorders = true; ssr.attenuateIntersectionDistance = true; ssr.blurDispersionStrength = 0.03; ssr.ssrDownsample = 1; ssr.blurDownsample = 1;
      if (sky) ssr.environmentTexture = sky;
      this.ssr = ssr;
    }
    if (ao || tier.screenReflections) this.excludeOverlays();
    if (post) {
      const pipeline = new DefaultRenderingPipeline('graphics', false, this.scene, [this.camera]);
      // With the ambient-occlusion/reflection pre-pass the scene is drawn into its render target,
      // so multisampling belongs there rather than on the pipeline's first post-process.
      const prePass = (ao || tier.screenReflections) ? this.scene.prePassRenderer : null;
      if (prePass) { prePass.samples = post.msaa; pipeline.samples = 1; } else pipeline.samples = post.msaa;
      pipeline.fxaaEnabled = post.fxaa;
      pipeline.bloomEnabled = post.bloom; pipeline.bloomThreshold = postEffects.bloomThreshold; pipeline.bloomWeight = postEffects.bloomWeight; pipeline.bloomKernel = postEffects.bloomKernel; pipeline.bloomScale = postEffects.bloomScale;
      pipeline.sharpenEnabled = post.sharpen > 0; if (post.sharpen > 0) { pipeline.sharpen.edgeAmount = post.sharpen; pipeline.sharpen.colorAmount = 1; }
      this.pipeline = pipeline;
    }
  }
  /**
   * Passes compile asynchronously. Until every pass on the camera is ready the scene renders
   * plainly (no pre-pass, no passes): a pass skipped mid-chain would otherwise read its own output.
   * Call once per frame before rendering.
   */
  update() {
    const ready = this.camera._postProcesses.every(pass => !pass || pass.isReady());
    if (this.scene.postProcessesEnabled === ready) return;
    this.scene.postProcessesEnabled = ready;
    if (this.scene.prePassRenderer) this.scene.prePassRenderer.defaultRT.enabled = ready;
  }
  /** Ambient occlusion stops at its far plane; follow the fitted camera range. */
  resize() { if (this.ssao) this.ssao.maxZ = this.camera.maxZ; }
  /**
   * Overlays drawn with non-pre-pass materials (route lines, guide lines) would otherwise be
   * written into the geometry buffer and cast ambient-occlusion halos onto the road.
   */
  private excludeOverlays() {
    const pre = this.scene.prePassRenderer; if (!pre) return;
    const exclude = (material: Material) => { if (!material.isPrePassCapable && !pre.excludedMaterials.includes(material)) pre.excludedMaterials.push(material); };
    this.scene.materials.forEach(exclude);
    this.observers.push(this.scene.onNewMaterialAddedObservable.add(exclude));
    this.observers.push(this.scene.onMaterialRemovedObservable.add(material => { const i = pre.excludedMaterials.indexOf(material); if (i >= 0) pre.excludedMaterials.splice(i, 1); }));
  }
  get passes() { return [this.ssao && 'ambient-occlusion', this.ssr && 'screen-reflections', this.pipeline && 'pipeline'].filter(Boolean) as string[]; }
  dispose() {
    this.scene.postProcessesEnabled = true; if (this.scene.prePassRenderer) this.scene.prePassRenderer.defaultRT.enabled = true;
    this.observers.forEach(observer => observer.remove()); this.observers = [];
    this.pipeline?.dispose(); this.ssr?.dispose(); this.ssao?.dispose();
    this.pipeline = undefined; this.ssr = undefined; this.ssao = undefined;
  }
}
