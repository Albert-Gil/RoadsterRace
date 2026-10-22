import { Engine } from '@babylonjs/core/Engines/engine';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Culling/ray';
import { distance, mix, modulo } from '../core/geometry';
import { drawingStart, startGate, gatePoint, trimDrawing } from '../core/start-finish';
import { bridgeAt } from '../core/bridge';
import { gestureSpeeds } from '../core/route';
import type { CompiledRoute, DrawSample, DrawingTrim, Point, TrackDefinition } from '../core/types';
import type { PresentationTheme } from './themes';
import { sceneTuning, sceneryTheme, sceneryLighting } from './themes';
import { visualAssets } from './assets';
import { VehicleView } from './vehicle';
import { buildScenery, type SceneryRuntime } from './scenery';
import type { SceneryId } from '../content/circuits';
import { surfaceTexture } from './textures';
import { createReflectionSky } from './environment';
import { PaceLine } from './pace-line';
import { VehicleShowcase } from './showcase';

export class GameScene {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: FreeCamera;
  readonly vehicle: VehicleView;
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
  private sceneryRuntime: SceneryRuntime;
  private shadows: ShadowGenerator;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private layoutMode = 'welcome';
  inspectVehicle(view: 'front' | 'side' | 'rear') { this.showcase.inspectView(view); }
  ready = false;
  drawCalls = 0;
  constructor(readonly canvas: HTMLCanvasElement, readonly track: TrackDefinition, theme: PresentationTheme, readonly scenery: SceneryId = 'coastal', engine?: Engine) {
    theme = sceneryTheme(theme, scenery);
    this.theme = theme;
    this.engine = engine ?? new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance', disableWebGL2Support: false, useHighPrecisionMatrix: true }, false);
    if (this.engine.webGLVersion < 2) { this.engine.dispose(); throw new Error('This prototype needs WebGL 2. Please try a current Safari or Chrome browser.'); }
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5));
    this.scene = new Scene(this.engine);
    this.scene.skipPointerMovePicking = true; this.scene.skipPointerDownPicking = true; this.scene.skipPointerUpPicking = true;
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 1.12;
    this.scene.imageProcessingConfiguration.contrast = 1.08;
    this.camera = new FreeCamera('fixed-race-camera', new Vector3(0, 140, -140), this.scene);
    this.camera.mode = Camera.PERSPECTIVE_CAMERA; this.camera.fov = sceneTuning.camera.verticalFov; this.camera.setTarget(Vector3.Zero()); this.camera.minZ = 1; this.camera.maxZ = 1000;
    this.scene.environmentTexture = createReflectionSky(this.scene); this.scene.environmentIntensity = 0.85;
    const lighting = sceneryLighting[scenery];
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene); ambient.intensity = sceneTuning.lighting.ambient; ambient.diffuse = Color3.FromHexString(lighting.ambient); ambient.groundColor = Color3.FromHexString(lighting.ground);
    this.light = new DirectionalLight('sun', new Vector3(0.55, -1, 0.45).normalize(), this.scene); this.light.position.set(-70, 127, -57); this.light.diffuse = Color3.FromHexString(lighting.sun);
    this.light.shadowFrustumSize = scenery === 'coastal' ? 210 : 250; this.light.shadowMinZ = 1; this.light.shadowMaxZ = 350; this.light.autoUpdateExtends = false;
    this.shadows = new ShadowGenerator(sceneTuning.lighting.shadowMapSize, this.light); this.shadows.usePercentageCloserFiltering = true; this.shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM; this.shadows.bias = 0.0004; this.shadows.normalBias = 0.08; this.shadows.setDarkness(sceneTuning.lighting.shadowDarkness);
    const mat = (role: string, color: string) => { const m = new StandardMaterial(role, this.scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.setAll(0.04); m.backFaceCulling = false; this.materials.set(role, m); return m; };
    this.sceneryRuntime = buildScenery(scenery, this.scene, track, theme, this.materials);
    this.terrainMaterial = this.materials.get('terrain')!;
    const shoulder = mat('shoulder', theme.scene.shoulder);
    if (!track.bridges?.length) this.ribbon('road-shoulder', track.centerline, track.roadWidth + 2.5, 0.04).material = shoulder;
    else { let run: Point[] = []; for (const p of track.centerline) { if (bridgeAt(p, track)) { if (run.length > 1) this.openRibbon('road-shoulder', run, track.roadWidth + 2.5, 0.04).material = shoulder; run = []; } else run.push(p); } if (run.length > 1) this.openRibbon('road-shoulder', run, track.roadWidth + 2.5, 0.04).material = shoulder; }
    this.ribbon('asphalt', track.centerline, track.roadWidth, 0.10).material = this.roadMaterial = mat('asphalt', theme.scene.asphalt);
    this.roadMaterial.diffuseTexture = surfaceTexture(this.scene, 'asphalt');
    const rubber = mat('rubbered-racing-surface', '#161b20'); rubber.disableLighting = true; rubber.emissiveColor = Color3.FromHexString('#161b20'); rubber.diffuseTexture = surfaceTexture(this.scene, 'rubber'); rubber.useAlphaFromDiffuseTexture = true; rubber.alpha = 0.28;
    this.ribbon('established-tire-wear', track.centerline, track.roadWidth * 0.48, 0.121).material = rubber;
    const white = mat('curb', theme.scene.curb), accent = mat('accent', '#b32a35');
    const p = track.centerline, n = p.length - 1;
    for (let i = 0; i < n; i += 3) {
      const a = p[i], b = p[(i + 3) % n], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len;
      for (const side of [-1, 1]) {
        if (i < 35 || i > n - 12 || bridgeAt(a, track) || bridgeAt(b, track)) continue;
        const curb = MeshBuilder.CreateBox('curb', { width: 0.7, height: 0.16, depth: len + 0.1 }, this.scene);
        curb.position.set((a.x + b.x) / 2 + nx * side * (track.roadWidth / 2 + 0.1), 0.17, (a.z + b.z) / 2 + nz * side * (track.roadWidth / 2 + 0.1));
        curb.rotation.y = Math.atan2(dx, dz); curb.material = Math.floor(i / 3) % 2 ? white : accent;
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
      const tri = MeshBuilder.CreateLines('direction-arrow', { points: [new Vector3(a.x - dx - dz * 0.8, 0.2, a.z - dz + dx * 0.8), new Vector3(a.x + dx, 0.2, a.z + dz), new Vector3(a.x - dx + dz * 0.8, 0.2, a.z - dz - dx * 0.8)] }, this.scene);
      tri.color = Color3.FromHexString('#edf4e8');
    }
    // Bake static scenery by material: curbs and foliage should not each cost a draw call.
    const staticGroups = new Map<number, Mesh[]>();
    for (const m of [...this.scene.meshes]) {
      if (!(m instanceof Mesh) || m.getClassName() === 'LinesMesh' || m === this.marker || m === this.approach || m === this.errorMarker || !m.material) continue;
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
        merged.isPickable = false; merged.hasVertexAlpha = vertexAlpha; merged.receiveShadows = !material.disableLighting; merged.freezeWorldMatrix();
        if (this.sceneryRuntime.shadowCasterMaterials.has(material) || material === white || material === accent) this.shadows.addShadowCaster(merged, false);
      }
    }
    this.vehicle = new VehicleView(this.scene, theme); this.vehicles.push(this.vehicle); this.vehicle.update({ ...track.start, heading: startHeading });
    this.registerVehicleShadows(this.vehicle); void this.vehicle.loadAsset(visualAssets.vehicle).then(() => this.registerVehicleShadows(this.vehicle));
    for (const [url, material] of [[visualAssets.roadTexture, this.roadMaterial], [visualAssets.terrainTexture, this.terrainMaterial]] as const) {
      if (url) material.diffuseTexture = new Texture(url, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE, undefined, () => { material.diffuseTexture?.dispose(); material.diffuseTexture = null; });
    }
    this.showcase = new VehicleShowcase(this.engine, theme);
    this.setTheme(theme); this.resize(); this.ready = true;
  }
  private ribbon(name: string, points: Point[], width: number, y: number) {
    const sides = [-1, 1].map(side => points.map((p, i) => {
      const a = points[modulo(i - 1, points.length - 1)], b = points[(i + 1) % (points.length - 1)];
      const len = distance(a, b) || 1;
      return new Vector3(p.x - (b.z - a.z) / len * width / 2 * side, y, p.z + (b.x - a.x) / len * width / 2 * side);
    }));
    let travelled = 0;
    const uv = points.map((point, i) => { if (i) travelled += distance(point, points[i - 1]); return travelled / 7; });
    const mesh = MeshBuilder.CreateRibbon(name, { pathArray: sides, sideOrientation: Mesh.FRONTSIDE, uvs: sides.flatMap((_, side) => uv.map(u => new Vector2(u, side))) }, this.scene);
    // The surface is flat, including overlapping inside offsets at the tight S bend.
    mesh.setVerticesData(VertexBuffer.NormalKind, Array.from({ length: mesh.getTotalVertices() * 3 }, (_, i) => i % 3 === 1 ? 1 : 0));
    return mesh;
  }
  private openRibbon(name: string, points: Point[], width: number, y: number) {
    const sides = [-1, 1].map(side => points.map((p, i) => {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)], length = distance(a, b) || 1;
      return new Vector3(p.x - (b.z - a.z) / length * width / 2 * side, y, p.z + (b.x - a.x) / length * width / 2 * side);
    }));
    const mesh = MeshBuilder.CreateRibbon(name, { pathArray: sides, sideOrientation: Mesh.DOUBLESIDE }, this.scene); mesh.setVerticesData(VertexBuffer.NormalKind, Array.from({ length: mesh.getTotalVertices() * 3 }, (_, i) => i % 3 === 1 ? 1 : 0)); return mesh;
  }
  resize() {
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
    const elevation = sceneTuning.camera.elevationDegrees * Math.PI / 180, yaw = sceneTuning.camera.azimuthDegrees * Math.PI / 180;
    const away = new Vector3(Math.sin(yaw) * Math.cos(elevation), Math.sin(elevation), -Math.cos(yaw) * Math.cos(elevation));
    const right = new Vector3(Math.cos(yaw), 0, Math.sin(yaw)), up = Vector3.Cross(away, right);
    const tangent = Math.tan(this.camera.fov / 2);
    const cx = (left - rightInset) / w, cy = (bottom - top) / h;
    const rx = Math.max(0.2, (w - left - rightInset) / w) * sceneTuning.camera.fittingMargin;
    const ry = Math.max(0.2, (h - top - bottom) / h) * sceneTuning.camera.fittingMargin;
    let cameraDistance = 0;
    // Fit the actual course and its sand apron, rather than unused bounding-box corners.
    const apron = interactive ? (this.track.roadWidth - this.track.carWidth) / 2 + this.track.roadWidth + 2 : this.track.roadWidth / 2 + 4;
    for (const p of this.track.centerline) for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, point = new Vector3(p.x + Math.cos(a) * apron, 0, p.z + Math.sin(a) * apron);
      const depth = Vector3.Dot(point, away);
      // Account for perspective depth when centering the course beside the toolbar.
      cameraDistance = Math.max(cameraDistance, depth + Math.max(Math.abs(Vector3.Dot(point, right) + cx * tangent * aspect * depth) / (tangent * aspect * rx), Math.abs(Vector3.Dot(point, up) + cy * tangent * depth) / (tangent * ry)));
    }
    const offset = right.scale(-cx * tangent * aspect * cameraDistance).add(up.scale(-cy * tangent * cameraDistance));
    // Narrow portrait fits may place the camera beyond the old 1000 m far plane.
    // Keep the whole venue visible and retain depth precision at the road surface.
    this.camera.minZ = Math.max(1, cameraDistance / 100);
    this.camera.maxZ = Math.max(1000, cameraDistance + 600);
    this.camera.position.copyFrom(away.scale(cameraDistance).add(offset)); this.camera.setTarget(offset);
    // Input/projection can run before the next rendered frame after a mode change.
    this.scene.updateTransformMatrix(true);
    this.lines.forEach(line => line.resize()); this.ignoredLines.forEach(line => line.resize()); this.errorLine?.resize();
  }
  setLayout(mode: string) { this.layoutMode = mode; this.scene.imageProcessingConfiguration.exposure = ['welcome', 'setup', 'results'].includes(mode) ? 0.45 : 1.12; this.resize(); }
  setTheme(theme: PresentationTheme) {
    theme = sceneryTheme(theme, this.scenery);
    this.theme = theme;
    // Scenery fills the entire viewport; UI surfaces are small independent overlays.
    this.scene.clearColor = Color4.FromHexString(`${theme.ui.surface}ff`);
    for (const [role, color] of Object.entries({ 'barrier-concrete': theme.venue.concrete, 'galvanized-rail': theme.venue.metal, 'race-red': theme.venue.accent, 'race-charcoal': theme.venue.rubber, 'track-ivory': theme.venue.marking, 'asphalt-repair': theme.venue.repair })) this.materials.get(role)!.diffuseColor = Color3.FromHexString(color);
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
      mesh.receiveShadows = true;
      // Body and aero silhouette suffice at gameplay scale; wheels use the contact shadow.
      if (mesh.name === 'roadster-paint' || mesh.name === 'roadster-carbon') this.shadows.addShadowCaster(mesh, false);
    }
  }
  showVehicles(player: number | null, count: number) { this.vehicles.forEach((vehicle, i) => vehicle.setEnabled(i < count && (player === null || i === player))); }
  setPlanningPlayer(player: number | null) {
    this.activePlayer = player;
    const color = Color3.FromHexString((this.driverColors ?? this.theme.players)[player ?? 0]);
    this.materials.get('start-glow')!.diffuseColor = color;
    this.materials.get('start-glow')!.emissiveColor = color.scale(0.5);
  }
  get visibleRouteCount() { return this.lines.length; }
  groundPoint(clientX: number, clientY: number): Point | null {
    const rect = this.canvas.getBoundingClientRect();
    // Babylon applies hardware scaling internally. Compensate for drawing-buffer
    // integer rounding first (e.g. 667 CSS px at 1.5x becomes 1000 device px).
    const scale = this.engine.getHardwareScalingLevel();
    const x = (clientX - rect.left) * this.engine.getRenderWidth() / rect.width * scale;
    const y = (clientY - rect.top) * this.engine.getRenderHeight() / rect.height * scale;
    const ray = this.scene.createPickingRay(x, y, Matrix.Identity(), this.camera);
    if (Math.abs(ray.direction.y) < 1e-8) return null;
    const t = (0.15 - ray.origin.y) / ray.direction.y;
    return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
  }
  project(point: Point & { y?: number }) {
    const rect = this.canvas.getBoundingClientRect();
    const viewport = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight());
    // Camera viewports count Y from the bottom; screen projection counts from the top.
    viewport.y = this.engine.getRenderHeight() - viewport.y - viewport.height;
    const v = Vector3.Project(new Vector3(point.x, point.y ?? 0.15, point.z), Matrix.Identity(), this.scene.getTransformMatrix(), viewport);
    return { x: rect.left + v.x / this.engine.getRenderWidth() * rect.width, y: rect.top + v.y / this.engine.getRenderHeight() * rect.height };
  }
  drawLine(samples: DrawSample[] | CompiledRoute | null, drawing?: DrawingTrim) {
    this.lines.forEach(line => line.dispose()); this.lines = [];
    this.ignoredLines.forEach(line => line.dispose()); this.ignoredLines = [];
    if (!samples) return;
    let points = Array.isArray(samples) ? samples : samples.points;
    let speeds: number[];
    const muted = (stroke: DrawSample[]) => { if (stroke.length > 1) this.ignoredLines.push(new PaceLine(this.scene, stroke, stroke.map(() => 9), this.theme, 0, false, false, true)); };
    if (Array.isArray(samples)) {
      const start = drawingStart(samples, this.track);
      if (!start) { muted(samples); return; }
      const trimmed = trimDrawing(samples, this.track);
      muted(start.leadIn); if (trimmed.ok) muted(trimmed.tail);
      const counted = (trimmed.ok ? trimmed.samples : [start.sample, ...samples.slice(start.next)]).filter((p, i, all) => !i || distance(p, all[i - 1]) > 0.001);
      points = counted; speeds = gestureSpeeds(counted, this.track.length);
    } else { speeds = samples.points.map(p => p.desiredSpeed); if (drawing) { muted(drawing.leadIn); muted(drawing.tail); } }
    if (points.length > 1) this.lines.push(new PaceLine(this.scene, points, speeds, this.theme));
  }
  drawRaceLines(routes: CompiledRoute[]) {
    this.drawLine(null);
    routes.forEach((route, player) => {
      this.lines.push(new PaceLine(this.scene, route.points, route.points.map(p => p.desiredSpeed), this.theme, player, true));
    });
  }
  showError(point?: Point, section?: Point[]) { this.errorLine?.dispose(); this.errorLine = undefined; this.errorMarker.isVisible = !!point; if (point) this.errorMarker.position.set(point.x, 0.3, point.z); if (section) this.errorLine = new PaceLine(this.scene, section, section.map(() => 9), this.theme, 0, false, true); }
  showStart(show: boolean) { this.marker.isVisible = show; this.approach.isVisible = show; }
  get depthFeatures() { return { perspective: this.camera.mode === Camera.PERSPECTIVE_CAMERA, shadowMapSize: this.shadows.getShadowMap()?.getSize().width ?? 0, shadowCasters: this.shadows.getShadowMap()?.renderList?.length ?? 0, renderReady: this.scene.isReady() && this.showcase.scene.isReady(), worldReady: this.scene.isReady(), showcaseReady: this.showcase.scene.isReady(), pending: [...this.scene.meshes, ...this.showcase.scene.meshes].filter(m => !m.isReady(true)).map(m => m.name), carTriangles: this.vehicle.triangleCount, showcaseTriangles: this.showcase.car.triangleCount, pace: this.theme.pace, lineWidths: this.lines.map(line => line.cssWidths), ignoredStrokeCount: this.ignoredLines.length }; }
  render(time: number) {
    const reduced = this.reducedMotion.matches;
    (this.marker.material as StandardMaterial).alpha = reduced ? 0.32 : 0.29 + Math.sin(time * 3) * 0.05;
    this.sceneryRuntime.update(time, reduced);
    const callsBefore = this.engine._drawCalls.current;
    this.scene.render();
    if (['welcome', 'setup', 'results'].includes(this.layoutMode)) this.showcase.render(time);
    this.drawCalls = this.engine._drawCalls.current - callsBefore;
  }
  dispose(disposeEngine = true) { this.showcase.dispose(); this.scene.dispose(); if (disposeEngine) this.engine.dispose(); }
}
