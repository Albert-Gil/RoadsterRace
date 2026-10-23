import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { ReplayFrame } from '../core/lap-replay';
import { buildRoadsterGeometry } from './roadster-geometry.js';
import { ghostAppearance } from './themes';

/** One cosmetic mesh, outside vehicle arrays, contacts and sound/effect systems. */
export class LapGhost {
  private mesh:Mesh;
  get visible(){return this.mesh.isEnabled();}
  constructor(scene:Scene){
    const geometry=buildRoadsterGeometry('race'),positions:number[]=[],indices:number[]=[];
    const scale=2.2/2.0201642066907674;
    for(const part of Object.values(geometry.body))for(let i=0;i<part.p.length;i+=3){positions.push(part.p[i+2]*scale,part.p[i+1]*scale,part.p[i]*scale);indices.push(indices.length);}
    const data=new VertexData(),normals:number[]=[];data.positions=positions;data.uvs=new Array(positions.length/3*2).fill(0);data.indices=indices;VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;
    const body=new Mesh('best-lap-body',scene);data.applyToMesh(body);
    const parts=[body];
    for(const x of [-1,1])for(const z of [-1.65,1.65]){const wheel=MeshBuilder.CreateCylinder('ghost-wheel',{diameter:0.72,height:0.23,tessellation:10},scene);wheel.rotation.z=Math.PI/2;wheel.position.set(x,0.36,z);parts.push(wheel);}
    this.mesh=Mesh.MergeMeshes(parts,true,true)!;
    const material=new StandardMaterial('best-lap-ghost',scene);material.diffuseColor=Color3.FromHexString(ghostAppearance.color);material.emissiveColor=material.diffuseColor.scale(0.3);material.alpha=ghostAppearance.opacity;material.backFaceCulling=false;material.disableDepthWrite=true;
    this.mesh.material=material;this.mesh.isPickable=false;this.mesh.receiveShadows=false;this.mesh.setEnabled(false);
  }
  update(pose:ReplayFrame|null){this.mesh.setEnabled(!!pose);if(pose){this.mesh.position.set(pose.x,pose.y,pose.z);this.mesh.rotation.y=pose.heading;}}
}
