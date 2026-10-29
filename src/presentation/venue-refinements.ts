import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TrackDefinition, Point } from '../core/types';
import type { SceneryId } from '../content/circuits';
import { insideBarrier } from '../core/barriers';
import { launchsiteVessels } from '../core/tracks/venue-parcels';

/** Presentation-only finishing pass. Shared material roles join the scene's static batches. */
export function refineVenue(id:SceneryId,scene:Scene,track:TrackDefinition,materials:Map<string,StandardMaterial>):string[]{
  if(id==='canyon')return ['continuous mineral beds','darker hillside feet','weathered alluvial shoulders'];
  const concrete=materials.get('barrier-concrete')!,metal=materials.get('galvanized-rail')!,dark=materials.get('architecture-trim')!,white=materials.get('architecture')!,glass=materials.get('architecture-glass')!;
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:StandardMaterial)=>{const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=m;return mesh;};
  const beam=(name:string,a:Vector3,b:Vector3,r:number,m:StandardMaterial)=>{const mesh=MeshBuilder.CreateTube(name,{path:[a,b],radius:r,tessellation:6,cap:3},scene);mesh.material=m;return mesh;};
  const original=[...scene.meshes];for(const m of original)m.computeWorldMatrix(true);
  // Entrances and layered footings give existing buildings a supported base and facade depth.
  const bodies=original.filter(m=>(m.material?.name==='city-facade'&&m.name.endsWith('-body')||/^(?:la-building-body|pastel-shop|beachfront-hotel|mission-control|assembly-hangar)$/.test(m.name)));
  for(const [index,m]of bodies.entries()){
    const b=m.getBoundingInfo().boundingBox,a=b.minimumWorld,c=b.maximumWorld,w=c.x-a.x,d=c.z-a.z,x=(a.x+c.x)/2,z=(a.z+c.z)/2;
    if(w<4||d<4)continue;
    const facing=a.z+.08;
    box('refined-building-stone-foot',x,a.y+.14,z,w,.28,d,concrete);
    const doorWidth=Math.min(2.4,w*.24);
    box('recessed-entrance-frame',x,a.y+1.1,facing,doorWidth+.28,2.2,.1,dark);
    box('recessed-entrance-glass',x,a.y+1.12,facing-.025,doorWidth,1.9,.05,glass);
    // A shallow canopy stays close to the existing facade, well inside protected setbacks.
    if(id==='bay'||id==='night-city'||id==='sunset'){
      const canopy=box('layered-shop-canopy',x,a.y+2.35,facing-.3,Math.min(w-.6,6),.15,.75,index%2?dark:metal);canopy.rotation.x=-.06;
      for(const side of [-1,1])box('canopy-wall-bracket',x+side*Math.min(w*.3,2.3),a.y+2.1,facing-.18,.07,.55,.55,metal);
    }
    if(id==='bay')for(let floor=a.y+3.4;floor<c.y-1;floor+=2.5){
      box('facade-recessed-floor-band',x,floor,facing+.005,w-.22,.12,.08,dark);
      if(index%3===1)for(let px=a.x+.8;px<c.x-.6;px+=1.5)box('bay-shutter-panel',px,floor-.7,facing+.02,.18,1.15,.08,metal);
    }
  }
  if(id==='coastal'){
    const garden=track.barriers.find(b=>b.id==='coastal-gardens')!;
    const path=[{x:-30,z:-10},{x:-13,z:-8},{x:-9,z:9},{x:-22,z:12}];
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],length=Math.hypot(b.x-a.x,b.z-a.z);
      if(![a,b].every(p=>insideBarrier(p,garden)))continue;
      const p=box('garden-shellstone-path',(a.x+b.x)/2,.09,(a.z+b.z)/2,length,.07,2.1,concrete);p.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);
      for(let s=2;s<length;s+=2){const x=a.x+(b.x-a.x)*s/length,z=a.z+(b.z-a.z)*s/length;const joint=box('garden-path-joint',x,.13,z,.035,.012,2,dark);joint.rotation.y=p.rotation.y;}
    }
    for(const [x,z]of [[-29,2],[-21,9],[-13,1]])if(insideBarrier({x,z},garden)){
      box('island-garden-bench',x,.65,z,2.4,.14,.5,white);for(const side of [-1,1])box('garden-bench-foot',x+side*.85,.35,z,.16,.6,.4,dark);
      box('garden-bench-back',x,1,z+.23,2.4,.55,.1,metal);
    }
    return ['shellstone garden walks','layered pit entrances','grounded coastal furniture'];
  }
  if(id==='spaceport'){
    const parcel=track.barriers.find(b=>b.id==='utility-storage-tower')!;
    for(let i=1;i<launchsiteVessels.length;i++){
      const a=launchsiteVessels[i-1],b=launchsiteVessels[i],path=[{x:a.x,z:a.z},{x:b.x,z:a.z},{x:b.x,z:b.z}];
      if(!path.every(p=>insideBarrier(p,parcel)))continue;
      for(let k=1;k<path.length;k++){
        const p=path[k-1],q=path[k],n=Math.ceil(Math.hypot(q.x-p.x,q.z-p.z));
        if(!Array.from({length:n+1},(_,j)=>({x:p.x+(q.x-p.x)*j/n,z:p.z+(q.z-p.z)*j/n})).every(v=>insideBarrier(v,parcel)))continue;
        beam('connected-utility-pipe',new Vector3(p.x,.72,p.z),new Vector3(q.x,.72,q.z),.22,metal);
        for(let j=1;j<n;j+=3)box('utility-pipe-saddle',p.x+(q.x-p.x)*j/n,.38,p.z+(q.z-p.z)*j/n,.65,.75,.65,concrete);
      }
    }
    return ['connected tank-farm pipework','service saddles and foundations','layered assembly entrances'];
  }
  if(id==='bay'){
    for(const bridge of track.bridges??[])for(const p of [bridge.from,bridge.to]){
      const bearing=box('bridge-abutment-bearing',p.x,-.23,p.z,2.4,.6,bridge.width,concrete);bearing.rotation.y=-Math.atan2(bridge.to.z-bridge.from.z,bridge.to.x-bridge.from.x);
      for(const side of [-1,1])box('bridge-bearing-anchor',p.x,-.06,p.z+side*(bridge.width/2-.6),1.1,.3,.7,metal);
    }
    return ['layered bridge abutments','recessed city storefronts','facade bands and shutters'];
  }
  if(id==='sunset'){
    const piles=original.filter(m=>m.name==='pier-pile'||m.name==='amusement-pile');
    for(let i=0;i<piles.length;i++){
      const a=piles[i].getBoundingInfo().boundingBox.centerWorld;
      const next=piles.slice(i+1).map(m=>m.getBoundingInfo().boundingBox.centerWorld).filter(b=>Math.hypot(a.x-b.x,a.z-b.z)<10&&Math.hypot(a.x-b.x,a.z-b.z)>2).sort((b,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(a.x-c.x,a.z-c.z))[0];
      if(!next)continue;
      const mid:Point={x:(a.x+next.x)/2,z:(a.z+next.z)/2};
      if(track.waterOpenings?.some(s=>insideBarrier(mid,{...s,height:0})))continue;
      beam('pier-diagonal-cross-brace',new Vector3(a.x,-1.8,a.z),new Vector3(next.x,-.35,next.z),.11,dark);
      beam('pier-diagonal-cross-brace',new Vector3(a.x,-.35,a.z),new Vector3(next.x,-1.8,next.z),.11,dark);
    }
    return ['cross-braced pier supports','layered beachfront entrances','weathered structural hardware'];
  }
  if(id==='night-city')return ['layered backlot entrances','varied warm/cool facades','restrained road reflections'];
  return [];
}
