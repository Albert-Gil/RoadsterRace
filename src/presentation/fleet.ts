import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import{FresnelParameters}from'@babylonjs/core/Materials/fresnelParameters';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { Point, TrackDefinition } from '../core/types';
import { CompositionShapes } from './composition-shapes';
import { hex, mix } from './landscape/mesh';
import { cumulative, samplePolyline } from '../core/geometry';
import { roadEdges } from '../core/road-geometry';
import { deckElevation, deckPlanningHeight, deckAt } from '../core/decks';
import { jumpCoordinates } from '../core/support';
import { surfaceTexture } from './textures';
import { fleetAppearance as art, type PresentationTheme } from './themes';

/** Ear clipping keeps concave ship ends faithful to their support footprint. */
export function deckTriangles(ps:Point[]){
 const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),area=ps.reduce((v,p,i)=>v+p.x*ps[(i+1)%ps.length].z-ps[(i+1)%ps.length].x*p.z,0),ids=ps.map((_,i)=>i),out:number[]=[];if(area<0)ids.reverse();
 let budget=ps.length*ps.length;while(ids.length>3&&budget-->0){let found=false;for(let i=0;i<ids.length;i++){const a=ids[(i+ids.length-1)%ids.length],b=ids[i],c=ids[(i+1)%ids.length];if(cross(ps[a],ps[b],ps[c])<=1e-8)continue;if(ids.some(j=>j!==a&&j!==b&&j!==c&&cross(ps[a],ps[b],ps[j])>=-1e-8&&cross(ps[b],ps[c],ps[j])>=-1e-8&&cross(ps[c],ps[a],ps[j])>=-1e-8))continue;out.push(a,b,c);ids.splice(i,1);found=true;break;}if(!found)throw Error('Invalid deck polygon');}if(ids.length===3)out.push(...ids);return out;
}
/** Original naval kit: static hull/deck surfaces follow the authored support polygons. */
export function fleetGeometry(track:TrackDefinition){
 const hull=new CompositionShapes(),deck=new CompositionShapes(),paint=new CompositionShapes(),details=new CompositionShapes(),road=new CompositionShapes(),radar=new CompositionShapes();
 const cap=(g:CompositionShapes,ps:Point[],height:(p:Point)=>number,color:string)=>{const ids=ps.map(p=>g.vertex(p.x,height(p),p.z,hex(color)));const indices=deckTriangles(ps);for(let i=0;i<indices.length;i+=3)g.triangle(ids[indices[i]],ids[indices[i+1]],ids[indices[i+2]]);};
 for(const d of track.decks??[]){
  const ps=d.footprint,c={x:ps.reduce((v,p)=>v+p.x,0)/ps.length,z:ps.reduce((v,p)=>v+p.z,0)/ps.length};
  cap(deck,ps,p=>deckElevation(p,d)+.015,d.kind==='support-ship'?art.supportDeck:art.deck);
  if(d.kind==='transfer'){
   for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];hull.quad([[a.x,deckElevation(a,d),a.z],[b.x,deckElevation(b,d),b.z],[b.x,4,b.z],[a.x,4,a.z]],art.hull);}
   continue;
  }
  for(let i=0;i<ps.length;i++){
   const a=ps[i],b=ps[(i+1)%ps.length],at={x:c.x+(a.x-c.x)*.87,z:c.z+(a.z-c.z)*.87},bt={x:c.x+(b.x-c.x)*.87,z:c.z+(b.z-c.z)*.87};
   hull.quad([[a.x,d.elevation,a.z],[b.x,d.elevation,b.z],[bt.x,1.2,bt.z],[at.x,1.2,at.z]],i%3?art.hull:art.hullShade);
   hull.quad([[at.x,1.2,at.z],[bt.x,1.2,bt.z],[bt.x,-3,bt.z],[at.x,-3,at.z]],art.waterline);
   paint.beam([a.x,d.elevation-.35,a.z],[b.x,d.elevation-.35,b.z],.15,art.coping,5);
   const count=Math.floor(Math.hypot(b.x-a.x,b.z-a.z)/5);
   for(let n=1;n<count;n++){const t=n/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;details.beam([x,1.5,z],[x,d.elevation-.6,z],.075,art.ribs,4);details.box(x,d.elevation-.8,z,.4,.3,.4,art.coping);}
  }
 }
 // Regular flight-deck plates, tie-down rows and broad catapult courses are native ship detail.
 for(const d of track.decks!.filter(d=>d.kind==='carrier')){
  const side=d.id==='carrier-a'?1:-1,y=d.elevation;
  for(let x=-110;x<110;x+=8){paint.box(x,y+.045,side*-109,.045,.035,20,art.ribs);for(const z of[-102,-118])paint.box(x,y+.065,side*z,.22,.03,.22,art.line);}
  for(let x=-95;x<95;x+=10)paint.box(x,y+.05,side*-105,5,.04,.45,art.line);
  for(let i=0;i<4;i++)paint.box(-92+i*1.6,y+.06,side*-108,.8,.04,7,art.line);
  paint.box(0,y+.05,side*-100,210,.04,.18,art.line);paint.box(0,y+.052,side*-102,210,.04,.08,art.line);
 }
 // Steel transfer wedges are integral to the carrier edge, under the unchanged physical rise.
 for(const j of track.jumps!.filter(j=>j.rampLength>0)){
  const p=(along:number,side:number)=>({x:j.from.x+j.forward.x*along+j.forward.z*side,z:j.from.z+j.forward.z*along-j.forward.x*side}),base=j.takeoffElevation??0;
  for(const side of[-j.width/2,j.width/2]){const a=p(0,side),b=p(j.rampLength,side);hull.quad([[a.x,base,a.z],[b.x,base,b.z],[b.x,base+j.lipHeight,b.z],[a.x,base,a.z]],art.hullShade);}
  for(const side of[-6,-3,0,3,6]){const a=p(0,side),b=p(j.rampLength,side);hull.beam([a.x,base-.16,a.z],[b.x,base+j.lipHeight-.16,b.z],.12,art.ribs,5);}
 }
 // Broad, readable racing surface. There is no physical or visible deck across a gap.
 const paths=[track.centerline,...(track.hopShortcuts??[]).map(h=>h.branch)];
 for(const [pi,source]of paths.entries()){
  const ds=cumulative(source),path=Array.from({length:Math.ceil(ds.at(-1)!)+1},(_,i)=>samplePolyline(source,ds,Math.min(i,ds.at(-1)!)));
  const edges=roadEdges(path,16,pi===0);
  for(let i=0;i<path.length-1;i++){
   const a=path[i],b=path[i+1],mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
   if(!deckAt(mid,track))continue;
   const height=(p:Point)=>deckPlanningHeight(p,track)??deckPlanningHeight(mid,track)??8;
   road.quad([[edges[0][i].x,height(edges[0][i])+.09,edges[0][i].z],[edges[1][i].x,height(edges[1][i])+.09,edges[1][i].z],[edges[1][i+1].x,height(edges[1][i+1])+.09,edges[1][i+1].z],[edges[0][i+1].x,height(edges[0][i+1])+.09,edges[0][i+1].z]],art.asphalt);
   // Ordinary neutral road edges. No special jump or shortcut markings.
   for(const side of[0,1]){const p=edges[side][i],q=edges[side][i+1];paint.beam([p.x,height(p)+.13,p.z],[q.x,height(q)+.13,q.z],.065,art.line,4);}
  }
 }
 for(const b of track.barriers.filter(b=>!b.deckSurfaceId)){
  const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs),base=b.baseHeight??0;
  if(b.id.startsWith('fleet-rail')){
   const a=b.footprint[0],c=b.footprint[1];details.beam([a.x,base+.8,a.z],[c.x,base+.8,c.z],.10,art.coping,5);details.beam([a.x,base+.35,a.z],[c.x,base+.35,c.z],.055,art.coping,4);for(const p of[a,c])details.beam([p.x,base,p.z],[p.x,base+1.1,p.z],.075,art.coping,4);
  }else if(b.id.includes('aircraft')){
   // Compact original folded-wing deck fighters: broad wings, twin fins and dark canopy.
   details.box(x,base+.55,z,w*.68,.7,d*.25,art.aircraft);
   details.quad([[x-w*.45,base+.7,z],[x+w*.45,base+.7,z],[x+w*.15,base+.75,z+d*.48],[x-w*.16,base+.75,z+d*.48]],art.aircraft);
   details.box(x+w*.18,base+1.12,z,w*.3,.6,d*.18,art.glass);
   for(const side of[-1,1])details.quad([[x-w*.3,base+.6,z+side*d*.17],[x-w*.35,base+2.4,z+side*d*.22],[x-w*.1,base+1.7,z+side*d*.22],[x-w*.08,base+.6,z+side*d*.17]],art.aircraft);
   details.box(x-w*.35,base+.72,z,w*.08,.22,d*.22,art.dark);for(const dx of[-w*.22,w*.25])for(const dz of[-d*.1,d*.1])details.box(x+dx,base+.17,z+dz,.45,.34,.18,art.dark);
  }else{
   details.box(x,base+b.height*.32,z,w,b.height*.64,d,art.hullShade);
   details.box(x,base+b.height*.54,z,w*.94,.2,d*.96,art.coping);
   details.box(x,base+b.height*.83,z,w*.6,b.height*.24,d*.54,art.hullShade);
   for(let i=0;i<4;i++)details.box(x-w*.32+i*w*.21,base+b.height*.48,z-d*.505,w*.13,.6,.03,art.glass);
   details.box(x,base+b.height*.78,z,w*.85,b.height*.28,d*.72,art.coping);
   for(const side of[-1,1])details.box(x,base+b.height*.76,z+side*d*.365,w*.76,.9,.06,art.glass);
   details.beam([x,base+b.height*.91,z],[x,base+b.height,z],.22,art.ribs,6);
   for(const side of[-1,1]){details.beam([x+side*w*.35,base+b.height*.66,z],[x,base+b.height*.98,z],.12,art.coping,5);details.box(x,base+b.height*.9,z+side*d*.22,w*.75,.18,d*.035,art.ribs);}
   details.box(x,base+b.height*.52,z-d*.505,w*.7,.38,.04,art.glass);
   const r=new CompositionShapes();r.box(0,0,0,w*.65,.35,.75,art.coping);radar.instance(r,{x,y:base+b.height-.7,z});
  }
 }
 // Deck equipment is on the outboard parking strip, away from all roads and the touch gate.
 for(const side of[-1,1])for(let i=0;i<10;i++){
  const x=side*(-105+i*17),z=side*-119,y=side===1?12:10;
  details.box(x,y+.4,z,1.2,.8,1.8,art.equipment);
  for(const dz of[-4,4])paint.box(x,y+.04,z+dz,10,.035,.16,art.line);paint.box(x-5,y+.04,z,.16,.035,8,art.line);
  details.box(x,y-.5,z+side*2.5,1.2,1.5,1.1,art.dark);
  for(const dx of[-.4,.4])details.beam([x+dx,y+.15,z-.7],[x+dx,y+.15,z+.7],.15,art.dark,6);
  paint.box(x,y+.025,z+side*2.2,4,.025,.2,art.line);
 }
 // Low quay visible between the returning destroyer and carrier; transfers remain graded.
 for(const part of[road,hull])for(let i=0;i<part.indices.length;i+=3)[part.indices[i+1],part.indices[i+2]]=[part.indices[i+2],part.indices[i+1]];
 return{hull,deck,road,paint,details,radar};
}
export function buildFleet(scene:Scene,track:TrackDefinition,_theme:PresentationTheme,materials:Map<string,StandardMaterial>){
 const casters=new Set<StandardMaterial>(),geo=fleetGeometry(track);
 const mat=(name:string,color:string,shadow=false)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.setAll(.12);m.backFaceCulling=false;m.metadata={absoluteVertexColors:true};materials.set(name,m);if(shadow)casters.add(m);return m;};
 const hull=mat('fleet-hull','#ffffff',true),deck=mat('fleet-deck','#ffffff'),asphalt=mat('asphalt','#ffffff'),paint=mat('fleet-paint','#ffffff'),detail=mat('fleet-equipment','#ffffff',true),water=mat('terrain',art.water);
 water.specularColor.setAll(.25);water.reflectionTexture=scene.environmentTexture;water.reflectionFresnelParameters=new FresnelParameters({bias:.05,power:3,leftColor:new Color3(.22,.22,.22),rightColor:new Color3(.6,.6,.6)});const waterTexture=surfaceTexture(scene,'water');water.diffuseTexture=waterTexture;
 const mesh=(name:string,g:CompositionShapes,m:StandardMaterial,dynamic=false)=>{const mesh=new Mesh(name,scene),data=g.toVertexData();data.uvs=Float32Array.from({length:g.vertexCount*2},(_,i)=>g.positions[Math.floor(i/2)*3+(i%2?2:0)]/12);data.applyToMesh(mesh,dynamic);mesh.material=m;mesh.isPickable=false;if(dynamic)mesh.metadata={dynamicScenery:true};return mesh;};
 mesh('fleet-hulls',geo.hull,hull);mesh('fleet-decks',geo.deck,deck);mesh('fleet-roads',geo.road,asphalt);mesh('fleet-deck-markings',geo.paint,paint);mesh('fleet-aircraft-islands-equipment',geo.details,detail);
 const sea=new CompositionShapes();sea.quad([[-600,-1.6,-600],[600,-1.6,-600],[600,-1.6,600],[-600,-1.6,600]],'#ffffff');mesh('fleet-harbor-water',sea,water);
 const radars=mesh('fleet-radars',geo.radar,detail,true);
 asphalt.diffuseTexture=surfaceTexture(scene,'asphalt');deck.diffuseTexture=surfaceTexture(scene,'concrete');hull.specularPower=32;
 const rotorBase=Float32Array.from(geo.radar.positions),rotorNormals=Float32Array.from(geo.radar.toVertexData().normals!),rotorPoints=rotorBase.slice(),rotorDirections=rotorNormals.slice(),centers=track.barriers.filter(b=>!b.deckSurfaceId&&!b.id.includes('aircraft')&&!b.id.startsWith('fleet-rail')).map(b=>({x:b.footprint.reduce((a,q)=>a+q.x,0)/b.footprint.length,z:b.footprint.reduce((a,q)=>a+q.z,0)/b.footprint.length})),owners=Array.from({length:rotorBase.length/3},(_,i)=>centers.reduce((a,b)=>Math.hypot(rotorBase[i*3]-a.x,rotorBase[i*3+2]-a.z)<Math.hypot(rotorBase[i*3]-b.x,rotorBase[i*3+2]-b.z)?a:b));
 return{shadowCasterMaterials:casters,update(time:number,reduced:boolean){const angle=reduced?0:time*.45,c=Math.cos(angle),s=Math.sin(angle),p=rotorPoints,n=rotorDirections;for(let i=0;i<p.length;i+=3){const center=owners[i/3],x=rotorBase[i]-center.x,z=rotorBase[i+2]-center.z;p[i]=center.x+x*c+z*s;p[i+2]=center.z-x*s+z*c;n[i]=rotorNormals[i]*c+rotorNormals[i+2]*s;n[i+2]=-rotorNormals[i]*s+rotorNormals[i+2]*c;}radars.updateVerticesData(VertexBuffer.PositionKind,p);radars.updateVerticesData(VertexBuffer.NormalKind,n);if(water.diffuseTexture&&!reduced){waterTexture.uOffset=time*.002;}}};
}
