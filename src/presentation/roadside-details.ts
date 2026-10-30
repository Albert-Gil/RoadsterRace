import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { TrackDefinition } from '../core/types';
import type { SceneryId } from '../content/circuits';
import { roadsideGeometry } from './roadside-geometry';
import { roadsideAppearance } from './themes';

/** One opaque, vertex-coloured roadside batch. No new lights, particles or simulation state. */
export function buildRoadsideDetails(scene:Scene,track:TrackDefinition,style:SceneryId,materials:Map<string,StandardMaterial>){
 const result=roadsideGeometry(track,style,roadsideAppearance.palettes[style],roadsideAppearance),mesh=new Mesh('visible-roadside-details',scene);
 result.geometry.toVertexData().applyToMesh(mesh);
 const material=new StandardMaterial('roadside-details',scene);material.diffuseColor.setAll(1);material.specularColor.setAll(.03);material.backFaceCulling=false;material.twoSidedLighting=true;material.metadata={absoluteVertexColors:true};materials.set('roadside-details',material);
 mesh.material=material;mesh.isPickable=false;mesh.receiveShadows=true;mesh.metadata={roadsideDetails:true,plants:result.plants,props:result.props,edgeMarks:result.edgeMarks};
 return mesh;
}
