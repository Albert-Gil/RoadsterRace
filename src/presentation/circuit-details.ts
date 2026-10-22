import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { TrackDefinition, Point } from '../core/types';
import { bridgeAt } from '../core/bridge';
import { insideBarrier } from '../core/barriers';
import { cumulative, distance, projectToPolyline } from '../core/geometry';
import type { PresentationTheme } from './themes';

/** Walls originate in physical footprints. Every other solid prop is inside a protected island. */
export function buildCircuitDetails(scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>, casters: Set<StandardMaterial>, coastal = true) {
  const mat = (name: string, color: string, casts = true) => { const m = new StandardMaterial(name, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.setAll(0.05); materials.set(name, m); if (casts) casters.add(m); return m; };
  const concrete = mat('barrier-concrete', theme.venue.concrete), rail = mat('galvanized-rail', theme.venue.metal), red = mat('race-red', theme.venue.accent), dark = mat('race-charcoal', theme.venue.rubber), white = materials.get('architecture')!, grass = materials.get('embankment')!, rock = materials.get('rock')!, leaf = materials.get('foliage')!, leafLight = materials.get('foliageLight')!;
  const marking = mat('track-ivory', theme.venue.marking, false), worn = mat('asphalt-repair', theme.venue.repair, false); worn.alpha = 0.4;
  const box = (name: string, p: Point, y: number, w: number, h: number, d: number, material: StandardMaterial, angle = 0) => { const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene); m.position.set(p.x, y, p.z); m.rotation.y = angle; m.material = material; return m; };
  const label = (name: string, text: string, width: number, height: number, p: Point, y: number, angle = 0) => {
    const texture = new DynamicTexture(name, { width: 1024, height: 128 }, scene, false); const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#19242c'; ctx.fillRect(0, 0, 1024, 128); ctx.fillStyle = '#ed3949'; ctx.fillRect(0, 0, 18, 128); ctx.font = 'italic bold 62px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f3f1e8'; ctx.fillText(text, 520, 86); texture.update();
    const m = mat(name, '#ffffff'); m.diffuseTexture = texture; m.emissiveColor.setAll(0.12); m.backFaceCulling = false;
    const sign = MeshBuilder.CreatePlane(name, { width, height }, scene); sign.position.set(p.x, y, p.z); sign.rotation.y = angle; sign.material = m; return sign;
  };
  for (const barrier of track.barriers) {
    if (barrier.id === 'gantry-support' || barrier.id === 'grandstand') continue; // These authored structures are rendered separately.
    if (barrier.kind === 'bridge-rail' || barrier.kind === 'bridge-support' || barrier.kind === 'pier-rail') {
      const p = barrier.footprint, positions: number[] = [], indices: number[] = [];
      const quad = (a: number[], b: number[], c: number[], d: number[]) => { const base = positions.length / 3; positions.push(...a, ...b, ...c, ...d); indices.push(base, base + 1, base + 2, base, base + 2, base + 3); };
      const bottom = barrier.baseHeight ?? (barrier.kind === 'pier-rail' ? 0 : 0.05), top = bottom + barrier.height;
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; quad([a.x, bottom, a.z], [b.x, bottom, b.z], [b.x, top, b.z], [a.x, top, a.z]); }
      quad([p[0].x, top, p[0].z], [p[1].x, top, p[1].z], [p[2].x, top, p[2].z], [p[3].x, top, p[3].z]);
      const data = new VertexData(), normals: number[] = []; data.positions = positions; data.indices = indices; VertexData.ComputeNormals(positions, indices, normals); data.normals = normals; data.uvs = positions.flatMap((_, i) => i % 3 ? [] : [positions[i] / 8, positions[i + 2] / 8]);
      // Polygon winding may be reflected by a venue. Its horizontal cap always faces up.
      for (let i = normals.length - 12; i < normals.length; i += 3) { normals[i] = 0; normals[i + 1] = 1; normals[i + 2] = 0; }
      const wall = new Mesh(`solid-${barrier.id}`, scene); data.applyToMesh(wall); concrete.backFaceCulling = false; wall.material = concrete;
      continue;
    }
    const vertices = barrier.footprint, cx = vertices.reduce((s, p) => s + p.x, 0) / vertices.length, cz = vertices.reduce((s, p) => s + p.z, 0) / vertices.length;
    const data = new VertexData(), positions = [cx, 0.16, cz], normals = [0, 1, 0], uvs = [cx / 8, cz / 8], indices: number[] = [];
    vertices.forEach(p => { positions.push(p.x, 0.16, p.z); normals.push(0, 1, 0); uvs.push(p.x / 8, p.z / 8); });
    for (let i = 0; i < vertices.length; i++) indices.push(0, (i + 1) % vertices.length + 1, i + 1);
    data.positions = positions; data.normals = normals; data.uvs = uvs; data.indices = indices;
    const ground = new Mesh(`protected-${barrier.id}`, scene); data.applyToMesh(ground); ground.material = grass;
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i], b = vertices[(i + 1) % vertices.length], len = distance(a, b), dx = (b.x - a.x) / len, dz = (b.z - a.z) / len;
      const center = { x: (a.x + b.x) / 2 - dz * 0.25, z: (a.z + b.z) / 2 + dx * 0.25 }, angle = Math.atan2(dx, dz);
      box(`solid-wall-${barrier.id}`, center, barrier.height / 2 + 0.1, 0.5, barrier.height, len + 0.12, concrete, angle);
      box('wall-cap', center, barrier.height + 0.12, 0.52, 0.08, len + 0.14, white, angle);
      // Thin metal rail sits inside the physical wall face.
      box('inside-guardrail', center, 0.65, 0.53, 0.15, len, rail, angle);
      for (let j = 0; j < len; j += 2.8) {
        const t = (j + 0.4) / len, p = { x: a.x + (b.x - a.x) * t - dz * 0.26, z: a.z + (b.z - a.z) * t + dx * 0.26 };
        box('wall-marker', p, 0.62, 0.54, 0.22, 0.7, i % 3 === 0 ? red : dark, angle);
      }
    }
    // Plant only within the solid islands, leaving the generous sand runoff usable.
    for (let i = 0; coastal && i < 110; i++) {
      const p = { x: cx + Math.sin(i * 17.3) * 26, z: cz + Math.sin(i * 9.71) * 16 };
      if (!insideBarrier(p, barrier) || (barrier.id === 'coastal-gardens' && p.x > -24 && p.x < 2 && p.z > -12 && p.z < 3)) continue;
      if (projectToPolyline(p, [...vertices, vertices[0]], cumulative([...vertices, vertices[0]])).distance < 1.7) continue;
      const bush = MeshBuilder.CreateSphere('coastal-scrub', { diameter: 1.3 + (i % 4) * 0.35, segments: 4 }, scene); bush.position.set(p.x, 0.7, p.z); bush.scaling.set(1.3, 0.75, 1); bush.material = i % 3 ? leaf : leafLight;
      if (i % 7 === 0) { const stone = MeshBuilder.CreateSphere('landscaped-limestone', { diameter: 2.3, segments: 4 }, scene); stone.position.set(p.x + 0.4, 0.7, p.z); stone.scaling.set(1.3, 0.7, 1); stone.material = rock; }
    }
  }
  // Narrow continuous edge lines replace the highway-like center dashes.
  for (const side of [-1, 1]) {
    const path = [-0.065, 0.065].map(offset => track.centerline.map((p, i, all) => {
      const a = all[Math.max(0, i - 1)], b = all[Math.min(all.length - 1, i + 1)], len = distance(a, b) || 1;
      const r = side * (track.roadWidth / 2 - 0.35) + offset;
      return new Vector3(p.x - (b.z - a.z) / len * r, 0.143, p.z + (b.x - a.x) / len * r);
    }));
    const edge = MeshBuilder.CreateRibbon('painted-road-edge', { pathArray: path, sideOrientation: Mesh.DOUBLESIDE }, scene); edge.material = marking;
  }
  // Grid paint follows the authored start tangent on either course.
  const next = track.centerline[1], heading = Math.atan2(next.x - track.start.x, next.z - track.start.z), fx = Math.sin(heading), fz = Math.cos(heading);
  for (let i = 0; i < 8; i++) {
    const back = 3 + Math.floor(i / 2) * 5, side = i % 2 ? 2.8 : -2.8;
    const x = track.start.x - fx * back + fz * side, z = track.start.z - fz * back - fx * side;
    box('grid-front', { x, z }, 0.15, 0.14, 0.012, 2.1, marking, heading - Math.PI / 2);
    for (const sign of [-1, 1]) box('grid-side', { x: x - fx * 1.2 + fz * sign, z: z - fz * 1.2 - fx * sign }, 0.15, 2.4, 0.012, 0.12, marking, heading - Math.PI / 2);
  }
  for (let i = 0; i < 9; i++) { const p = track.centerline[20 + i * 23]; if (bridgeAt(p, track)) continue; box('road-repair', p, 0.135, 1 + i % 3, 0.006, 1.8, worn, i * 0.78); }
  if (!coastal) return;
  // Pit bays are entirely inside the protected central infield.
  for (let i = 0; i < 5; i++) {
    const x = -20 + i * 4;
    box('pit-roller-door', { x, z: -8.18 }, 1.4, 3.3, 2.3, 0.08, dark);
    box('pit-bay-header', { x, z: -8.25 }, 2.7, 3.6, 0.18, 0.16, red);
    for (let j = 0; j < 5; j++) box('roller-door-slat', { x, z: -8.25 }, 0.6 + j * 0.35, 3.2, 0.03, 0.02, rail);
    box('pit-apron', { x, z: -11 }, 0.19, 3.5, 0.035, 4.8, dark);
  }
  label('pit-fascia', 'ROADSTER  /  RACE', 17, 1.45, { x: -10, z: -9.82 }, 4.65);
  // Gantry spans the full runoff; its inner support is inside the protected island.
  for (const z of [-12, -48]) box('gantry-column', { x: -18, z }, 3.5, 0.7, 7, 0.7, dark);
  box('start-gantry', { x: -18, z: -30 }, 6.8, 0.8, 0.65, 36.5, dark);
  label('start-gantry-sign', 'COASTAL  LAUNCH', 12, 1.3, { x: -18.45, z: -30 }, 6.6, Math.PI / 2);
  for (let i = 0; i < 5; i++) box('start-light', { x: -18.5, z: -27 + i * 1.2 }, 5.6, 0.18, 0.38, 0.38, red);
  // Tire stacks and braking markers on the inside of the wall, not in usable runoff.
  for (let i = 0; i < 12; i++) {
    const tire = MeshBuilder.CreateTorus('tire-barrier', { diameter: 0.75, thickness: 0.28, tessellation: 8 }, scene); tire.position.set(25 + i * 0.9, 0.35, -15); tire.material = i % 4 < 2 ? dark : white;
  }
  label('braking-marker', 'BRAKE  /  01', 5, 0.85, { x: 29, z: -15.5 }, 1.5);
  // Layered coastal planting outside the entire driving corridor.
  for (let i = 0; i < 46; i++) {
    const a = i * 2.39996, p = { x: Math.cos(a) * (70 + i % 9), z: Math.sin(a) * (48 + i % 10) };
    if (projectToPolyline(p, track.centerline, track.distances).distance < 20 || p.z > 47 && p.x > -32 && p.x < 4) continue;
    const mound = MeshBuilder.CreateSphere('coastal-bank', { diameter: 4 + i % 4, segments: 5 }, scene); mound.position.set(p.x, -0.5, p.z); mound.scaling.set(1.6, 0.45, 1.1); mound.material = grass;
    const stem = MeshBuilder.CreateCylinder('coastal-tree-trunk', { height: 3.5, diameterTop: 0.17, diameterBottom: 0.5, tessellation: 6 }, scene); stem.position.set(p.x, 1.4, p.z); stem.rotation.z = 0.15; stem.material = materials.get('trunk')!;
    for (let j = 0; j < 3; j++) { const crown = MeshBuilder.CreateSphere('windswept-tree', { diameter: 2.1 + i % 3 * 0.4, segments: 5 }, scene); crown.position.set(p.x + Math.cos(j * 2.4) * 0.9 - 0.3, 3 + j * 0.25, p.z + Math.sin(j * 2.4) * 0.9); crown.scaling.set(1.2, 0.9, 1); crown.material = j % 2 ? leaf : leafLight; }
  }
}
