import { Geometry, hex, mix, type Rgb } from './landscape/mesh';
import { boulder } from './landscape/rocks';
import { yosemiteAppearance as art } from './themes';

/** Tapered trunks and real lateral branches, shared by the eight original tree templates. */
function limb(g:Geometry,a:number[],b:number[],r0:number,r1:number,color:Rgb,n=6){
  const d=b.map((v,i)=>v-a[i]),length=Math.hypot(...d);for(let i=0;i<3;i++)d[i]/=length;
  const u=Math.abs(d[1])>.9?[1,0,0]:[d[2],0,-d[0]],ul=Math.hypot(...u);for(let i=0;i<3;i++)u[i]/=ul;
  const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];
  const rings=[a,b].map((p,k)=>Array.from({length:n},(_,i)=>{const angle=i/n*Math.PI*2,r=k?r1:r0,c=mix(color,hex(art.dressing.barkDark),i%3*.12);return g.vertex(p[0]+r*(Math.cos(angle)*u[0]+Math.sin(angle)*v[0]),p[1]+r*(Math.cos(angle)*u[1]+Math.sin(angle)*v[1]),p[2]+r*(Math.cos(angle)*u[2]+Math.sin(angle)*v[2]),c);}));
  for(let i=0;i<n;i++){const j=(i+1)%n;g.triangle(rings[0][i],rings[1][i],rings[0][j]);g.triangle(rings[0][j],rings[1][i],rings[1][j]);}
}

/** Uneven ponderosa/cedar crowns replace the old stack of identical cones.
 * Foliage templates are reused; the resulting forest still renders as one mesh.
 */
export function yosemiteTreeTemplates(){
  return Array.from({length:8},(_,seed)=>{
    const g=new Geometry(),cedar=seed%3===0;
    limb(g,[0,0,0],[.009*Math.sin(seed),.98,0],.027,.005,hex(art.bark),9);
    for(let tier=0;tier<5;tier++){
      const y=.30+tier*.125,reach=(cedar?.11:.13)*(1-tier*.15);
      for(let j=0;j<3;j++){
        const a=j*Math.PI*2/3+tier*1.7+seed*.9,px=Math.cos(a)*reach,pz=Math.sin(a)*reach;
        limb(g,[0,y-.05,0],[px,y+.02,pz],.008*(1-tier*.12),.0025,hex(art.bark),5);
        const foliage=boulder({size:[.19*(1-tier*.14),cedar?.25:.20,.18*(1-tier*.14)],seed:seed*71+tier*13+j,detail:0,roundness:2.1,roughness:.24,flatten:.55,
          colour:(_x,_y,_z,up,h)=>mix(hex(seed%4?art.forest:art.cedar),hex(art.forestLight),Math.min(.7,.10+h*.35+Math.max(0,up)*.20))});
        g.instance(foliage,{x:px,y:y-.065,z:pz,heading:a});
      }
    }
    return g.withNormals();
  });
}

/** Low fern rosettes, sedges and flowers; no raised rock scatter or road obstruction. */
export function yosemiteUndergrowth(g:Geometry,x:number,y:number,z:number,size:number,seed:number){
  const fern=seed%3===0,color=hex(fern?art.fern:art.grass),tip=hex(seed%9===0?art.flowers:art.dryMeadow);
  for(let j=0;j<(fern?7:5);j++){
    const a=j/(fern?7:5)*Math.PI*2+seed*.7,dx=Math.cos(a)*size,dz=Math.sin(a)*size,w=size*(fern?.16:.08);
    const root=g.vertex(x,y+.03,z,color),l=g.vertex(x+dx*.5-dz*w,y+size*.60,z+dz*.5+dx*w,color),r=g.vertex(x+dx*.5+dz*w,y+size*.60,z+dz*.5-dx*w,color),end=g.vertex(x+dx,y+size*.25,z+dz,tip);
    g.triangle(root,l,r);g.triangle(l,end,r);
    if(fern)for(let k=1;k<=3;k++)for(const side of[-1,1]){
      const t=k/4,px=x+dx*t,pz=z+dz*t,yy=y+size*(.2+.3*Math.sin(t*Math.PI)),b=g.vertex(px,yy,pz,color),c=g.vertex(px+dx*.20-dz*.22*side,yy+.07,pz+dz*.20+dx*.22*side,tip),d=g.vertex(px+dx*.23,yy,pz+dz*.23,color);g.triangle(b,c,d);
    }
  }
}
