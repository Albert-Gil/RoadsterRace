import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { SmartArray } from '@babylonjs/core/Misc/smartArray';

/** Babylon internals used for the copy (WebGL 2 only): the render target's framebuffer and depth texture. */
interface GLTexture { _hardwareTexture?: { underlyingResource?: WebGLTexture | null } | null }
interface GLTarget { _framebuffer?: WebGLFramebuffer | null; _depthStencilTexture?: (GLTexture & { _comparisonFunction?: number }) | null; _depthStencilTextureWithStencil?: boolean; width: number; height: number }
interface GLEngine { _gl?: WebGL2RenderingContext; _currentFramebuffer?: WebGLFramebuffer | null; webGLVersion?: number; isWebGPU?: boolean }
type Lists = [SmartArray<SubMesh>, SmartArray<SubMesh>, SmartArray<SubMesh>, SmartArray<SubMesh>];
const lists = (): Lists => [new SmartArray<SubMesh>(64), new SmartArray<SubMesh>(64), new SmartArray<SubMesh>(64), new SmartArray<SubMesh>(64)];

/**
 * Static scenery shadows are drawn once, not every frame. The sun and its shadow frustum never move,
 * so the shadow map of the static casters (rocks, trees, buildings) is kept in a copy of the same
 * format. Each frame the shadow map starts from that copy (a framebuffer blit instead of a clear)
 * and only the moving casters (cars, lift chairs) are drawn on top with the usual depth test, giving
 * the same map as drawing every caster. The copy is taken inside an ordinary frame: the static
 * casters are drawn, copied, then the moving ones, so no frame differs. A static caster that is
 * added, shown, hidden, moved or given another material, a light change or a lost context draws
 * the static part again; a caster whose shadow shader is still compiling makes the next frame try
 * again. Without WebGL 2 (WebGPU, WebGL 1) every caster is drawn every frame, as before.
 * All casters use rendering group 0.
 */
export class StaticShadowCache {
  private readonly statics = new Set<AbstractMesh>();
  private readonly dynamics = new Set<AbstractMesh>();
  private cache: RenderTargetTexture | null = null;
  private attached = false;
  private state: 'bake' | 'ready' | 'off' = 'bake';
  private undo: (() => void)[] = [];
  private supported = false;
  private missed = false;
  private relist = false;
  private readonly seen: number[] = [];
  private readonly parts: [Lists, Lists] = [lists(), lists()];
  /** How often the static part was drawn, and its size (diagnostics). */
  readonly stats = { bakes: 0, staticTriangles: 0 };

  constructor(private readonly scene: Scene, private readonly generator: ShadowGenerator) {
    const map = generator.getShadowMap(), engine = scene.getEngine() as unknown as GLEngine;
    if (!map || !engine._gl || engine.isWebGPU || (engine.webGLVersion ?? 1) < 2) { this.state = 'off'; return; }
    this.supported = true;
    // Before the shadow map renders: notice changed static casters and prepare the copy.
    const before = scene.onBeforeRenderObservable.add(() => this.prepare(map));
    // Ready frames start from the copy instead of a clear (the generator's own clear runs first).
    const clear = map.onClearObservable.add(() => { if (this.state === 'ready' && this.cache) this.copy(this.cache, map); });
    // After the frame that took the copy, only the moving casters stay in the list.
    const after = map.onAfterRenderObservable.add(() => { if (this.relist) { this.relist = false; this.syncList(); } });
    const restored = scene.getEngine().onContextRestoredObservable.add(() => { this.attached = false; this.invalidate(); });
    // Babylon resets a shadow map's refresh counter when a caster's shadow shader is not ready yet.
    const reset = map.resetRefreshCounter; map.resetRefreshCounter = () => { this.missed = true; reset.call(map); };
    const render = map.customRenderFunction;
    map.customRenderFunction = (opaque, alphaTest, transparent, depthOnly, beforeTransparents) => {
      if (this.state !== 'bake' || !this.cache || !this.attached) { render(opaque, alphaTest, transparent, depthOnly, beforeTransparents); return; }
      const [statics, moving] = this.split([opaque, alphaTest, transparent, depthOnly]);
      this.missed = false; render(...statics);
      if (!this.missed) this.bake(map);
      render(...moving, beforeTransparents);
    };
    this.undo.push(() => scene.onBeforeRenderObservable.remove(before), () => map.onClearObservable.remove(clear), () => map.onAfterRenderObservable.remove(after),
      () => scene.getEngine().onContextRestoredObservable.remove(restored), () => { map.resetRefreshCounter = reset; map.customRenderFunction = render; });
  }
  get enabled() { return this.state !== 'off'; }

  /** Registers a shadow caster; dynamic casters (cars) are drawn every frame. */
  add(mesh: AbstractMesh, dynamic: boolean) {
    (dynamic ? this.dynamics : this.statics).add(mesh);
    if (!dynamic) this.invalidate(); else this.syncList();
  }
  /** Turns the cache on (drawn again next frame) or off (every caster every frame); for comparisons. */
  setEnabled(on: boolean) { if (!this.supported) return; this.state = on ? 'bake' : 'off'; this.syncList(); }
  /** Draws the static casters again on the next frame. */
  invalidate() { if (this.supported && this.state !== 'off') this.state = 'bake'; this.syncList(); }

  /**
   * Off and bake: every caster. Ready: only the moving casters. The list is replaced in one splice
   * and never left empty: Babylon re-checks every material when it empties or fills, and receivers
   * drop shadows altogether while it is empty (so with no moving casters it keeps every caster).
   */
  private syncList() {
    const map = this.generator.getShadowMap(); if (!map) return;
    const live = (meshes: Set<AbstractMesh>) => [...meshes].filter(mesh => !mesh.isDisposed()), moving = live(this.dynamics);
    const wanted = this.state === 'ready' && moving.length ? moving : [...moving, ...live(this.statics)];
    const list = map.renderList ?? (map.renderList = []);
    if (list.length !== wanted.length || wanted.some((mesh, i) => list[i] !== mesh)) list.splice(0, list.length, ...wanted);
  }
  private prepare(map: RenderTargetTexture) {
    if (this.state === 'off') return;
    if (this.changed()) this.invalidate();
    if (this.state !== 'bake' || (this.cache && this.attached)) return;
    this.cache ??= this.createCache(map);
    this.attached = !!this.cache && this.attach(this.cache);
    if (!this.attached) { this.state = 'off'; this.syncList(); }
  }
  /** Whether anything that shapes the static shadows changed since the last frame. */
  private changed() {
    let i = 0, changed = false;
    const note = (value: number) => { if (this.seen[i] !== value) { this.seen[i] = value; changed = true; } i++; };
    // Babylon rebuilds the light matrix every frame, so compare its values.
    for (const value of this.generator.getTransformMatrix().m) note(value);
    note(this.generator.bias); note(this.generator.normalBias);
    for (const mesh of this.statics) {
      if (mesh.isDisposed()) { note(-1); continue; }
      note(mesh.isEnabled() && mesh.isVisible ? 1 : 0); note(mesh.getWorldMatrix().updateFlag); note(mesh.getTotalIndices());
      note(mesh.material?.uniqueId ?? -1); note(mesh.material?.needAlphaBlendingForMesh(mesh) ? 1 : 0);
    }
    if (this.seen.length !== i) { this.seen.length = i; changed = true; }
    return changed;
  }
  /** The submeshes of the static casters, then the rest, in the shadow map's own order. */
  private split(all: Lists) {
    const [statics, moving] = this.parts;
    all.forEach((list, i) => {
      statics[i].reset(); moving[i].reset();
      for (let j = 0; j < list.length; j++) (this.statics.has(list.data[j].getMesh()) ? statics[i] : moving[i]).push(list.data[j]);
    });
    return this.parts;
  }
  private target(texture: RenderTargetTexture) { return texture.renderTarget as unknown as GLTarget | null; }
  /** The shadow map now holds every static caster and nothing else: keep a copy. */
  private bake(map: RenderTargetTexture) {
    this.copy(map, this.cache!);
    this.stats.bakes++; this.stats.staticTriangles = [...this.statics].reduce((sum, mesh) => sum + (mesh.isDisposed() ? 0 : Math.round((mesh.getTotalIndices?.() ?? 0) / 3)), 0);
    this.state = 'ready'; this.relist = true;
  }
  /** A render target with exactly the shadow map's size, colour format and depth texture. */
  private createCache(map: RenderTargetTexture) {
    const colour = map.getInternalTexture(), depth = this.target(map)?._depthStencilTexture; if (!colour || !depth) return null;
    const size = map.getSize(), cache = new RenderTargetTexture(`${map.name}-static`, { width: size.width, height: size.height }, this.scene, false, true, colour.type, false, undefined, false, false, undefined, colour.format);
    cache.createDepthStencilTexture(depth._comparisonFunction ?? 0, true, this.target(map)?._depthStencilTextureWithStencil ?? false, undefined, undefined, `${map.name}-static-depth`);
    return cache;
  }
  /** Babylon attaches a target's depth texture when it binds it to draw; the copy is never drawn into. */
  private attach(cache: RenderTargetTexture) {
    const engine = this.scene.getEngine() as unknown as GLEngine, gl = engine._gl!, target = this.target(cache);
    const colourTexture = (cache.getInternalTexture() as unknown as GLTexture | null)?._hardwareTexture?.underlyingResource, depthTexture = target?._depthStencilTexture?._hardwareTexture?.underlyingResource;
    if (!target?._framebuffer || !colourTexture || !depthTexture) return false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target._framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colourTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, target._depthStencilTextureWithStencil ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, engine._currentFramebuffer ?? null);
    return complete;
  }
  /** Copies colour and depth between two render targets of identical format (framebuffer blit). */
  private copy(from: RenderTargetTexture, to: RenderTargetTexture) {
    const engine = this.scene.getEngine() as unknown as GLEngine, gl = engine._gl!, a = this.target(from), b = this.target(to);
    if (!a?._framebuffer || !b?._framebuffer) return;
    const scissor = gl.isEnabled(gl.SCISSOR_TEST); if (scissor) gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, a._framebuffer); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, b._framebuffer);
    // PCF reads only the depth texture and never writes colour; PCSS keeps depth in colour too.
    const colour = this.generator.usePercentageCloserFiltering ? 0 : gl.COLOR_BUFFER_BIT;
    gl.blitFramebuffer(0, 0, a.width, a.height, 0, 0, b.width, b.height, colour | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, engine._currentFramebuffer ?? null);
    if (scissor) gl.enable(gl.SCISSOR_TEST);
  }
  dispose() { for (const undo of this.undo) undo(); this.undo = []; this.cache?.dispose(); this.cache = null; }
}
