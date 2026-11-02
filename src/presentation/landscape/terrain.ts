import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { terrainArrays, terrainHeightAt, type TerrainArrays, type TerrainSpec } from './terrain-fields';

export * from './terrain-fields';

/** A terrain mesh from its arrays (built here or in a scenery worker). */
export function terrainMesh(name: string, scene: Scene, arrays: TerrainArrays, material: StandardMaterial) {
  const data = new VertexData(); data.positions = arrays.positions; data.normals = arrays.normals; data.colors = arrays.colors; data.uvs = arrays.uvs; data.indices = arrays.indices;
  const mesh = new Mesh(name, scene); data.applyToMesh(mesh); mesh.material = material; mesh.isPickable = false; mesh.receiveShadows = true;
  return mesh;
}

/** One heightfield mesh for the land around a circuit (terrainArrays, then terrainMesh). */
export function buildTerrain(name: string, scene: Scene, spec: TerrainSpec, material: StandardMaterial, skirt = 1200) {
  const arrays = terrainArrays(spec, skirt);
  return { mesh: terrainMesh(name, scene, arrays, material), heightAt: terrainHeightAt(arrays, spec.extent, spec.cell) };
}
