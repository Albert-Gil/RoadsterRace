import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { PresentationTheme } from './themes';
import { softShadowTexture, surfaceTexture } from './textures';
import { projectToPolyline } from '../core/geometry';
import type { TrackDefinition } from '../core/types';
import { visualAssets } from './assets';

/** Decorative geometry only. The broad sand apron stays clear around the circuit. */
export function buildCoast(scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>) {
  const material = (role: string, color: string, unlit = false) => {
    const m = new StandardMaterial(role, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.setAll(0.03); m.disableLighting = unlit; if (unlit) m.emissiveColor = m.diffuseColor.clone(); m.backFaceCulling = false; materials.set(role, m); return m;
  };
  const waterMaterial = material('water', theme.scene.water, true), shallow = material('shallows', theme.scene.shallows, true);
  const waterGrain = surfaceTexture(scene, 'water'); waterGrain.uScale = waterGrain.vScale = 200; waterMaterial.diffuseTexture = waterGrain;
  const water = MeshBuilder.CreateGround('open-water', { width: 2000, height: 2000 }, scene); water.position.y = -3; water.material = waterMaterial;
  const sand = material('terrain', theme.scene.terrain), sandGrain = surfaceTexture(scene, 'sand'); sandGrain.uScale = sandGrain.vScale = 8; sand.diffuseTexture = sandGrain; sand.emissiveColor = Color3.FromHexString(theme.scene.terrain).scale(0.04);
  const wetSand = material('wet-sand', theme.scene.shoulder), foam = material('foam', theme.scene.foam, true);
  const ring = (scale: number, y: number) => Array.from({ length: 129 }, (_, i) => {
    const a = i / 128 * Math.PI * 2, r = 1 + 0.035 * Math.sin(3 * a + 0.7) + 0.018 * Math.cos(7 * a);
    return new Vector3(Math.cos(a) * 85 * r * scale, y, Math.sin(a) * 62 * r * scale);
  });
  const band = (name: string, inner: number, outer: number, y1: number, y2: number, mat: StandardMaterial) => {
    const mesh = MeshBuilder.CreateRibbon(name, { pathArray: [ring(inner, y1), ring(outer, y2)], sideOrientation: Mesh.FRONTSIDE }, scene); mesh.material = mat;
    mesh.setVerticesData(VertexBuffer.NormalKind, Array.from({ length: 258 }, () => [0, 1, 0]).flat());
    if (name === 'lagoon-shelf') { mesh.setVerticesData(VertexBuffer.ColorKind, [0.98, 0].flatMap(alpha => Array.from({ length: 129 }, () => [1, 1, 1, alpha]).flat())); mesh.hasVertexAlpha = true; }
  };
  band('lagoon-shelf', 0.99, 1.25, -0.15, -2.94, shallow);
  band('shore-break', 1.035, 1.048, -0.65, -0.82, foam);
  band('wet-sand-rim', 0.965, 1.037, -0.07, -0.68, wetSand);
  const perimeter = ring(0.975, -0.035), land = new Mesh('sandy-island', scene), data = new VertexData();
  const positions = [0, -0.035, 0], normals = [0, 1, 0], uvs = [0.5, 0.5], indices: number[] = [];
  perimeter.forEach((p, i) => { positions.push(p.x, p.y, p.z); normals.push(0, 1, 0); uvs.push(p.x / 180 + 0.5, p.z / 135 + 0.5); if (i) indices.push(0, i + 1, i); });
  data.positions = positions; data.normals = normals; data.uvs = uvs; data.indices = indices;
  data.applyToMesh(land); land.material = sand;
  const embankment = material('embankment', theme.scene.embankment);
  const rockMaterial = material('rock', theme.scene.rock);
  if (visualAssets.embankmentTexture) {
    const texture = new Texture(visualAssets.embankmentTexture, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE, undefined, () => { texture.dispose(); embankment.diffuseTexture = null; rockMaterial.diffuseTexture = null; }); texture.anisotropicFilteringLevel = 4;
    embankment.diffuseTexture = rockMaterial.diffuseTexture = texture;
  }
  const mounds = [{ x: -16, z: 0, width: 36, depth: 20, height: 0.28 }, { x: -31, z: 0, width: 12, depth: 17, height: 3.2 }, { x: 5, z: -6, width: 9, depth: 9, height: 2.1 }];
  const moundHeight = (x: number, z: number, mound: typeof mounds[number]) => {
    const r2 = ((x - mound.x) / (mound.width / 2)) ** 2 + ((z - mound.z) / (mound.depth / 2)) ** 2;
    return mound.height * Math.max(0, 1 - r2) ** 1.2 * (0.92 + Math.sin(x * 1.3 + z) * 0.08);
  };
  const groundHeight = (x: number, z: number) => Math.max(0, ...mounds.map(mound => moundHeight(x, z, mound)));
  for (const mound of mounds) {
    const mesh = new Mesh('sculpted-infield', scene), vertices = new VertexData();
    const positions: number[] = [], indices: number[] = [], normals: number[] = [], uv: number[] = [], colors: number[] = [], segments = 48, rings = 10;
    for (let r = 0; r <= rings; r++) for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2, radius = r / rings * (0.94 + 0.05 * Math.sin(a * 5));
      const x = mound.x + Math.cos(a) * mound.width / 2 * radius, z = mound.z + Math.sin(a) * mound.depth / 2 * radius;
      positions.push(x, groundHeight(x, z) + 0.02, z); uv.push(x / 6, z / 6); colors.push(1, 1, 1, Math.min(1, (1 - r / rings) * 5));
      if (r && i) { const c = r * (segments + 1) + i, b = c - segments - 1; indices.push(b - 1, c - 1, b, b, c - 1, c); }
    }
    VertexData.ComputeNormals(positions, indices, normals); if (normals.reduce((sum, value, i) => sum + (i % 3 === 1 ? value : 0), 0) < 0) { for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]; VertexData.ComputeNormals(positions, indices, normals); }
    vertices.positions = positions; vertices.indices = indices; vertices.normals = normals; vertices.uvs = uv; vertices.colors = colors; vertices.applyToMesh(mesh); mesh.material = embankment; mesh.hasVertexAlpha = true;
    // Stones at the foot of the mound emphasize actual height and light direction.
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, x = mound.x + Math.cos(a) * mound.width * 0.4, z = mound.z + Math.sin(a) * mound.depth * 0.4;
      const stone = MeshBuilder.CreateSphere('infield-limestone', { diameter: 1.2 + i % 3 * 0.4, segments: 5 }, scene); stone.position.set(x, groundHeight(x, z) + 0.35, z); stone.scaling.y = 0.8; stone.material = rockMaterial; stone.convertToFlatShadedMesh();
    }
  }
  const glint = material('water-glints', theme.scene.foam, true); glint.alpha = 0.28;
  for (let i = 0; i < 40; i++) {
    const a = i * 2.39996, r = 1.3 + (i % 5) * 0.09;
    const streak = MeshBuilder.CreateBox('sea-glint', { width: 1.5 + i % 4, height: 0.015, depth: 0.12 }, scene);
    streak.position.set(Math.cos(a) * 85 * r, -2.9, Math.sin(a) * 64 * r); streak.rotation.y = -0.25; streak.material = glint;
  }
  const shade = material('scenery-shadow', '#ffffff', true); shade.diffuseTexture = softShadowTexture(scene); shade.useAlphaFromDiffuseTexture = true; shade.alpha = 0.28;
  shade.emissiveColor.setAll(1);
  const shadow = (x: number, z: number, w: number, d: number) => {
    const mesh = MeshBuilder.CreateGround('scenery-contact', { width: w, height: d }, scene); mesh.position.set(x + 0.7, 0.01, z - 0.5); mesh.material = shade;
  };
  const leaf = material('foliage', theme.scene.foliage), leafLight = material('foliageLight', theme.scene.foliageLight), trunk = material('trunk', theme.scene.trunk);
  const palm = (x: number, z: number, height: number, heading: number) => {
    const elevation = groundHeight(x, z);
    const stem = MeshBuilder.CreateCylinder('palm-trunk', { height, diameterTop: 0.24, diameterBottom: 0.48, tessellation: 7 }, scene);
    stem.position.set(x, elevation + height / 2, z); stem.rotation.z = 0.12; stem.material = trunk;
    const crownX = x - height * 0.06;
    for (let i = 0; i < 11; i++) {
      const a = heading + i / 11 * Math.PI * 2;
      const frond = MeshBuilder.CreateRibbon('palm-frond', { pathArray: [-1, 1].map(side => Array.from({ length: 9 }, (_, j) => {
        const t = j / 8, reach = (3.8 + Math.sin(i * 3) * 0.5) * t, width = Math.sin(t * Math.PI) * 0.42;
        return new Vector3(crownX + Math.sin(a) * reach + Math.cos(a) * side * width, elevation + height + Math.sin(t * Math.PI) * 0.8 - t * t * 1.4, z + Math.cos(a) * reach - Math.sin(a) * side * width);
      })), sideOrientation: Mesh.FRONTSIDE }, scene);
      const normals = frond.getVerticesData(VertexBuffer.NormalKind)!; for (let n = 1; n < normals.length; n += 3) normals[n] = Math.abs(normals[n]); frond.setVerticesData(VertexBuffer.NormalKind, normals);
      frond.material = i % 2 ? leaf : leafLight;
    }
    if (elevation < 0.1) shadow(x, z, 7, 6);
  };
  for (const [i, [x, z]] of [[-77, -13], [-77, 8], [-50, 46], [-32, 54], [-10, 55], [12, 55], [48, 33], [72, 11], [78, -19], [48, -50], [-17, -54], [-46, -49], [-28, 3], [-21, 8], [-13, 4]].entries()) {
    if (!(x > -30 && x < 7 && z > 48) && projectToPolyline({ x, z }, track.centerline, track.distances).distance > track.roadWidth * 1.5 + 3) palm(x, z, 5.2 + i % 3 * 0.6, i * 1.7);
  }
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2 + 0.12 + Math.sin(i * 7) * 0.08, r = 0.98 + (i % 3) * 0.012;
    const rock = MeshBuilder.CreateSphere('shore-rock', { diameter: 2.8 + i % 4, segments: 5 }, scene);
    rock.position.set(Math.cos(a) * 85 * r, -0.6, Math.sin(a) * 62 * r); rock.scaling.set(1.6, 0.65 + i % 4 * 0.18, 1.15); rock.rotation.y = i * 2.2; rock.material = rockMaterial; rock.convertToFlatShadedMesh(); shadow(rock.position.x, rock.position.z, 7, 5);
  }
  const white = material('architecture', theme.scene.curb), trim = material('architecture-trim', theme.scene.structure), glass = material('architecture-glass', theme.scene.glass), accent = material('architecture-accent', theme.players[0]);
  glass.specularColor.setAll(0.85); glass.specularPower = 96; glass.reflectionTexture = scene.environmentTexture; glass.roughness = 0.15;
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, mat: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene); mesh.position.set(x, y, z); mesh.material = mat; return mesh;
  };
  shadow(-10, -6, 23, 13);
  box('pavilion-plinth', -10, 0.2, -6, 21, 0.4, 10, white);
  box('pavilion', -10, 2.4, -5, 17, 4.4, 6, white);
  box('panoramic-glass', -10, 2.7, -8.05, 15.5, 2.7, 0.1, glass);
  box('pavilion-floor-band', -10, 2.6, -8.15, 17, 0.12, 0.23, white);
  for (let i = 0; i < 6; i++) box('window-mullion', -17.5 + i * 3, 2.7, -8.14, 0.12, 2.9, 0.15, trim);
  box('floating-roof', -10, 4.85, -5.5, 20, 0.3, 8.5, white);
  box('roof-trim', -10, 4.64, -9.75, 20, 0.14, 0.18, accent);
  for (let i = 0; i < 7; i++) box('solar-panel', -17 + i * 2.25, 5.06, -5, 1.9, 0.07, 3.8, glass);
  for (const x of [-23, 4]) {
    box('banner-pole', x, 3.5, -4, 0.12, 7, 0.12, trim);
    box('circuit-banner', x + 0.8, 5.7, -4, 1.6, 2.5, 0.06, accent); shadow(x, -4, 2, 3);
  }
  // A stepped spectator stand behind the top straight makes vertical scale legible.
  box('grandstand-foundation', -14, 0.2, 54.5, 28, 0.4, 10, white);
  for (let row = 0; row < 5; row++) {
    const y = 0.6 + row * 0.8, z = 51 + row * 1.55;
    box('grandstand-tier', -14, y / 2, z, 26, y, 1.6, white);
    box('grandstand-seat', -14, y + 0.19, z, 24.5, 0.28, 0.45, accent);
    for (let i = 0; i < 12; i++) box('seat-divider', -25.5 + i * 2.05, y + 0.36, z + 0.18, 0.07, 0.4, 0.09, trim);
  }
  for (const x of [-27, -1]) for (const z of [51, 58]) box('grandstand-column', x, 3.4, z, 0.28, 6.8, 0.28, trim);
  const standRoof = box('grandstand-canopy', -14, 7, 54.5, 30, 0.25, 11, white); standRoof.rotation.x = -0.06;
  box('grandstand-fascia', -14, 6.8, 49, 30, 0.55, 0.16, accent);
  // A small offshore sailing boat adds scale, far outside the driving apron.
  const hull = MeshBuilder.CreateSphere('sailboat-hull', { diameter: 1, segments: 8 }, scene); hull.scaling.set(2.6, 0.9, 7); hull.position.set(97, -2.65, 22); hull.rotation.y = -0.4; hull.material = white;
  const sail = new Mesh('sail', scene), sailData = new VertexData();
  sailData.positions = [96, -2.1, 22, 96, 6, 22, 96, -1.5, 27]; sailData.indices = [0, 1, 2]; sailData.normals = [1, 0, 0, 1, 0, 0, 1, 0, 0]; sailData.uvs = [0, 0, 0, 1, 1, 0]; sailData.applyToMesh(sail); sail.material = white;
  const shadowCasterMaterials = new Set(['embankment', 'foliage', 'foliageLight', 'trunk', 'rock', 'architecture', 'architecture-trim', 'architecture-glass', 'architecture-accent'].map(role => materials.get(role)!));
  return { waterTexture: waterGrain, foamMaterial: foam, shadowCasterMaterials };
}
