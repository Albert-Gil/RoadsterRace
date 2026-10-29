/** CPU view of the actual static ground triangles. Presentation only. */
export interface SurfaceVertex{x:number;y:number;z:number}
export type SurfaceTriangle=[SurfaceVertex,SurfaceVertex,SurfaceVertex];
type TriangleRef={p:ArrayLike<number>;a:number;b:number;c:number};
type Grid={p:ArrayLike<number>;indices:ArrayLike<number>;minX:number;minZ:number;cell:number;cols:number;rows:number};
const vertex=(p:ArrayLike<number>,i:number):SurfaceVertex=>({x:p[i*3],y:p[i*3+1],z:p[i*3+2]});
function triangle(ref:TriangleRef):SurfaceTriangle{return[vertex(ref.p,ref.a),vertex(ref.p,ref.b),vertex(ref.p,ref.c)];}
function at(x:number,z:number,[a,b,c]:SurfaceTriangle){
 const d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-10)return undefined;
 const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d;
 return u>=-1e-6&&v>=-1e-6&&u+v<=1.000001?u*a.y+v*b.y+(1-u-v)*c.y:undefined;
}
export class RenderedSurface{
 private bins=new Map<string,TriangleRef[]>();private grid?:Grid;
 constructor(private cell=4){}
 add(p:ArrayLike<number>,indices:ArrayLike<number>,doubleSided=false){
  for(let i=0;i<indices.length;i+=3){
   const ref={p,a:indices[i],b:indices[i+1],c:indices[i+2]},[a,b,c]=triangle(ref),area=(b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z);
   if(Math.abs(area)<1e-9||doubleSided&&area<0)continue;
   for(let x=Math.floor(Math.min(a.x,b.x,c.x)/this.cell);x<=Math.floor(Math.max(a.x,b.x,c.x)/this.cell);x++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/this.cell);z<=Math.floor(Math.max(a.z,b.z,c.z)/this.cell);z++){
    const key=`${x}/${z}`,bin=this.bins.get(key)??[];bin.push(ref);this.bins.set(key,bin);
   }
  }
 }
 setGrid(grid:Grid){this.grid=grid;}
 private gridCell(x:number,z:number):SurfaceTriangle[]{
  const g=this.grid;if(!g)return[];const col=Math.floor((x-g.minX)/g.cell),row=Math.floor((z-g.minZ)/g.cell);
  if(col<0||row<0||col>=g.cols-1||row>=g.rows-1)return[];
  const i=(row*(g.cols-1)+col)*6;
  return[0,3].map(j=>[vertex(g.p,g.indices[i+j]),vertex(g.p,g.indices[i+j+1]),vertex(g.p,g.indices[i+j+2])] as SurfaceTriangle);
 }
 height(x:number,z:number){
  let h:number|undefined;
  for(const ref of this.bins.get(`${Math.floor(x/this.cell)}/${Math.floor(z/this.cell)}`)??[]){const y=at(x,z,triangle(ref));if(y!==undefined)h=h===undefined?y:Math.max(h,y);}
  for(const t of this.gridCell(x,z)){const y=at(x,z,t);if(y!==undefined)h=h===undefined?y:Math.max(h,y);}
  return h;
 }
 patch(x0:number,z0:number,x1:number,z1:number):SurfaceTriangle[]{
  const refs=new Set<TriangleRef>();
  for(let x=Math.floor(x0/this.cell);x<=Math.floor(x1/this.cell);x++)for(let z=Math.floor(z0/this.cell);z<=Math.floor(z1/this.cell);z++)for(const t of this.bins.get(`${x}/${z}`)??[])refs.add(t);
  const result=[...refs].map(triangle),g=this.grid;
  if(g)for(let z=Math.max(g.minZ,Math.floor((z0-g.minZ)/g.cell)*g.cell+g.minZ);z<=Math.min(z1,g.minZ+(g.rows-2)*g.cell);z+=g.cell)for(let x=Math.max(g.minX,Math.floor((x0-g.minX)/g.cell)*g.cell+g.minX);x<=Math.min(x1,g.minX+(g.cols-2)*g.cell);x+=g.cell)result.push(...this.gridCell(x+.01,z+.01));
  return result;
 }
}
