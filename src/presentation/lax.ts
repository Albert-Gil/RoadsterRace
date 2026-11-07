import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { TrackDefinition, Point } from '../core/types';
import { roadEdges } from '../core/road-geometry';
import { roadHeight, roadSupportWidth, sectionAt } from '../core/elevation';
import { laxTerminals, laxApronAircraft, laxCargoAprons, laxPlanting, LAX_LAYOUT } from '../core/tracks/lax';
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
 const ground=new CompositionShapes(),road=new CompositionShapes(),concrete=new CompositionShapes(),structure=new CompositionShapes(),glass=new CompositionShapes(),equipment=new CompositionShapes(),paint=new CompositionShapes(),plants=new CompositionShapes(),base=LAX_LAYOUT.streetHeight;
 ground.box(0,-.2,20,2400,.3,2400,art.ground);
 concrete.box(0,-.055,27,193,.08,186,art.apron);
 concrete.box(0,-.045,87,210,.08,65,art.apron);
 // These ARE the race straights: each runway continues beyond the raced section.
 for(const side of[-1,1])for(const [x,w] of[[side*82,16],[side*111,11]]){
  road.box(x,.005,25,w,.04,330,art.runway);
  for(let z=-130;z<185;z+=13)paint.box(x,.08,z,.28,.02,5,art.marking);
  for(const edge of[-1,1])paint.box(x+edge*(w/2-.28),.08,25,.22,.02,327,art.marking);
  for(const z of[-128,169])for(let n=-3;n<=3;n++)paint.box(x+n*w/9,.09,z,.65,.02,8,art.marking);
  digits(paint,side<0?25:7,x-1.5,.10,side<0?151:-112,1.2);
 }
 const drawPath=(path:Point[],closed:boolean,branch=false)=>{
  const [a,b]=roadEdges(path,16,closed),edges=roadEdges(path,2,closed),ds=cumulative(path);
  const at=(i:number)=>path[i].y??roadHeight(track,projectToPolyline(path[i],track.centerline,track.distances).progress);
  for(let i=0;i<path.length-1;i++){
   const y=at(i),yn=at(i+1),s=sectionAt(track,path[i].courseProgress??track.distances[i]??0),apron=!branch&&s?.id==='north-apron',runway=!branch&&s?.id.includes('runway'),ramp=!branch&&s?.id.endsWith('-ramp');
   const color=runway?art.runway:apron?art.apron:art.asphalt;
   if(!apron)road.quad([[a[i].x,y+.04,a[i].z],[b[i].x,y+.04,b[i].z],[b[i+1].x,yn+.04,b[i+1].z],[a[i+1].x,yn+.04,a[i+1].z]].reverse(),color);
   if(y>.1||yn>.1){
    const widths=[i,i+1].map(k=>branch?18:Math.min(28,roadSupportWidth(track,track.distances[k]))),shoulders=edges.map(edge=>[i,i+1].map((k,n)=>({x:path[k].x+(edge[k].x-path[k].x)*widths[n]/2,z:path[k].z+(edge[k].z-path[k].z)*widths[n]/2})));
    const [l,r]=shoulders;concrete.quad([[l[0].x,y+.01,l[0].z],[r[0].x,y+.01,r[0].z],[r[1].x,yn+.01,r[1].z],[l[1].x,yn+.01,l[1].z]].reverse(),art.concrete);
    for(const edge of shoulders)structure.quad([[edge[0].x,ramp?0:y-.55,edge[0].z],[edge[1].x,ramp?0:yn-.55,edge[1].z],[edge[1].x,yn,edge[1].z],[edge[0].x,y,edge[0].z]],art.fascia);
    if(i%12===0&&y>1.2)structure.box(path[i].x,y/2-.25,path[i].z,1.4,y-.5,1.4,art.concrete);
   }
   if(!branch&&!runway&&!apron)for(const edge of[a,b])paint.beam([edge[i].x,y+.09,edge[i].z],[edge[i+1].x,yn+.09,edge[i+1].z],.11,art.marking,4);
   if(apron)paint.beam([path[i].x,y+.06,path[i].z],[path[i+1].x,yn+.06,path[i+1].z],.12,art.yellow,4);
   if(!branch&&Math.floor(ds[i]/7)!==Math.floor((ds[i-1]??-1)/7)){
    const p=path[i],q=path[i+1],d=Math.hypot(q.x-p.x,q.z-p.z)||1,dx=(q.x-p.x)/d,dz=(q.z-p.z)/d;
    if(apron){for(const sign of[-1,1])equipment.box(p.x-dz*7.5*sign,y+.15,p.z+dx*7.5*sign,.20,.28,.20,art.blue);}
    else if(!runway)for(const sign of[-1,1])paint.beam([p.x-dz*.2*sign,y+.09,p.z+dx*.2*sign],[p.x+dx*3-dz*.2*sign,yn+.09,p.z+dz*3+dx*.2*sign],.055,art.yellow,4);
   }
  }
 };
 drawPath(track.centerline,true);for(const h of track.hopShortcuts??[])drawPath(h.branch,false,true);
 // Physical launch plates distinguish automatic street/airfield transfers from the hidden Hop lane.
 for(const j of track.terrainTakeoffs??[]){
  const lip=roadHeight(track,j.progress),start=roadHeight(track,j.progress-8),across=(u:number,v:number,h:number)=>[j.center.x+j.forward.x*u+j.forward.z*v,h,j.center.z+j.forward.z*u-j.forward.x*v];
  for(const sign of[-1,1]){structure.beam(across(-8,sign*8,start-.15),across(0,sign*8,lip-.15),.22,art.metal,6);structure.quad([across(-8,sign*8,0),across(0,sign*8,0),across(0,sign*8,lip),across(-8,sign*8,start)],art.fascia);}
  structure.beam(across(0,-8,lip-.12),across(0,8,lip-.12),.20,art.metal,6);
  for(let n=1;n<7;n++){const u=-8+n,y=roadHeight(track,j.progress+u);paint.beam(across(u,-7.8,y+.07),across(u,7.8,y+.07),.045,art.metal,4);}
 }
 laxTerminals.forEach(([x,z],i)=>{
  const head=i===3,w=head?LAX_LAYOUT.headWidth:LAX_LAYOUT.terminalWidth,d=head?LAX_LAYOUT.headDepth:LAX_LAYOUT.terminalDepth;
  concrete.box(x,.2,z,w+1,.4,d+1,art.concrete);structure.box(x,3.6,z,w,6.6,d,art.terminal);glass.box(x,4.6,z,w+.08,2.5,d+.08,art.glass);structure.box(x,6.5,z,w+1,.35,d+1,art.roof);
  for(let k=-d/2+1;k<d/2;k+=3)structure.box(x,4.6,z+k,w+.12,2.7,.16,art.frame);
  for(let n=-w/2+1;n<w/2;n+=3){let last:V|undefined;for(let k=0;k<=10;k++){const t=k/10,p=[x+n,6.7+Math.sin(t*Math.PI)*.85,z-d/2+t*d];if(last)structure.beam(last,p,.11,art.frame,5);last=p;}}
  glass.quad([[x-2.2,6.8,z-d/2+1],[x+2.2,6.8,z-d/2+1],[x+2.2,6.8,z+d/2-1],[x-2.2,6.8,z+d/2-1]],art.skylight);
  paint.box(x+w/2-2,6.75,z,3,.04,5,art.blue);digits(paint,i+1,x+w/2-2.5,6.82,z-1.8,1.3);
  equipment.box(x,7,z+3,2,.8,2.5,art.metal);
  if(head)return;
  const side=Math.sign(x),px=side*LAX_LAYOUT.planeX;
  airliner(equipment,glass,px,z,LAX_LAYOUT.planeScale,side<0?0:Math.PI,art.livery[i%3]);
  structure.box(side*54,2.7,z+4,6,1.8,2,art.terminal);glass.box(side*54,3,z+4,6.05,.65,2.06,art.glass);
  structure.box(x-side*5,4,z,1,.28,d-1,art.roof);for(const zz of[-6,0,6])structure.beam([x-side*5,base,z+zz],[x-side*5,4,z+zz],.12,art.frame,5);
  for(let n=0;n<3;n++){equipment.box(px+side*5,.65,z+7+n*1.1,1.2,.9,.8,art.yellow);equipment.beam([px+side*5,.25,z+6.5+n*1.1],[px+side*5,.25,z+7+n*1.1],.055,art.dark,4);}
  paint.beam([px-4,.07,z-7],[px+4,.07,z-7],.09,art.yellow,4);
 });
 // Raised central parking island, Theme Building arches and close-up control cab.
 concrete.box(0,1.5,-11.5,24,3,35,art.parking);
 for(const axis of[0,Math.PI/2])for(const sign of[-1,1]){let last:V|undefined;for(let i=0;i<=18;i++){const t=i/18,p=[Math.sin(axis)*sign*10*(1-t),base+Math.sin(t*Math.PI/2)*13,-5+Math.cos(axis)*sign*10*(1-t)];if(last)structure.beam(last,p,.5,art.terminal,7);last=p;}}
 structure.beam([0,12,-5],[0,13.5,-5],4.7,art.roof,28);glass.beam([0,11,-5],[0,12.5,-5],4.3,art.glass,28);structure.beam([0,10.8,-5],[0,11,-5],4.7,art.terminal,28);
 structure.box(0,13.5,-23,2.8,21,2.8,art.tower);structure.box(0,24,-23,6,1.5,6,art.roof);glass.box(0,22.9,-23,5.6,1.3,5.6,art.glass);structure.beam([0,24.75,-23],[0,27,-23],.10,art.metal,6);
 for(const x of[-8,8])for(const z of[-25,-17,-9,-1]){paint.box(x,base+.035,z,3,.03,.1,art.marking);equipment.box(x,base+.7,z+1.8,1.7,1.4,3,art.livery[Math.abs(z)%3]);glass.box(x,base+1.2,z+1.8,1.55,.55,1.6,art.glass);}
 for(const b of track.barriers){
  const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs),h=b.baseHeight??0;
  if(b.id.startsWith('lax-departures-rail')){const f=b.footprint,a={x:(f[0].x+f[3].x)/2,z:(f[0].z+f[3].z)/2},c={x:(f[1].x+f[2].x)/2,z:(f[1].z+f[2].z)/2};structure.beam([a.x,h+.9,a.z],[c.x,h+.9,c.z],.18,art.metal,6);structure.beam([a.x,h,a.z],[a.x,h+1.1,a.z],.1,art.metal,5);}
  else if(b.id.includes('center-way')){
   if(b.id==='lax-center-way-equipment')for(let n=0;n<6;n++){const zz=z-d/2+(n+.5)*d/6,y=n%2?1.8:1.6;equipment.box(x,h+y/2,zz,w,y,d/6-.18,art.service);for(const side of[-1,1])glass.panelX(x+side*(w/2+.01),h+y*.56,zz,1.5,.6,art.hangar,side);}
   else structure.box(x,h+b.height/2,z,w,b.height,d,art.service);
  }else if(b.id.includes('terminal-parcel')||b.id==='lax-north-garden'){
   concrete.box(x,base/2,z,w,base,d,art.concrete);
   for(let i=0;i<b.footprint.length;i++){const a=b.footprint[i],c=b.footprint[(i+1)%b.footprint.length];structure.beam([a.x,base+.95,a.z],[c.x,base+.95,c.z],.18,art.concrete,4);}
   if(b.id==='lax-north-garden')plants.box(x,base+.23,z,w-1,.06,d-1,art.plant);
  }
 }
 for(const p of laxPlanting)plants.palm(p.x,p.y,p.z,p.height,p.radius,art.trunk,art.plant);
 for(const [x,z,heading] of laxApronAircraft)airliner(equipment,glass,x,z,1,heading,art.livery[Math.abs(x+z)%3]);
 for(const z of[145,-111])concrete.box(0,-.04,z,182,.08,58,art.apron);
 for(const {x,z,side} of laxCargoAprons){structure.box(x,5.5,z+side*22,40,11,20,art.cargo);for(let n=-1;n<=1;n++)glass.box(x+n*11,4,z+side*11.9,9,7,.12,art.hangar);airliner(equipment,glass,x,z-side*7,.8,side>0?Math.PI:0,art.livery[Math.abs(x)%3]);}
 for(const side of[-1,1])for(const z of[-12,22,56]){const x=side*LAX_LAYOUT.groundVehicleX;equipment.box(x,1.7,z,3.4,3.2,8,z>0?art.yellow:art.rescue);glass.box(x,2.4,z-2,3.5,1,2.7,art.glass);for(const dx of[-1.8,1.8])equipment.beam([x+dx,.8,z-2.5],[x+dx,.8,z+2.5],.8,art.dark,6);}
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
