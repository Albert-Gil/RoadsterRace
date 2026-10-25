import { LapGhost } from './lap-ghost';
import type { ReplayFrame } from '../core/lap-replay';
import { drawingRay, roadHeight } from '../core/elevation';
import { roadEdges } from '../core/road-geometry';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { createWebGLEngine, rendererName } from './engine';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Scene } from '@babylonjs/core/scene';
import type { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import '@babylonjs/core/Culling/ray';
import { distance, mix, modulo } from '../core/geometry';
import { drawingStart, startGate, gatePoint, trimDrawing } from '../core/start-finish';
import { bridgeAt } from '../core/bridge';
import { gestureSpeeds } from '../core/route';
import type { CompiledRoute, DrawSample, DrawingTrim, Point, TrackDefinition } from '../core/types';
import type { PresentationTheme } from './themes';
import { sceneTuning, sceneryTheme, sceneryLighting, nightAppearance, graphicsTiers, venueSkies, colorGrade, type GraphicsLevel } from './themes';
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves';
import { FrameGovernor, lowerAutomaticLevel, renderPixelRatio, resolveGraphics, type GraphicsChoice } from './graphics';
import { applySurfaceFinishes, SurfaceDetailPlugin } from './surface-detail';
import { PostEffects } from './post-processing';
import { visualAssets } from './assets';
import { assetUrl } from './urls';
import { VehicleView } from './vehicle';
import { buildScenery, type SceneryRuntime } from './scenery';
import type { SceneryId } from '../content/circuits';
import { surfaceTexture } from './textures';
import { createReflectionSky, loadSky } from './environment';
import { PaceLine } from './pace-line';
import { VehicleShowcase } from './showcase';
import { jumpCoordinates, flightGravity, FLIGHT_RULES } from '../core/support';
import { RULES } from '../core/simulation';
import { planningHeight } from './planning-height';
import { JumpFeedback } from './jump-feedback';

export class GameScene {
  readonly engine: AbstractEngine;
  readonly scene: Scene;
  readonly camera: FreeCamera;
  readonly vehicle: VehicleView;
  private lapGhost: LapGhost;
  setGhost(pose:ReplayFrame|null){this.lapGhost.update(pose);}
  readonly vehicles: VehicleView[] = [];
  private materials = new Map<string, StandardMaterial>();
  private lines: PaceLine[] = [];
  private ignoredLines: PaceLine[] = [];
  private approach: Mesh;
  private errorLine?: PaceLine;
  private showcase: VehicleShowcase;
  private activePlayer: number | null = null;
  private driverColors?: string[];
  private marker: Mesh;
  private errorMarker: Mesh;
  private theme: PresentationTheme;
  private roadMaterial: StandardMaterial;
  private terrainMaterial: StandardMaterial;
  private light: DirectionalLight;
  private vehicleFill?: HemisphericLight;
  private sceneryRuntime: SceneryRuntime;
  private jumpFeedback: JumpFeedback;
  feedback(point: Point, splash: boolean) { this.jumpFeedback.emit(point, splash); }
  private shadows: ShadowGenerator;
  private shadowCasters = new Set<AbstractMesh>();
  private proceduralSky: BaseTexture;
  private sky: CubeTexture | null = null;
  private skyFailed = false;
  private post: PostEffects;
  private governor = new FrameGovernor();
  private lastFrame = 0;
  private stepDownPending = false;
  /** The tier currently rendered; `graphicsChoice` is the player's setting (auto or fixed). */
  graphicsLevel: GraphicsLevel = 'medium';
  private graphicsChoice: GraphicsChoice = 'auto';
  /** Called after the automatic tier steps down, so menus can show the new level. */
  onGraphicsChange?: (level: GraphicsLevel) => void;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private layoutMode = 'welcome';
  private canvasResizeObserver: ResizeObserver;
  inspectVehicle(view: 'front' | 'side' | 'rear') { this.showcase.inspectView(view); }
  get showcaseProjection() { return this.showcase.projectionMetrics; }
  ready = false;
  /** Development metric: draw calls of the last frame (world scene, plus the menu showcase when shown), via public instrumentation. Always 0 in production. */
  drawCalls = 0;
  private instrumentation?: SceneInstrumentation;
  private showcaseInstrumentation?: SceneInstrumentation;
  constructor(readonly canvas: HTMLCanvasElement, readonly track: TrackDefinition, theme: PresentationTheme, readonly scenery: SceneryId = 'coastal', engine?: AbstractEngine, graphics: GraphicsChoice = 'auto') {
    theme = sceneryTheme(theme, scenery);
    this.theme = theme;
    this.engine = engine ?? createWebGLEngine(canvas);
    this.graphicsChoice = graphics; this.graphicsLevel = resolveGraphics(graphics, rendererName(this.engine));
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, graphicsTiers[this.graphicsLevel].maxPixelRatio));
    this.scene = new Scene(this.engine);
    this.scene.skipPointerMovePicking = true; this.scene.skipPointerDownPicking = true; this.scene.skipPointerUpPicking = true;
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = sceneTuning.grading.exposure;
    this.scene.imageProcessingConfiguration.contrast = sceneTuning.grading.contrast;
    this.camera = new FreeCamera('fixed-race-camera', new Vector3(0, 140, -140), this.scene);
    this.camera.mode = Camera.PERSPECTIVE_CAMERA; this.camera.fov = sceneTuning.camera.verticalFov; this.camera.setTarget(Vector3.Zero()); this.camera.minZ = 1; this.camera.maxZ = 1000;
    this.proceduralSky = createReflectionSky(this.scene); this.scene.environmentTexture = this.proceduralSky; this.scene.environmentIntensity = 0.85;
    const lighting = sceneryLighting[scenery];
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene); ambient.intensity = sceneTuning.lighting.ambient; ambient.diffuse = Color3.FromHexString(lighting.ambient); ambient.groundColor = Color3.FromHexString(lighting.ground);
    if(scenery==='night-city')ambient.intensity=nightAppearance.ambientIntensity;
    if(scenery==='night-city'){
      this.vehicleFill=new HemisphericLight('night-car-fill',new Vector3(0,1,0),this.scene);
      this.vehicleFill.intensity=nightAppearance.vehicleFill;
      this.vehicleFill.setEnabled(false);
    }
    this.light = new DirectionalLight('sun', new Vector3(0.55, -1, 0.45).normalize(), this.scene); this.light.position.set(-70, 127, -57); this.light.diffuse = Color3.FromHexString(lighting.sun);
    this.light.shadowFrustumSize = scenery === 'coastal' ? 210 : 250; this.light.shadowMinZ = 1; this.light.shadowMaxZ = 350; this.light.autoUpdateExtends = false;
    this.shadows = this.createShadows();
    const mat = (role: string, color: string) => { const m = new StandardMaterial(role, this.scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.setAll(0.04); m.backFaceCulling = false; this.materials.set(role, m); return m; };
    this.sceneryRuntime = buildScenery(scenery, this.scene, track, theme, this.materials);
    this.terrainMaterial = this.materials.get('terrain')!;
    const p = track.centerline, n = p.length - 1;
    const white = mat('curb', theme.scene.curb), accent = mat('accent', '#b32a35');
    if(track.sections){this.roadMaterial=this.materials.get('asphalt')!;}else{
    const shoulder = mat('shoulder', theme.scene.shoulder);
    if (track.supports) { /* Authored pier surfaces replace unsupported sand shoulders. */ }
    else if (!track.bridges?.length) this.ribbon('road-shoulder', track.centerline, track.roadWidth + 2.5, 0.04).material = shoulder;
    else { let run: Point[] = []; for (const p of track.centerline) { if (bridgeAt(p, track)) { if (run.length > 1) this.openRibbon('road-shoulder', run, track.roadWidth + 2.5, 0.04).material = shoulder; run = []; } else run.push(p); } if (run.length > 1) this.openRibbon('road-shoulder', run, track.roadWidth + 2.5, 0.04).material = shoulder; }
    this.ribbon('asphalt', track.centerline, track.roadWidth, 0.10).material = this.roadMaterial = mat('asphalt', theme.scene.asphalt);
    for (const shortcut of track.hopShortcuts ?? []) {
      this.openRibbon('service-lane-shoulder', shortcut.branch, shortcut.width + 2.5, 0.04).material = shoulder;
      this.openRibbon('service-lane-asphalt', shortcut.branch, shortcut.width, 0.1).material = this.roadMaterial;
    }
    for (const jump of track.jumps ?? []) {
      this.openRibbon('jump-approach-asphalt', [...jump.branch.filter(p=>jumpCoordinates(p,jump).along<0), jump.from], jump.width, 0.1).material = this.roadMaterial;
      this.openRibbon('jump-landing-asphalt', [{ x: jump.from.x + jump.forward.x * (jump.rampLength + jump.gap), z: jump.from.z + jump.forward.z * (jump.rampLength + jump.gap) }, jump.branch.at(-1)!], jump.width, 0.1).material = this.roadMaterial;
    }
    this.roadMaterial.diffuseTexture = surfaceTexture(this.scene, 'asphalt');
    const rubber = mat('rubbered-racing-surface', '#161b20'); rubber.disableLighting = true; rubber.emissiveColor = Color3.FromHexString('#161b20'); rubber.diffuseTexture = surfaceTexture(this.scene, 'rubber'); rubber.useAlphaFromDiffuseTexture = true; rubber.alpha = 0.28;
    this.ribbon('established-tire-wear', track.centerline, track.roadWidth * 0.48, 0.121).material = rubber;
    const curbInner = roadEdges(p, track.roadWidth + .05), curbOuter = roadEdges(p, track.roadWidth + 1.45);
    for (let i = 0; i < n; i += 3) {
      const a = p[i], b = p[Math.min(i + 3, n)];
      for (const side of [0, 1]) {
        if (i < 35 || i > n - 12 || bridgeAt(a, track) || bridgeAt(b, track)) continue;
        // Follow the shared bounded road edge instead of overlapping straight boxes on bends.
        const pathArray = [curbInner, curbOuter].map(edges => edges[side].slice(i, Math.min(i + 3, n) + 1).map(v => new Vector3(v.x, .18, v.z)));
        const curb = MeshBuilder.CreateRibbon('curb', { pathArray, sideOrientation: Mesh.DOUBLESIDE }, this.scene);
        curb.setVerticesData(VertexBuffer.NormalKind, Array.from({ length: curb.getTotalVertices() }, () => [0, 1, 0]).flat());
        curb.material = Math.floor(i / 3) % 2 ? white : accent;
      }
    }
    }
    const black = mat('checker', '#303d40');
    const gate = startGate(track);
    const startHeading = Math.atan2(gate.forward.x, gate.forward.z), startX = Math.sin(startHeading), startZ = Math.cos(startHeading);
    for (let row = 0; row < 2; row++) for (let col = 0; col < 10; col++) {
      const tile = MeshBuilder.CreateBox('start-checker', { width: 0.85, depth: gate.width / 10, height: 0.02 }, this.scene);
      const side = (col - 4.5) * gate.width / 10;
      tile.position.set(gate.center.x + startX * row * 0.85 + startZ * side, 0.145, gate.center.z + startZ * row * 0.85 - startX * side); tile.rotation.y = startHeading - Math.PI / 2; tile.material = (row + col) % 2 ? white : black;
    }
    const startMat = mat('start-glow', theme.players[0]); startMat.emissiveColor = Color3.FromHexString(theme.players[0]).scale(0.5);
    this.marker = MeshBuilder.CreateGround('start-finish-gate', { width: gate.width, height: 1.6 }, this.scene); this.marker.position.set(gate.center.x, 0.24, gate.center.z); this.marker.rotation.y = startHeading; this.marker.material = startMat; startMat.alpha = 0.32;
    const guides: Vector3[][] = [];
    const at = (across: number, along: number) => { const p = gatePoint(track, across, along); return new Vector3(p.x, 0.26, p.z); };
    for (const side of [-1, 1]) for (let along = -gate.leadIn; along < 0; along += 1.4) guides.push([at(side * gate.width / 2, along), at(side * gate.width / 2, Math.min(0, along + 0.8))]);
    for (let across = -gate.width / 2; across < gate.width / 2; across += 1.4) guides.push([at(across, -gate.leadIn), at(Math.min(gate.width / 2, across + 0.8), -gate.leadIn)]);
    for (const across of [-gate.width / 4, gate.width / 4]) guides.push([at(across - 0.7, -6), at(across, -4.6), at(across + 0.7, -6)]);
    const approach = MeshBuilder.CreateLineSystem('drawing-approach-zone', { lines: guides }, this.scene); approach.color = Color3.FromHexString('#d4e6df'); approach.alpha = 0.8; this.approach = approach;
    const err = mat('error', '#ec765a'); err.emissiveColor = Color3.FromHexString('#ec765a');
    this.errorMarker = MeshBuilder.CreateTorus('route-error', { diameter: 4, thickness: 0.25, tessellation: 32 }, this.scene); this.errorMarker.material = err; this.errorMarker.isVisible = false;
    // Small arrows teach direction without a screen-space overlay covering the circuit.
    for (const fraction of [10, 45, 95, 150, 195].map(value => value / 216)) {
      const i = Math.min(n - 1, Math.floor(fraction * n));
      const a = p[i], b = p[i + 1], angle = Math.atan2(b.x - a.x, b.z - a.z);
      const dx = Math.sin(angle), dz = Math.cos(angle);
      const tri = MeshBuilder.CreateLines('direction-arrow', { points: [new Vector3(a.x - dx - dz * 0.8, (a.y??0)+0.2, a.z - dz + dx * 0.8), new Vector3(a.x + dx, (a.y??0)+0.2, a.z + dz), new Vector3(a.x - dx + dz * 0.8, (a.y??0)+0.2, a.z - dz - dx * 0.8)] }, this.scene);
      tri.color = Color3.FromHexString('#edf4e8');
    }
    // Bake static scenery by material: curbs and foliage should not each cost a draw call.
    const staticGroups = new Map<number, Mesh[]>();
    for (const m of [...this.scene.meshes]) {
      if (!(m instanceof Mesh) || m.metadata?.dynamicScenery || m.getClassName() === 'LinesMesh' || m === this.marker || m === this.approach || m === this.errorMarker || !m.material) continue;
      const group = staticGroups.get(m.material.uniqueId) ?? []; group.push(m); staticGroups.set(m.material.uniqueId, group);
    }
    for (const group of staticGroups.values()) {
      const material = group[0].material as StandardMaterial;
      const vertexAlpha = group.some(mesh => mesh.hasVertexAlpha);
      if (group.some(mesh => mesh.isVerticesDataPresent(VertexBuffer.ColorKind))) {
        for (const mesh of group) if (!mesh.isVerticesDataPresent(VertexBuffer.ColorKind)) mesh.setVerticesData(VertexBuffer.ColorKind, new Array(mesh.getTotalVertices() * 4).fill(1));
      }
      const merged = group.length > 1 ? Mesh.MergeMeshes(group, true, true, undefined, false, false) : group[0];
      if (merged) {
        if (material === this.roadMaterial) merged.name = 'asphalt';
        merged.isPickable = false; merged.hasVertexAlpha = vertexAlpha; merged.receiveShadows = !material.disableLighting; merged.freezeWorldMatrix();
        if (this.sceneryRuntime.shadowCasterMaterials.has(material) || material === white || material === accent) this.castShadow(merged);
      }
    }
    this.lapGhost = new LapGhost(this.scene);
    if(scenery==='night-city'){
      const glow=new GlowLayer('night-architecture-glow',this.scene,{mainTextureFixedSize:nightAppearance.glowTextureSize,blurKernelSize:nightAppearance.glowKernel});
      glow.intensity=nightAppearance.glowIntensity;
      // Only the already-batched emissive architecture enters the small glow render target.
      for(const mesh of this.scene.meshes)if(mesh instanceof Mesh&&(mesh.material?.name.startsWith('la-neon-')||mesh.material?.name==='la-windows'))glow.addIncludedOnlyMesh(mesh);
    }
    this.jumpFeedback = new JumpFeedback(this.scene);
    this.vehicle = new VehicleView(this.scene, theme); this.vehicles.push(this.vehicle); this.vehicle.update({ ...track.start, heading: startHeading });
    this.registerVehicleShadows(this.vehicle); void this.vehicle.loadAsset(visualAssets.vehicle).then(() => this.registerVehicleShadows(this.vehicle));
    for (const [url, material] of [[visualAssets.roadTexture, this.roadMaterial]] as const) {
      // Asphalt artwork must never replace the packed-dirt venue's own material.
      if (url && !track.sections) material.diffuseTexture = new Texture(assetUrl(url), this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE, undefined, () => { material.diffuseTexture?.dispose(); material.diffuseTexture = null; });
    }
    this.showcase = new VehicleShowcase(this.engine, theme);
    this.post = new PostEffects(this.scene, this.camera);
    this.applyGraphics();
    // Loaded only for development builds; the inspector and browser budgets read drawCalls.
    if (import.meta.env.DEV) void import('@babylonjs/core/Instrumentation/sceneInstrumentation').then(({ SceneInstrumentation }) => {
      if (this.scene.isDisposed) return;
      this.instrumentation = new SceneInstrumentation(this.scene); this.showcaseInstrumentation = new SceneInstrumentation(this.showcase.scene);
    });
    this.setTheme(theme); this.resize(); this.ready = true;
    // Mobile layout / dynamic viewport units may settle after window.resize.
    // Follow the canvas itself so its drawing buffer never stays portrait-sized
    // while CSS stretches it into landscape (or after a toolbar height change).
    this.canvasResizeObserver = new ResizeObserver(entries => {
      if (this.ready && entries.some(entry => entry.contentRect.width > 0 && entry.contentRect.height > 0)) this.resize();
    });
    this.canvasResizeObserver.observe(canvas);
  }
  private castShadow(mesh: AbstractMesh) { this.shadowCasters.add(mesh); this.shadows?.addShadowCaster(mesh, false); }
  private createShadows() {
    const tier = graphicsTiers[this.graphicsLevel], shadows = new ShadowGenerator(tier.shadowMapSize, this.light);
    if (tier.shadowFilter === 'pcss') { shadows.useContactHardeningShadow = true; shadows.contactHardeningLightSizeUVRatio = sceneTuning.lighting.contactHardening; }
    else shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = { low: ShadowGenerator.QUALITY_LOW, medium: ShadowGenerator.QUALITY_MEDIUM, high: ShadowGenerator.QUALITY_HIGH }[tier.shadowQuality];
    shadows.bias = 0.0004; shadows.normalBias = 0.08; shadows.setDarkness(sceneTuning.lighting.shadowDarkness);
    for (const mesh of this.shadowCasters) if (!mesh.isDisposed()) shadows.addShadowCaster(mesh, false);
    return shadows;
  }
  /** Sky, surfaces, post-processing and showcase lighting for the current tier. Shadows are rebuilt by setGraphicsLevel. */
  private applyGraphics() {
    const tier = graphicsTiers[this.graphicsLevel], venue = venueSkies[this.scenery];
    if (tier.skyLighting && !this.skyFailed) {
      this.sky ??= loadSky(this.scene, venue.file, this.light.direction, () => { this.skyFailed = true; this.applyGraphics(); });
      this.scene.environmentTexture = this.sky; this.scene.environmentIntensity = venue.intensity;
    } else { this.scene.environmentTexture = this.proceduralSky; this.scene.environmentIntensity = 0.85; }
    const sky = this.scene.environmentTexture === this.sky ? this.sky : null;
    applySurfaceFinishes(this.scene, this.materials, this.scenery, tier, sky, venue.waterReflection);
    const ip = this.scene.imageProcessingConfiguration;
    ip.colorCurvesEnabled = !!tier.postProcessing;
    if (tier.postProcessing) {
      const curves = new ColorCurves(); curves.globalSaturation = colorGrade.saturation;
      curves.highlightsHue = colorGrade.highlights.hue; curves.highlightsDensity = colorGrade.highlights.density; curves.highlightsSaturation = colorGrade.highlights.saturation;
      curves.shadowsHue = colorGrade.shadows.hue; curves.shadowsDensity = colorGrade.shadows.density; curves.shadowsSaturation = colorGrade.shadows.saturation;
      ip.colorCurves = curves;
    }
    this.post.apply(tier, sky);
    this.showcase.setSkyLighting(tier.skyLighting);
    this.governor.reset();
  }
  private setGraphicsLevel(level: GraphicsLevel) {
    if (level === this.graphicsLevel) return;
    this.graphicsLevel = level;
    this.shadows.dispose(); this.shadows = this.createShadows();
    this.applyGraphics(); this.resize();
  }
  /** Player setting: 'auto' (detected, steps down when slow) or a fixed tier. Never touches the simulation. */
  setGraphics(choice: GraphicsChoice) {
    this.graphicsChoice = choice;
    this.setGraphicsLevel(resolveGraphics(choice, rendererName(this.engine)));
  }
  private ribbon(name: string, points: Point[], width: number, y: number) {
    const sides = roadEdges(points, width).map(side => side.map(p => new Vector3(p.x,y,p.z)));
    let travelled = 0;
    const uv = points.map((point, i) => { if (i) travelled += distance(point, points[i - 1]); return travelled / 7; });
    const mesh = MeshBuilder.CreateRibbon(name, { pathArray: sides, sideOrientation: Mesh.FRONTSIDE, uvs: sides.flatMap((_, side) => uv.map(u => new Vector2(u, side))) }, this.scene);
    // The surface is flat, including overlapping inside offsets at the tight S bend.
    mesh.setVerticesData(VertexBuffer.NormalKind, Array.from({ length: mesh.getTotalVertices() * 3 }, (_, i) => i % 3 === 1 ? 1 : 0));
    return mesh;
  }
  private openRibbon(name: string, points: Point[], width: number, y: number) {
    const sides = roadEdges(points,width,false).map(side=>side.map(p=>new Vector3(p.x,y,p.z)));
    const mesh = MeshBuilder.CreateRibbon(name, { pathArray: sides, sideOrientation: Mesh.DOUBLESIDE }, this.scene); mesh.setVerticesData(VertexBuffer.NormalKind, Array.from({ length: mesh.getTotalVertices() * 3 }, (_, i) => i % 3 === 1 ? 1 : 0)); return mesh;
  }
  resize() {
    const box = this.canvas.getBoundingClientRect(), ratio = renderPixelRatio(this.graphicsLevel, box.width, box.height, window.devicePixelRatio || 1);
    if (box.width > 0 && Math.abs(this.engine.getHardwareScalingLevel() - 1 / ratio) > 1e-4) this.engine.setHardwareScalingLevel(1 / ratio);
    this.engine.resize();
    this.showcase?.resize(); this.lines.forEach(line => line.resize()); this.ignoredLines.forEach(line => line.resize()); this.errorLine?.resize();
    const interactive = ['drawing', 'preview', 'handoff', 'ready', 'racing', 'countdown', 'paused'].includes(this.layoutMode);
    // Draw scenery edge to edge. Fit the course into a CSS safe rectangle instead of
    // shrinking the rendered viewport into a letterboxed strip. Every interactive phase
    // uses the same rectangle, so drawing, preview and racing project identically.
    const rect = this.canvas.getBoundingClientRect();
    const space = interactive ? document.querySelector('#course-space')?.getBoundingClientRect() : undefined;
    const left = space ? space.left - rect.left : 0, rightInset = space ? rect.right - space.right : 0;
    const top = space ? space.top - rect.top : 0, bottom = space ? rect.bottom - space.bottom : 0;
    const w = rect.width, h = rect.height;
    this.camera.viewport = new Viewport(0, 0, 1, 1);
    const aspect = this.engine.getRenderWidth() / this.engine.getRenderHeight();
    const elevation = (Math.min(w,h)<=500?sceneTuning.camera.compactElevationDegrees:sceneTuning.camera.elevationDegrees) * Math.PI / 180;
    const tangent = Math.tan(this.camera.fov / 2);
    const paths = [this.track.centerline,...(this.track.jumps??[]).map(j=>j.branch),...(this.track.hopShortcuts??[]).map(j=>j.branch)];
    const fitted = paths.flatMap((path,i)=>roadEdges(path,this.track.roadWidth,i===0).flatMap(side=>side.map((p,n)=>new Vector3(p.x,this.track.sections?roadHeight(this.track,path[n].courseProgress??0):0,p.z))));
    for(const across of [-this.track.roadWidth/2,this.track.roadWidth/2]) fitted.push(new Vector3(...(()=>{const p=gatePoint(this.track,across,-12);return [p.x,0,p.z] as [number,number,number];})()));
    // Reserve the complete manual-hop height envelope, including a ramp launch.
    const hopEnvelope = RULES.hopLaunchSpeed ** 2 / (2 * flightGravity('hop')) + FLIGHT_RULES.carHeight + 0.3;
    for (const p of [...fitted]) fitted.push(new Vector3(p.x, p.y+hopEnvelope, p.z));
    for(const j of this.track.jumps??[]) for(const along of [8,25,45]) fitted.push(new Vector3(j.from.x+j.forward.x*along,hopEnvelope+j.lipHeight,j.from.z+j.forward.z*along));
    for(const j of this.track.jumps??[])if(j.kind==='crest'){const v=j.launchBoost!+RULES.maxSpeed*j.launchSlope!,at=RULES.maxSpeed*v/FLIGHT_RULES.gravity;fitted.push(new Vector3(j.from.x+j.forward.x*at,j.takeoffElevation!+v*v/(2*FLIGHT_RULES.gravity)+FLIGHT_RULES.carHeight+.3,j.from.z+j.forward.z*at));}
    const courseCenter = new Vector3((Math.min(...fitted.map(p=>p.x))+Math.max(...fitted.map(p=>p.x)))/2,0,(Math.min(...fitted.map(p=>p.z))+Math.max(...fitted.map(p=>p.z)))/2);
    const cx = (left-rightInset)/w, cy=(bottom-top)/h;
    const clearance = Math.min(w,h) <= 500 ? sceneTuning.camera.phoneRunoffClearancePixels : sceneTuning.camera.clearancePixels;
    const rx=Math.max(0.2,(w-left-rightInset-2*clearance)/w),ry=Math.max(0.2,(h-top-bottom-2*clearance)/h);
    const candidate = (degrees:number)=>{
      const yaw=degrees*Math.PI/180;
      const away=new Vector3(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),-Math.cos(yaw)*Math.cos(elevation));
      const right=new Vector3(Math.cos(yaw),0,Math.sin(yaw)),up=Vector3.Cross(away,right);
      let d=0;
      for(const p of fitted){ const point=p.subtract(courseCenter),depth=Vector3.Dot(point,away); d=Math.max(d,depth+Math.max(Math.abs(Vector3.Dot(point,right)+cx*tangent*aspect*depth)/(tangent*aspect*rx),Math.abs(Vector3.Dot(point,up)+cy*tangent*depth)/(tangent*ry))); }
      return {away,right,up,d};
    };
    let fit=candidate(sceneTuning.camera.azimuthDegrees);
    for(let yaw=0;yaw<180;yaw+=sceneTuning.camera.azimuthStep){const c=candidate(yaw);if(c.d<fit.d*0.995)fit=c;}
    const {away,right,up,d:cameraDistance}=fit;
    const offset=right.scale(-cx*tangent*aspect*cameraDistance).add(up.scale(-cy*tangent*cameraDistance)).add(courseCenter);
    // Narrow portrait fits may place the camera beyond the old 1000 m far plane.
    // Keep the whole venue visible and retain depth precision at the road surface.
    this.camera.minZ = Math.max(1, cameraDistance / 100);
    this.camera.maxZ = Math.max(1000, cameraDistance + 600);
    this.camera.position.copyFrom(away.scale(cameraDistance).add(offset)); this.camera.setTarget(offset);
    // Input/projection can run before the next rendered frame after a mode change.
    this.scene.updateTransformMatrix(true);
    this.post?.resize();
    this.lines.forEach(line => line.resize()); this.ignoredLines.forEach(line => line.resize()); this.errorLine?.resize();
  }
  setLayout(mode: string) { this.layoutMode = mode; const menu=['welcome','setup','results'].includes(mode);this.scene.imageProcessingConfiguration.exposure = this.scenery==='night-city' ? (menu?nightAppearance.menuExposure:nightAppearance.gameExposure) : (menu ? 0.45 : 1.12); this.resize(); }
  setTheme(theme: PresentationTheme) {
    theme = sceneryTheme(theme, this.scenery);
    this.theme = theme;
    // Scenery fills the entire viewport; UI surfaces are small independent overlays.
    this.scene.clearColor = Color4.FromHexString(`${theme.ui.surface}ff`);
    for (const [role, color] of Object.entries({ 'barrier-concrete': theme.venue.concrete, 'galvanized-rail': theme.venue.metal, 'race-red': theme.venue.accent, 'race-charcoal': theme.venue.rubber, 'track-ivory': theme.venue.marking, 'asphalt-repair': theme.venue.repair })) {const material=this.materials.get(role);if(material)material.diffuseColor=Color3.FromHexString(color);}
    for (const role of ['water', 'shallows', 'foam', 'terrain', 'embankment', 'asphalt', 'shoulder', 'curb', 'foliage', 'foliageLight', 'rock', 'trunk'] as const) { const m = this.materials.get(role); if (m) { m.diffuseColor = Color3.FromHexString(theme.scene[role]); if (m.disableLighting) m.emissiveColor = m.diffuseColor.clone(); } }
    for (const [role, color] of [['wet-sand', theme.scene.shoulder], ['water-glints', theme.scene.foam], ['architecture', theme.scene.curb], ['architecture-trim', theme.scene.structure], ['architecture-glass', theme.scene.glass], ['architecture-accent', this.scenery === 'coastal' ? theme.players[0] : theme.venue.accent], ['orbital-metal', theme.venue.metal]]) { const m = this.materials.get(role); if (!m) continue; m.diffuseColor = Color3.FromHexString(color); if (m.disableLighting) m.emissiveColor = m.diffuseColor.clone(); }
    this.terrainMaterial.emissiveColor = Color3.FromHexString(theme.scene.terrain).scale(0.015);
    this.materials.get('accent')!.diffuseColor = Color3.FromHexString('#b32a35');
    this.materials.get('start-glow')!.diffuseColor = Color3.FromHexString(theme.players[0]);
    this.light.intensity = sceneTuning.lighting.sunlight * theme.scene.sunlight; this.vehicles.forEach(vehicle => vehicle.setTheme(theme));
    this.showcase?.setTheme(theme);
    this.setPlanningPlayer(this.activePlayer);
  }
  setPlayers(count: number) {
    while (this.vehicles.length < count) {
      const vehicle = new VehicleView(this.scene, this.theme); this.vehicles.push(vehicle);
      this.registerVehicleShadows(vehicle); void vehicle.loadAsset(visualAssets.vehicle).then(() => this.registerVehicleShadows(vehicle));
    }
    this.vehicles.forEach((vehicle, player) => { vehicle.setEnabled(player < count); vehicle.setIdentity(count > 1 ? player : null, this.theme); });
  }
  setDriverPaints(colors: string[]) { this.driverColors = colors; this.vehicles.forEach((vehicle, index) => vehicle.setPaint(colors[index])); this.setShowcasePaint(colors[0]); this.setPlanningPlayer(this.activePlayer); }
  setShowcasePaint(color: string) { this.showcase.car.setPaint(color); }
  private registerVehicleShadows(vehicle: VehicleView) {
    if (this.scene.isDisposed) return;
    for (const mesh of vehicle.root.getChildMeshes()) if (mesh.material && !mesh.material.needAlphaBlending()) {
      if(this.vehicleFill&&!this.vehicleFill.includedOnlyMeshes.includes(mesh))this.vehicleFill.includedOnlyMeshes.push(mesh);
      mesh.receiveShadows = true;
      // Body and aero silhouette suffice at gameplay scale; wheels use the contact shadow.
      if (mesh.name === 'roadster-paint' || mesh.name === 'roadster-carbon') this.castShadow(mesh);
    }
    if(this.vehicleFill?.includedOnlyMeshes.length)this.vehicleFill.setEnabled(true);
  }
  showVehicles(player: number | null, count: number) { this.vehicles.forEach((vehicle, i) => vehicle.setEnabled(i < count && (player === null || i === player))); }
  setPlanningPlayer(player: number | null) {
    this.activePlayer = player;
    const color = Color3.FromHexString((this.driverColors ?? this.theme.players)[player ?? 0]);
    this.materials.get('start-glow')!.diffuseColor = color;
    this.materials.get('start-glow')!.emissiveColor = color.scale(0.5);
  }
  get visibleRouteCount() { return this.lines.length; }
  groundPoint(clientX: number, clientY: number, previous?:Point): Point | null {
    const rect = this.canvas.getBoundingClientRect();
    // Babylon applies hardware scaling internally. Compensate for drawing-buffer
    // integer rounding first (e.g. 667 CSS px at 1.5x becomes 1000 device px).
    const scale = this.engine.getHardwareScalingLevel();
    const x = (clientX - rect.left) * this.engine.getRenderWidth() / rect.width * scale;
    const y = (clientY - rect.top) * this.engine.getRenderHeight() / rect.height * scale;
    const ray = this.scene.createPickingRay(x, y, Matrix.Identity(), this.camera);
    if(this.track.sections)return drawingRay(ray,this.track,previous);
    if (Math.abs(ray.direction.y) < 1e-8) return null;
    let t = (0.15 - ray.origin.y) / ray.direction.y;
    const flat = { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
    // Intersect the authored ramp plane analytically, using the same height as simulation.
    for (const j of this.track.jumps ?? []) for (const [start, end, base, slope] of [[0, j.rampLength, 0, j.lipHeight / j.rampLength], [j.rampLength, j.rampLength + j.gap, j.lipHeight, -j.lipHeight / j.gap]]) {
      const numerator = 0.15 + base + slope * ((ray.origin.x - j.from.x) * j.forward.x + (ray.origin.z - j.from.z) * j.forward.z - start) - ray.origin.y;
      const denominator = ray.direction.y - slope * (ray.direction.x * j.forward.x + ray.direction.z * j.forward.z);
      const hit = numerator / denominator, p = { x: ray.origin.x + ray.direction.x * hit, z: ray.origin.z + ray.direction.z * hit };
      const c = jumpCoordinates(p, j);
      if (hit > 0 && c.along >= start && c.along <= end && Math.abs(c.across) <= j.width / 2) return p;
    }
    return flat;
  }
  project(point: Point & { y?: number }) {
    const rect = this.canvas.getBoundingClientRect();
    const viewport = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight());
    // Camera viewports count Y from the bottom; screen projection counts from the top.
    viewport.y = this.engine.getRenderHeight() - viewport.y - viewport.height;
    const v = Vector3.Project(new Vector3(point.x, point.y ?? planningHeight(point, this.track) + 0.15, point.z), Matrix.Identity(), this.scene.getTransformMatrix(), viewport);
    return { x: rect.left + v.x / this.engine.getRenderWidth() * rect.width, y: rect.top + v.y / this.engine.getRenderHeight() * rect.height };
  }
  drawLine(samples: DrawSample[] | CompiledRoute | null, drawing?: DrawingTrim) {
    this.lines.forEach(line => line.dispose()); this.lines = [];
    this.ignoredLines.forEach(line => line.dispose()); this.ignoredLines = [];
    if (!samples) return;
    let points = Array.isArray(samples) ? samples : samples.points;
    let speeds: number[];
    const muted = (stroke: DrawSample[]) => { if (stroke.length > 1) this.ignoredLines.push(new PaceLine(this.scene, stroke, stroke.map(() => 9), this.theme, 0, false, false, true, this.track)); };
    if (Array.isArray(samples)) {
      const start = drawingStart(samples, this.track);
      if (!start) { muted(samples); return; }
      const trimmed = trimDrawing(samples, this.track);
      muted(start.leadIn); if (trimmed.ok) muted(trimmed.tail);
      const counted = (trimmed.ok ? trimmed.samples : [start.sample, ...samples.slice(start.next)]).filter((p, i, all) => !i || distance(p, all[i - 1]) > 0.001);
      points = counted; speeds = gestureSpeeds(counted, this.track.length);
    } else { speeds = samples.points.map(p => p.desiredSpeed); if (drawing) { muted(drawing.leadIn); muted(drawing.tail); } }
    if (points.length > 1) this.lines.push(new PaceLine(this.scene, points, speeds, this.theme, 0, false, false, false, this.track));
  }
  drawRaceLines(routes: CompiledRoute[]) {
    this.drawLine(null);
    routes.forEach((route, player) => {
      this.lines.push(new PaceLine(this.scene, route.points, route.points.map(p => p.desiredSpeed), this.theme, player, true, false, false, this.track));
    });
  }
  showError(point?: Point, section?: Point[]) { this.errorLine?.dispose(); this.errorLine = undefined; this.errorMarker.isVisible = !!point; if (point) this.errorMarker.position.set(point.x, 0.3, point.z); if (section) this.errorLine = new PaceLine(this.scene, section, section.map(() => 9), this.theme, 0, false, true, false, this.track); }
  showStart(show: boolean) { this.marker.isVisible = show; this.approach.isVisible = show; }
  get depthFeatures() { return { hopCores: this.scene.meshes.filter(m=>m.name === 'four-downward-cold-gas-cores' && m.isEnabled() && m.isVisible).length, vehicleScale: sceneTuning.vehicle.racingScale, ghostVisible:this.lapGhost.visible, graphicsLevel: this.graphicsLevel, graphicsChoice: this.graphicsChoice, renderer: this.engine.isWebGPU ? 'webgpu' : 'webgl2', postPasses: this.post.passes, sky: this.scene.environmentTexture?.name ?? null, decorativeMotion: this.scene.meshes.filter(m => m.metadata?.dynamicScenery).map(m => ({name: m.name, rotation: m.rotation.asArray(), position: m.position.asArray()})), perspective: this.camera.mode === Camera.PERSPECTIVE_CAMERA, shadowMapSize: this.shadows.getShadowMap()?.getSize().width ?? 0, shadowCasters: this.shadows.getShadowMap()?.renderList?.length ?? 0, renderReady: this.scene.isReady() && this.showcase.scene.isReady(), worldReady: this.scene.isReady(), showcaseReady: this.showcase.scene.isReady(), pending: [...this.scene.meshes, ...this.showcase.scene.meshes].filter(m => !m.isReady(true)).map(m => m.name), carTriangles: this.vehicle.triangleCount, showcaseTriangles: this.showcase.car.triangleCount, pace: this.theme.pace, lineWidths: this.lines.map(line => line.cssWidths), ignoredStrokeCount: this.ignoredLines.length }; }
  render(time: number) {
    const reduced = this.reducedMotion.matches, frameMs = this.lastFrame ? (time - this.lastFrame) * 1000 : 0; this.lastFrame = time;
    if (this.graphicsChoice === 'auto' && this.governor.sample(frameMs)) this.stepDownPending = true;
    // Rebuilding shadows and passes can stall a frame; never do it mid-race (it would trigger the slow-frame pause).
    if (this.stepDownPending && !['racing', 'countdown'].includes(this.layoutMode)) {
      this.stepDownPending = false;
      const next = lowerAutomaticLevel();
      if (next && next !== this.graphicsLevel) { this.setGraphicsLevel(next); this.onGraphicsChange?.(next); }
    }
    SurfaceDetailPlugin.time = reduced ? 0 : time;
    this.post.update();
    (this.marker.material as StandardMaterial).alpha = reduced ? 0.32 : 0.29 + Math.sin(time * 3) * 0.05;
    this.sceneryRuntime.update(time, reduced);
    this.jumpFeedback.update(time, reduced);
    // Each instrumented scene restarts the shared engine counter as it begins rendering.
    this.scene.render();
    this.drawCalls = this.instrumentation?.drawCallsCounter.current ?? 0;
    if (['welcome', 'setup', 'results'].includes(this.layoutMode)) { this.showcase.render(time); this.drawCalls += this.showcaseInstrumentation?.drawCallsCounter.current ?? 0; }
  }
  dispose(disposeEngine = true) { this.ready = false; this.canvasResizeObserver.disconnect(); this.post.dispose(); this.instrumentation?.dispose(); this.showcaseInstrumentation?.dispose(); this.showcase.dispose(); this.scene.dispose(); if (disposeEngine) this.engine.dispose(); }
}
