import {Geometry,hex} from './landscape/mesh';

/** Closed 92-triangle silhouette: cabin, underfloor and four solid tyres.
 * Coordinates use the game's +Z-forward axes; the caller applies the model's scale.
 * The raised steel wing uses its shipped mesh, preserving its exact aero silhouette. */
export function vehicleShadowGeometry(){
 const g=new Geometry(),c=hex('#20252a');
 const rings=[[-2.15,.86,.70,.75,.64],[-.8,1,.72,1.14,.73],[.75,.97,.68,1.1,.70],[2.33,.70,.42,.43,.55]]
  .map(([z,w,shoulder,roof,rw])=>[[-w,.12],[-w,shoulder],[-rw,roof],[rw,roof],[w,shoulder],[w,.12]].map(([x,y])=>g.vertex(x,y,z,c)));
 for(let k=1;k<rings.length;k++)for(let i=0;i<6;i++){const j=(i+1)%6;g.triangle(rings[k-1][i],rings[k][i],rings[k][j]);g.triangle(rings[k-1][i],rings[k][j],rings[k-1][j]);}
 for(const [end,row]of [rings[0],rings.at(-1)!].entries())for(let i=1;i<5;i++)end?g.triangle(row[0],row[i+1],row[i]):g.triangle(row[0],row[i],row[i+1]);
 for(const [z,x,y,r,w]of [[1.325,.79,.345,.34,.27],[-1.455,.815,.35,.35,.30]])for(const side of[-1,1]){
  const ps=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,b,d])=>g.vertex(x*side+a*w/2,y+b*r,z+d*r,c));
  for(const [a,b,d,e]of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]]){g.triangle(ps[a],ps[b],ps[d]);g.triangle(ps[a],ps[d],ps[e]);}
 }
 return g.withNormals();
}
