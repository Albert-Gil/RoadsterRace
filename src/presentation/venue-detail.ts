import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { SceneryId } from '../content/circuits';
import { venueDetail } from './themes';

/** Architectural dressing is attached to existing protected structures, never the runoff.
 * Reuse the venue's materials so the scene's static batching adds no draw calls.
 */
export function dressVenue(id: SceneryId, scene: Scene, materials: Map<string, StandardMaterial>) {
  const white = materials.get('architecture')!;
  const dark = materials.get('architecture-trim')!;
  const metal = materials.get('galvanized-rail')!;
  const glass = materials.get('architecture-glass')!;
  const accent = materials.get(id === 'sunset' ? 'sunset-coral' : 'race-red')!;
  const box = (name: string, p: Vector3, w: number, h: number, d: number, mat: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    mesh.position.copyFrom(p); mesh.material = mat; return mesh;
  };
  const beam = (name: string, a: Vector3, b: Vector3, radius: number, mat: StandardMaterial) => {
    const mesh = MeshBuilder.CreateTube(name, { path: [a, b], radius, tessellation: 5, cap: 3 }, scene);
    mesh.material = mat;
  };
  const original = [...scene.meshes];
  for (const mesh of original) mesh.computeWorldMatrix(true);
  for (const mesh of original) {
    const bounds = mesh.getBoundingInfo().boundingBox;
    const lo = bounds.minimumWorld, hi = bounds.maximumWorld;
    const center = lo.add(hi).scale(.5), width = hi.x - lo.x, depth = hi.z - lo.z;
    if (/(?:-body|pastel-shop|beachfront-hotel|mission-control)$/.test(mesh.name) && width > 4 && depth > 4) {
      // Upper facade floor bands, recessed-looking vertical window mullions and roof drainage.
      for (let y = lo.y + 2.5; y < hi.y - .4; y += venueDetail.floorSpacing) {
        for (const z of [lo.z - .035, hi.z + .035]) {
          box('facade-string-course', new Vector3(center.x, y, z), width + .08, .1, .09, white);
          for (let x = lo.x + 1; x < hi.x - .7; x += 1.5)
            box('facade-window-mullion', new Vector3(x, y - .55, z + (z < center.z ? -.04 : .04)), .055, .9, .06, metal);
        }
      }
      for (const x of [lo.x + .18, hi.x - .18]) {
        box('building-drainpipe', new Vector3(x, center.y, hi.z + .07), .09, hi.y - lo.y, .09, metal);
      }
      if (id === 'bay' || id === 'sunset') {
        // Bounded rooftop pergola: a recognisable silhouette without enlarging the footprint.
        const w = Math.min(4, width * .5), d = Math.min(3, depth * .5);
        for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2])
          box('roof-terrace-post', new Vector3(center.x + x, hi.y + .9, center.z + z), .1, 1.8, .1, dark);
        for (let x = -w / 2; x <= w / 2; x += .45)
          box('roof-terrace-slat', new Vector3(center.x + x, hi.y + 1.8, center.z), .15, .12, d + .25, white);
      }
    }
    if (mesh.name === 'assembly-hangar') {
      // Ribbed sheet metal and a service catwalk along the existing hangar face.
      for (let x = lo.x + .5; x < hi.x; x += .9)
        box('hangar-standing-seam', new Vector3(x, center.y, hi.z + .04), .065, hi.y - lo.y - .2, .08, metal);
      box('hangar-service-catwalk', new Vector3(center.x, hi.y - 1, hi.z + .12), width, .14, .38, dark);
      for (let x = lo.x; x <= hi.x; x += 2)
        box('hangar-catwalk-stanchion', new Vector3(x, hi.y - .5, hi.z + .26), .055, 1, .055, metal);
      box('hangar-catwalk-rail', new Vector3(center.x, hi.y, hi.z + .26), width, .06, .06, metal);
    }
    if (mesh.name === 'utility-tank') {
      for (const x of [-.36, .36]) box('tank-ladder-stringer', new Vector3(center.x + x, center.y, lo.z - .08), .07, hi.y - lo.y, .07, dark);
      for (let y = lo.y + .3; y < hi.y; y += .35)
        box('tank-ladder-rung', new Vector3(center.x, y, lo.z - .08), .72, .055, .07, metal);
    }
    if (mesh.name === 'bridge-tower-leg') {
      // Recessed tower panels and horizontal stiffeners sit on the tower itself.
      for (let y = 1.4; y < hi.y - 1; y += 2.2) {
        box('bridge-tower-recess', new Vector3(center.x, y, lo.z - .025), width * .5, 1.55, .04, dark);
        box('bridge-tower-stiffener', new Vector3(center.x, y + .85, center.z), width + .1, .1, depth + .1, accent);
      }
    }
    if (mesh.name === 'pier-pile' || mesh.name === 'amusement-pile') {
      for (const y of [hi.y - .35, lo.y + .5])
        box('pier-pile-steel-collar', new Vector3(center.x, y, center.z), width + .09, .13, depth + .09, metal);
      // Brackets terminate beneath the supported deck, never across the water opening.
      beam('pier-pile-knee-brace', new Vector3(center.x, hi.y - 1.1, center.z), new Vector3(center.x + .55, hi.y, center.z), .08, dark);
    }
    if (mesh.name === 'pit-roller-door') {
      box('pit-service-light', new Vector3(center.x, hi.y + .12, lo.z - .06), width * .6, .1, .12, white);
      box('pit-door-window', new Vector3(center.x, hi.y - .5, lo.z - .05), width * .7, .3, .05, glass);
    }
    if (mesh.name === 'grandstand-canopy') {
      for (let x = lo.x + 1; x < hi.x; x += 1.8) {
        const rib = box('canopy-standing-seam', new Vector3(x, mesh.position.y + .15, center.z), .07, .08, depth - .3, metal);
        rib.rotation.x = mesh.rotation.x;
      }
    }
    if (mesh.name === 'rocket-body') {
      for (let y = lo.y + .7; y < hi.y; y += 1.3) {
        const ring = MeshBuilder.CreateTorus('rocket-panel-joint', { diameter: width + .015, thickness: .035, tessellation: 20 }, scene);
        ring.position.set(center.x, y, center.z); ring.material = dark;
      }
    }
  }
}
