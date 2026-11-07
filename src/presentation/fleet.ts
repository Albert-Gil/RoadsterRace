import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import{FresnelParameters}from'@babylonjs/core/Materials/fresnelParameters';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { Point, TrackDefinition } from '../core/types';
import { CompositionShapes } from './composition-shapes';
import { hex } from './landscape/mesh';
import { deckElevation, deckPlanningHeight, deckAt } from '../core/decks';
import { surfaceTexture } from './textures';
import { fleetAppearance as art, type PresentationTheme } from './themes';
import { navalHull, navalProp, vesselFrame } from './fleet-model';
import {carrierDeckSignature,aircraftApron} from './fleet-outfit';

import { carrierLaneGeometry } from './fleet-carrier-lane';
export { deckTriangles } from './fleet-deck-shapes';
import { deckTriangles } from './fleet-deck-shapes';

/** Native naval venue: actual support polygons form the flight decks; all detail shares six batches. */
export function fleetGeometry(track:TrackDefinition){
 const hull=new CompositionShapes(),deck=new CompositionShapes(),paint=new CompositionShapes(),details=new CompositionShapes(),road=new CompositionShapes(),radar=new CompositionShapes();
 const cap=(g:CompositionShapes,ps:Point[],height:(p:Point)=>number,color:string)=>{const ids=ps.map(p=>g.vertex(p.x,height(p),p.z,hex(color))),indices=deckTriangles(ps);for(let i=0;i<indices.length;i+=3)g.triangle(ids[indices[i]],ids[indices[i+1]],ids[indices[i+2]]);};
 for(const d of track.decks??[]){
  if(d.rampId)continue; // Render the authoritative wedge once, with its full sloping top below.
  cap(deck,d.footprint,p=>deckElevation(p,d)+art.drivingOffset,d.kind==='support-ship'?art.supportDeck:art.deck);

  navalHull(d,hull,paint,details);
  const frame=vesselFrame(d),local=d.footprint.map(frame.local),s0=Math.min(...local.map(p=>p.x)),s1=Math.max(...local.map(p=>p.x));
  // Contact scuppers, horizontal hull seams, subdued foam around the stationary waterline.
  for(let edge=0;edge<local.length;edge++){
   const a=local[edge],b=local[(edge+1)%local.length],count=Math.floor(Math.hypot(b.x-a.x,b.z-a.z)/9);
   for(let n=1;n<count;n++){const t=n/count,s=a.x+(b.x-a.x)*t,side=a.z+(b.z-a.z)*t;
    paint.beam(frame.world(s*.9,side*.59,-1.47),frame.world(s*.9+2,side*.59,-1.47),.13,art.foam,4);
    if(n%3===0){const p=frame.world(s,side,d.elevation-.7);details.beam([p[0],p[1]-2,p[2]],[p[0],p[1]+.1,p[2]],.25,art.dark,7);}
   }
  }
  if(d.kind==='carrier'){
   // Aviation deck language: arrestor courses, catapult stripes, plate seams and tie-down stars.
   for(let s=s0+18;s<s1-26;s+=8)for(const t of[-19,24]){const p=frame.world(s,t,d.elevation+.05);if(deckAt({x:p[0],z:p[2]},track)?.id!==d.id)continue;paint.beam(frame.world(s-.38,t,d.elevation+.055),frame.world(s+.38,t,d.elevation+.055),.055,art.line,4);paint.beam(frame.world(s,t-.38,d.elevation+.055),frame.world(s,t+.38,d.elevation+.055),.055,art.line,4);}
   for(const t of[-24,-22])for(let s=s0+24;s<s1-35;s+=12)paint.beam(frame.world(s,t,d.elevation+.06),frame.world(s+6,t,d.elevation+.06),.11,art.line,4);
   for(let s=s0+35;s<s1-30;s+=12)paint.beam(frame.world(s,-31,d.elevation+.035),frame.world(s,-16,d.elevation+.035),.035,art.ribs,4);
   for(let i=0;i<5;i++)paint.beam(frame.world(s0+28+i*2,-28,d.elevation+.065),frame.world(s0+28+i*2,-16,d.elevation+.065),.23,art.line,4);
   carrierDeckSignature(track,d,frame,paint);
  }
 }
 for(const j of track.jumps!.filter(j=>j.rampLength>0)){
  const base=j.takeoffElevation??0;
  const at=(along:number,across:number,y:number):number[]=>[j.from.x+j.forward.x*along+j.forward.z*across,y,j.from.z+j.forward.z*along-j.forward.x*across];
  // Raised steel ski-jump: the shape, rather than a sign, identifies automatic takeoff.
  deck.quad([at(0,-j.width/2,base+art.drivingOffset),at(j.rampLength,-j.width/2,base+j.lipHeight+art.drivingOffset),at(j.rampLength,j.width/2,base+j.lipHeight+art.drivingOffset),at(0,j.width/2,base+art.drivingOffset)].reverse(),art.rampSurface);
  for(const side of[-1,1]){
   const across=side*(j.width/2-.32);
   paint.beam(at(0,across,base+.16),at(j.rampLength,across,base+j.lipHeight+.16),.25,art.rampEdge,5);
   for(let n=1;n<5;n++){const a=j.rampLength*n/5;details.beam(at(a,side*j.width/2,base-.3),at(a,side*j.width/2,base+j.lipHeight*n/5-.15),.12,art.ribs,5);}
  }
  for(let n=1;n<10;n++){const a=j.rampLength*n/10,y=base+j.lipHeight*n/10+.13;paint.beam(at(a,-j.width/2+.6,y),at(a,j.width/2-.6,y),.055,art.rampRibs,4);}
  details.beam(at(j.rampLength,-j.width/2,base+j.lipHeight-.16),at(j.rampLength,j.width/2,base+j.lipHeight-.16),.22,art.coping,6);
  for(const side of[-j.width/2,j.width/2]){const a={x:j.from.x+j.forward.z*side,z:j.from.z-j.forward.x*side},b={x:a.x+j.forward.x*j.rampLength,z:a.z+j.forward.z*j.rampLength};hull.quad([[a.x,base-.7,a.z],[b.x,base-.7,b.z],[b.x,base+j.lipHeight,b.z],[a.x,base,a.z]],art.hullShade);}
  for(const side of[-6,-3,0,3,6]){const a={x:j.from.x+j.forward.z*side,z:j.from.z-j.forward.x*side};hull.beam([a.x,base-.16,a.z],[a.x+j.forward.x*j.rampLength,base+j.lipHeight-.16,a.z+j.forward.z*j.rampLength],.12,art.ribs,5);}
 }
 // Carrier runway lanes share existing floor/paint batches; the other ships stay unmarked.
 const lane=carrierLaneGeometry(track);deck.instance(lane.floor,{x:0,y:0,z:0});paint.instance(lane.markings,{x:0,y:0,z:0});details.instance(lane.kerbs,{x:0,y:0,z:0});

 for(const b of track.barriers.filter(b=>!b.deckSurfaceId)){
  if(b.id.startsWith('fleet-rail')){
   const a=b.footprint[0],c=b.footprint[1],base=b.baseHeight??0;details.beam([a.x,base+.8,a.z],[c.x,base+.8,c.z],.10,art.coping,5);details.beam([a.x,base+.35,a.z],[c.x,base+.35,c.z],.055,art.coping,4);const count=Math.ceil(Math.hypot(c.x-a.x,c.z-a.z)/3.2);for(let i=0;i<=count;i++){const t=i/count,x=a.x+(c.x-a.x)*t,z=a.z+(c.z-a.z)*t;details.beam([x,base,z],[x,base+1.1,z],.075,art.coping,4);}
  }else {if(b.id.includes('parked-aircraft')||b.equipmentKind==='early-warning-aircraft'||b.equipmentKind==='transport-helicopter')aircraftApron(b,paint);navalProp(b,details,radar);}
 }
 for(let i=0;i<road.indices.length;i+=3)[road.indices[i+1],road.indices[i+2]]=[road.indices[i+2],road.indices[i+1]];
 return{hull,deck,road,paint,details,radar};
}
export function buildFleet(scene:Scene,track:TrackDefinition,_theme:PresentationTheme,materials:Map<string,StandardMaterial>){
 const casters=new Set<StandardMaterial>(),geo=fleetGeometry(track);
 const mat=(name:string,color:string,shadow=false)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.setAll(.12);m.backFaceCulling=false;m.metadata={absoluteVertexColors:true};materials.set(name,m);if(shadow)casters.add(m);return m;};
 const hull=mat('fleet-hull','#ffffff',true),deck=mat('fleet-deck','#ffffff'),asphalt=mat('asphalt','#ffffff'),paint=mat('fleet-paint','#ffffff'),detail=mat('fleet-equipment','#ffffff',true),water=mat('terrain',art.water);
 // A baked ambient fill keeps the tall, shaded steel sides readable without adding a light or pass.
 hull.emissiveColor=Color3.FromHexString(art.hullFill);
 water.specularColor.setAll(.25);water.reflectionTexture=scene.environmentTexture;water.reflectionFresnelParameters=new FresnelParameters({bias:.05,power:3,leftColor:new Color3(.22,.22,.22),rightColor:new Color3(.6,.6,.6)});const waterTexture=surfaceTexture(scene,'water');water.diffuseTexture=waterTexture;waterTexture.uScale=.28;waterTexture.vScale=.28;
 const mesh=(name:string,g:CompositionShapes,m:StandardMaterial,dynamic=false)=>{const mesh=new Mesh(name,scene),data=g.toVertexData();data.uvs=Float32Array.from({length:g.vertexCount*2},(_,i)=>g.positions[Math.floor(i/2)*3+(i%2?2:0)]/12);data.applyToMesh(mesh,dynamic);mesh.material=m;mesh.isPickable=false;if(dynamic)mesh.metadata={dynamicScenery:true};return mesh;};
 mesh('fleet-hulls',geo.hull,hull);mesh('fleet-decks',geo.deck,deck);mesh('fleet-deck-markings',geo.paint,paint);mesh('fleet-aircraft-islands-equipment',geo.details,detail);
 const sea=new CompositionShapes();sea.quad([[-600,-1.6,-600],[600,-1.6,-600],[600,-1.6,600],[-600,-1.6,600]],'#ffffff');mesh('fleet-harbor-water',sea,water);
 const radars=mesh('fleet-radars',geo.radar,detail,true);
 asphalt.diffuseTexture=surfaceTexture(scene,'asphalt');deck.diffuseTexture=surfaceTexture(scene,'asphalt');hull.specularPower=32;
 const rotorBase=Float32Array.from(geo.radar.positions),rotorNormals=Float32Array.from(geo.radar.toVertexData().normals!),rotorPoints=rotorBase.slice(),rotorDirections=rotorNormals.slice();
 const centers=track.barriers.filter(b=>!b.deckSurfaceId&&!b.equipmentKind&&(b.id.includes('island')||b.id.includes('bridge')||b.id.includes('aircraft')&&b.id.endsWith('-92'))).map(b=>({x:b.footprint.reduce((a,q)=>a+q.x,0)/b.footprint.length,z:b.footprint.reduce((a,q)=>a+q.z,0)/b.footprint.length,speed:b.id.includes('aircraft')?8:.45}));
 const owners=Array.from({length:rotorBase.length/3},(_,i)=>centers.reduce((best,b,n)=>Math.hypot(rotorBase[i*3]-b.x,rotorBase[i*3+2]-b.z)<Math.hypot(rotorBase[i*3]-centers[best].x,rotorBase[i*3+2]-centers[best].z)?n:best,0));
 const turnCos=new Float64Array(centers.length),turnSin=new Float64Array(centers.length);
 return{shadowCasterMaterials:casters,update(time:number,reduced:boolean){
  for(let i=0;i<centers.length;i++){const a=reduced?0:time*centers[i].speed;turnCos[i]=Math.cos(a);turnSin[i]=Math.sin(a);}const p=rotorPoints,n=rotorDirections;
  for(let i=0;i<p.length;i+=3){const owner=owners[i/3],t=centers[owner],c=turnCos[owner],s=turnSin[owner],x=rotorBase[i]-t.x,z=rotorBase[i+2]-t.z;p[i]=t.x+x*c+z*s;p[i+2]=t.z-x*s+z*c;n[i]=rotorNormals[i]*c+rotorNormals[i+2]*s;n[i+2]=-rotorNormals[i]*s+rotorNormals[i+2]*c;}
  radars.updateVerticesData(VertexBuffer.PositionKind,p);radars.updateVerticesData(VertexBuffer.NormalKind,n);if(water.diffuseTexture&&!reduced)waterTexture.uOffset=time*.002;
 }};
}
