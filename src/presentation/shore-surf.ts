import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import type {Scene} from '@babylonjs/core/scene';
import {Geometry,hex} from './landscape/mesh';
import {shoreComposition as art} from './themes';

type Shore={kind:'island';water:number}|{kind:'beach';water:number;shoreX:(z:number)=>number;height:(x:number,z:number)=>number};
/** Three coherent, broken wave fronts in one bounded cosmetic batch. */
export function shoreSurf(scene:Scene,shore:Shore,existing?:StandardMaterial){
 const material=existing??new StandardMaterial('shore-surf-foam',scene);
 if(!existing){material.diffuseColor=Color3.White();material.emissiveColor=Color3.White();material.disableLighting=true;material.alpha=.58;material.disableDepthWrite=true;material.backFaceCulling=false;material.metadata={roadsterOverlay:true};}
 const g=new Geometry(),segments=shore.kind==='island'?192:144;
 for(let wave=0;wave<3;wave++)for(let i=0;i<segments;i++){
  const start=g.vertexCount;for(let k=0;k<4;k++)g.vertex(0,shore.water,0,hex(art.foam));g.triangle(start,start+1,start+2);g.triangle(start,start+2,start+3);
 }
 const mesh=new Mesh('coherent-shore-surf',scene),v=g.toVertexData();v.normals=new Float32Array(g.positions.length);for(let i=1;i<v.normals.length;i+=3)v.normals[i]=1;v.applyToMesh(mesh,true);mesh.material=material;mesh.hasVertexAlpha=true;mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;mesh.metadata={dynamicScenery:true,shoreSurf:true};
 const positions=new Float32Array(g.positions),colors=new Float32Array(g.colors);
 const update=(time:number,reduced:boolean)=>{
  for(let wave=0;wave<3;wave++){
   const phase=((reduced?0:time*art.speed)+wave/3)%1,fade=Math.sin(phase*Math.PI)*art.opacity;
   for(let i=0;i<segments;i++)for(let corner=0;corner<4;corner++){
    const index=(wave*segments+i)*4+corner,at=index*3,k=i+(corner===1||corner===2?1:0),outer=corner>=2?1:0;
    if(shore.kind==='island'){
     const a=k/segments*Math.PI*2,shape=1+.035*Math.sin(3*a+.7)+.018*Math.cos(7*a),r=1.15-phase*.12+outer*.004;
     positions[at]=Math.cos(a)*85*shape*r;positions[at+2]=Math.sin(a)*62*shape*r;positions[at+1]=-.16+(shore.water+.05+.16)*(r-.99)/.26+.018;
     colors[index*4+3]=fade*(.35+.65*Math.sin(a*7+wave*.8)**2);
    }else{
     const z=-170+k/segments*340,x=shore.shoreX(z)+3.5+(1-phase)*8+outer*.34;
     positions[at]=x;positions[at+2]=z;positions[at+1]=Math.max(shore.water+.035,shore.height(x,z)+.018);colors[index*4+3]=fade*(.28+.72*Math.sin(z*.14+wave*.7)**2);
    }
   }
  }
  mesh.updateVerticesData(VertexBuffer.PositionKind,positions);mesh.updateVerticesData(VertexBuffer.ColorKind,colors);
 };update(0,true);mesh.refreshBoundingInfo();return{mesh,update};
}
