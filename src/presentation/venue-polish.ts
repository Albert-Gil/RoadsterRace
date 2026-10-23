import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { insideBarrier } from '../core/barriers';
import { cumulative, projectToPolyline } from '../core/geometry';
import type { TrackDefinition } from '../core/types';
import type { SceneryId } from '../content/circuits';
import type { PresentationTheme } from './themes';
import { surfaceTexture } from './textures';

/** Original architectural and landscape details, batched with existing materials.
 * Solid props stay on existing rooftops or within protected, barrier-clear islands.
 * This pass cannot change the road, supports, collision data or camera bounds.
 */
export function finishVenue(id: SceneryId, scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>) {
  const concrete = materials.get('barrier-concrete')!, metal = materials.get('galvanized-rail')!;
  const dark = materials.get('architecture-trim')!, white = materials.get('architecture')!;
  const glass = materials.get('architecture-glass')!, accent = materials.get('race-red')!;
  const leaf = materials.get('foliage')!, lightLeaf = materials.get('foliageLight')!;
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, mat: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z); mesh.material = mat; return mesh;
  };
  const original = [...scene.meshes];
  for (const mesh of original) mesh.computeWorldMatrix(true);
  // Reflected Santa Monica parents are resolved before authoring these world-space details.
  const buildings = original.filter(m => /(?:-body|hangar|pavilion|mission-control|pastel-shop|beachfront-hotel)$/.test(m.name));
  const roofs = original.filter(m => /(?:-roof|floating-roof|hotel-roofline|shop-cornice)$/.test(m.name));
  for (const roof of roofs) {
    const b = roof.getBoundingInfo().boundingBox, a = b.minimumWorld, z = b.maximumWorld;
    const w = z.x - a.x, d = z.z - a.z, x = (a.x + z.x) / 2, cz = (a.z + z.z) / 2, y = z.y;
    if (w < 3 || d < 3) continue;
    for (const side of [-1, 1]) {
      box('roof-parapet', x, y + 0.13, cz + side * (d / 2 - 0.13), w, 0.26, 0.14, white);
      box('roof-parapet', x + side * (w / 2 - 0.13), y + 0.13, cz, 0.14, 0.26, d, white);
    }
    const n = Math.max(1, Math.min(5, Math.floor(w / 5)));
    for (let i = 0; i < n; i++) {
      const px = x + (i - (n - 1) / 2) * 3.3;
      box('rooftop-service-unit', px, y + 0.36, cz + d * 0.2, 1.25, 0.65, 1.1, metal);
      for (let k = 0; k < 4; k++) box('rooftop-vent-grille', px - 0.43 + k * 0.28, y + 0.7, cz + d * 0.2, 0.07, 0.035, 0.82, dark);
      if (id === 'spaceport' || id === 'coastal') {
        const panel = box('framed-solar-cell', px, y + 0.12, cz - d * 0.2, 2.7, 0.1, Math.min(2, d * 0.3), glass);
        panel.rotation.x = 0.08;
        for (let k = 0; k < 4; k++) box('solar-cell-divider', px - 1.05 + k * 0.7, y + 0.2, cz - d * 0.2, 0.025, 0.015, Math.min(2, d * 0.3), metal);
      }
    }
  }
  // Layered planting beds in the unused portion of protected islands.
  for (const barrier of track.barriers) {
    if (barrier.kind && barrier.kind !== 'infield' || /gantry|grandstand/.test(barrier.id)) continue;
    const p = barrier.footprint, x0 = Math.min(...p.map(p => p.x)), x1 = Math.max(...p.map(p => p.x));
    const z0 = Math.min(...p.map(p => p.z)), z1 = Math.max(...p.map(p => p.z));
    if ((x1 - x0) * (z1 - z0) < 70) continue;
    const edge = [...p, p[0]], edgeDistances = cumulative(edge);
    let count = 0;
    for (let x = x0 + 3; x < x1 - 2; x += 5.5) for (let z = z0 + 3; z < z1 - 2; z += 5.5) {
      const point = { x, z };
      if (count >= 18 || !insideBarrier(point, barrier) || projectToPolyline(point, edge, edgeDistances).distance < 2.3) continue;
      if (projectToPolyline(point, track.centerline, track.distances).distance < track.roadWidth / 2 + 5) continue;
      if (buildings.some(m => { const b = m.getBoundingInfo().boundingBox; return x > b.minimumWorld.x - 2.2 && x < b.maximumWorld.x + 2.2 && z > b.minimumWorld.z - 2.2 && z < b.maximumWorld.z + 2.2; })) continue;
      if (id !== 'spaceport') box('garden-turf-inset', x, 0.19, z, 4.4, 0.025, 4.4, leaf);
      box('landscaped-planter-base', x, 0.26, z, 3.4, 0.5, 2.4, concrete);
      box('planter-soil', x, 0.52, z, 3.1, 0.04, 2.1, dark);
      for (let k = 0; k < 3; k++) {
        const shrub = MeshBuilder.CreateSphere('clipped-venue-shrub', { diameter: 1.3, segments: 5 }, scene);
        shrub.position.set(x - 1 + k, 1.05, z); shrub.scaling.set(1, 0.75 + k % 2 * 0.25, 0.85); shrub.material = k % 2 ? lightLeaf : leaf;
      }
      if (count % 3 === 0 && id !== 'spaceport') {
        box('garden-bench-seat', x, 0.65, z + 1.65, 2.4, 0.13, 0.46, white);
        for (const side of [-1, 1]) box('garden-bench-leg', x + side * 0.85, 0.4, z + 1.65, 0.12, 0.5, 0.4, dark);
      }
      count++;
    }
  }
  if (id === 'spaceport') {
    // Launch-pad service details sit within the existing protected launch complex.
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const block = box('launch-pad-hazard-marker', 97 + Math.cos(a) * 7.9, 0.38, 20 + Math.sin(a) * 7.9, 0.22, 0.04, 1.3, i % 2 ? white : accent); block.rotation.y = -a;
    }
    for (const x of [-18, -19, -23]) for (let y = 1; y <= 3; y++) box('utility-tank-service-band', x, y, x === -18 ? 26 : x === -19 ? 32 : 29, 2.84, 0.08, 2.84, metal);
  }
  if (id === 'coastal') {
    for (let row = 0; row < 5; row++) for (let seat = 0; seat < 18; seat++) {
      if ((seat + row * 3) % 5 === 0) continue;
      const x = -25 + seat * 1.3, z = 54 + row * 1.55, y = 0.9 + row * 0.8;
      box('grandstand-spectator-shirt', x, y + 0.35, z, 0.4, 0.55, 0.3, [white, dark, accent, glass][(row + seat) % 4]);
      const head = MeshBuilder.CreateSphere('grandstand-spectator-head', { diameter: 0.3, segments: 4 }, scene);
      head.position.set(x, y + 0.77, z); head.material = concrete;
    }
  }
  const wood = materials.get('pier-timber');
  if (wood) { const texture = surfaceTexture(scene, 'timber'); texture.uScale = texture.vScale = 0.5; wood.diffuseTexture = texture; }
  concrete.diffuseTexture = surfaceTexture(scene, 'concrete');
  const water = materials.get('water');
  if (water) {
    if (!water.diffuseTexture) { const texture = surfaceTexture(scene, 'water'); texture.uScale = texture.vScale = 160; water.diffuseTexture = texture; }
    water.disableLighting = false; water.emissiveColor.setAll(0);
    water.specularColor = Color3.FromHexString(theme.scene.foam).scale(0.25); water.specularPower = 96;
  }
}
