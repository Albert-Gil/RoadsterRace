import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { vehicleMaterials } from './themes';

// Four quadrants in one linear occlusion/roughness/metalness map. The discs
// have their own axle-space coordinates even though all brakes share one mesh.
export function wheelUV(role:string, x:number, y:number): [number,number] {
  const slot=role==='tire'?0:role==='disc'?2:role==='caliper'?3:1;
  return [(slot%2+.5+x/.76)*.5, (Math.floor(slot/2)+.5+y/.76)*.5];
}

export function wheelFinish(scene:Scene) {
  const tile=64, size=2*tile, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const slot=Math.floor(x/tile)+2*Math.floor(y/tile);
    const dx=(x%tile+.5)/tile-.5, dy=(y%tile+.5)/tile-.5;
    const r=Math.hypot(dx,dy)*.76, angle=Math.atan2(dy,dx);
    const [rough,metal]=vehicleMaterials.wheels.finishes[slot];
    let exposure=1, roughness:number=rough;
    if(slot===2){
      // Staggered drillings, brushed contact rings and a recessed centre hub.
      const ring=r>.18?.202:.165, n=r>.18?17:13;
      const phase=(angle/(2*Math.PI)*n+(r>.18?.36:0));
      const hole=Math.hypot(r-ring,(phase-Math.round(phase))*2*Math.PI*ring/n)<.008;
      exposure=hole?.14:r<.09?.57:.89+.09*Math.cos(r*820);
      roughness+=.07*Math.sin(r*920);
    }else if(slot===0){
      roughness+=.045*Math.sin(r*940);
    }
    const i=(y*size+x)*4;
    pixels[i]=Math.round(255*exposure);pixels[i+1]=Math.round(255*roughness);
    pixels[i+2]=Math.round(255*metal);pixels[i+3]=255;
  }
  const map=RawTexture.CreateRGBATexture(pixels,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
  map.name='roadster-wheel-finishes';map.gammaSpace=false;
  map.wrapU=map.wrapV=Texture.CLAMP_ADDRESSMODE;
  return map;
}
