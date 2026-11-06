import {VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import type{Scene}from'@babylonjs/core/scene';
import{productionSurfaceTuning as art}from'./themes';
/** Baked material response, applied once before the existing material batches merge.
 * No lights, passes, animation, support or collision changes. */
export function productionShade(role:string,height:number,normalY:number,seed:number){
 const base=Math.max(0,Math.min(1,height));
 if(/rock|stone|granite|mesa|cliff/.test(role))return art.rockFoot+(1-art.rockFoot)*Math.sqrt(base)+Math.sin(base*25+seed*.13)*art.strata;
 if(/foliage|leaf|trunk|fir|pine/.test(role))return art.plantFoot+(1-art.plantFoot)*Math.sqrt(base)+Math.max(0,normalY)*art.crown;
 if(/snow|alpine/.test(role))return art.snowFoot+(1-art.snowFoot)*base;
 return art.structureFoot+(1-art.structureFoot)*Math.min(1,base*3)+Math.max(0,normalY)*art.top;
}
export function finishProduction(scene:Scene){
 let vertices=0;
 for(const mesh of [...scene.meshes]){
  const material=mesh.material,role=material?.name??'';
  if(!material||mesh.metadata?.dynamicScenery||!/(?:city-facade|architecture|timber|stone|granite|mesa|cliff|orbital|rocket|foliage|trunk|snow|alpine)/.test(role)||!mesh.isVerticesDataPresent(VertexBuffer.PositionKind))continue;
  const positions=mesh.getVerticesData(VertexBuffer.PositionKind)!,normals=mesh.getVerticesData(VertexBuffer.NormalKind),colors=mesh.getVerticesData(VertexBuffer.ColorKind)??new Float32Array(mesh.getTotalVertices()*4).fill(1);
  let lo=Infinity,hi=-Infinity;for(let i=1;i<positions.length;i+=3){lo=Math.min(lo,positions[i]);hi=Math.max(hi,positions[i]);}
  if(hi-lo<.3)continue;
  for(let i=0;i<positions.length;i+=3){const shade=productionShade(role,(positions[i+1]-lo)/(hi-lo),normals?.[i+1]??0,positions[i]+positions[i+2]);for(let c=0;c<3;c++)colors[i/3*4+c]*=shade;}
  mesh.setVerticesData(VertexBuffer.ColorKind,colors);mesh.metadata={...mesh.metadata,productionKit:1};vertices+=mesh.getTotalVertices();
 }
 return vertices;
}
