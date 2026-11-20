import {CompositionShapes} from './composition-shapes';
import {hex,mix,type Rgb} from './landscape/mesh';
import {launchsiteCampusAppearance as art} from './themes';

/**
 * Launchsite spaceport campus (presentation only): a vehicle assembly building, a propellant
 * farm, a tracking station with a solar field and a sound-suppression water tower, all far
 * outside the course. Like the loose desert scatter they have no collider; every footprint stays
 * at least 30 m (and 1.1 × its height) from the course and its Hop lanes and clear of every barrier
 * (tests/unit/launchsite-campus.test.ts). The landscape levels the ground under each site.
 */
export interface CampusSite {id:string;x:number;z:number;width:number;depth:number;height:number}
export const launchsiteCampusSites:readonly CampusSite[]=[
 {id:'assembly-building',x:120,z:77,width:34,depth:26,height:34},
 {id:'propellant-farm',x:84,z:80,width:24,depth:22,height:12},
 {id:'tracking-station',x:-128,z:57,width:16,depth:14,height:14},
 {id:'solar-field',x:-150,z:52,width:20,depth:22,height:1.6},
 {id:'water-tower',x:-112,z:-50,width:9,depth:9,height:24},
];
const site=(id:string)=>launchsiteCampusSites.find(s=>s.id===id)!;

export function launchsiteCampus(){
 const g=new CompositionShapes();
 assembly(g,site('assembly-building'));propellant(g,site('propellant-farm'));tracking(g,site('tracking-station'));solar(g,site('solar-field'));waterTower(g,site('water-tower'));
 return g;
}

function assembly(g:CompositionShapes,s:CampusSite){
 const a=art.assembly,x0=s.x-s.width/2,z0=s.z-s.depth/2,front=z0-.02;
 g.box(s.x,.15,s.z,s.width+3,.3,s.depth+3,a.apron);
 // Main high bay and a lower annex along the east side.
 g.box(s.x-3,s.height/2,s.z,s.width-6,s.height,s.depth,a.wall);
 g.box(s.x+s.width/2-3,a.annex/2,s.z,6,a.annex,s.depth-2,a.wallShade);
 // Horizontal panel bands and a dark roof parapet.
 for(let y=a.band;y<s.height-1;y+=a.band){g.box(s.x-3,y,s.z,s.width-5.8,.35,s.depth+.2,a.wallShade);}
 g.box(s.x-3,s.height+.4,s.z,s.width-5.6,.8,s.depth+.4,a.trim);
 g.box(s.x+s.width/2-3,a.annex+.25,s.z,6.2,.5,s.depth-1.6,a.trim);
 // Two tall vertical doors facing the course side (south, -z) and the pad road.
 for(const dx of[-8,4]){
  g.panelZ(s.x+dx-3+3,s.height*.45,front,7,s.height*.86,a.door,-1);
  for(let y=4;y<s.height*.86;y+=4)g.panelZ(s.x+dx,y,front-.03,7,.18,a.doorLine,-1);
 }
 // A broad colour stripe and roof equipment.
 g.panelZ(s.x-15,s.height*.78,front-.04,4,s.height*.3,a.stripe,-1);
 for(const [dx,dz] of[[-12,-6],[-4,6],[6,-4]]){g.box(s.x+dx,s.height+1.6,s.z+dz,3,1.6,2.4,a.equipment);}
 g.beam([s.x-14,s.height+.8,s.z+8],[s.x-14,s.height+9,s.z+8],.12,a.trim,4);
}

function propellant(g:CompositionShapes,s:CampusSite){
 const p=art.propellant;
 g.box(s.x,.12,s.z,s.width,.24,s.depth,p.apron);
 // Low berms around the farm.
 for(const side of[-1,1]){g.box(s.x,.5,s.z+side*(s.depth/2-.6),s.width,1,1.2,p.berm);g.box(s.x+side*(s.width/2-.6),.5,s.z,1.2,1,s.depth,p.berm);}
 // Two spherical tanks on legs and a horizontal tank row.
 for(const [dx,dz,c] of[[-5.5,4,p.lox],[5.5,4,p.fuel]] as const){
  const cx=s.x+dx,cz=s.z+dz,r=p.radius,cy=r+3.2;
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;g.beam([cx+Math.cos(a)*r*.82,.2,cz+Math.sin(a)*r*.82],[cx+Math.cos(a)*r*.82,cy,cz+Math.sin(a)*r*.82],.16,p.leg,4);}
  sphere(g,cx,cy,cz,r,hex(c));
  g.beam([cx,cy+r,cz],[cx,cy+r+1.4,cz],.18,p.pipe,4);
 }
 for(const dz of[-4.5,-7.5]){g.beam([s.x-9,1.6,s.z+dz],[s.x+9,1.6,s.z+dz],1.25,p.horizontal,10);for(const dx of[-6,0,6])g.box(s.x+dx,.7,s.z+dz,.6,1.2,1.8,p.leg);}
 // Transfer pipes heading to the launch complex road.
 for(const k of[0,1])g.beam([s.x-9,.9+k*.5,s.z-1+k],[s.x-12-6,.9+k*.5,s.z-12+k],.16,p.pipe,4);
}

function tracking(g:CompositionShapes,s:CampusSite){
 const t=art.tracking;
 g.box(s.x,.12,s.z,s.width,.24,s.depth,t.pad);
 g.box(s.x+4,1.6,s.z-3.5,7,3.2,5,t.building);g.box(s.x+4,3.35,s.z-3.5,7.3,.3,5.3,t.roof);
 // Pedestal and a dish tilted toward the sky.
 const cx=s.x-3,cz=s.z+2;
 g.box(cx,2.4,cz,2.6,4.8,2.6,t.building);g.box(cx,5.2,cz,1.6,.8,1.6,t.roof);
 const r=t.dish,tilt=.85,n=18,rings=4,center=[cx,8.3,cz],ax=[0,Math.cos(tilt),-Math.sin(tilt)],u=[1,0,0],v=[0,Math.sin(tilt),Math.cos(tilt)];
 const at=(rad:number,ang:number,depth:number)=>[center[0]+u[0]*Math.cos(ang)*rad+v[0]*Math.sin(ang)*rad+ax[0]*depth,center[1]+u[1]*Math.cos(ang)*rad+v[1]*Math.sin(ang)*rad+ax[1]*depth,center[2]+u[2]*Math.cos(ang)*rad+v[2]*Math.sin(ang)*rad+ax[2]*depth];
 const rows:number[][]=[];
 for(let k=0;k<=rings;k++){const rad=r*k/rings,depth=.55*(k/rings)**2,row:number[]=[];for(let i=0;i<n;i++){const p=at(rad,i/n*Math.PI*2,depth);row.push(g.vertex(p[0],p[1],p[2],hex(k%2?t.dish2:t.dish1)));}rows.push(row);}
 for(let k=0;k<rings;k++)for(let i=0;i<n;i++){const j=(i+1)%n;g.triangle(rows[k][i],rows[k+1][j],rows[k][j]);g.triangle(rows[k][i],rows[k+1][i],rows[k+1][j]);}
 g.beam([cx,5.6,cz],center,.35,t.building,6);
 const feed=at(0,0,2.6);for(let i=0;i<3;i++){const p=at(r*.85,i/3*Math.PI*2,.4);g.beam(p,feed,.05,t.roof,3);}
 g.box(feed[0],feed[1],feed[2],.5,.5,.5,t.roof);
 // Antenna mast and a fence line.
 g.beam([s.x+6.5,.2,s.z+5],[s.x+6.5,s.height,s.z+5],.12,t.roof,4);
 for(let i=0;i<=8;i++){const x=s.x-s.width/2+i*s.width/8;for(const side of[-1,1])g.box(x,.7,s.z+side*s.depth/2,.08,1.4,.08,t.fence);}
 for(const side of[-1,1])g.box(s.x,1.3,s.z+side*s.depth/2,s.width,.05,.05,t.fence);
}

function solar(g:CompositionShapes,s:CampusSite){
 const p=art.solar,rows=Math.floor(s.depth/p.pitch);
 for(let k=0;k<rows;k++){
  const z=s.z-s.depth/2+p.pitch*(k+.5),lo=.5,hi=s.height,half=p.panel/2;
  g.quad([[s.x-s.width/2,lo,z-half],[s.x+s.width/2,lo,z-half],[s.x+s.width/2,hi,z+half],[s.x-s.width/2,hi,z+half]],k%2?p.cell:mix(hex(p.cell),hex(p.frame),.12));
  for(let x=s.x-s.width/2+1;x<s.x+s.width/2;x+=4)g.box(x,(lo+hi)/2-.2,z,.12,hi-.1,.12,p.frame);
 }
}

function waterTower(g:CompositionShapes,s:CampusSite){
 const w=art.water,top=s.height-w.radius;
 for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;g.beam([s.x+Math.cos(a)*s.width/2,0,s.z+Math.sin(a)*s.width/2],[s.x+Math.cos(a)*w.radius*.7,top-w.radius*.6,s.z+Math.sin(a)*w.radius*.7],.22,w.leg,5);}
 for(const y of[5,10,15]){const f=y/(top-w.radius*.6),r=s.width/2*(1-f)+w.radius*.7*f;for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4,b=a+Math.PI/2;g.beam([s.x+Math.cos(a)*r,y,s.z+Math.sin(a)*r],[s.x+Math.cos(b)*r,y,s.z+Math.sin(b)*r],.1,w.leg,4);}}
 g.beam([s.x,0,s.z],[s.x,top,s.z],.45,w.leg,6);
 sphere(g,s.x,top,s.z,w.radius,hex(w.tank));
 g.box(s.x,s.height+.2,s.z,.8,.6,.8,w.leg);
}

/** A lat-long sphere with an equator band. */
function sphere(g:CompositionShapes,x:number,y:number,z:number,r:number,c:Rgb){
 const lat=8,lon=16,rows:number[][]=[];
 for(let i=0;i<=lat;i++){const phi=i/lat*Math.PI,row:number[]=[];for(let k=0;k<lon;k++){const th=k/lon*Math.PI*2,band=Math.abs(i-lat/2)<.6?mix(c,[0,0,0],.18):c;row.push(g.vertex(x+Math.sin(phi)*Math.cos(th)*r,y+Math.cos(phi)*r,z+Math.sin(phi)*Math.sin(th)*r,band));}rows.push(row);}
 for(let i=0;i<lat;i++)for(let k=0;k<lon;k++){const j=(k+1)%lon;g.triangle(rows[i][k],rows[i+1][j],rows[i][j]);g.triangle(rows[i][k],rows[i+1][k],rows[i+1][j]);}
}
