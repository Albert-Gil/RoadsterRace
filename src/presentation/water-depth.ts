import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import type {Scene} from '@babylonjs/core/scene';
import {Geometry,hex,mix} from './landscape/mesh';
import {waterDepthAppearance} from './themes';

export type WaterDepthStyle=keyof typeof waterDepthAppearance;

/**
 * Open-water depth (presentation only): one translucent, unlit, non-shadowing overlay just above
 * the existing sea. Its alpha rises with distance from the shore, so water reads as shallow
 * beside land and deeper offshore instead of one flat colour. It adds no support, collision or
 * water hazard; the physical water level and coastline are unchanged. One draw call.
 * `shore(x, z)` is the horizontal distance to the nearest shoreline in metres (≤ 0 on land).
 */
export function waterDepthGeometry(style:WaterDepthStyle,y:number,shore:(x:number,z:number)=>number){
 const a=waterDepthAppearance[style],g=new Geometry(),deep=hex(a.deep),mid=hex(a.mid),n=Math.round(2*a.reach/a.cell),grid:number[][]=[],alpha:number[][]=[];
 const ease=(t:number)=>t<=0?0:t>=1?1:t*t*(3-2*t);
 for(let i=0;i<=n;i++){
  const row:number[]=[],alphas:number[]=[];
  for(let k=0;k<=n;k++){
   const x=a.centre[0]-a.reach+i*a.cell,z=a.centre[1]-a.reach+k*a.cell,d=shore(x,z);
   // Two stages: a quick drop-off to the shelf colour, then a long fade to deep water.
   const t1=ease((d-a.near)/(a.shelf-a.near)),t2=ease((d-a.shelf)/(a.far-a.shelf)),value=d<=0?0:a.shelfAlpha*t1+(a.alpha-a.shelfAlpha)*t2;
   const v=g.vertex(x,y+a.lift,z,mix(mid,deep,t2));g.colors[v*4+3]=value;row.push(v);alphas.push(value);
  }
  grid.push(row);alpha.push(alphas);
 }
 for(let i=0;i<n;i++)for(let k=0;k<n;k++){
  if(!(alpha[i][k]||alpha[i+1][k]||alpha[i][k+1]||alpha[i+1][k+1]))continue;
  g.triangle(grid[i][k],grid[i][k+1],grid[i+1][k+1]);g.triangle(grid[i][k],grid[i+1][k+1],grid[i+1][k]);
 }
 g.normals=Array.from({length:g.vertexCount*3},(_,j)=>j%3===1?1:0);
 return g;
}

export function waterDepth(scene:Scene,style:WaterDepthStyle,y:number,shore:(x:number,z:number)=>number){
 const material=new StandardMaterial(`water-depth-${style}`,scene);
 material.diffuseColor=Color3.Black();material.specularColor=Color3.Black();material.emissiveColor=Color3.White();material.disableLighting=true;
 material.backFaceCulling=false;material.disableDepthWrite=true;material.metadata={roadsterOverlay:true,absoluteVertexColors:true};
 const mesh=new Mesh(`water-depth-${style}`,scene);waterDepthGeometry(style,y,shore).toVertexData().applyToMesh(mesh);
 mesh.material=material;mesh.hasVertexAlpha=true;mesh.isPickable=false;mesh.receiveShadows=false;mesh.alphaIndex=-1;
 return mesh;
}

/** Distance from a point to the union of axis-aligned rectangles (0 inside). */
export function rectangleDistance(rects:readonly {x:number;z:number;width:number;depth:number}[]){
 return (x:number,z:number)=>Math.min(...rects.map(r=>{const dx=Math.max(r.x-x,0,x-(r.x+r.width)),dz=Math.max(r.z-z,0,z-(r.z+r.depth));return Math.hypot(dx,dz);}));
}
