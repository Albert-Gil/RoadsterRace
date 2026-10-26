import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { assetUrl } from './urls';

/**
 * Third-party scenery props (CC0 Kenney models, see docs/ASSET_RIGHTS.md), baked by
 * `node tools/bake-props.mjs` into one vertex-coloured file per venue. Every prop shares one
 * plain material, so a venue's props batch into a single mesh and draw call.
 */
export interface PropModel { positions: Float32Array; normals: Float32Array; colors: Float32Array; indices: Uint16Array; min: number[]; max: number[] }
export type PropLibrary = ReadonlyMap<string, PropModel>;

/** A prop instance: world position of the model origin (its base), heading as elsewhere in the game (0 = +z). */
export interface PropPlacement { key: string; x: number; y: number; z: number; heading?: number; scale?: number; roll?: number }
/** An axis-aligned coloured box in a prop's local frame, for simple structures (pontoons, pilings). */
export interface PropBox { x: number; y: number; z: number; width: number; height: number; depth: number; color: string; heading?: number }

interface Header { models: Record<string, { vertexStart: number; vertexCount: number; indexStart: number; indexCount: number; min: number[]; max: number[] }>; layout: Record<'positions' | 'indices' | 'normals' | 'colors', [number, number]> }

const libraries = new Map<string, Promise<PropLibrary>>();
export function parseProps(buffer: ArrayBuffer): PropLibrary {
  const headerBytes = new DataView(buffer).getUint32(0, true), header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, headerBytes))) as Header;
  const body = 4 + headerBytes, slice = (part: keyof Header['layout']) => buffer.slice(body + header.layout[part][0], body + header.layout[part][0] + header.layout[part][1]);
  const positions = new Int16Array(slice('positions')), indices = new Uint16Array(slice('indices')), normals = new Int8Array(slice('normals')), colors = new Uint8Array(slice('colors'));
  const library = new Map<string, PropModel>();
  for (const [key, m] of Object.entries(header.models)) {
    const model: PropModel = { positions: new Float32Array(m.vertexCount * 3), normals: new Float32Array(m.vertexCount * 3), colors: new Float32Array(m.vertexCount * 4), indices: indices.slice(m.indexStart, m.indexStart + m.indexCount), min: m.min, max: m.max };
    for (let i = 0; i < m.vertexCount; i++) for (let k = 0; k < 3; k++) {
      const source = (m.vertexStart + i) * 3 + k;
      model.positions[i * 3 + k] = m.min[k] + (positions[source] + 32768) / 65535 * (m.max[k] - m.min[k]);
      model.normals[i * 3 + k] = normals[source] / 127;
      model.colors[i * 4 + k] = colors[source] / 255; model.colors[i * 4 + 3] = 1;
    }
    library.set(key, model);
  }
  return library;
}
export function loadProps(venue: string): Promise<PropLibrary> {
  let library = libraries.get(venue);
  if (!library) {
    library = fetch(assetUrl(`assets/models/${venue}-props.bin`)).then(response => { if (!response.ok) throw new Error(`${venue} props: HTTP ${response.status}`); return response.arrayBuffer(); }).then(parseProps);
    library.catch(() => libraries.delete(venue)); libraries.set(venue, library);
  }
  return library;
}

/** One merged vertex-coloured geometry for many placements and boxes, transformed on the CPU once. */
export function propVertexData(library: PropLibrary, placements: readonly PropPlacement[], boxes: readonly PropBox[] = []): VertexData {
  let vertices = 0, triangles = 0;
  const used = placements.map(p => { const model = library.get(p.key); if (!model) throw new Error(`Unknown prop ${p.key}`); vertices += model.positions.length / 3; triangles += model.indices.length; return model; });
  vertices += boxes.length * 24; triangles += boxes.length * 36;
  const positions = new Float32Array(vertices * 3), normals = new Float32Array(vertices * 3), colors = new Float32Array(vertices * 4), indices = new Uint32Array(triangles);
  let v = 0, t = 0;
  const transform = (x: number, y: number, z: number, p: { x: number; y: number; z: number; heading?: number; scale?: number; roll?: number }, normal = false) => {
    const s = normal ? 1 : p.scale ?? 1, h = p.heading ?? 0, r = p.roll ?? 0;
    // Roll about the local forward (z) axis, then heading about y (0 = +z, as the game's headings).
    const rx = x * Math.cos(r) - y * Math.sin(r), ry = x * Math.sin(r) + y * Math.cos(r);
    const wx = (rx * Math.cos(h) + z * Math.sin(h)) * s, wy = ry * s, wz = (-rx * Math.sin(h) + z * Math.cos(h)) * s;
    return normal ? [wx, wy, wz] : [wx + p.x, wy + p.y, wz + p.z];
  };
  placements.forEach((p, n) => {
    const model = used[n], count = model.positions.length / 3;
    for (let i = 0; i < count; i++) {
      positions.set(transform(model.positions[i * 3], model.positions[i * 3 + 1], model.positions[i * 3 + 2], p), (v + i) * 3);
      normals.set(transform(model.normals[i * 3], model.normals[i * 3 + 1], model.normals[i * 3 + 2], p, true), (v + i) * 3);
    }
    colors.set(model.colors, v * 4);
    for (let i = 0; i < model.indices.length; i++) indices[t + i] = model.indices[i] + v;
    v += count; t += model.indices.length;
  });
  for (const b of boxes) {
    const box = VertexData.CreateBox({ width: b.width, height: b.height, depth: b.depth }), color = Color3.FromHexString(b.color);
    const at = { x: b.x, y: b.y, z: b.z, heading: b.heading };
    for (let i = 0; i < 24; i++) {
      positions.set(transform(box.positions![i * 3], box.positions![i * 3 + 1], box.positions![i * 3 + 2], at), (v + i) * 3);
      normals.set(transform(box.normals![i * 3], box.normals![i * 3 + 1], box.normals![i * 3 + 2], at, true), (v + i) * 3);
      colors.set([color.r, color.g, color.b, 1], (v + i) * 4);
    }
    for (let i = 0; i < 36; i++) indices[t + i] = box.indices![i] + v;
    v += 24; t += 36;
  }
  const data = new VertexData(); data.positions = positions; data.normals = normals; data.colors = colors; data.indices = indices;
  return data;
}

/** The shared plain material: colour comes from the baked vertex colours. */
export function propMaterial(scene: Scene, name = 'kenney-props') {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.White(); material.specularColor.setAll(0.06); material.emissiveColor.setAll(0.04);
  return material;
}
export function propMesh(name: string, scene: Scene, data: VertexData, material: StandardMaterial) {
  const mesh = new Mesh(name, scene); data.applyToMesh(mesh); mesh.material = material; mesh.isPickable = false;
  return mesh;
}
