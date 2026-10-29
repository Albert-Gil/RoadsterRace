import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { TrackDefinition } from '../core/types';
import { sampleTerrain } from '../core/terrain';
import { snowyTahoeAppearance as art } from './themes';

/** One bounded cosmetic snow mesh. Gusts never enter simulation, pace or grip. */
export function tahoeWeather(scene:Scene,track:TrackDefinition){
  const cfg=art.weather,n=cfg.flakes+cfg.groundWisps,positions=new Float32Array(n*12),colors=new Float32Array(n*16),indices:number[]=[],uvs:number[]=[];
  let seed=9127;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const flakes=Array.from({length:n},(_,i)=>{
    const near=rand()<cfg.nearCourse,p=track.centerline[Math.floor(rand()*(track.centerline.length-1))];
    const x=near?p.x+(rand()-.5)*66:-180+rand()*340,z=near?p.z+(rand()-.5)*66:-125+rand()*310;
    return{x,z,ceiling:sampleTerrain({x,z},track)+40,phase:rand()*45,size:.5+rand()*.8,speed:.7+rand()*.6,wisp:i>=cfg.flakes};
  });
  for(let i=0;i<n;i++){const b=i*4;indices.push(b,b+1,b+2,b,b+2,b+3);uvs.push(0,0,1,0,1,1,0,1);}
  const texture=new DynamicTexture('alpine-snowflake',32,scene,false),ctx=texture.getContext() as CanvasRenderingContext2D;
  const g=ctx.createRadialGradient(16,16,0,16,16,15);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(244,250,255,.8)');g.addColorStop(.8,'rgba(130,164,190,.4)');g.addColorStop(1,'rgba(130,164,190,0)');ctx.fillStyle=g;ctx.fillRect(0,0,32,32);texture.hasAlpha=true;texture.update();
  const material=new StandardMaterial('alpine-snowfall',scene);material.diffuseTexture=texture;material.useAlphaFromDiffuseTexture=true;material.emissiveColor=Color3.White();material.disableLighting=true;material.disableDepthWrite=true;material.backFaceCulling=false;
  material.metadata={roadsterOverlay:true};
  const data=new VertexData();data.positions=positions;data.colors=colors;data.uvs=uvs;data.indices=indices;
  const mesh=new Mesh('bounded-alpine-snowfall',scene);data.applyToMesh(mesh,true);mesh.material=material;mesh.hasVertexAlpha=true;mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;mesh.metadata={dynamicScenery:true};
  return {mesh,update(time:number,reduced:boolean){
    mesh.setEnabled(!reduced);if(reduced||!scene.activeCamera)return;
    const right=scene.activeCamera.getDirection(Vector3.Right()),up=scene.activeCamera.getDirection(Vector3.Up()),gust=Math.sin(time/cfg.gustPeriod*Math.PI*2),strength=.72+.25*gust;
    for(let i=0;i<n;i++){
      const f=flakes[i],x=f.x+Math.sin(time*.35+f.phase)*cfg.wind+gust*3,z=f.z+Math.sin(time*.23+f.phase)*2.4,floor=sampleTerrain({x,z},track);
      const y=f.wisp?floor+.35+Math.sin(time+f.phase)*.14:f.ceiling-((time*cfg.fallSpeed*f.speed+f.phase)%45);
      const alpha=f.wisp?cfg.wispOpacity*strength*(.5+.5*Math.sin(time*.7+f.phase)**2):y>floor+.15?cfg.opacity*strength:0;
      for(let v=0;v<4;v++){
        const size=(f.wisp?cfg.wispSize:cfg.size)*f.size,a=(v===0||v===3?-1:1)*size/2,b=(v<2?-1:1)*size*(f.wisp?.16:.65)/2,p=i*12+v*3,c=i*16+v*4;
        positions[p]=x+right.x*a+up.x*b;positions[p+1]=y+right.y*a+up.y*b;positions[p+2]=z+right.z*a+up.z*b;
        colors[c]=colors[c+1]=colors[c+2]=1;colors[c+3]=alpha;
      }
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind,positions);mesh.updateVerticesData(VertexBuffer.ColorKind,colors);
  }};
}
