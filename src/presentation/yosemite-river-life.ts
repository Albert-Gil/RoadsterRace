import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer';
import type {Scene} from '@babylonjs/core/scene';
import type {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import type {Point,TrackDefinition} from '../core/types';
import {cumulative,projectToPolyline,samplePolyline} from '../core/geometry';
import {yosemiteRivers} from '../core/tracks/yosemite-water';
import {Geometry,hex,mix,type Rgb} from './landscape/mesh';
import {yosemiteAppearance} from './themes';

const art=yosemiteAppearance.riverLife;
interface Paddle {from:number;to:number;pivot:{x:number;y:number;z:number}}
export interface RiverCanoe {position:Point;level:number;heading:number;geometry:Geometry;paddles:Paddle[];motion:{path:Point[];distances:number[];at:number}}

/** Slow paddled circuits along the river, with continuous turns rather than visible wrap/teleport. */
export function canoePose(boat:RiverCanoe,time:number){
 const a=time*Math.PI*2/art.cruisePeriod,along=Math.sin(a)*art.travel,across=.12*(1-Math.cos(a)),m=boat.motion;
 const p=samplePolyline(m.path,m.distances,m.at+along),b=samplePolyline(m.path,m.distances,m.at+along-.25),f=samplePolyline(m.path,m.distances,m.at+along+.25),heading=Math.atan2(f.x-b.x,f.z-b.z);
 return{position:{x:p.x+Math.cos(heading)*across,z:p.z-Math.sin(heading)*across},heading:heading+Math.atan2(.12*Math.sin(a),art.travel*Math.cos(a))};
}

/** Original open-hull canoe, wooden gunwales, two seated paddlers and small wakes. */
function canoe(paint:string){
 const g=new Geometry(),paddles:Paddle[]=[],hull=hex(paint),wood=hex(art.wood),inside=hex(art.interior);
 const quad=(ps:number[][],color:Rgb)=>{const ids=ps.map(p=>g.vertex(p[0],p[1],p[2],color));g.triangle(ids[0],ids[1],ids[2]);g.triangle(ids[0],ids[2],ids[3]);};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:Rgb)=>{
  const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,lo=y-h/2,hi=y+h/2;
  quad([[a,lo,c],[b,lo,c],[b,hi,c],[a,hi,c]],mix(color,[0,0,0],.12));quad([[b,lo,e],[a,lo,e],[a,hi,e],[b,hi,e]],color);
  quad([[a,lo,e],[a,lo,c],[a,hi,c],[a,hi,e]],color);quad([[b,lo,c],[b,lo,e],[b,hi,e],[b,hi,c]],color);quad([[a,hi,c],[b,hi,c],[b,hi,e],[a,hi,e]],mix(color,[1,1,1],.12));
 };
 const oval=(x:number,y:number,z:number,rx:number,ry:number,rz:number,color:Rgb)=>{
  const rows=Array.from({length:5},(_,k)=>Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2,t=k/4*Math.PI;return g.vertex(x+Math.sin(t)*Math.cos(a)*rx,y+Math.cos(t)*ry,z+Math.sin(t)*Math.sin(a)*rz,color);}));
  for(let k=0;k<4;k++)for(let i=0;i<6;i++){const j=(i+1)%6;g.triangle(rows[k][i],rows[k+1][j],rows[k][j]);g.triangle(rows[k][i],rows[k+1][i],rows[k+1][j]);}
 };
 const pole=(a:number[],b:number[],radius:number,color:Rgb)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),h=Math.hypot(dx,dz)||1,ux=dz/h,uz=-dx/h,vx=dy*uz/len,vy=(dz*ux-dx*uz)/len,vz=-dy*ux/len;
  const rows=[a,b].map(p=>Array.from({length:6},(_,i)=>{const t=i/6*Math.PI*2,c=Math.cos(t)*radius,s=Math.sin(t)*radius;return g.vertex(p[0]+ux*c+vx*s,p[1]+vy*s,p[2]+uz*c+vz*s,color);}));
  for(let i=0;i<6;i++){const j=(i+1)%6;g.triangle(rows[0][i],rows[1][j],rows[0][j]);g.triangle(rows[0][i],rows[1][i],rows[1][j]);}
 };
 const rows=[false,true].map(inner=>Array.from({length:13},(_,k)=>Array.from({length:9},(_,i)=>{
  const t=k/12,z=(t-.5)*art.length,a=(i/8-.5)*Math.PI,w=Math.max(.035,Math.sin(t*Math.PI)**.72*art.width/2)-(inner?.045:0),lift=.23*(Math.abs(t-.5)*2)**6;
  return g.vertex(Math.sin(a)*Math.max(.018,w),-.18+(1-Math.cos(a))*.5+lift+(inner?.065:0),z,inner?mix(inside,hull,Math.abs(Math.sin(a))*.65):mix(hull,hex('#ffffff'),i===0||i===8?.12:0));
 })));
 for(let side=0;side<2;side++)for(let k=0;k<12;k++)for(let i=0;i<8;i++){
  const r=rows[side],ids=[r[k][i],r[k+1][i],r[k+1][i+1],r[k][i+1]];if(side)ids.reverse();g.triangle(ids[0],ids[1],ids[2]);g.triangle(ids[0],ids[2],ids[3]);
 }
 for(const edge of[0,8])for(let k=0;k<12;k++){
  const points=[rows[0][k][edge],rows[0][k+1][edge],rows[1][k+1][edge],rows[1][k][edge]].map(i=>g.positions.slice(i*3,i*3+3));quad(edge?points:points.reverse(),mix(hull,hex('#ffffff'),.22));
 }
 // Painted flotation decks remain readable from the fixed overhead camera.
 for(const k of[0,1,10,11]){
  const points=[rows[1][k][0],rows[1][k+1][0],rows[1][k+1][8],rows[1][k][8]].map(i=>g.positions.slice(i*3,i*3+3));quad(points.reverse(),mix(hull,hex('#ffffff'),k===0||k===11?.15:0));
 }
 for(const z of[-1.1,1.05]){
  box(0,.32,z,art.width*.77,.10,.35,wood);box(0,.37,z+.32,.44,.18,.76,hex('#30434b'));
  box(0,.77,z,.46,.60,.32,hex(art.shirt));box(0,.80,z+.19,.52,.44,.10,hex(art.vest));box(0,.80,z-.19,.52,.44,.10,hex(art.vest));
  oval(0,1.22,z,.18,.23,.18,hex(art.skin));oval(0,1.37,z,.20,.09,.20,hex('#efe6ce'));
  const side=z<0?-1:1,pivot={x:side*.47,y:.99,z:z+.12};
  for(const sx of[-1,1])pole([sx*.25,1,z],[pivot.x,.96,pivot.z],.085,hex(art.skin));
  const from=g.vertexCount;
  pole([pivot.x*.75,1.40,z-.08],[side*1.32,-.06,z+.70],.035,wood);
  oval(side*1.32,-.01,z+.70,.16,.05,.37,wood);
  paddles.push({from,to:g.vertexCount,pivot});
 }
 box(0,.36,0,art.width*.87,.07,.13,wood);
 for(const side of[-1,1])for(let i=0;i<3;i++){
  const z=-art.length/2+.6-i*.20,x=side*(.34+i*.13),color=mix(hex(art.foam),hex(yosemiteAppearance.water),i*.2);
  quad([[x-.045,.012,z],[x+.045,.012,z],[x+side*.15+.045,.012,z-.32],[x+side*.15-.045,.012,z-.32]].reverse(),color);
 }
 return{geometry:g.withNormals(),paddles};
}

/** Float on the authoritative main river, clear of both banks, solids and takeoffs. */
export function yosemiteCanoes(track:TrackDefinition):RiverCanoe[]{
 const river=yosemiteRivers(track).find(r=>r.id==='bridalveil-creek')!,distances=cumulative(river.path);
 return art.anchors.map((anchor,index)=>{
  const s=projectToPolyline(anchor,river.path,distances).progress,position=samplePolyline(river.path,distances,s),before=samplePolyline(river.path,distances,s-.5),after=samplePolyline(river.path,distances,s+.5);
  return{position,level:river.level,heading:Math.atan2(after.x-before.x,after.z-before.z),motion:{path:river.path,distances,at:s},...canoe(art.hulls[index%art.hulls.length])};
 });
}

/** One opaque animated batch, existing material, no lights, shadows or physics bodies. */
export function buildYosemiteRiverLife(scene:Scene,track:TrackDefinition,material:StandardMaterial){
 const boats=yosemiteCanoes(track),all=new Geometry(),spans:{boat:RiverCanoe;start:number;bindings:Int8Array}[]=[];
 for(const boat of boats){
  const start=all.vertexCount,bindings=new Int8Array(boat.geometry.vertexCount).fill(-1);boat.paddles.forEach((p,i)=>bindings.fill(i,p.from,p.to));
  all.instance(boat.geometry,{x:boat.position.x,y:boat.level,z:boat.position.z,heading:boat.heading});spans.push({boat,start,bindings});
 }
 const mesh=new Mesh('yosemite-river-canoes',scene);all.toVertexData().applyToMesh(mesh,true);mesh.material=material;mesh.isPickable=false;mesh.metadata={dynamicScenery:true,riverLife:true,canoeCount:boats.length};
 const positions=new Float32Array(all.positions),normals=new Float32Array(all.normals!);
 return{mesh,update(time:number,reduced:boolean){
  const t=reduced?0:time;
  for(const [index,{boat,start,bindings}]of spans.entries()){
   const pose=canoePose(boat,t),phase=index*2.1,bob=Math.sin(t*.95+phase)*art.bob,roll=Math.sin(t*1.3+phase)*art.roll,cr=Math.cos(roll),sr=Math.sin(roll),ch=Math.cos(pose.heading),sh=Math.sin(pose.heading);
   const angles=boat.paddles.map((_,i)=>Math.sin(t*art.paddleSpeed+phase+i*.65)*art.paddleSwing),cos=angles.map(Math.cos),sin=angles.map(Math.sin),base=boat.geometry.positions,bn=boat.geometry.normals!;
   for(let i=0;i<boat.geometry.vertexCount;i++){
    const a=i*3,out=(start+i)*3,p=bindings[i];let x=base[a],y=base[a+1],z=base[a+2],nx=bn[a],ny=bn[a+1],nz=bn[a+2];
    if(p>=0){const pivot=boat.paddles[p].pivot,dy=y-pivot.y,dz=z-pivot.z;y=pivot.y+dy*cos[p]-dz*sin[p];z=pivot.z+dy*sin[p]+dz*cos[p];const yy=ny*cos[p]-nz*sin[p];nz=ny*sin[p]+nz*cos[p];ny=yy;}
    const xx=x*cr-y*sr,yy=x*sr+y*cr,nnx=nx*cr-ny*sr,nny=nx*sr+ny*cr;
    positions[out]=pose.position.x+xx*ch+z*sh;positions[out+1]=boat.level+bob+yy;positions[out+2]=pose.position.z-xx*sh+z*ch;
    normals[out]=nnx*ch+nz*sh;normals[out+1]=nny;normals[out+2]=-nnx*sh+nz*ch;
   }
  }
  mesh.updateVerticesData(VertexBuffer.PositionKind,positions);mesh.updateVerticesData(VertexBuffer.NormalKind,normals);
 }};
}
