import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TrackDefinition } from '../core/types';
import { backlotCaseParts, backlotCases, serviceConduit } from '../core/tracks/hop-obstacles';

/** Unmarked, venue-appropriate props for the two authored manual-Hop lanes. */
export function buildHopObstacles(scene: Scene, track: TrackDefinition, materials: Map<string, StandardMaterial>) {
  const concrete=materials.get('barrier-concrete')!, metal=materials.get('galvanized-rail')!, dark=materials.get('race-charcoal')!;
  const white=materials.get('architecture')!, structure=materials.get('architecture-trim')!, leaf=materials.get('foliage')!, leafLight=materials.get('foliageLight')!;
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:StandardMaterial)=>{
    const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=material;return m;
  };
  const cylinder=(name:string,x:number,y:number,z:number,length:number,diameter:number,material:StandardMaterial)=>{
    const m=MeshBuilder.CreateCylinder(name,{height:length,diameter,tessellation:12},scene);m.position.set(x,y,z);m.material=material;return m;
  };
  if(track.id==='orbital-launchyard'){
    const p=serviceConduit,cx=p.x+p.width/2,cy=p.height-p.depth/2;
    const pipe=cylinder('service-crossing-conduit',cx,cy,p.z,p.width,p.depth,metal);pipe.rotation.z=Math.PI/2;
    for(const x of [p.x+2,cx,p.x+p.width-2]){
      const collar=cylinder('conduit-collar',x,cy,p.z,.14,p.depth,structure);collar.rotation.z=Math.PI/2;
      box('conduit-saddle',x,(p.height-p.depth)/2,p.z,.55,p.height-p.depth,p.depth,concrete);
    }
  }else if(track.id==='la-nights'){
    const row=backlotCases;
    box('backlot-loading-pallet',row.x+row.width/2,.06,row.z,row.width,.12,row.depth,dark);
    for(const p of backlotCaseParts()){
      const cx=p.x+p.width/2,base=.15,body=p.height-base;
      box('studio-equipment-case',cx,base+body/2,p.z,p.width,body,p.depth,structure);
      for(const y of [base+.04,p.height-.04]){
        for(const side of [-1,1]){
          box('case-edge-rail',cx,y,p.z+side*(p.depth/2-.035),p.width,.08,.07,metal);
          box('case-edge-rail',cx+side*(p.width/2-.035),y,p.z,.07,.08,p.depth,metal);
        }
      }
      for(const side of [-1,1]){
        for(const end of [-1,1])box('case-corner',cx+side*(p.width/2-.035),base+body/2,p.z+end*(p.depth/2-.035),.07,body,.07,metal);
        box('case-handle',cx,p.height*.55,p.z+side*(p.depth/2-.025),.58,.16,.05,white);
        for(const x of [cx-p.width*.31,cx+p.width*.31]){
          box('case-latch',x,p.height*.62,p.z+side*(p.depth/2-.025),.12,.23,.05,metal);
          const wheel=cylinder('case-caster',x,.075,p.z+side*(p.depth/2-.08),.12,.15,dark);wheel.rotation.x=Math.PI/2;
        }
      }
    }
  }else return;

  const endIds=track.id==='la-nights'?['backlot-west-wing','backlot-east-wing']:['service-hop-left-end','service-hop-right-end'];
  for(const id of endIds){
    const b=track.barriers.find(b=>b.id===id)!;
    const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x0=Math.min(...xs),x1=Math.max(...xs),z=(Math.min(...zs)+Math.max(...zs))/2,depth=Math.max(...zs)-Math.min(...zs);
    if(track.id==='la-nights'){
      box('backlot-planter-base',(x0+x1)/2,b.height/2,z,x1-x0,b.height,depth,concrete);
      box('backlot-planter-soil',(x0+x1)/2,b.height-.06,z,x1-x0-.25,.1,depth-.25,dark);
      for(let x=x0+1;x<x1-.5;x+=1.7){
        const shrub=MeshBuilder.CreateSphere('backlot-planter-shrub',{diameter:1.35,segments:6},scene);shrub.position.set(x,b.height+.35,z);shrub.scaling.y=.8;shrub.material=Math.floor(x)%2?leaf:leafLight;
      }
    }else{
      box('service-plant-bed',(x0+x1)/2,.15,z,x1-x0,.3,depth,concrete);
      for(let x=x0+1.3;x<x1-.8;x+=2.7){
        box('service-valve-cabinet',x,.65,z,2.25,.7,1.45,structure);
        box('service-cabinet-lid',x,.96,z,2.25,.08,1.45,metal);
        for(let k=-.6;k<=.6;k+=.3)box('service-cabinet-vent',x+k,.64,z-.72,.1,.3,.02,metal);
      }
    }
  }
}
