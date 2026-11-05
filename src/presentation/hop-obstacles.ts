import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TrackDefinition } from '../core/types';
import { backlotCaseParts, backlotCases, rocketYardTip, serviceConduit, utilityWing, quayPlanter } from '../core/tracks/hop-obstacles';
import { buildingGeometry } from './building-geometry';

/** Unmarked, venue-appropriate props for the authored manual-Hop lanes. */
export function buildHopObstacles(scene: Scene, track: TrackDefinition, materials: Map<string, StandardMaterial>) {
  const concrete=materials.get('barrier-concrete')!, metal=materials.get('galvanized-rail')!, dark=materials.get('race-charcoal')!;
  const white=materials.get('architecture')!, structure=materials.get('architecture-trim')!, leaf=materials.get('foliage')!, leafLight=materials.get('foliageLight')!;
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:StandardMaterial)=>{
    const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=material;return m;
  };
  const cylinder=(name:string,x:number,y:number,z:number,length:number,diameter:number,material:StandardMaterial)=>{
    const m=MeshBuilder.CreateCylinder(name,{height:length,diameter,tessellation:12},scene);m.position.set(x,y,z);m.material=material;return m;
  };
  if(track.id==='golden-gate'){
    const p=quayPlanter,cx=p.x+p.width/2;
    box('quay-planter-base',cx,.39,p.z,p.width,.78,p.depth,concrete);
    box('quay-planter-soil',cx,.77,p.z,p.width-.18,.08,p.depth-.18,dark);
    for(let x=p.x+.5;x<p.x+p.width;x+=.75){const shrub=MeshBuilder.CreateSphere('quay-planter-shrub',{diameter:.72,segments:6},scene);shrub.position.set(x,.96,p.z);shrub.scaling.set(1,.65,1);shrub.material=Math.floor(x)%2?leaf:leafLight;}
    return;
  }else if(track.id==='orbital-launchyard'){
    const p=serviceConduit,cx=p.x+p.width/2,cy=p.height-p.depth/2;
    const pipe=cylinder('service-crossing-conduit',cx,cy,p.z,p.width,p.depth,metal);pipe.rotation.z=Math.PI/2;
    for(const x of [p.x+2,cx,p.x+p.width-2]){
      const collar=cylinder('conduit-collar',x,cy,p.z,.14,p.depth,structure);collar.rotation.z=Math.PI/2;
      box('conduit-saddle',x,(p.height-p.depth)/2,p.z,.55,p.height-p.depth,p.depth,concrete);
    }
    // The hairpin wing (v10): the tank plinth's concrete curb carrying one low pipe on saddles.
    // The pipe's top is the obstacle height; nothing marks it as a way through.
    const w=utilityWing, curbData=buildingGeometry(w.footprint,w.curb,0).toVertexData(), curb=new Mesh('utility-wing-curb',scene);
    curbData.colors=null;curbData.uvs=new Float32Array(curbData.positions!.length/3*2);curbData.applyToMesh(curb);curb.material=materials.get('embankment')??concrete;
    const d=.34,y=w.height-d/2,wingPipe=cylinder('utility-wing-pipe',-2,y,43,15.5,d,materials.get('orbital-metal')??metal);wingPipe.rotation.z=Math.PI/2;
    for(const x of [-8,-3,2])box('utility-wing-saddle',x,(w.curb+y)/2,43,.3,y-w.curb,.45,structure);
    // The rocket yard's low tip (v10): a curb carrying a two-pipe rack, 1.3 m in all, so a Hop clears it.
    const tip=rocketYardTip.footprint,x0=tip[0].x,x1=tip[1].x,z0=tip[0].z,z1=tip[2].z,tx=(x0+x1)/2,tz=(z0+z1)/2;
    box('yard-tip-curb',tx,.225,tz,x1-x0,.45,z1-z0,materials.get('embankment')??concrete);
    for(const [dz,py] of [[-.55,.78],[.55,1.13]] as const){
      const rack=cylinder('yard-tip-pipe',tx,py,tz+dz,x1-x0-.6,.34,materials.get('orbital-metal')??metal);rack.rotation.z=Math.PI/2;
    }
    for(let x=x0+1;x<x1-.5;x+=3.4)box('yard-tip-rack',x,(.45+.96)/2,tz,.25,.96-.45,z1-z0-.4,structure);
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
