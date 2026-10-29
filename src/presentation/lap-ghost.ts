import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { ReplayFrame } from '../core/lap-replay';
import { buildRoadsterGeometry } from './roadster-geometry.js';
import { ghostAppearance, sceneTuning } from './themes';
import type{TrackDefinition}from'../core/types';
import{groundHeight}from'../core/support';
import{fitVehicleToSurface}from'./vehicle-grounding';
import{snowSurfaceHeight}from'./surface-height';

/** One cosmetic mesh, outside vehicle arrays, contacts and sound/effect systems. */
export class LapGhost {
  private mesh:Mesh;
  private tyreContacts:{x:number;y:number;z:number}[]=[];
  get visible(){return this.mesh.isEnabled();}
  constructor(scene:Scene,private track?:TrackDefinition,private visibleSurface?:(x:number,z:number)=>number|undefined){
    const geometry=buildRoadsterGeometry('race'),positions:number[]=[],indices:number[]=[];
    const scale=2.2/2.0201642066907674;
    for(const part of Object.values(geometry.body))for(let i=0;i<part.p.length;i+=3){positions.push(part.p[i+2]*scale,part.p[i+1]*scale,part.p[i]*scale);indices.push(indices.length);}
    geometry.mounts.forEach((mount,i)=>{for(const side of[-1,1]){
      for(const part of[...Object.values(geometry.wheels[i].spin),...Object.values(geometry.wheels[i].fixed)])for(let j=0;j<part.p.length;j+=9){
        const order=side===1?[0,3,6]:[0,6,3];for(const k of order){positions.push((mount.z+part.p[j+k+2])*side*scale,(mount.y+part.p[j+k+1])*scale,(mount.x+part.p[j+k])*scale);indices.push(indices.length);}
      }
      const visual=scale*sceneTuning.vehicle.racingScale;this.tyreContacts.push({x:mount.z*side*visual,y:(mount.y-mount.r)*visual,z:mount.x*visual});
    }});
    const data=new VertexData(),normals:number[]=[];data.positions=positions;data.uvs=new Array(positions.length/3*2).fill(0);data.indices=indices;VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;
    this.mesh=new Mesh('best-lap-body',scene);data.applyToMesh(this.mesh);this.mesh.scaling.setAll(sceneTuning.vehicle.racingScale);
    const material=new StandardMaterial('best-lap-ghost',scene);material.diffuseColor=Color3.FromHexString(ghostAppearance.color);material.emissiveColor=material.diffuseColor.scale(0.3);material.alpha=ghostAppearance.opacity;material.backFaceCulling=false;material.disableDepthWrite=true;
    this.mesh.material=material;this.mesh.isPickable=false;this.mesh.receiveShadows=false;this.mesh.setEnabled(false);
  }
  update(pose:ReplayFrame|null){
    this.mesh.setEnabled(!!pose);if(!pose)return;
    const track=this.track;
    const fit=track?.terrain&&Math.abs(pose.y-groundHeight(pose,track))<.15?fitVehicleToSurface(pose,this.tyreContacts,(x,z)=>this.visibleSurface?.(x,z)??snowSurfaceHeight({x,z},track),sceneTuning.vehicle.contactGap,0):null;
    this.mesh.position.set(pose.x,fit?.y??pose.y+(track?.terrain?sceneTuning.vehicle.groundLift:0),pose.z);this.mesh.rotation.y=pose.heading;this.mesh.rotation.x=-(fit?.pitch??0);this.mesh.rotation.z=fit?.roll??0;
  }
}
