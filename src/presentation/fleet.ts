import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import{FresnelParameters}from'@babylonjs/core/Materials/fresnelParameters';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { Point, TrackDefinition } from '../core/types';
import { CompositionShapes } from './composition-shapes';
import { hex } from './landscape/mesh';
import { cumulative, samplePolyline } from '../core/geometry';
import { roadEdges } from '../core/road-geometry';
import { deckElevation, deckPlanningHeight, deckAt } from '../core/decks';
import { surfaceTexture } from './textures';
import { fleetAppearance as art, type PresentationTheme } from './themes';
import { navalHull, navalProp, vesselFrame } from './fleet-model';

/** Ear clipping keeps concave ship ends faithful to their support footprint. */
export function deckTriangles(ps:Point[]){
 const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),area=ps.reduce((v,p,i)=>v+p.x*ps[(i+1)%ps.length].z-ps[(i+1)%ps.length].x*p.z,0),ids=ps.map((_,i)=>i),out:number[]=[];if(area<0)ids.reverse();
 let budget=ps.length*ps.length;while(ids.length>3&&budget-->0){let found=false;for(let i=0;i<ids.length;i++){const a=ids[(i+ids.length-1)%ids.length],b=ids[i],c=ids[(i+1)%ids.length];if(cross(ps[a],ps[b],ps[c])<=1e-8)continue;if(ids.some(j=>j!==a&&j!==b&&j!==c&&cross(ps[a],ps[b],ps[j])>=-1e-8&&cross(ps[b],ps[c],ps[j])>=-1e-8&&cross(ps[c],ps[a],ps[j])>=-1e-8))continue;out.push(a,b,c);ids.splice(i,1);found=true;break;}if(!found)throw Error('Invalid deck polygon');}if(ids.length===3)out.push(...ids);return out;
}
/** Native naval venue: actual support polygons form the flight decks; all detail shares six batches. */
export function fleetGeometry(track:TrackDefinition){
 const hull=new CompositionShapes(),deck=new CompositionShapes(),paint=new CompositionShapes(),details=new CompositionShapes(),road=new CompositionShapes(),radar=new CompositionShapes();
 const cap=(g:CompositionShapes,ps:Point[],height:(p:Point)=>number,color:string)=>{const ids=ps.map(p=>g.vertex(p.x,height(p),p.z,hex(color))),indices=deckTriangles(ps);for(let i=0;i<indices.length;i+=3)g.triangle(ids[indices[i]],ids[indices[i+1]],ids[indices[i+2]]);};
 for(const d of track.decks??[]){
  cap(deck,d.footprint,p=>deckElevation(p,d)+.015,d.kind==='support-ship'?art.supportDeck:art.deck);
  if(d.kind==='transfer'){
   // A narrow naval gangway with open water below, never a broad solid plinth.
   const ps=d.footprint;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];hull.quad([[a.x,deckElevation(a,d)-.12,a.z],[b.x,deckElevation(b,d)-.12,b.z],[b.x,deckElevation(b,d)-.8,b.z],[a.x,deckElevation(a,d)-.8,a.z]],art.hullShade);}
   const f=d.from!,t=d.to!,length=Math.hypot(t.x-f.x,t.z-f.z),rx=(t.z-f.z)/length,rz=-(t.x-f.x)/length;
   for(const side of[-10.3,10.3]){
    for(let n=0;n<9;n++){const u=n/8,x=f.x+(t.x-f.x)*u+rx*side,z=f.z+(t.z-f.z)*u+rz*side,y=deckElevation({x,z},d);details.beam([x,y-2.4,z],[x,y-.3,z],.08,art.coping,5);if(n){const v=(n-1)/8,px=f.x+(t.x-f.x)*v+rx*side,pz=f.z+(t.z-f.z)*v+rz*side,py=deckElevation({x:px,z:pz},d);details.beam([px,py-2.4,pz],[x,y-.3,z],.1,art.ribs,5);details.beam([px,py-.3,pz],[x,y-.3,z],.08,art.coping,5);}}
   }
   continue;
  }
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
   // Large original deck number, entirely on the outboard parking strip.
   const number=d.id==='carrier-a'?7:4,at=s1-58;
   for(const [x,z,w,depth]of number===7?[[at,-20,9,.6],[at+4,-25,.6,10]]:[[at-3,-25,.6,10],[at+4,-25,.6,10],[at,-23,8,.6]]){
    const g=new CompositionShapes();g.box(x,d.elevation+.05,z,w,.035,depth,art.line);details.instance(g,{x:d.vessel!.origin.x,y:0,z:d.vessel!.origin.z,heading:-Math.atan2(d.vessel!.forward.z,d.vessel!.forward.x)});
   }
  }
 }
 for(const j of track.jumps!.filter(j=>j.rampLength>0)){
  const base=j.takeoffElevation??0;
  for(const side of[-j.width/2,j.width/2]){const a={x:j.from.x+j.forward.z*side,z:j.from.z-j.forward.x*side},b={x:a.x+j.forward.x*j.rampLength,z:a.z+j.forward.z*j.rampLength};hull.quad([[a.x,base-.7,a.z],[b.x,base-.7,b.z],[b.x,base+j.lipHeight,b.z],[a.x,base,a.z]],art.hullShade);}
  for(const side of[-6,-3,0,3,6]){const a={x:j.from.x+j.forward.z*side,z:j.from.z-j.forward.x*side};hull.beam([a.x,base-.16,a.z],[a.x+j.forward.x*j.rampLength,base+j.lipHeight-.16,a.z+j.forward.z*j.rampLength],.12,art.ribs,5);}
 }
 const paths=[track.centerline,...(track.hopShortcuts??[]).map(h=>h.branch)];
 for(const[pi,source]of paths.entries()){
  const ds=cumulative(source),path=Array.from({length:Math.ceil(ds.at(-1)!)+1},(_,i)=>samplePolyline(source,ds,Math.min(i,ds.at(-1)!))),edges=roadEdges(path,track.roadWidth,pi===0);
  for(let i=0;i<path.length-1;i++){
   const mid={x:(path[i].x+path[i+1].x)/2,z:(path[i].z+path[i+1].z)/2};if(!deckAt(mid,track))continue;
   const height=(p:Point)=>deckPlanningHeight(p,track)??deckPlanningHeight(mid,track)??16;
   road.quad([[edges[0][i].x,height(edges[0][i])+.09,edges[0][i].z],[edges[1][i].x,height(edges[1][i])+.09,edges[1][i].z],[edges[1][i+1].x,height(edges[1][i+1])+.09,edges[1][i+1].z],[edges[0][i+1].x,height(edges[0][i+1])+.09,edges[0][i+1].z]],art.asphalt);
   for(const side of[0,1]){const p=edges[side][i],q=edges[side][i+1];paint.beam([p.x,height(p)+.13,p.z],[q.x,height(q)+.13,q.z],.065,art.line,4);}
  }
 }
 for(const b of track.barriers.filter(b=>!b.deckSurfaceId)){
  if(b.id.startsWith('fleet-rail')){
   const a=b.footprint[0],c=b.footprint[1],base=b.baseHeight??0;details.beam([a.x,base+.8,a.z],[c.x,base+.8,c.z],.10,art.coping,5);details.beam([a.x,base+.35,a.z],[c.x,base+.35,c.z],.055,art.coping,4);const count=Math.ceil(Math.hypot(c.x-a.x,c.z-a.z)/3.2);for(let i=0;i<=count;i++){const t=i/count,x=a.x+(c.x-a.x)*t,z=a.z+(c.z-a.z)*t;details.beam([x,base,z],[x,base+1.1,z],.075,art.coping,4);}
  }else navalProp(b,details,radar);
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
 mesh('fleet-hulls',geo.hull,hull);mesh('fleet-decks',geo.deck,deck);mesh('fleet-roads',geo.road,asphalt);mesh('fleet-deck-markings',geo.paint,paint);mesh('fleet-aircraft-islands-equipment',geo.details,detail);
 const sea=new CompositionShapes();sea.quad([[-600,-1.6,-600],[600,-1.6,-600],[600,-1.6,600],[-600,-1.6,600]],'#ffffff');mesh('fleet-harbor-water',sea,water);
 const radars=mesh('fleet-radars',geo.radar,detail,true);
 asphalt.diffuseTexture=surfaceTexture(scene,'asphalt');deck.diffuseTexture=surfaceTexture(scene,'asphalt');hull.specularPower=32;
 const rotorBase=Float32Array.from(geo.radar.positions),rotorNormals=Float32Array.from(geo.radar.toVertexData().normals!),rotorPoints=rotorBase.slice(),rotorDirections=rotorNormals.slice(),centers=track.barriers.filter(b=>!b.deckSurfaceId&&!b.id.includes('aircraft')&&(b.id.includes('island')||b.id.includes('bridge'))).map(b=>({x:b.footprint.reduce((a,q)=>a+q.x,0)/b.footprint.length,z:b.footprint.reduce((a,q)=>a+q.z,0)/b.footprint.length})),owners=Array.from({length:rotorBase.length/3},(_,i)=>centers.reduce((a,b)=>Math.hypot(rotorBase[i*3]-a.x,rotorBase[i*3+2]-a.z)<Math.hypot(rotorBase[i*3]-b.x,rotorBase[i*3+2]-b.z)?a:b));
 return{shadowCasterMaterials:casters,update(time:number,reduced:boolean){const angle=reduced?0:time*.45,c=Math.cos(angle),s=Math.sin(angle),p=rotorPoints,n=rotorDirections;for(let i=0;i<p.length;i+=3){const center=owners[i/3],x=rotorBase[i]-center.x,z=rotorBase[i+2]-center.z;p[i]=center.x+x*c+z*s;p[i+2]=center.z-x*s+z*c;n[i]=rotorNormals[i]*c+rotorNormals[i+2]*s;n[i+2]=-rotorNormals[i]*s+rotorNormals[i+2]*c;}radars.updateVerticesData(VertexBuffer.PositionKind,p);radars.updateVerticesData(VertexBuffer.NormalKind,n);if(water.diffuseTexture&&!reduced){waterTexture.uOffset=time*.002;}}};
}
