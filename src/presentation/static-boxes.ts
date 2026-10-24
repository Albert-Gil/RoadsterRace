import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';

const corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const faces=[{v:[0,3,2,1],n:[0,0,-1]},{v:[4,5,6,7],n:[0,0,1]},{v:[0,4,7,3],n:[-1,0,0]},
 {v:[1,2,6,5],n:[1,0,0]},{v:[3,7,6,2],n:[0,1,0]},{v:[0,1,5,4],n:[0,-1,0]}];
/** Build thousands of static facade details directly into material buckets.
 * Avoid thousands of scene nodes/world-matrix allocations before the final scenery merge.
 */
export class StaticBoxes {
 private groups=new Map<StandardMaterial,{positions:number[];normals:number[];uvs:number[];indices:number[]}>();
 add(x:number,y:number,z:number,w:number,h:number,d:number,material:StandardMaterial){
  let g=this.groups.get(material);if(!g){g={positions:[],normals:[],uvs:[],indices:[]};this.groups.set(material,g);}
  for(const face of faces){const base=g.positions.length/3;
   for(const index of face.v){const c=corners[index];g.positions.push(x+c[0]*w/2,y+c[1]*h/2,z+c[2]*d/2);g.normals.push(...face.n);}
   g.uvs.push(0,0,1,0,1,1,0,1);g.indices.push(base,base+1,base+2,base,base+2,base+3);
  }
 }
 build(scene:Scene,prefix:string){
  for(const [material,g] of this.groups){const data=new VertexData();data.positions=g.positions;data.normals=g.normals;data.uvs=g.uvs;data.indices=g.indices;
   const mesh=new Mesh(`${prefix}-${material.name}`,scene);data.applyToMesh(mesh);mesh.material=material;
  }
  this.groups.clear();
 }
}
