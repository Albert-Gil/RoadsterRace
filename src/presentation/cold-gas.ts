import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { hopEffects } from './themes';
import { hopOutlet, type ExhaustPose } from './exhaust-pose';

/** RoadsterLAB-inspired crossed cold-gas sheets. Four jets share one bounded draw. */
export class ColdGas {
  readonly mesh: Mesh;
  private positions = new Float32Array(4 * 3 * 4 * 3);
  constructor(scene: Scene) {
    const data = new VertexData(), indices: number[] = [], colors: number[] = [];
    for (let i = 0; i < 12; i++) {
      const n = i * 4; indices.push(n,n+1,n+2,n,n+2,n+3);
      colors.push(1,1,1,0.7, 1,1,1,0.7, 1,1,1,0.04, 1,1,1,0.04);
    }
    data.positions = this.positions; data.indices = indices; data.colors = colors;
    this.mesh = new Mesh('four-downward-cold-gas-cores', scene); data.applyToMesh(this.mesh, true);
    const material = new StandardMaterial('hop-cold-gas', scene);
    material.emissiveColor = Color3.FromHexString(hopEffects.coreColor); material.disableLighting = true;
    material.backFaceCulling = false; material.disableDepthWrite = true; material.alpha = 0.7;
    this.mesh.material = material; this.mesh.hasVertexAlpha = true; this.mesh.isPickable = false;
    this.mesh.alwaysSelectAsActiveMesh = true; this.mesh.isVisible = false;
  }
  update(p: ExhaustPose, reduced:boolean) {
    this.mesh.isVisible = p.hopAge !== undefined && p.hopAge >= 0 && p.hopAge < hopEffects.pulse;
    if (!this.mesh.isVisible) return;
    hopEffects.mounts.forEach((m,i) => {
      const {x,z,y:top,supportY} = hopOutlet(p,m);
      const bottom=Math.min(top,Math.max(supportY === undefined ? -8 : supportY+0.03, top-2.8));
      for(let plane=0;plane<3;plane++) for(let v=0;v<4;v++) {
        const a=plane*Math.PI/3, low=v>=2, width=low?0.22:0.045;
        const side=v===0||v===3?-1:1, at=(i*12+plane*4+v)*3;
        this.positions[at]=x+Math.cos(a)*width*side;
        this.positions[at+1]=low?bottom:top;
        this.positions[at+2]=z+Math.sin(a)*width*side;
      }
    });
    (this.mesh.material as StandardMaterial).alpha = reduced ? 0.38 : 0.65;
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, this.positions);
  }
}
