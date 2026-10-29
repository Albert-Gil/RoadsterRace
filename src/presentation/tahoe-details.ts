import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TrackDefinition } from '../core/types';
import { Geometry,hex } from './landscape/mesh';
import { snowyTahoeAppearance as art } from './themes';

type Mats={wood:StandardMaterial;wall:StandardMaterial;roof:StandardMaterial;glass:StandardMaterial;steel:StandardMaterial;stone:StandardMaterial;red:StandardMaterial};
export function tahoeDetails(scene:Scene,track:TrackDefinition,m:Mats){
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat:StandardMaterial)=>{const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=mat;return mesh;};
  const bake=(name:string,g:Geometry,mat:StandardMaterial)=>{const mesh=new Mesh(name,scene),v=g.toVertexData();for(let i=0;i<(v.normals?.length??0);i+=3)if(v.normals![i+1]<0){v.normals![i]*=-1;v.normals![i+1]*=-1;v.normals![i+2]*=-1;}v.uvs=new Float32Array(g.vertexCount*2);v.applyToMesh(mesh);mesh.material=mat;return mesh;};
  for(const b of track.barriers.filter(b=>b.kind==='building'&&!b.id.includes('pylon')&&!b.id.includes('groomer'))){
    const x0=Math.min(...b.footprint.map(p=>p.x)),x1=Math.max(...b.footprint.map(p=>p.x)),z0=Math.min(...b.footprint.map(p=>p.z)),z1=Math.max(...b.footprint.map(p=>p.z)),x=(x0+x1)/2,z=(z0+z1)/2,w=x1-x0,d=z1-z0,y=b.baseHeight??0,h=b.height;
    const body=h*.5,front=z0+d*.13,back=z1-d*.13,ridge=y+h*.88;
    box('chalet-stone-foundation',x,y+.22,z,w*.95,.44,d*.94,m.stone);
    box('chalet-timber-body',x,y+body/2,z,w*.94,body,d*.74,m.wall);
    const roof=new Geometry(),color=hex(art.roof);
    // Long ridge, steep snowy eaves and closed gables: no industrial flat-roof silhouette.
    for(const side of [-1,1]){
      const zz=side<0?z0:z1,a=roof.vertex(x0,y+body,zz,color),bb=roof.vertex(x0,ridge,z,color),c=roof.vertex(x1,ridge,z,color),dd=roof.vertex(x1,y+body,zz,color);
      if(side<0){roof.triangle(a,bb,c);roof.triangle(a,c,dd);}else{roof.triangle(a,c,bb);roof.triangle(a,dd,c);}
    }
    const rm=bake('steep-chalet-snow-roof',roof,m.roof);rm.material!.backFaceCulling=false;
    const gables=new Geometry();for(const side of [-1,1]){const xx=x+side*w*.47,a=gables.vertex(xx,y+body,front,hex(art.cabin)),bb=gables.vertex(xx,ridge,z,hex(art.cabin)),c=gables.vertex(xx,y+body,back,hex(art.cabin));gables.triangle(a,bb,c);}bake('chalet-closed-gables',gables,m.wood);
    for(const side of [-1,1]){
      const zz=side<0?front-.025:back+.025;
      for(let px=x0+1.5;px<x1-1;px+=3.4){
        box('recessed-chalet-window-frame',px,y+body*.58,zz,2.1,Math.min(1.45,body*.52),.15,m.wood);
        box('warm-chalet-window',px,y+body*.58,zz+side*.09,1.82,Math.min(1.2,body*.44),.05,m.glass);
        box('chalet-window-mullion',px,y+body*.58,zz+side*.13,.09,Math.min(1.3,body*.46),.07,m.wood);
      }
      box('chalet-eave-timber',x,y+body,side<0?z0+.12:z1-.12,w-.3,.18,.22,m.wood);
      for(let px=x0+.7;px<x1-.4;px+=1.3){const icicle=MeshBuilder.CreateCylinder('hanging-roof-ice',{height:.22+(Math.sin(px*3)+1)*.18,diameterTop:.08,diameterBottom:0,tessellation:4},scene);icicle.position.set(px,y+body-.2,side<0?z0+.09:z1-.09);icicle.material=m.roof;}
    }
    box('timber-front-terrace',x,y+.33,z0+d*.08,w*.88,.14,d*.12,m.wood);
    for(let px=x0+1;px<x1-1;px+=2.2){box('terrace-post',px,y+.95,z0+.2,.11,1.25,.11,m.wood);box('chalet-facade-upright',px,y+body/2,front,.12,body,.12,m.wood);}
    box('terrace-handrail',x,y+1.55,z0+.2,w*.88,.12,.12,m.wood);
    box('chalet-door',x,y+1.02,front-.1,1.35,2.04,.12,m.steel);
    // Original ski-resort details stay within the protected building footprint.
    for(let level=.65;level<body-.25;level+=.5)box('chalet-log-course',x,y+level,front-.05,w*.9,.055,.08,m.wood);
    for(const side of [-1,1]){
      const px=x+side*w*.31;
      box('lodge-lantern-bracket',px,y+1.95,front-.15,.09,.38,.15,m.steel);
      box('warm-lodge-lantern',px,y+1.82,front-.22,.22,.34,.22,m.glass);
      box('snowy-lantern-cap',px,y+2.02,front-.22,.32,.08,.31,m.roof);
    }
    if(w>9){
      const rackX=x0+2,rackZ=z0+d*.08;
      box('rental-ski-rack',rackX,y+.95,rackZ,2.4,.12,.3,m.wood);
      for(let i=0;i<4;i++){const ski=box('rental-skis',rackX-.8+i*.48,y+.95,rackZ,.14,1.8,.07,i%2?m.red:m.steel);ski.rotation.z=.11;box('ski-bindings',rackX-.8+i*.48,y+.77,rackZ-.06,.16,.18,.08,m.steel);}
      for(const side of[-1,1])box('ski-rack-leg',rackX+side,y+.47,rackZ,.12,.94,.22,m.wood);
    }
    if(b.id==='mountain-rescue-hut'){
      box('rescue-sled-bed',x1-2,y+.38,z0+1.2,2.5,.25,.8,m.red);
      for(const side of[-1,1])box('rescue-sled-runner',x1-2,y+.17,z0+1.2+side*.3,2.8,.12,.08,m.steel);
    }
    box('chalet-chimney',x+w*.25,y+h*.76,z+.4,.8,h*.44,.8,m.stone);
    box('chalet-chimney-snow-cap',x+w*.25,y+h-.07,z+.4,1,.12,1,m.roof);
    if(b.id==='alpine-lodge')for(let row=0;row<2;row++)for(let i=0;i<5;i++){const log=MeshBuilder.CreateCylinder('lodge-stacked-firewood',{height:1.2,diameter:.28,tessellation:7},scene);log.rotation.x=Math.PI/2;log.position.set(x0+1.1+i*.31,y+.36+row*.27,z0+.8);log.material=m.wood;}
  }
  // Small tracked groomer, kept inside its authored protected footprint.
  const g=track.barriers.find(b=>b.id==='snow-groomer');if(g){
    const x=22,z=21,y=g.baseHeight??0;
    box('snowcat-chassis',x,y+.6,z,5.2,.7,2.7,m.red);
    for(const side of [-1,1]){box('snowcat-track',x,y+.35,z+side*1.1,5.5,.55,.65,m.steel);for(let i=0;i<7;i++)box('snowcat-track-tread',x-2.3+i*.75,y+.64,z+side*1.1,.14,.09,.7,m.stone);}
    box('snowcat-cab',x-.6,y+1.5,z,2.3,1.4,2.3,m.red);box('snowcat-windscreen',x+.57,y+1.6,z,.08,.85,1.85,m.steel);box('snowcat-snow-roof',x-.6,y+2.24,z,2.5,.16,2.5,m.roof);
    box('snowcat-plow',x+2.75,y+.35,z,.28,.65,3.5,m.red);
  }
  for(const [x,z]of [[-6,-7],[4,-7],[3,17],[-44,20]]){
    box('alpine-timber-bench',x,.58,z,2.8,.16,.55,m.wood);box('alpine-bench-back',x,.95,z+.22,2.8,.6,.1,m.wood);for(const side of [-1,1])box('alpine-bench-foot',x+side*.95,.3,z,.16,.6,.45,m.steel);
  }
  for(const b of track.barriers.filter(b=>b.id.includes('pylon'))){const x=b.footprint[0].x+1,z=b.footprint[0].z+1,y=b.baseHeight!;box('lift-pylon-footing',x,y+.25,z,1.8,.5,1.8,m.stone);box('ski-lift-pylon',x,y+b.height/2,z,.5,b.height,.5,m.steel);box('ski-lift-crosshead',x,y+b.height,z,4,.45,.45,m.red);for(const side of [-1,1]){const wheel=MeshBuilder.CreateCylinder('cable-sheave',{diameter:1,height:.18,tessellation:12},scene);wheel.rotation.x=Math.PI/2;wheel.position.set(x+side*1.1,y+b.height,z);wheel.material=m.steel;}}
  const liftIds=['lower-lift-station','lift-pylon-1','lift-pylon-2','upper-lift-station'];
  const cable=liftIds.map(id=>{const b=track.barriers.find(b=>b.id===id)!,x=b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,z=b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length;return new Vector3(x,(b.baseHeight??0)+b.height*(id.includes('station')?.8:1),z);});
  for(const side of [-1,1])for(let i=1;i<cable.length;i++){
    const a=cable[i-1].add(new Vector3(side*1.2,0,0)),b=cable[i].add(new Vector3(side*1.2,0,0)),mid=a.add(b).scale(.5);mid.y-=1.1;
    const c=MeshBuilder.CreateTube('taut-ski-lift-cable',{path:[a,mid,b],radius:.055,tessellation:4},scene);c.material=m.steel;
  }
  // A single vertex-coloured moving mesh for all chairs.
  const chairs=new Geometry();
  const cube=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{
    const temp=MeshBuilder.CreateBox('chair-template',{width:w,height:h,depth:d},scene),p=temp.getVerticesData(VertexBuffer.PositionKind)!,idx=temp.getIndices()!,base=chairs.vertexCount;
    for(let i=0;i<p.length;i+=3)chairs.vertex(x+p[i],y+p[i+1],z+p[i+2],hex(color));for(let i=0;i<idx.length;i+=3)chairs.triangle(base+idx[i],base+idx[i+1],base+idx[i+2]);temp.dispose();
  };
  cube(0,-2,0,1.8,.18,.8,art.lift);cube(0,-1.6,.35,1.8,.75,.12,art.lift);cube(0,-.8,0,.075,2,.075,art.steel);
  for(const side of[-1,1])cube(side*.35,-2.18,0,.16,.08,2.5,art.steel);
  const template=[...chairs.positions],count=8,all=new Geometry();for(let i=0;i<count;i++)all.append(chairs);
  const moving=new Mesh('moving-ski-lift-chairs',scene);all.toVertexData().applyToMesh(moving,true);moving.material=m.roof;moving.metadata={dynamicScenery:true};moving.isPickable=false;moving.alwaysSelectAsActiveMesh=true;
  const out=new Float32Array(all.positions.length),lengths=[0];for(let i=1;i<cable.length;i++)lengths.push(lengths[i-1]+Vector3.Distance(cable[i-1],cable[i]));const length=lengths.at(-1)!;
  return {moving,update(time:number,reduced:boolean){
    for(let i=0;i<count;i++){
      const loop=((reduced?0:time)*art.liftSpeed+i*length*2/count)%(length*2),back=loop>length,s=back?length*2-loop:loop;let k=1;while(k<lengths.length-1&&lengths[k]<s)k++;
      const u=(s-lengths[k-1])/(lengths[k]-lengths[k-1]),a=cable[k-1],b=cable[k],x=a.x+(b.x-a.x)*u+(back?1.2:-1.2),y=a.y+(b.y-a.y)*u-Math.sin(u*Math.PI)*1.1,z=a.z+(b.z-a.z)*u;
      for(let v=0;v<template.length;v+=3){const o=i*template.length+v;out[o]=x+template[v];out[o+1]=y+template[v+1];out[o+2]=z+template[v+2];}
    }
    moving.updateVerticesData(VertexBuffer.PositionKind,out,true);
  }};
}
