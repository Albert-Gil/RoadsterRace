import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { loadProps, propMaterial, propMesh, propVertexData, type PropBox, type PropPlacement } from './props';
import { newportHarbour } from './themes';

/**
 * Newport harbour dressing around the coastal island: marina piers off the beach with boats
 * berthed, a mooring field in the shallows, Lido-style islets with beach houses, and a few boats
 * under way. Everything is in the water beyond the island's shore, at least 12 m beyond the road
 * edge and mostly at the edge of the fixed camera. None of it has collision: as before, Newport's
 * sea is not a physical surface (a line drawn into it is still driven as sand).
 * Props are CC0 Kenney models (docs/ASSET_RIGHTS.md); islet ground reuses the venue's materials.
 */
export interface Harbour { shadowCasters: Promise<AbstractMesh[]>; update(time: number, reducedMotion: boolean): void }

const ISLAND = { x: 85, z: 62 };
/** A point on the island's ellipse; ring 1 is the shore, 1.25 the outer edge of its shallow shelf. */
const ellipse = (angle: number, ring: number) => ({ x: Math.cos(angle) * ISLAND.x * ring, z: Math.sin(angle) * ISLAND.z * ring });
/** Island-relative ring of a point (1 = shore, 1.25 = outer edge of the shallow shelf). */
export const harbourRing = (x: number, z: number) => Math.hypot(x / ISLAND.x, z / ISLAND.z);
/** Heading (0 = +z) straight out to sea from the shore at an ellipse angle. */
const seaward = (angle: number) => Math.atan2(Math.cos(angle) / ISLAND.x, Math.sin(angle) / ISLAND.z);
/** Hull lengths of the Kenney boats in model units, for spacing berths before the models load. */
const HULL: Record<string, number> = { 'boat-sail-a': 3.8, 'boat-sail-b': 4.1, 'boat-speed-a': 3.4, 'boat-speed-b': 3.3, 'boat-speed-c': 3.2, 'boat-speed-g': 3.8, 'boat-speed-i': 3.9, 'boat-fishing-small': 3.9, 'boat-house-b': 5.6, 'boat-row-small': 2.4 };
const random = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface IsletShape { angle: number; center: { x: number; z: number }; tangent: number; length: number; width: number; top: number }

/** Where every harbour prop, pier box and islet goes (pure; no rendering). */
export function newportLayout(water: number, palms: readonly PropPlacement[] = []) {
  const H = newportHarbour, placements: PropPlacement[] = [...palms], boxes: PropBox[] = [], islets: IsletShape[] = [], rand = random(H.seed);
  const boat = (key: string, x: number, z: number, heading: number) => { const scale = H.boatScale * (key.startsWith('boat-sail') ? 1.1 : 1); placements.push({ key, x, y: water - H.draft * scale, z, heading, scale }); };
  const forward = (p: { x: number; z: number }, heading: number, along: number, across = 0) => ({ x: p.x + Math.sin(heading) * along + Math.cos(heading) * across, z: p.z + Math.cos(heading) * along - Math.sin(heading) * across });

  // ---- Marina piers off the beach, boats berthed along both sides.
  const deck = water + 0.34;
  for (const pier of H.piers) {
    const heading = seaward(pier.angle), start = ellipse(pier.angle, 0.985), d = H.dock;
    // Berths alternate sides, end to end from the shore; the pier runs just past the last one.
    const cursor = [H.berthStart, H.berthStart], berths = pier.boats.map((key, i) => {
      const side = i % 2, length = (HULL[key] ?? 4) * H.boatScale * (key.startsWith('boat-sail') ? 1.1 : 1), along = cursor[side] + length / 2;
      cursor[side] += length + H.berthGap; return { key, side: side ? 1 : -1, along, reversed: i % 3 === 2 };
    });
    const length = Math.max(...cursor) + 0.5, sections = Math.round(length / 3.2);
    for (let k = 0; k < sections; k++) { const p = forward(start, heading, (k + 0.5) * length / sections); boxes.push({ x: p.x, y: deck, z: p.z, width: d.width, height: 0.2, depth: length / sections - 0.12, color: d.deck, heading }); }
    for (let k = 1; k <= sections; k++) for (const side of [-1, 1]) {
      const p = forward(start, heading, k * length / sections - 0.2, side * (d.width / 2 - 0.15));
      boxes.push({ x: p.x, y: water + 0.25, z: p.z, width: 0.28, height: 1.1, depth: 0.28, color: d.piling, heading });
    }
    for (const b of berths) { const p = forward(start, heading, b.along, b.side * (d.width / 2 + H.berthGap + 2.1)); boat(b.key, p.x, p.z, heading + (b.reversed ? Math.PI : 0) + (rand() - 0.5) * 0.06); }
  }

  // ---- Lido-style islets: low sandy islands with beach houses and private docks.
  for (const islet of H.islets) {
    // Local x runs along the shore (the island's tangent), local z across it.
    const c = ellipse(islet.angle, islet.ring), tangent = Math.atan2(-Math.cos(islet.angle) * ISLAND.z, -Math.sin(islet.angle) * ISLAND.x), top = water + 0.42;
    const local = (lx: number, lz: number) => isletPoint({ center: c, tangent }, lx, lz);
    islets.push({ angle: islet.angle, center: c, tangent, length: islet.length, width: islet.width, top });
    // Beach houses facing the channel, each with a private dock and boat on the channel side.
    const towardIsland = Math.atan2(-c.x, -c.z), side = Math.sin(tangent) * -c.x + Math.cos(tangent) * -c.z > 0 ? 1 : -1;
    islet.houses.forEach((key, i) => {
      const lx = (i - (islet.houses.length - 1) / 2) * islet.length * 0.27, house = local(lx, -side * islet.width * 0.06);
      placements.push({ key, x: house.x, y: top, z: house.z, heading: towardIsland + (rand() - 0.5) * 0.16, scale: H.houseScale });
      const dockStart = local(lx + 2.5, side * islet.width * 0.4), dockHeading = towardIsland, length = H.dock.length;
      boxes.push({ ...forward(dockStart, dockHeading, length / 2), y: water + 0.34, width: H.dock.width, height: 0.2, depth: length, color: H.dock.deck, heading: dockHeading });
      for (const s of [-1, 1]) boxes.push({ ...forward(dockStart, dockHeading, length - 0.2, s * (H.dock.width / 2 - 0.15)), y: water + 0.25, width: 0.28, height: 1.1, depth: 0.28, color: H.dock.piling, heading: dockHeading });
      // Every boat lies on the same side of its dock, so neighbouring berths never meet.
      const berth = forward(dockStart, dockHeading, length * 0.55, H.dock.width / 2 + 2.4);
      boat(islet.boats[i % islet.boats.length], berth.x, berth.z, dockHeading + (i % 2 ? Math.PI : 0));
    });
    islet.palms.forEach((offset, k) => {
      const p = local(offset * islet.length / 2, side * islet.width * 0.2);
      placements.push({ key: k % 2 ? 'palm-detailed-straight' : 'palm-detailed-bend', x: p.x, y: top, z: p.z, heading: rand() * 6.28, scale: H.palmScale });
    });
  }

  // ---- Mooring field in the shallows between the piers; boats swing to the same breeze.
  const clear = (angle: number) => H.piers.every(p => Math.abs(wrap(angle - p.angle)) > H.moorings.pierClearance) && H.islets.every(i => Math.abs(wrap(angle - i.angle)) > H.moorings.isletClearance) && H.moorings.avoid.every(([a, b]) => wrap(angle - a) < 0 || wrap(angle - b) > 0);
  let n = 0;
  for (let angle = 0; angle < Math.PI * 2; angle += H.moorings.step) {
    if (!clear(angle)) continue;
    const ring = H.moorings.rings[n % H.moorings.rings.length] + (rand() - 0.5) * 0.02, p = ellipse(angle + (rand() - 0.5) * 0.04, ring);
    boat(H.moorings.boats[n++ % H.moorings.boats.length], p.x, p.z, H.breeze + (rand() - 0.5) * 0.35);
  }
  for (let angle = H.buoys.offset, i = 0; angle < Math.PI * 2 + H.buoys.offset; angle += H.buoys.step, i++) {
    const p = ellipse(angle, H.buoys.ring); placements.push({ key: i % 2 ? 'buoy-flag' : 'buoy', x: p.x, y: water - 0.45, z: p.z, heading: rand() * 6.28, scale: 1.3 });
  }
  return { placements, boxes, islets };
}
const isletPoint = (islet: { center: { x: number; z: number }; tangent: number }, lx: number, lz: number) => ({ x: islet.center.x + lx * Math.cos(islet.tangent) + lz * Math.sin(islet.tangent), z: islet.center.z - lx * Math.sin(islet.tangent) + lz * Math.cos(islet.tangent) });

export function buildNewportHarbour(scene: Scene, materials: Map<string, StandardMaterial>, palms: PropPlacement[], water: number): Harbour {
  const H = newportHarbour, { placements, boxes, islets } = newportLayout(water, palms);
  // Islet ground reuses the island's materials, so it batches with the island's own bands.
  const terrain = materials.get('terrain')!, wetSand = materials.get('wet-sand')!, shallows = materials.get('shallows')!;
  for (const islet of islets) {
    const ring = (scale: number, y: number) => Array.from({ length: 49 }, (_, i) => {
      const a = i / 48 * Math.PI * 2, wobble = 1 + 0.05 * Math.sin(3 * a + islet.angle * 5) + 0.03 * Math.cos(5 * a);
      const p = isletPoint(islet, Math.cos(a) * islet.length / 2 * scale * wobble, Math.sin(a) * islet.width / 2 * scale * wobble); return new Vector3(p.x, y, p.z);
    });
    const band = (name: string, inner: number, outer: number, y1: number, y2: number, material: StandardMaterial, fade = false) => {
      const mesh = MeshBuilder.CreateRibbon(name, { pathArray: [ring(inner, y1), ring(outer, y2)], sideOrientation: Mesh.FRONTSIDE }, scene); mesh.material = material;
      mesh.setVerticesData(VertexBuffer.NormalKind, Array.from({ length: 98 }, () => [0, 1, 0]).flat());
      if (fade) { mesh.setVerticesData(VertexBuffer.ColorKind, [0.95, 0].flatMap(alpha => Array.from({ length: 49 }, () => [1, 1, 1, alpha]).flat())); mesh.hasVertexAlpha = true; }
    };
    band('islet-shelf', 1.0, 1.45, water + 0.2, water + 0.04, shallows, true);
    band('islet-wet-sand', 0.88, 1.02, islet.top - 0.02, water + 0.18, wetSand);
    band('islet-sand', 0, 0.9, islet.top, islet.top, terrain);
  }

  // ---- Boats under way circle the island beyond the moorings (presentation only).
  const underWay: { mesh: Mesh; ring: number; speed: number; phase: number; scale: number }[] = [];
  let resolve: (meshes: AbstractMesh[]) => void = () => {};
  const shadowCasters = new Promise<AbstractMesh[]>(r => { resolve = r; });
  const pending = { props: 'newport' }; scene.addPendingData(pending);
  void loadProps('newport').then(library => {
    if (scene.isDisposed) return resolve([]);
    const material = propMaterial(scene, 'newport-props'), mesh = propMesh('newport-harbour-props', scene, propVertexData(library, placements, boxes), material);
    mesh.receiveShadows = true; mesh.freezeWorldMatrix();
    for (const [i, b] of H.underWay.entries()) {
      const moving = propMesh(`newport-boat-under-way-${i}`, scene, propVertexData(library, [{ key: b.key, x: 0, y: 0, z: 0, scale: H.boatScale }]), material);
      moving.metadata = { dynamicScenery: true }; underWay.push({ mesh: moving, ring: b.ring, speed: b.speed, phase: b.phase, scale: H.boatScale });
    }
    update(0, false); resolve([mesh]);
  }).catch(error => { console.warn('Newport harbour props unavailable:', error); resolve([]); }).finally(() => scene.removePendingData(pending));

  function update(time: number, reducedMotion: boolean) {
    const t = reducedMotion ? 0 : time;
    for (const b of underWay) {
      const perimeter = Math.PI * 2 * Math.sqrt(((ISLAND.x * b.ring) ** 2 + (ISLAND.z * b.ring) ** 2) / 2), angle = b.phase + t * b.speed / perimeter * Math.PI * 2;
      const p = ellipse(angle, b.ring), ahead = ellipse(angle + 0.01, b.ring);
      b.mesh.position.set(p.x, water - H.draft * b.scale + (reducedMotion ? 0 : Math.sin(time * 1.3 + b.phase) * 0.05), p.z);
      b.mesh.rotation.set(0, Math.atan2(ahead.x - p.x, ahead.z - p.z), reducedMotion ? 0 : Math.sin(time * 0.9 + b.phase * 2) * 0.03);
    }
  }
  return { shadowCasters, update };
}
