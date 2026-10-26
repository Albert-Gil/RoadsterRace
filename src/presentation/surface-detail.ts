import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { MaterialDefines } from '@babylonjs/core/Materials/materialDefines';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Constants } from '@babylonjs/core/Engines/constants';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { FresnelParameters } from '@babylonjs/core/Materials/fresnelParameters';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { surfaceFinishes, sceneryFinishes, type GraphicsTier, type SurfaceFinish, type SurfaceKind } from './themes';
import { neutralDetailMap, requestDetailMap } from './surface-maps';
import type { SceneryId } from '../content/circuits';

function detailTexture(scene: Scene, kind: SurfaceKind, size: number) {
  const name = `surface-detail-${kind}-${size}`, existing = scene.textures.find(t => t.name === name);
  if (existing) return existing as RawTexture;
  const texture = new RawTexture(neutralDetailMap(size), size, size, Constants.TEXTUREFORMAT_RGBA, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE);
  texture.name = name; texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE; texture.anisotropicFilteringLevel = 8; texture.gammaSpace = false;
  void requestDetailMap(kind, size).then(pixels => { if (!scene.isDisposed && scene.textures.includes(texture)) texture.update(pixels); });
  return texture;
}

// ---------------------------------------------------------------------------------------------
// Material plugin: world-space (planar XZ, plus a side projection for cliffs) detail for
// StandardMaterial. Mesh UVs are untouched, so every venue's authored geometry qualifies.
// ---------------------------------------------------------------------------------------------

export class SurfaceDetailPlugin extends MaterialPluginBase {
  /** Shared animation clock (seconds); frozen while reduced motion is requested. */
  static time = 0;
  detail: BaseTexture | null = null;
  scale = 4; normal = 0.5; variation = 0.1; walls = false; water = false;
  private enabled = false;
  get isEnabled() { return this.enabled; }
  set isEnabled(value: boolean) { if (this.enabled === value) return; this.enabled = value; this.markAllDefinesAsDirty(); this._enable(value); }
  constructor(material: StandardMaterial) {
    super(material, 'SurfaceDetail', 200, { SURFACE_DETAIL: false, SURFACE_WATER: false, SURFACE_WALLS: false });
  }
  getClassName() { return 'SurfaceDetailPlugin'; }
  /** GLSL for WebGL 2 and WGSL for the experimental WebGPU renderer. */
  isCompatible(language: ShaderLanguage) { return language === ShaderLanguage.GLSL || language === ShaderLanguage.WGSL; }
  prepareDefines(defines: MaterialDefines) {
    const on = this.enabled && !!this.detail;
    defines.SURFACE_DETAIL = on; defines.SURFACE_WATER = on && this.water; defines.SURFACE_WALLS = on && this.walls;
  }
  getSamplers(samplers: string[]) { samplers.push('surfaceDetailSampler'); }
  getActiveTextures(textures: BaseTexture[]) { if (this.detail) textures.push(this.detail); }
  hasTexture(texture: BaseTexture) { return texture === this.detail; }
  getUniforms(language?: ShaderLanguage) {
    const ubo = [{ name: 'surfaceDetail', size: 4, type: 'vec4' }, { name: 'surfaceMotion', size: 4, type: 'vec4' }];
    return language === ShaderLanguage.WGSL ? { ubo } : { ubo, fragment: '#ifdef SURFACE_DETAIL\nuniform vec4 surfaceDetail;\nuniform vec4 surfaceMotion;\n#endif' };
  }
  bindForSubMesh(uniformBuffer: UniformBuffer) {
    if (!this.enabled || !this.detail) return;
    uniformBuffer.updateFloat4('surfaceDetail', 1 / this.scale, this.normal, this.variation, 0);
    uniformBuffer.updateFloat4('surfaceMotion', SurfaceDetailPlugin.time, 0, 0, 0);
    uniformBuffer.setTexture('surfaceDetailSampler', this.detail);
  }
  getCustomCode(shaderType: string, language?: ShaderLanguage) {
    if (shaderType !== 'fragment') return null;
    return language === ShaderLanguage.WGSL ? { CUSTOM_FRAGMENT_DEFINITIONS: WGSL_DEFINITIONS, CUSTOM_FRAGMENT_UPDATE_DIFFUSE: WGSL_DETAIL } : { CUSTOM_FRAGMENT_DEFINITIONS: GLSL_DEFINITIONS, CUSTOM_FRAGMENT_UPDATE_DIFFUSE: GLSL_DETAIL };
  }
}

/*
 * The detail is applied where the diffuse colour is final and before lighting reads the normal.
 * Upward surfaces use a planar XZ projection; SURFACE_WALLS adds a side projection (cliffs,
 * foliage, facades). All texture reads stay in uniform control flow (required by WGSL).
 * Broad mottling: lighter patches lean warm, darker ones cool, as dry and damp ground do.
 */
const GLSL_DEFINITIONS = '#ifdef SURFACE_DETAIL\nuniform sampler2D surfaceDetailSampler;\n#endif';
const GLSL_DETAIL = `
#ifdef SURFACE_DETAIL
{
  float detailUp = smoothstep(0.55, 0.92, abs(normalW.y));
  vec2 detailP = vPositionW.xz * surfaceDetail.x;
#ifdef SURFACE_WATER
  float detailT = surfaceMotion.x;
  vec4 detailA = texture2D(surfaceDetailSampler, detailP + vec2(detailT * 0.023, detailT * 0.011));
  vec4 detailB = texture2D(surfaceDetailSampler, detailP * 0.57 + vec2(0.37 - detailT * 0.017, 0.11 + detailT * 0.021));
  vec2 detailSlope = (detailA.rg + detailB.rg) - 1.0;
  float detailTone = texture2D(surfaceDetailSampler, detailP * 0.31 + vec2(detailT * 0.002, 0.0)).a;
#else
  vec4 detailA = texture2D(surfaceDetailSampler, detailP);
  vec2 detailSlope = detailA.rg * 2.0 - 1.0;
  float detailTone = detailA.a * 0.45 + texture2D(surfaceDetailSampler, detailP * 0.23 + 0.5).a * 0.55;
#endif
  vec3 detailN = normalW + vec3(detailSlope.x, 0.0, detailSlope.y) * surfaceDetail.y;
#ifdef SURFACE_WALLS
  vec3 detailAbs = abs(normalW);
  bool detailX = detailAbs.x > detailAbs.z;
  vec4 detailS = texture2D(surfaceDetailSampler, (detailX ? vPositionW.zy : vPositionW.xy) * surfaceDetail.x);
  vec2 detailWall = detailS.rg * 2.0 - 1.0;
  vec3 detailSide = normalW + ((detailX ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)) * detailWall.x + vec3(0.0, detailWall.y, 0.0)) * surfaceDetail.y;
  detailN = mix(detailSide, detailN, detailUp);
  detailTone = mix(detailS.a, detailTone, detailUp);
  detailUp = 1.0;
#endif
  normalW = normalize(mix(normalW, detailN, detailUp));
  float detailShade = (detailTone - 0.5) * 2.0 * surfaceDetail.z * detailUp;
  baseColor.rgb *= (1.0 + detailShade) * (vec3(1.0) + vec3(0.25, 0.05, -0.2) * detailShade);
}
#endif
`;
const WGSL_DEFINITIONS = '#ifdef SURFACE_DETAIL\nvar surfaceDetailSamplerSampler: sampler;\nvar surfaceDetailSampler: texture_2d<f32>;\n#endif';
const WGSL_DETAIL = `
#ifdef SURFACE_DETAIL
{
  var detailUp: f32 = smoothstep(0.55, 0.92, abs(normalW.y));
  let detailP: vec2f = fragmentInputs.vPositionW.xz * uniforms.surfaceDetail.x;
#ifdef SURFACE_WATER
  let detailT: f32 = uniforms.surfaceMotion.x;
  let detailA: vec4f = textureSample(surfaceDetailSampler, surfaceDetailSamplerSampler, detailP + vec2f(detailT * 0.023, detailT * 0.011));
  let detailB: vec4f = textureSample(surfaceDetailSampler, surfaceDetailSamplerSampler, detailP * 0.57 + vec2f(0.37 - detailT * 0.017, 0.11 + detailT * 0.021));
  let detailSlope: vec2f = (detailA.rg + detailB.rg) - vec2f(1.0);
  var detailTone: f32 = textureSample(surfaceDetailSampler, surfaceDetailSamplerSampler, detailP * 0.31 + vec2f(detailT * 0.002, 0.0)).a;
#else
  let detailA: vec4f = textureSample(surfaceDetailSampler, surfaceDetailSamplerSampler, detailP);
  let detailSlope: vec2f = detailA.rg * 2.0 - vec2f(1.0);
  var detailTone: f32 = detailA.a * 0.45 + textureSample(surfaceDetailSampler, surfaceDetailSamplerSampler, detailP * 0.23 + vec2f(0.5)).a * 0.55;
#endif
  var detailN: vec3f = normalW + vec3f(detailSlope.x, 0.0, detailSlope.y) * uniforms.surfaceDetail.y;
#ifdef SURFACE_WALLS
  let detailAbs: vec3f = abs(normalW);
  let detailX: bool = detailAbs.x > detailAbs.z;
  let detailS: vec4f = textureSample(surfaceDetailSampler, surfaceDetailSamplerSampler, select(fragmentInputs.vPositionW.xy, fragmentInputs.vPositionW.zy, detailX) * uniforms.surfaceDetail.x);
  let detailWall: vec2f = detailS.rg * 2.0 - vec2f(1.0);
  let detailSide: vec3f = normalW + (select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), detailX) * detailWall.x + vec3f(0.0, detailWall.y, 0.0)) * uniforms.surfaceDetail.y;
  detailN = mix(detailSide, detailN, detailUp);
  detailTone = mix(detailS.a, detailTone, detailUp);
  detailUp = 1.0;
#endif
  normalW = normalize(mix(normalW, detailN, detailUp));
  let detailShade: f32 = (detailTone - 0.5) * 2.0 * uniforms.surfaceDetail.z * detailUp;
  baseColor = vec4f(baseColor.rgb * (1.0 + detailShade) * (vec3f(1.0) + vec3f(0.25, 0.05, -0.2) * detailShade), baseColor.a);
}
#endif
`;

// ---------------------------------------------------------------------------------------------
// Applying finishes per tier. Original material values are remembered so tiers can switch live.
// ---------------------------------------------------------------------------------------------

interface Original { specular: Color3; power: number }
const originals = new WeakMap<StandardMaterial, Original>();
const plugins = new WeakMap<StandardMaterial, SurfaceDetailPlugin>();

export function finishFor(role: string, scenery: SceneryId): SurfaceFinish | undefined {
  const local = sceneryFinishes[scenery] ?? {};
  return local[role] ?? surfaceFinishes[role] ?? Object.entries(surfaceFinishes).find(([key]) => key.endsWith('*') && role.startsWith(key.slice(0, -1)))?.[1];
}

/**
 * Applies (or removes) world-space detail, sky reflections and gloss to the venue's role
 * materials. `sky` is the venue's prefiltered environment; null keeps reflections off.
 */
export function applySurfaceFinishes(scene: Scene, materials: Map<string, StandardMaterial>, scenery: SceneryId, tier: GraphicsTier, sky: BaseTexture | null, waterReflection = 1) {
  const mips = sky ? Math.log2(Math.max(1, sky.getSize().width)) : 0;
  for (const [role, material] of materials) {
    const finish = finishFor(role, scenery); if (!finish) continue;
    if (!originals.has(material)) originals.set(material, { specular: material.specularColor.clone(), power: material.specularPower });
    const original = originals.get(material)!;
    let plugin = plugins.get(material);
    if (tier.surfaceDetail && (finish.normal > 0 || finish.variation > 0)) {
      if (!plugin) { plugin = new SurfaceDetailPlugin(material); plugins.set(material, plugin); }
      plugin.detail = detailTexture(scene, finish.kind, tier.detailTextureSize);
      plugin.scale = finish.scale; plugin.normal = finish.normal; plugin.variation = finish.variation; plugin.water = finish.kind === 'water'; plugin.walls = !!finish.walls;
      plugin.isEnabled = true;
    } else if (plugin) plugin.isEnabled = false;
    const reflect = tier.skyLighting && sky && finish.reflection ? finish.reflection * (finish.kind === 'water' ? waterReflection : 1) : 0;
    if (reflect > 0) {
      material.reflectionTexture = sky; material.roughness = (finish.roughness ?? 0.2) * mips;
      // Babylon's term is (bias + |cos|)^power: leftColor applies at grazing angles, rightColor facing the camera.
      material.reflectionFresnelParameters = new FresnelParameters({ leftColor: Color3.White().scale(reflect), rightColor: Color3.White().scale(reflect * 0.04), bias: 0, power: 0.6 });
    } else material.reflectionTexture = null;
    const glossy = tier.surfaceDetail;
    material.specularColor = glossy && finish.specular !== undefined ? new Color3(finish.specular, finish.specular, finish.specular) : original.specular.clone();
    material.specularPower = glossy && finish.gloss !== undefined ? finish.gloss : original.power;
  }
}
