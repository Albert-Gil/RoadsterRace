import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { TrackDefinition, Point } from '../core/types';
import { roadEdges } from '../core/road-geometry';
import { roadHeight, roadSupportWidth } from '../core/elevation';
import { laxTerminals, laxApronAircraft, laxCargoAprons, laxPlanting } from '../core/tracks/lax';
import { cumulative, projectToPolyline } from '../core/geometry';
import { CompositionShapes } from './composition-shapes';
import { RenderedSurface } from './rendered-surface';
import { laxAppearance as art, type PresentationTheme } from './themes';
import { surfaceTexture } from './textures';
import { hex } from './landscape/mesh';

type V=number[];
/** Original airliner kit, reusable at different apron scales, with no individual draw calls. */
function airliner(g:CompositionShapes,paint:CompositionShapes,x:number,z:number,scale=1,heading=0,tail=art.livery[0]){
 const at=(a:number,b:number,c:number):V=>[x+(a*Math.cos(heading)+c*Math.sin(heading))*scale,b*scale,z+(-a*Math.sin(heading)+c*Math.cos(heading))*scale];
 const quad=(p:V[],color:string)=>g.quad(p.map(v=>at(...v as[number,number,number])),color);
 // Ringed fuselage: pointed nose, cabin barrel, tapered tail. Flat underside rests on gear.
 const rings=[[-18,.15,2.8],[-15,1.7,3.5],[-11,2,3.7],[9,2,3.7],[15,1,4],[18,.2,4.5]],ids=rings.map(([s,r,h])=>Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,p=at(Math.cos(a)*r,h+Math.sin(a)*r,s);return g.vertex(p[0],p[1],p[2],hex(i<6?art.aircraft:art.aircraftShade));}));
 for(let r=0;r<ids.length-1;r++)for(let n=0;n<12;n++){const k=(n+1)%12;g.triangle(ids[r][n],ids[r+1][k],ids[r][k]);g.triangle(ids[r][n],ids[r+1][n],ids[r+1][k]);}
 for(const side of[-1,1]){
  quad([[side*1.5,3.3,-1],[side*11.5,2.6,6],[side*10,2.7,9],[side*1.4,3.5,5]],art.wing);
  quad([[side*1,4.2,12],[side*4.8,4.2,16],[side*4.6,4.2,18],[side*.5,4.2,16]],tail);
  g.beam(at(side*5.7,2,3),at(side*5.7,2,7),1.05*scale,art.engine,12);
  g.beam(at(side*5.7,2,2.95),at(side*5.7,2,3.1),.73*scale,art.dark,12);
  for(let j=-10;j<=8;j+=1.3){const a=at(side*1.94,4.15,j),b=at(side*1.94,4.15,j+.55);paint.beam(a,b,.17*scale,art.glass,4);}
  g.beam(at(side*1.3,.6,-11),at(side*1.3,2.7,-11),.13*scale,art.dark,6);
  for(const zz of[-11,4])g.beam(at(side*1.5,.6,zz-.45),at(side*1.5,.6,zz+.45),.48*scale,art.dark,8);
 }
 quad([[-.1,4,12],[-.1,10,16],[-.1,10,18],[-.1,4,18]],tail);
 quad([[.1,4,18],[.1,10,18],[.1,10,16],[.1,4,12]],tail);
 quad([[-1.2,4.3,-15],[-.6,5,-13],[.6,5,-13],[1.2,4.3,-15]],art.glass);
}
function digits(g:CompositionShapes,n:number,x:number,y:number,z:number,scale=1){
 const shapes=['abcdef','bc','abged','abgcd','fgbc','afgcd','afgecd','abc','abcdefg','abfgcd'];
 const seg:Record<string,number[][]>={a:[[0,2],[1,2]],b:[[1,2],[1,1]],c:[[1,1],[1,0]],d:[[0,0],[1,0]],e:[[0,0],[0,1]],f:[[0,1],[0,2]],g:[[0,1],[1,1]]};
 for(const [i,d] of [...String(n)].entries())for(const s of shapes[+d]){const [a,b]=seg[s];g.beam([x+(i*1.5+a[0])*scale,y,z+a[1]*scale],[x+(i*1.5+b[0])*scale,y,z+b[1]*scale],.12*scale,art.marking,4);}
}
export function laxGeometry(track:TrackDefinition){
 const ground=new CompositionShapes(),road=new CompositionShapes(),concrete=new CompositionShapes(),structure=new CompositionShapes(),glass=new CompositionShapes(),equipment=new CompositionShapes(),paint=new CompositionShapes(),plants=new CompositionShapes();
 ground.box(0,-.2,20,2400,.3,2400,art.ground);
 concrete.box(0,-.05,28,258,.08,290,art.apron);
 // Two parallel runways on each side of the terminal horseshoe. The inner pair carries the race.
 for(const side of[-1,1]){
  const x=side*153;ground.box(x,.005,24,19,.04,430,art.runway);
  for(let z=-170;z<230;z+=15)paint.box(x,.06,z,.38,.02,7,art.marking);
  for(const end of[-107,145])for(let j=-3;j<=3;j++)paint.box(x+j*1.65,.06,end,1,.02,9,art.marking);
  digits(paint,side<0?25:7,x-2,.08,-88,1.3);
  for(let z=-106;z<150;z+=9)for(const xx of[-10,10])paint.box(x+xx,.10,z,.32,.16,.32,art.blue);
 }
 const addRoad=(path:Point[],closed:boolean,width:number,isBranch=false)=>{
  const [a,b]=roadEdges(path,width,closed),ds=cumulative(path);
  const height=(i:number)=>path[i].y??roadHeight(track,projectToPolyline(path[i],track.centerline,track.distances).progress);
  const shoulders=roadEdges(path,2,closed).map(edge=>edge.map((p,i)=>{
   const width=isBranch?18:roadSupportWidth(track,track.distances[i]);
   return{x:path[i].x+(p.x-path[i].x)*width/2,z:path[i].z+(p.z-path[i].z)*width/2};
  }));
  for(let i=0;i<path.length-1;i++){
   const h=height(i),hn=height(i+1);
   road.quad([[a[i].x,h+.04,a[i].z],[b[i].x,h+.04,b[i].z],[b[i+1].x,hn+.04,b[i+1].z],[a[i+1].x,hn+.04,a[i+1].z]].reverse(),art.asphalt);
   if(h>.15||hn>.15){
    const [l,r]=shoulders;concrete.quad([[l[i].x,h+.01,l[i].z],[r[i].x,h+.01,r[i].z],[r[i+1].x,hn+.01,r[i+1].z],[l[i+1].x,hn+.01,l[i+1].z]].reverse(),art.concrete);
    for(const edge of shoulders)structure.quad([[edge[i].x,h-.8,edge[i].z],[edge[i+1].x,hn-.8,edge[i+1].z],[edge[i+1].x,hn,edge[i+1].z],[edge[i].x,h,edge[i].z]],art.fascia);
    if(i%18===0&&h>2)structure.box(path[i].x,h/2-.4,path[i].z,2.2,h-.8,2.2,art.concrete);
   }
   if(!isBranch)for(const edge of[a,b])paint.beam([edge[i].x,h+.09,edge[i].z],[edge[i+1].x,hn+.09,edge[i+1].z],.14,art.marking,4);
   if(!isBranch&&i>0){
    const before=path[i-1],after=path[i+1],turn=Math.abs((path[i].x-before.x)*(after.z-path[i].z)-(path[i].z-before.z)*(after.x-path[i].x));
    if(turn>.012)for(const edge of[a,b])paint.beam([edge[i].x,h+.08,edge[i].z],[edge[i+1].x,hn+.08,edge[i+1].z],.38,Math.floor(ds[i]/3)%2?art.marking:art.kerb,4);
   }
   if(!isBranch&&Math.floor(ds[i]/9)!==Math.floor((ds[i-1]??-1)/9)&&Math.abs(path[i+1].x-path[i].x)<.05)paint.beam([path[i].x,h+.09,path[i].z],[path[i].x,hn+.09,path[i].z+(path[i+1].z-path[i].z>0?3:-3)],.11,art.yellow,4);
  }
 };
 addRoad(track.centerline,true,16);for(const lane of track.hopShortcuts??[])addRoad(lane.branch,false,16,true);
 // Seven terminals, numbered in horseshoe order, with jet bridges and apron gate aircraft.
 const terminals=laxTerminals;
 terminals.forEach(([x,z],i)=>{
  const head=i===3,w=head?40:20,d=head?14:32;
  concrete.box(x,.22,z,w+1,.45,d+1,art.concrete);
  structure.box(x,3.6,z,w,6.6,d,art.terminal);
  glass.box(x,4.6,z,w+.1,2.5,d+.1,art.glass);
  structure.box(x,6.45,z,w+2,.42,d+2,art.roof);
  for(let n=-d/2+1;n<d/2;n+=4)structure.box(x,4.6,z+n,w+.25,2.8,.24,art.frame);
  // Barrel vault sections, rooftop plant and deep shaded curbside canopies.
  for(let n=-w/2+2;n<w/2;n+=4){
   let prev:V|undefined;for(let j=0;j<=12;j++){const t=j/12,p=[x+n,6.7+Math.sin(t*Math.PI)*1.1,z-d/2+t*d];if(prev)structure.beam(prev,p,.14,art.frame,5);prev=p;}
  }
  for(let n=-1;n<=1;n++)equipment.box(x+n*5,7,z,3,.9,5,art.metal);
  paint.box(x+6,6.74,z,5,.05,7,art.blue);digits(paint,i+1,x+5,6.81,z-2.5,1.9);
  for(let j=0;j<12;j++){
   const t=j/12,u=(j+1)/12,y=6.8+Math.sin(t*Math.PI)*.9,yn=6.8+Math.sin(u*Math.PI)*.9;
   glass.quad([[x-3,y,z-d/2+2+t*(d-4)],[x+3,y,z-d/2+2+t*(d-4)],[x+3,yn,z-d/2+2+u*(d-4)],[x-3,yn,z-d/2+2+u*(d-4)]],art.skylight);
  }
  if(head)return;
  const side=Math.sign(x),ap=x+side*23;
  airliner(equipment,glass,ap,z,.74,side<0?0:Math.PI,art.livery[i%art.livery.length]);
  structure.box(x+side*14,3.2,z+7,8,2.5,2.8,art.terminal);
  glass.box(x+side*14,3.5,z+7,8.1,.8,2.9,art.glass);
  for(let q=0;q<3;q++){equipment.box(x+side*21,.8,z+17+q*2.2,2,1.3,1.5,art.yellow);equipment.beam([x+side*21,.4,z+16+q*2.2],[x+side*21,.4,z+17+q*2.2],.08,art.dark,4);}
  // Tow tractor, covered baggage dollies and a boarding-stair assembly share the equipment batch.
  equipment.box(ap+side*5,.9,z-15,2.2,1.5,3,art.yellow);glass.box(ap+side*5,1.8,z-15.4,1.6,.65,1.4,art.glass);
  for(let n=0;n<4;n++){equipment.box(ap-side*5,.9,z+8+n*2,2.3,1.1,1.6,art.service);equipment.box(ap-side*5,1.6,z+8+n*2,2.1,.4,1.5,art.terminal);}
  for(let n=0;n<9;n++)equipment.box(x+side*18,.25+n*.18,z-7+n*.34,2,.22,.36,art.concrete);
  for(const xx of[-.95,.95])structure.beam([x+side*18+xx,.9,z-7],[x+side*18+xx,2.6,z-4.2],.07,art.metal,5);
  // Curbside covered walkway and close-to-track foundations, kept inside the terminal parcel.
  structure.box(x-side*9.4,4.5,z,1.3,.28,29,art.roof);
  for(let zz=z-13;zz<=z+13;zz+=6.5)structure.beam([x-side*9.5,0,zz],[x-side*9.5,4.5,zz],.18,art.frame,6);
  for(const offset of[-10,10]){
   // Original gate stand markings, jet blast clearance arcs and taxiway lead-in.
   paint.beam([ap-7,.08,z+offset],[ap+7,.08,z+offset],.12,art.yellow,4);
   paint.beam([ap,.08,z+offset],[ap,.08,z],.09,art.yellow,4);
  }
 });
 // Theme Building: four sweeping concrete arches, restaurant disc and shaded glazing.
 concrete.box(0,3,-32,42,6,112,art.parking);
 for(const axis of[0,Math.PI/2])for(const sign of[-1,1]){
  let prev:V|undefined;for(let i=0;i<=20;i++){const t=i/20,x=Math.sin(axis)*sign*(18*(1-t)),z=-6+Math.cos(axis)*sign*(18*(1-t)),y=6+Math.sin(t*Math.PI/2)*17;if(prev)structure.beam(prev,[x,y,z],.7,art.terminal,8);prev=[x,y,z];}
 }
 structure.beam([0,18,-6],[0,20.3,-6],8.2,art.roof,32);
 glass.beam([0,17,-6],[0,18.7,-6],7.5,art.glass,32);
 structure.beam([0,16.6,-6],[0,17,-6],8.1,art.terminal,32);
 // LAX-like tall control cab, antenna and apron service roads on the protected parking island.
 structure.box(0,18,-58,4,24,4,art.tower);structure.box(0,30.5,-58,9,2,8,art.roof);glass.box(0,29,-58,8,2,7,art.glass);structure.beam([0,31.5,-58],[0,36,-58],.15,art.metal,7);
 for(let z=-80;z<13;z+=6)for(const x of[-15,15]){paint.box(x,6.04,z,5,.03,.12,art.marking);if(Math.abs(z+6)>12){equipment.box(x,6.9,z+2,2.5,1.7,4,art.livery[Math.abs(Math.round(z))%3]);glass.box(x,7.5,z+2,2.2,.6,2,art.glass);}}
 for(const x of[-20.6,20.6])structure.box(x,6.45,-32,.45,.9,111,art.concrete);
 // Threshold piano keys make the two main straights read as runways from the overview.
 for(const side of[-1,1])for(const z of[-65,108]){
  for(let n=-4;n<=4;n++)paint.box(side*110+n*1.35,.10,z,.72,.035,7,art.marking);
  digits(paint,side<0?25:7,side*110-2,.10,z+(z<0?10:-14),1.45);
 }
 // Physical shortcut equipment. Ordinary service props, with no shortcut lettering or special paint.
 for(const b of track.barriers){
  if(b.id.startsWith('lax-departures-rail')){const f=b.footprint,a={x:(f[0].x+f[3].x)/2,z:(f[0].z+f[3].z)/2},c={x:(f[1].x+f[2].x)/2,z:(f[1].z+f[2].z)/2},h=b.baseHeight??0;structure.beam([a.x,h+.9,a.z],[c.x,h+.9,c.z],.18,art.metal,6);structure.beam([a.x,h,a.z],[a.x,h+1.1,a.z],.12,art.metal,5);}
  else if(b.id.includes('center-way')){
   const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs);
   if(b.id==='lax-center-way-equipment')for(let n=0;n<6;n++){
    const zz=z-d/2+(n+.5)*d/6,h=n%2?1.8:1.6;
    equipment.box(x,6+h/2,zz,w,h,d/6-.18,art.service);
    for(const side of[-1,1])glass.panelX(x+side*(w/2+.01),6+h*.56,zz,1.5,.6,art.hangar,side);
    for(let r=0;r<4;r++)equipment.box(x,6+h-.12,zz-.6+r*.4,w+.02,.06,.09,art.metal);
   }else{structure.box(x,6+b.height/2,z,w,b.height,d,art.service);for(let zz=z-d/2+.6;zz<z+d/2;zz+=1.4)equipment.box(x,6+b.height+.03,zz,w+.02,.06,.13,art.metal);}
  }
  else if(b.id.includes('terminal-parcel')||b.id==='lax-north-garden'){
   const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs),base=b.baseHeight??0;
   concrete.box(x,base+.1,z,w,.2,d,art.concrete);
   for(let i=0;i<b.footprint.length;i++){const a=b.footprint[i],c=b.footprint[(i+1)%b.footprint.length];structure.beam([a.x,base+b.height-.12,a.z],[c.x,base+b.height-.12,c.z],.20,art.concrete,4);}
   if(b.id==='lax-north-garden')plants.box(x,base+.23,z,w-1,.06,d-1,art.plant);
  }
 }
 // Large apron aircraft, cargo hangars, fuel bowsers and airport fire rescue.
 for(const [x,z,h] of laxApronAircraft)airliner(equipment,glass,x,z,1.2,h,art.livery[Math.abs(x+z)%3]);
 // Peripheral maintenance/cargo aprons fill the portrait overview without enlarging the course fit.
 // They sit beyond the drivable support envelope; no aircraft moves through the race.
 for(const z of[212,-167])concrete.box(0,-.04,z,235,.08,67,art.apron);
 for(const {x,z,side} of laxCargoAprons){
   structure.box(x,6.5,z+side*24,49,13,22,art.cargo);
   for(let n=-1;n<=1;n++)glass.box(x+n*14,4.9,z+side*12.9,11,8,.12,art.hangar);
   airliner(equipment,glass,x,z-side*7,.88,side>0?Math.PI:0,art.livery[Math.abs(x)%3]);
   for(let n=-2;n<=2;n++)paint.box(x+n*7,.04,z-side*23,5,.02,.15,art.yellow);
 }
 for(const side of[-1,1]){
  structure.box(side*191,5.5,142,40,11,35,art.cargo);for(let i=-1;i<=1;i++)glass.box(side*191+i*11,4,123.9,9,6,.15,art.hangar);
  for(let z=-100;z<110;z+=34){equipment.box(side*132,1.8,z,3.4,3.2,8,z>0?art.yellow:art.rescue);glass.box(side*132,2.5,z-2,3.5,1,2.7,art.glass);for(const xx of[-1.8,1.8])equipment.beam([side*132+xx,.8,z-2.5],[side*132+xx,.8,z+2.5],.8,art.dark,6);}
  // Terminal service aprons have dark expansion joints and parking lead-ins instead of empty slabs.
  for(let z=-87;z<88;z+=10)paint.box(side*61,.035,z,24,.01,.055,art.joint);
  for(let z=-83;z<84;z+=5)paint.box(side*74,.05,z,2,.02,.14,art.yellow);
 }
 for(const p of laxPlanting)plants.palm(p.x,p.y,p.z,p.height,p.radius,art.trunk,art.plant);
 return{ground,road,concrete,structure,glass,equipment,paint,plants};
}
export function buildLax(scene:Scene,track:TrackDefinition,_theme:PresentationTheme,materials:Map<string,StandardMaterial>){
 const geo=laxGeometry(track),casters=new Set<StandardMaterial>(),surface=new RenderedSurface();
 const mesh=(key:keyof typeof geo,name:string,shadow=false)=>{
  const g=geo[key],m=new StandardMaterial(name,scene);m.diffuseColor=Color3.White();m.specularColor.setAll(key==='glass'?.35:.09);m.backFaceCulling=false;m.metadata={absoluteVertexColors:true};materials.set(name,m);if(shadow)casters.add(m);
  const part=new Mesh(name,scene),data=g.toVertexData();data.uvs=Float32Array.from({length:g.vertexCount*2},(_,i)=>g.positions[Math.floor(i/2)*3+(i%2?2:0)]/16);data.applyToMesh(part);part.material=m;part.isPickable=false;part.receiveShadows=true;
  if(['ground','concrete','road'].includes(key))surface.add(g.positions,g.indices);
  if(key==='road'){m.diffuseTexture=surfaceTexture(scene,'asphalt');}
 };
 mesh('ground','terrain');mesh('road','asphalt');mesh('concrete','airport-concrete');mesh('structure','airport-structure',true);mesh('glass','airport-glass');mesh('equipment','airport-equipment',true);mesh('paint','airport-markings');mesh('plants','airport-palms',true);
 return{groundSurface:surface,shadowCasterMaterials:casters,update(_time:number,_reduced:boolean){}};
}
