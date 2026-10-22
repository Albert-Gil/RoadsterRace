import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { TrackDefinition } from '../core/types';
import { projectToPolyline } from '../core/geometry';
import type { PresentationTheme } from './themes';
import { surfaceTexture } from './textures';

/** Original, lightweight launchyard scenery. All substantial structures occupy protected footprints. */
export function buildSpaceport(scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>) {
  const casters = new Set<StandardMaterial>();
  const mat = (role: string, color: string, casts = true) => {
    const m = new StandardMaterial(role, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.setAll(0.1); m.backFaceCulling = false;
    materials.set(role, m); if (casts) casters.add(m); return m;
  };
  const sand = mat('terrain', theme.scene.terrain, false), concrete = mat('embankment', theme.scene.embankment, false);
  const sandTexture = surfaceTexture(scene, 'sand'); sandTexture.uScale = sandTexture.vScale = 14; sand.diffuseTexture = sandTexture;
  const ground = MeshBuilder.CreateGround('launchyard-terrain', { width: 2000, height: 2000 }, scene); ground.position.y = -0.035; ground.material = sand;
  const white = mat('architecture', theme.scene.curb), steel = mat('architecture-trim', theme.scene.structure), glass = mat('architecture-glass', theme.scene.glass);
  const red = mat('architecture-accent', theme.venue.accent), metal = mat('orbital-metal', theme.venue.metal), rock = mat('rock', theme.scene.rock);
  const leaves = mat('foliage', theme.scene.foliage), lightLeaves = mat('foliageLight', theme.scene.foliageLight); mat('trunk', theme.scene.trunk);
  glass.reflectionTexture = scene.environmentTexture; glass.specularColor.setAll(0.8); metal.specularColor.setAll(0.65); metal.specularPower = 96;
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial) => {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene); m.position.set(x, y, z); m.material = material; return m;
  };
  const cylinder = (name: string, x: number, y: number, z: number, height: number, bottom: number, top: number, material: StandardMaterial) => {
    const m = MeshBuilder.CreateCylinder(name, { height, diameterTop: top, diameterBottom: bottom, tessellation: 20 }, scene); m.position.set(x, y, z); m.material = material; return m;
  };
  const sign = (name: string, text: string, x: number, y: number, z: number, width: number) => {
    const texture = new DynamicTexture(name, { width: 1024, height: 128 }, scene, false), ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = theme.scene.structure; ctx.fillRect(0, 0, 1024, 128); ctx.fillStyle = theme.scene.curb; ctx.font = 'italic bold 65px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 512, 87); texture.update();
    const material = mat(name, theme.scene.curb); material.diffuseTexture = texture; material.emissiveColor.setAll(0.15);
    const mesh = MeshBuilder.CreatePlane(name, { width, height: width / 8 }, scene); mesh.position.set(x, y, z); mesh.material = material;
  };
  // Assembly sector, entirely inside assembly-island.
  box('assembly-plinth', -11, 0.38, -16, 40, 0.16, 14, concrete);
  box('assembly-hangar', -11, 3.7, -14, 37, 7, 10, white);
  box('hangar-roof', -11, 7.4, -14, 39, 0.45, 12, metal);
  for (let i = 0; i < 5; i++) {
    const x = -25 + i * 7;
    box('hangar-door', x, 2.7, -19.1, 5.8, 4.7, 0.12, steel);
    for (let j = 0; j < 6; j++) box('door-rib', x, 0.7 + j * 0.7, -19.2, 5.8, 0.06, 0.12, metal);
    box('door-header', x, 5.4, -19.22, 6.1, 0.2, 0.15, red);
    box('roof-skylight', x, 7.66, -14, 4.4, 0.12, 5.4, glass);
  }
  sign('assembly-sign', 'ORBITAL / ASSEMBLY', -11, 6.4, -19.3, 28);
  box('mission-control', 28, 3, -17, 12, 5.7, 9, white);
  box('mission-control-glass', 28, 3.8, -21.55, 11, 2.3, 0.12, glass);
  box('mission-roof', 28, 6, -17, 13, 0.3, 10, metal);
  cylinder('dish-pedestal', 28, 7.3, -17, 2.3, 0.35, 0.3, steel);
  const dish = MeshBuilder.CreateSphere('communications-dish', { diameter: 3, segments: 8, slice: 0.5 }, scene); dish.position.set(28, 8.8, -17); dish.scaling.y = 0.35; dish.rotation.z = 0.5; dish.material = white;
  // Cantilever start lights: no unmarked outer support in usable runoff.
  box('start-cantilever-column', -43, 3.9, -20, 0.8, 7.8, 0.8, steel);
  box('start-cantilever-arm', -43, 7.5, -31, 0.8, 0.7, 23, steel);
  for (let i = 0; i < 5; i++) box('start-light', -43.5, 6.7, -36.5 - i * 1.2, 0.2, 0.42, 0.42, red);
  // Utility tanks fit within utilities-island and cannot become a shortcut.
  for (const [x, z] of [[-18, 26], [-19, 32], [-23, 29]]) {
    cylinder('utility-tank', x, 2, z, 3.6, 2.8, 2.8, white);
    cylinder('tank-cap', x, 3.9, z, 0.35, 2.8, 2.3, metal);
    box('tank-service-box', x + 1.3, 0.8, z, 0.7, 1.2, 0.6, steel);
  }
  // Launch landmark beyond the driving apron, protected by launch-complex.
  cylinder('landing-pad', 97, 0.26, 20, 0.12, 18, 18, concrete);
  const ring = MeshBuilder.CreateTorus('pad-ring', { diameter: 14, thickness: 0.15, tessellation: 48 }, scene); ring.position.set(97, 0.36, 20); ring.material = white;
  cylinder('rocket-engine-skirt', 94, 1.7, 19, 2.7, 3.3, 3.1, steel);
  cylinder('rocket-body', 94, 10.5, 19, 15, 3.1, 3.1, metal);
  cylinder('rocket-upper-body', 94, 19.2, 19, 2.4, 3.1, 2.8, white);
  cylinder('rocket-nose', 94, 22.2, 19, 3.6, 2.8, 0.05, steel);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const fin = box('rocket-fin', 94 + Math.sin(a) * 2, 3, 19 + Math.cos(a) * 2, 0.12, 3.8, 2, steel); fin.rotation.y = a; fin.rotation.x = 0.15;
  }
  for (const x of [101, 104]) for (const z of [23, 26]) box('launch-tower-leg', x, 13, z, 0.35, 25.5, 0.35, steel);
  for (let level = 2; level < 26; level += 3) {
    box('tower-floor', 102.5, level, 24.5, 3.7, 0.15, 3.7, metal);
    const brace = box('tower-brace', 102.5, level + 1.4, 22.9, 0.14, 4, 0.14, steel); brace.rotation.z = -0.7;
  }
  box('service-arm', 98.5, 19.5, 24.5, 8, 0.45, 0.6, white);
  // Sparse scrub/stone clusters stay beyond the complete planning corridor.
  for (let i = 0; i < 85; i++) {
    const a = i * 2.39996, p = { x: Math.cos(a) * (80 + i % 20), z: Math.sin(a) * (60 + i % 20) };
    if (projectToPolyline(p, track.centerline, track.distances).distance < 22 || p.x > 80 && p.z > 0 && p.z < 40) continue;
    const bush = MeshBuilder.CreateSphere('launchyard-scrub', { diameter: 1.4 + i % 3 * 0.5, segments: 4 }, scene); bush.position.set(p.x, 0.5, p.z); bush.scaling.set(1.5, 0.65, 1); bush.material = i % 3 ? leaves : lightLeaves;
    if (i % 4 === 0) { const stone = MeshBuilder.CreateSphere('launchyard-limestone', { diameter: 2.6, segments: 4 }, scene); stone.position.set(p.x + 1.5, 0.5, p.z); stone.scaling.set(1.6, 0.6, 1); stone.material = rock; }
  }
  return { shadowCasterMaterials: casters, update: (_time: number, _reduced: boolean) => {} };
}
