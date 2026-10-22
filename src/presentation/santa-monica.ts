import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { Point, TrackDefinition } from '../core/types';
import { groundHeight } from '../core/support';
import { sunsetAppearance as art, type PresentationTheme } from './themes';
import { surfaceTexture } from './textures';
import { santaMonicaAuthoredBuildings as santaMonicaBuildings } from '../content/santa-monica-art';
import { reflectSantaVenue } from '../core/tracks/santa-monica';

/** Original procedural seaside venue. Every pier slab uses a physical support footprint. */
export function buildSantaMonica(scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>) {
  // Props remain in a single documented authoring space. Reflect their shared
  // parent into the clockwise physical venue; static batching bakes that transform.
  track = reflectSantaVenue(track);
  const before = new Set(scene.meshes), venueRoot = new TransformNode('clockwise-santa-artwork', scene); venueRoot.scaling.z = -1;
  const casters = new Set<StandardMaterial>();
  const mat = (role: string, color: string, casts = true) => { const m = new StandardMaterial(role, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.setAll(0.08); m.backFaceCulling = false; materials.set(role, m); if (casts) casters.add(m); return m; };
  const sand = mat('terrain', theme.scene.terrain, false), edge = mat('embankment', theme.scene.embankment, false);
  const wood = mat('pier-timber', art.deck), dark = mat('architecture-trim', art.steel), white = mat('architecture', art.ivory), glass = mat('architecture-glass', art.glass);
  const coral = mat('sunset-coral', art.coral), gold = mat('sunset-gold', art.gold), leaf = mat('foliage', theme.scene.foliage), lightLeaf = mat('foliageLight', theme.scene.foliageLight);
  const trunk = mat('trunk', theme.scene.trunk); mat('rock', theme.scene.rock);
  const water = mat('water', theme.scene.water, false); water.specularColor.setAll(0.65); water.specularPower = 90;
  water.disableLighting = true; water.emissiveColor = Color3.FromHexString(theme.scene.water);
  const waterTexture = surfaceTexture(scene, 'water'); waterTexture.uScale = waterTexture.vScale = 120; water.diffuseTexture = waterTexture;
  const sandTex = surfaceTexture(scene, 'sand'); sandTex.uScale = sandTex.vScale = 6; sand.diffuseTexture = sandTex;
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial) => { const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene); m.position.set(x, y, z); m.material = material; return m; };
  const tube = (name: string, points: Vector3[], radius: number, material: StandardMaterial) => { const m = MeshBuilder.CreateTube(name, { path: points, radius, tessellation: 5 }, scene); m.material = material; return m; };
  const slab = (name: string, footprint: Point[], material: StandardMaterial, y: number, bottom?: number) => {
    const positions = footprint.flatMap(p => [p.x, y, p.z]), indices: number[] = [];
    for (let i = 1; i < footprint.length - 1; i++) indices.push(0, i + 1, i);
    if (bottom !== undefined) for (let i = 0; i < footprint.length; i++) { const a = footprint[i], b = footprint[(i + 1) % footprint.length], base = positions.length / 3; positions.push(a.x, bottom, a.z, b.x, bottom, b.z, b.x, y, b.z, a.x, y, a.z); indices.push(base, base + 1, base + 2, base, base + 2, base + 3); }
    const data = new VertexData(), normals: number[] = []; data.positions = positions; data.indices = indices; VertexData.ComputeNormals(positions, indices, normals);
    for (let i = 0; i < footprint.length; i++) { normals[i * 3] = 0; normals[i * 3 + 1] = 1; normals[i * 3 + 2] = 0; }
    data.normals = normals; data.uvs = positions.flatMap((_, i) => i % 3 ? [] : [positions[i] / (material === sand ? 180 : 5), positions[i + 2] / (material === sand ? 150 : 5)]);
    const m = new Mesh(name, scene); data.applyToMesh(m); material.backFaceCulling = false; m.material = material; return m;
  };
  const sea = MeshBuilder.CreateGround('pacific-ocean', { width: 2000, height: 2000 }, scene); sea.position.y = -2.4; sea.material = water;
  for (const s of track.supports!) slab(`supported-${s.id}`, s.footprint, s.id === 'beach-land' ? sand : wood, s.id === 'beach-land' ? -0.04 : 0.025, s.id === 'beach-land' ? -2.5 : -0.6);
  // Warm shoreline, entirely land-backed. No sand or shoulder spans the water gap.
  const shore = track.supports![0].footprint.slice(1, -1);
  const foam = mat('foam', theme.scene.foam, false); foam.emissiveColor = Color3.FromHexString(theme.scene.foam).scale(0.25);
  const band = (name: string, offsets: number[], heights: number[], material: StandardMaterial) => {
    const m = MeshBuilder.CreateRibbon(name, { pathArray: offsets.map((offset, i) => shore.map(p => new Vector3(p.x + offset, heights[i], p.z))), sideOrientation: Mesh.DOUBLESIDE }, scene); m.material = material;
    m.setVerticesData(VertexBuffer.NormalKind, Array.from({ length: m.getTotalVertices() }, () => [0, 1, 0]).flat());
  };
  band('wet-sand-shore', [0, 2.5], [-0.05, -0.7], edge);
  band('soft-pacific-shore-break', [2.5, 3], [-0.72, -0.85], foam);
  band('submerged-sand-bank', [3, 7], [-0.85, -2.4], sand);
  for (let i = 0; i < 22; i++) {
    const glint = box('sunset-water-glint', 43 + i % 6 * 22, -2.37, -45 + Math.floor(i / 6) * 32, 6 + i % 4 * 2, 0.01, 0.12, gold); glint.rotation.y = -0.15;
  }
  // Piles and diagonal braces remain beneath the supported deck, outside racing volumes.
  for (let x = 42; x <= 136; x += 12) for (const z of [8, 16, 46, 54]) {
    if (x > 48 && x < 62 && z < 20) continue;
    box('pier-pile', x, -1.45, z, 0.65, 3.1, 0.65, dark);
    tube('pier-crossbrace', [new Vector3(x, -2.3, z), new Vector3(x + 7, -0.5, z)], 0.14, wood);
  }
  for (let x = 76; x <= 116; x += 8) for (const z of [24, 38]) box('amusement-pile', x, -1.45, z, 0.7, 3.1, 0.7, dark);

  const sign = (text: string, x: number, z: number, width: number, materialRole: string) => {
    const tex = new DynamicTexture(materialRole, { width: 1024, height: 128 }, scene, false), ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = art.steel; ctx.fillRect(0, 0, 1024, 128); ctx.fillStyle = art.gold; ctx.fillRect(0, 112, 1024, 16);
    ctx.font = 'italic bold 66px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = art.ivory; ctx.fillText(text, 512, 83); tex.update();
    const m = mat(materialRole, '#ffffff', false); m.diffuseTexture = tex; m.emissiveColor.setAll(0.3); m.backFaceCulling = false;
    const board = MeshBuilder.CreatePlane(materialRole, { width, height: width / 8 }, scene); board.position.set(x, 3.8, z); board.material = m;
    for (const side of [-1, 1]) box('sign-support', x + side * width * 0.45, 1.8, z, 0.18, 3.6, 0.18, dark);
  };
  sign('SANTA MONICA / SUNSET RUN', -14, -24, 22, 'sunset-title');
  sign('PACIFIC PIER', 94, 24.1, 12, 'pier-title');
  sign('JUMP  ↗', 42, 19.1, 7, 'ramp-title');

  // Beachfront facades sit inside the protected garden footprint; furniture is protected too.
  const facade = [coral, white, gold];
  for (const { x, z, height: h, color } of santaMonicaBuildings.filter(b => b.kind === 'shop')) {
    box('pastel-shop-foundation', x, 0.18, z, 5, 0.4, 7, edge);
    box('pastel-shop', x, h / 2 + 0.35, z, 5, h, 7, facade[color]);
    box('shop-cornice', x, h + 0.5, z, 5.2, 0.25, 7.2, white);
    for (const side of [-1, 1]) {
      box('shop-awning', x, 2, z + side * 3.8, 4.5, 0.18, 1, coral);
      box('shopfront-glazing', x, 1.1, z + side * 3.55, 4.2, 1.5, 0.06, glass);
      for (let j = 0; j < 3; j++) box('upper-shop-window', x - 1.5 + j * 1.5, 3.4, z + side * 3.55, 0.9, 1.1, 0.08, glass);
    }
  }
  const palm = (x: number, z: number, h: number) => {
    tube('palm-trunk', [new Vector3(x, 0, z), new Vector3(x + 0.5, h * 0.6, z), new Vector3(x + 0.8, h, z + 0.2)], 0.24, trunk);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, frond = MeshBuilder.CreateSphere('palm-frond', { diameter: 1, segments: 4 }, scene);
      frond.scaling.set(3.8, 0.15, 0.75); frond.rotation.y = a; frond.rotation.z = -0.2; frond.position.set(x + 0.8 + Math.cos(a) * 1.25, h - 0.25, z + Math.sin(a) * 1.25); frond.material = i % 2 ? leaf : lightLeaf;
    }
  };
  for (const [x, z] of [[-30, -21], [-14, -21], [0, -21], [-73, -35], [-74, -12], [-73, 12], [-64, 45], [-40, 52], [-14, 50], [5, 66], [20, -65], [-92, -45], [-92, -24], [-91, 0], [-88, 25]]) palm(x, z, 5 + Math.abs(x) % 3);
  // Land-backed hotel frontage and promenade, outside the usable runoff.
  for (const { x, z, height: h, color } of santaMonicaBuildings.filter(b => b.kind === 'hotel')) {
    box('beachfront-city-foundation', x, 0.1, z, 11, 0.3, 9, edge); box('beachfront-hotel', x, h / 2 + 0.3, z, 10, h, 8, facade[color]);
    box('hotel-roofline', x, h + 0.4, z, 10.3, 0.25, 8.3, white);
    for (let floor = 1.5; floor < h; floor += 2) for (let c = 0; c < 4; c++) for (const side of [-1, 1]) box('hotel-window', x - 3.2 + c * 2.1, floor + 0.3, z + side * 4.05, 1.15, 1.15, 0.08, glass);
  }
  for (let i = 0; i < 12; i++) {
    const x = -103, z = -52 + i * 10; box('promenade-paving', x, 0.02, z, 4.8, 0.1, 10.1, edge);
    if (i % 2 === 0) { box('promenade-lamp', x + 1.8, 2.5, z, 0.13, 5, 0.13, dark); box('promenade-light', x + 1.8, 5.05, z, 0.6, 0.2, 0.5, white); }
  }
  // Lifeguard cabins and umbrellas are on beach land outside the driving/runoff corridor.
  for (const { x, z, color } of santaMonicaBuildings.filter(b => b.kind === 'lifeguard')) {
    box('lifeguard-cabin', x, 1.7, z, 3.1, 2, 2.4, color ? coral : white); box('lifeguard-roof', x, 2.8, z, 3.8, 0.2, 3.2, gold);
    for (const side of [-1, 1]) box('lifeguard-legs', x + side, 0.5, z, 0.18, 1.1, 0.18, dark);
    const canopy = MeshBuilder.CreateCylinder('beach-umbrella', { diameterTop: 0, diameterBottom: 3.8, height: 0.7, tessellation: 10 }, scene); canopy.position.set(x + 7, 2.3, z - 1); canopy.material = color ? gold : coral;
    box('umbrella-pole', x + 7, 1.1, z - 1, 0.08, 2.2, 0.08, white);
  }
  // The wheel is one moving batched mesh; its support structure remains static.
  const wheelParts: Mesh[] = [], wx = 85, wz = 31, wy = 10.4, radius = 7.7;
  for (const side of [-1, 1]) tube('wheel-a-frame', [new Vector3(wx - 5, 0.3, wz + side * 2), new Vector3(wx, wy, wz), new Vector3(wx + 5, 0.3, wz + side * 2)], 0.25, white);
  const rim = MeshBuilder.CreateTorus('pacific-wheel-rim', { diameter: radius * 2, thickness: 0.3, tessellation: 48 }, scene); rim.rotation.x = Math.PI / 2; rim.position.set(wx, wy, wz); rim.material = coral; wheelParts.push(rim);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, p = new Vector3(wx + Math.cos(a) * radius, wy + Math.sin(a) * radius, wz);
    wheelParts.push(tube('wheel-spoke', [new Vector3(wx, wy, wz), p], 0.065, coral));
    wheelParts.push(box('wheel-gondola', p.x, p.y - 0.45, wz, 1.2, 0.85, 1.1, coral));
  }
  const wheel = Mesh.MergeMeshes(wheelParts, true, true)!; wheel.name = 'animated-pacific-wheel'; wheel.metadata = { dynamicScenery: true };
  // Recenter the batched vertices so the local pivot is the wheel's axle.
  wheel.bakeTransformIntoVertices(Matrix.Translation(-wx, -wy, -wz)); wheel.position.set(wx, wy, wz);
  const coasterPath = Array.from({ length: 97 }, (_, i) => {
    const a = i / 96 * Math.PI * 2; return new Vector3(105 + Math.cos(a) * 8, 2.6 + (1 + Math.cos(a * 2 + 0.6)) * 2.1, 31 + Math.sin(a) * 4.8);
  });
  tube('sunset-coaster-track', coasterPath, 0.16, gold);
  for (let i = 0; i < 96; i += 8) { const p = coasterPath[i]; box('coaster-trestle', p.x, p.y / 2, p.z, 0.18, p.y, 0.18, white); }
  const trainParts = Array.from({ length: 3 }, (_, i) => box('coaster-train-car', -i * 1.2, 0, 0, 1, 0.7, 0.7, coral));
  const train = Mesh.MergeMeshes(trainParts, true, true)!; train.name = 'animated-coaster-train'; train.metadata = { dynamicScenery: true };

  // Physical ramp geometry and bright directional chevrons make the optional shortcut legible.
  const jump = track.jumps![0];
  const rampPaths = [-1, 1].map(side => [new Vector3(jump.from.x, 0.11, jump.from.z + side * 6), new Vector3(jump.from.x + 8, 1.31, jump.from.z + side * 6)]);
  const ramp = MeshBuilder.CreateRibbon('physical-jump-ramp', { pathArray: rampPaths, sideOrientation: Mesh.DOUBLESIDE }, scene); ramp.material = dark;
  for (const x of [43, 45.5, 48]) {
    const y = groundHeight({ x, z: 12 }, track) + 0.16;
    tube('jump-gold-chevron', [new Vector3(x - 0.8, y, 8.5), new Vector3(x + 0.3, y, 12), new Vector3(x - 0.8, y, 15.5)], 0.11, gold);
  }
  box('landing-edge-band', 60.1, 0.05, 12, 0.35, 0.1, 12, gold);
  // Slim deck seams add scale without turning the pier into an oversized platform.
  for (let x = 64; x <= 116; x += 3) box('landing-deck-seam', x, 0.115, 12, 0.04, 0.01, 11, white);

  for (const mesh of scene.meshes) if (!before.has(mesh) && !mesh.parent) mesh.parent = venueRoot;
  return { shadowCasterMaterials: casters, update(time: number, reduced: boolean) {
    waterTexture.uOffset = reduced ? 0 : time * 0.002;
    wheel.rotation.z = reduced ? 0 : time * 0.11;
    const index = reduced ? 0 : time * 7 % 96, i = Math.floor(index), a = coasterPath[i], b = coasterPath[i + 1];
    train.position.copyFrom(Vector3.Lerp(a, b, index - i)); train.position.y += 0.45; train.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  } };
}
