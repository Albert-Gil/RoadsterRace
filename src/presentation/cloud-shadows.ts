import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { MaterialDefines } from '@babylonjs/core/Materials/materialDefines';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import { cloudShadowAppearance, type GraphicsTier } from './themes';
import { SurfaceDetailPlugin } from './surface-detail';
import type { SceneryId } from '../content/circuits';

/**
 * Drifting cloud shadows (presentation only): soft, slowly moving patches of shade across every
 * lit surface of a daytime venue, computed in the fragment shader from world X/Z (no texture,
 * no extra pass, no draw call). The shade depends only on position and the shared animation
 * clock, which reduced motion freezes. Off on the Low tier and at night.
 */
export class CloudShadowPlugin extends MaterialPluginBase {
  static settings = { scale: 1 / 90, coverage: .55, strength: .16, windX: .9, windZ: .45 };
  private enabled = false;
  get isEnabled() { return this.enabled; }
  set isEnabled(value: boolean) { if (this.enabled === value) return; this.enabled = value; this.markAllDefinesAsDirty(); this._enable(value); }
  constructor(material: StandardMaterial) { super(material, 'CloudShadow', 210, { CLOUD_SHADOW: false }); }
  getClassName() { return 'CloudShadowPlugin'; }
  isCompatible(language: ShaderLanguage) { return language === ShaderLanguage.GLSL || language === ShaderLanguage.WGSL; }
  prepareDefines(defines: MaterialDefines) { defines.CLOUD_SHADOW = this.enabled; }
  getUniforms(language?: ShaderLanguage) {
    const ubo = [{ name: 'cloudShadow', size: 4, type: 'vec4' }, { name: 'cloudShadowB', size: 4, type: 'vec4' }];
    return language === ShaderLanguage.WGSL ? { ubo } : { ubo, fragment: '#ifdef CLOUD_SHADOW\nuniform vec4 cloudShadow;\nuniform vec4 cloudShadowB;\n#endif' };
  }
  bindForSubMesh(uniformBuffer: UniformBuffer) {
    if (!this.enabled) return;
    const s = CloudShadowPlugin.settings, t = SurfaceDetailPlugin.time;
    uniformBuffer.updateFloat4('cloudShadow', s.scale, s.coverage, -t * s.windX * s.scale, -t * s.windZ * s.scale);
    uniformBuffer.updateFloat4('cloudShadowB', s.strength, 0, 0, 0);
  }
  getCustomCode(shaderType: string, language?: ShaderLanguage) {
    if (shaderType !== 'fragment') return null;
    return language === ShaderLanguage.WGSL ? { CUSTOM_FRAGMENT_DEFINITIONS: WGSL_DEFINITIONS, CUSTOM_FRAGMENT_BEFORE_FOG: WGSL_SHADE } : { CUSTOM_FRAGMENT_DEFINITIONS: GLSL_DEFINITIONS, CUSTOM_FRAGMENT_BEFORE_FOG: GLSL_SHADE };
  }
}

const GLSL_DEFINITIONS = `#ifdef CLOUD_SHADOW
float cloudHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cloudNoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(cloudHash(i), cloudHash(i + vec2(1.0, 0.0)), u.x), mix(cloudHash(i + vec2(0.0, 1.0)), cloudHash(i + vec2(1.0, 1.0)), u.x), u.y); }
#endif`;
const GLSL_SHADE = `
#ifdef CLOUD_SHADOW
{
  vec2 cloudP = vPositionW.xz * cloudShadow.x + cloudShadow.zw;
  float cloudN = cloudNoise(cloudP) * 0.6 + cloudNoise(cloudP * 2.3 + vec2(17.0, 5.0)) * 0.3 + cloudNoise(cloudP * 5.1 + vec2(3.0, 41.0)) * 0.1;
  float cloudS = smoothstep(cloudShadow.y - 0.1, cloudShadow.y + 0.12, cloudN);
  color.rgb *= 1.0 - cloudS * cloudShadowB.x;
}
#endif
`;
const WGSL_DEFINITIONS = `#ifdef CLOUD_SHADOW
fn cloudHash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn cloudNoise(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (vec2f(3.0) - 2.0 * f);
  return mix(mix(cloudHash(i), cloudHash(i + vec2f(1.0, 0.0)), u.x), mix(cloudHash(i + vec2f(0.0, 1.0)), cloudHash(i + vec2f(1.0, 1.0)), u.x), u.y); }
#endif`;
const WGSL_SHADE = `
#ifdef CLOUD_SHADOW
{
  let cloudP: vec2f = fragmentInputs.vPositionW.xz * uniforms.cloudShadow.x + uniforms.cloudShadow.zw;
  let cloudN: f32 = cloudNoise(cloudP) * 0.6 + cloudNoise(cloudP * 2.3 + vec2f(17.0, 5.0)) * 0.3 + cloudNoise(cloudP * 5.1 + vec2f(3.0, 41.0)) * 0.1;
  let cloudS: f32 = smoothstep(uniforms.cloudShadow.y - 0.1, uniforms.cloudShadow.y + 0.12, cloudN);
  color = vec4f(color.rgb * (1.0 - cloudS * uniforms.cloudShadowB.x), color.a);
}
#endif
`;

const plugins = new WeakMap<Material, CloudShadowPlugin>(), state = { on: false };
const eligible = (m: Material): m is StandardMaterial => m instanceof StandardMaterial && !m.disableLighting && !m.metadata?.roadsterOverlay;
const attach = (m: Material) => {
  if (!eligible(m)) return;
  let plugin = plugins.get(m);
  if (!plugin && state.on) { try { plugin = new CloudShadowPlugin(m); plugins.set(m, plugin); } catch { return; } }
  if (plugin) plugin.isEnabled = state.on;
};
const observed = new WeakSet<Scene>();

/** Attaches (once) and enables/disables cloud shadows on every lit standard material, now and later. */
export function applyCloudShadows(scene: Scene, scenery: SceneryId, tier: GraphicsTier) {
  const venue = (cloudShadowAppearance.venues as Record<string, Partial<typeof CloudShadowPlugin.settings>>)[scenery];
  state.on = !!venue && tier.surfaceDetail;
  if (venue) Object.assign(CloudShadowPlugin.settings, cloudShadowAppearance.base, venue);
  for (const m of scene.materials) attach(m);
  if (!observed.has(scene)) { observed.add(scene); scene.onNewMaterialAddedObservable.add(m => queueMicrotask(() => attach(m))); }
}
