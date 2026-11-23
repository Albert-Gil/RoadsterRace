import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { MaterialDefines } from '@babylonjs/core/Materials/materialDefines';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import type { Scene } from '@babylonjs/core/scene';
import frames from './venue-light-frames.json';
import { venueLight as art } from './themes';
import { assetUrl } from './urls';

type Frame = typeof frames[keyof typeof frames];

// A single filtered lookup gives the heights of the nearby skyline. Compare
// them to the fragment, so a ship's upper deck and the water below can sample
// the same atlas and still receive different amounts of fill light.
class VenueLightPlugin extends MaterialPluginBase {
  constructor(material: StandardMaterial, private map: Texture, private frame: Frame, private strength: number) {
    super(material, 'VenueSkyVisibility', 205, { VENUE_SKY_VISIBILITY: false });
    this._enable(true);
  }
  getClassName() { return 'VenueLightPlugin'; }
  isCompatible(language: ShaderLanguage) { return language === ShaderLanguage.GLSL || language === ShaderLanguage.WGSL; }
  prepareDefines(defines: MaterialDefines) { defines.VENUE_SKY_VISIBILITY = this.map.isReady(); }
  getSamplers(samplers: string[]) { samplers.push('venueHorizon'); }
  // External uniforms leave the engine's material buffer layout identical for
  // included surfaces and excluded paint, even while the atlas is loading.
  getUniforms() { return {externalUniforms:['venueUV','venueHeight','venueShade']}; }
  bindForSubMesh(buffer: UniformBuffer, _scene:Scene, _engine:AbstractEngine, subMesh:SubMesh) {
    const f = this.frame;
    const effect=subMesh.effect;
    effect?.setFloat4('venueUV', f.left, f.bottom, 1/f.width, 1/f.depth);
    effect?.setFloat4('venueHeight', f.floor, f.range, art.bias, 1/art.reach);
    effect?.setFloat4('venueShade', art.tint[0]*this.strength, art.tint[1]*this.strength, art.tint[2]*this.strength, art.edgeFade);
    buffer.setTexture('venueHorizon',this.map);
  }
  getCustomCode(stage:string, language?:ShaderLanguage) {
    if (stage !== 'fragment') return null;
    const wg = language === ShaderLanguage.WGSL;
    const uniforms = wg ? 'uniforms.' : '', point = wg ? 'fragmentInputs.vPositionW' : 'vPositionW';
    const uv = uniforms+'venueUV', h = uniforms+'venueHeight', shade = uniforms+'venueShade';
    const fragment = `
#ifdef VENUE_SKY_VISIBILITY
{
  ${wg?'let':'vec2'} atlasUV = (${point}.xz - ${uv}.xy) * ${uv}.zw;
  ${wg?'let':'vec3'} skyline = ${wg?'textureSample(venueHorizon, venueHorizonSampler, atlasUV)':'texture2D(venueHorizon, atlasUV)'}.rgb * ${h}.y + ${h}.x;
  ${wg?'let':'vec3'} blocked = clamp((skyline - ${point}.y - ${h}.z) * ${h}.w, ${wg?'vec3f':'vec3'}(0.0), ${wg?'vec3f':'vec3'}(1.0));
  ${wg?'let':'vec2'} border = min(atlasUV, ${wg?'vec2f':'vec2'}(1.0)-atlasUV);
  ${wg?'let':'float'} shelter = dot(blocked, ${wg?'vec3f':'vec3'}(0.33333)) * smoothstep(0.0, ${shade}.w, min(border.x,border.y));
  ${wg?'baseColor = vec4f(baseColor.rgb * (vec3f(1.0) - shelter * '+shade+'.rgb),baseColor.a);':'baseColor.rgb *= vec3(1.0) - shelter * '+shade+'.rgb;'}
}
#endif`;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: '#ifdef VENUE_SKY_VISIBILITY\n'+(wg?'var venueHorizonSampler: sampler;\nvar venueHorizon: texture_2d<f32>;\nuniform venueUV: vec4f;\nuniform venueHeight: vec4f;\nuniform venueShade: vec4f;':'uniform sampler2D venueHorizon;\nuniform vec4 venueUV, venueHeight, venueShade;')+'\n#endif',
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: fragment,
    };
  }
}

export function installVenueLight(scene:Scene, id:string, materials:Map<string,StandardMaterial>) {
  const frame = frames[id as keyof typeof frames];
  if (!frame) return;
  const plugins:VenueLightPlugin[] = [];
  const map = new Texture(assetUrl('assets/venue-light/'+id+'.webp'), scene, false, false, Texture.TRILINEAR_SAMPLINGMODE,
    () => { for (const plugin of plugins) plugin.markAllDefinesAsDirty(); });
  map.gammaSpace = false;
  map.wrapU = map.wrapV = Texture.CLAMP_ADDRESSMODE;
  for (const [role, material] of materials) {
    if (material.disableLighting || material.alpha < .98 || material.metadata?.roadsterOverlay ||
        ['error','start-glow','checker','curb','accent'].includes(role)) continue;
    plugins.push(new VenueLightPlugin(material,map,frame,id==='la-nights'?art.nightStrength:art.strength));
  }
}
