import type { Geometry } from './mesh';

/** Vertex arrays for one mesh, transferable from a scenery worker. */
export interface MeshArrays { positions: Float32Array; normals: Float32Array; colors: Float32Array; uvs: Float32Array; indices: Uint32Array | Uint16Array }

/** A Geometry's arrays; UVs repeat every `uvScale` metres in world x/z, or are zero without one. */
export function geometryArrays(g: Geometry, uvScale?: number): MeshArrays {
  const v = g.toVertexData(), uvs = new Float32Array(g.vertexCount * 2);
  if (uvScale) for (let i = 0; i < g.vertexCount; i++) { uvs[i * 2] = g.positions[i * 3] / uvScale; uvs[i * 2 + 1] = g.positions[i * 3 + 2] / uvScale; }
  return { positions: v.positions as Float32Array, normals: v.normals as Float32Array, colors: v.colors as Float32Array, uvs, indices: v.indices as Uint32Array | Uint16Array };
}
/** The buffers behind some mesh arrays, for a postMessage transfer list. */
export const arrayBuffers = (...meshes: MeshArrays[]) => meshes.flatMap(m => [m.positions.buffer, m.normals.buffer, m.colors.buffer, m.uvs.buffer, m.indices.buffer]) as ArrayBuffer[];
