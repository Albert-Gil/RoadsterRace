import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { MeshArrays } from './mesh-arrays';

/** A static, shadow-receiving mesh from (worker-generated) arrays. */
export function arraysMesh(name: string, scene: Scene, arrays: MeshArrays, material: StandardMaterial) {
  const mesh = new Mesh(name, scene), v = new VertexData();
  v.positions = arrays.positions; v.normals = arrays.normals; v.colors = arrays.colors; v.uvs = arrays.uvs; v.indices = arrays.indices; v.applyToMesh(mesh);
  mesh.material = material; mesh.isPickable = false; mesh.receiveShadows = true; mesh.freezeWorldMatrix(); return mesh;
}
