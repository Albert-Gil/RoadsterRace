import { Geometry, hex, mix, type Rgb } from './landscape/mesh';
import type { RoadsidePalette } from './roadside-geometry';

/** Small venue-specific clusters, baked into the existing roadside mesh. Local
 * coordinates are bounded by a 1.5 m radius and normalized to the parcel height.
 * Substantial scenery never appears on otherwise drivable runoff.
 */
export function venueFurniture(style:string,p:RoadsidePalette,variant:number,height:number) {
  const g=new Geometry(),color=(role:keyof RoadsidePalette)=>hex(p[role]);
  const quad=(ps:number[][],c:Rgb)=>{const ids=ps.map(([x,y,z])=>g.vertex(x,y*height,z,c));g.triangle(ids[0],ids[1],ids[2]);g.triangle(ids[0],ids[2],ids[3]);};
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:Rgb)=>{
    const a=x-w/2,b=x+w/2,e=z-d/2,f=z+d/2,t=y+h,dark=mix(c,color('metal'),.22),light=mix(c,[1,1,1],.1);
    quad([[a,y,e],[b,y,e],[b,t,e],[a,t,e]],dark);quad([[b,y,f],[a,y,f],[a,t,f],[b,t,f]],c);
    quad([[a,y,f],[a,y,e],[a,t,e],[a,t,f]],dark);quad([[b,y,e],[b,y,f],[b,t,f],[b,t,e]],c);quad([[a,t,e],[b,t,e],[b,t,f],[a,t,f]],light);
  };
  const drum=(x:number,y:number,z:number,r:number,h:number,c:Rgb,segments=8)=>{
    const top=g.vertex(x,(y+h)*height,z,mix(c,[1,1,1],.1));
    for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,ax=x+Math.cos(a)*r,az=z+Math.sin(a)*r,bx=x+Math.cos(b)*r,bz=z+Math.sin(b)*r;
      quad([[ax,y,az],[bx,y,bz],[bx,y+h,bz],[ax,y+h,az]],mix(c,color('metal'),(i%3)*.07));const v=g.vertex(ax,(y+h)*height,az,c),w=g.vertex(bx,(y+h)*height,bz,c);g.triangle(top,v,w);}
  };
  const planter=(x:number,z:number,r:number)=>{drum(x,0,z,r,.45,color('trim'));drum(x,.45,z,r*.83,.04,color('surface'));for(let i=0;i<3;i++){const a=i*2.4;drum(x+Math.cos(a)*r*.4,.48,z+Math.sin(a)*r*.4,r*.30,.24+(.12*(i%2)),color(i%3?'plant':'flower'),4);}};
  const bench=(z:number)=>{for(let i=0;i<4;i++)box(0,.4,z-.23+i*.16,2.2,.09,.12,color('timber'));for(let i=0;i<2;i++)box(0,.65+i*.18,z+.3,2.2,.14,.09,color('timber'));for(const s of [-1,1])box(s*.78,0,z,.12,.4,.52,color('metal'));};
  let kind:string;
  if(style==='spaceport'){
    kind=variant%2?'valve manifold':'service equipment';
    box(0,0,0,2.25,.12,1.8,color('trim'));
    if(variant%2){for(const x of [-.65,0,.65]){box(x,.12,0,.16,.28,1.5,color('metal'));drum(x,.4,0,.22,.15,color('trim'));drum(x,.56,0,.3,.035,color('flower'));box(x,.6,0,.06,.25,.06,color('metal'));}}
    else{box(-.38,.12,0,1.2,.72,1.25,color('trim'));for(let i=0;i<5;i++)box(-.81+i*.21,.27,-.64,.08,.38,.025,color('metal'));drum(.7,.12,.3,.3,.58,color('metal'));drum(.7,.7,.3,.33,.05,color('trim'));box(-.38,.84,0,1.28,.08,1.32,color('metal'));}
  }else if(style==='alpine'||style==='yosemite'||style==='canyon'){
    kind=variant%2?'timber rest area':'stacked cut timber';
    if(variant%2){box(0,.52,0,2.2,.1,.75,color('timber'));for(const s of [-1,1]){box(0,.32,s*.65,2.3,.09,.28,color('timber'));box(s*.7,0,0,.15,.54,1.6,color('metal'));}if(style==='alpine')box(0,.62,0,2.14,.06,.72,color('tip'));}
    else{for(let row=0;row<2;row++)for(let col=0;col<3-row;col++){
      const x=(col-(2-row)/2)*.55,z=.15;box(x,.08+row*.3,z,.46,.28,1.7,color('timber'));box(x,.09+row*.3,z-.86,.4,.24,.025,color('trim'));
      if(style==='alpine')box(x,.36+row*.3,z,.44,.045,1.65,color('tip'));
    }box(-1.08,0,.1,.10,.78,1.5,color('metal'));box(1.08,0,.1,.10,.78,1.5,color('metal'));}
  }else if(style==='sunset'){
    kind=variant%2?'surfboard rack':'beach loungers';
    if(variant%2){for(const x of [-.8,.8])box(x,0,0,.12,.85,1.3,color('timber'));for(let i=0;i<3;i++){const z=-.45+i*.45;box(0,.48,z,2.25,.055,.3,color(i%2?'flower':'trim'));box(0,.54,z,.08,.012,.26,color('surface'));}box(0,.85,0,1.9,.08,.14,color('timber'));}
    else for(const s of [-1,1]){for(let i=0;i<6;i++)box(s*.62,.26,-.65+i*.25,.86,.06,.21,color(i%2?'trim':'timber'));box(s*.62,.50,.6,.86,.30,.12,color('timber'));for(const z of [-.55,.45])box(s*.62,0,z,.65,.26,.10,color('metal'));}
  }else if(style==='bay'||style==='night-city'){
    kind=variant%3?'street cafe':'planted city bench';
    if(variant%3){drum(0,.66,0,.64,.09,color('timber'));drum(0,0,0,.10,.66,color('metal'));for(const s of [-1,1]){box(s*.95,.36,0,.46,.08,.5,color('trim'));box(s*1.14,.46,0,.10,.38,.5,color('metal'));box(s*.95,0,0,.30,.36,.3,color('metal'));}}
    else{bench(-.15);planter(-.8,-.8,.35);planter(.8,-.8,.35);}
  }else{
    kind=variant%2?'tropical planters':'island garden bench';
    if(variant%2){planter(-.65,0,.52);planter(.65,.3,.48);box(0,0,-.72,2.25,.24,.40,color('timber'));}
    else{bench(.1);planter(0,-.7,.45);}
  }
  return {geometry:g,kind};
}
