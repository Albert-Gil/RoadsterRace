import { Geometry,hex,mix,type Rgb } from './landscape/mesh';
import { snowyTahoeAppearance as art } from './themes';
/** One original, irregular fir mesh: woody trunks, uneven boughs and leeward snow pillows. */
export function tahoeForest(trees:readonly {x:number;z:number;height:number}[],ground:(x:number,z:number)=>number){
 const g=new Geometry();
 const crown=(x:number,y:number,z:number,r:number,h:number,c:Rgb,seed:number)=>{
  for(let k=0;k<9;k++){const a=k*Math.PI*2/9,b=(k+1)*Math.PI*2/9,ra=r*(.82+.16*Math.sin(k*2.3+seed)),rb=r*(.82+.16*Math.sin((k+1)*2.3+seed));
   const p=g.vertex(x+Math.sin(a)*ra,y+.05*h*Math.sin(k+seed),z+Math.cos(a)*ra,c),q=g.vertex(x+Math.sin(b)*rb,y+.05*h*Math.sin(k+1+seed),z+Math.cos(b)*rb,c),tip=g.vertex(x+r*.1*Math.sin(seed),y+h,z+r*.08*Math.cos(seed),mix(c,hex('#ffffff'),.04));g.triangle(p,tip,q);
  }
 };
 for(const [i,t]of trees.entries()){
  const y=ground(t.x,t.z),h=t.height,seed=i*7.13;
  crown(t.x,y,t.z,h*.033,h*.67,hex(art.bark),seed);
  for(let layer=0;layer<5;layer++){
   const base=y+h*(.13+layer*.145),r=h*(.25-layer*.038),bh=h*(.34-layer*.021);
   crown(t.x,base,t.z,r,bh,hex(i%3?art.fir:art.firLight),seed+layer);
   crown(t.x+r*.07,base+bh*.3,t.z-r*.07,r*.76,bh*.74,hex(layer%2?art.powder:art.snow),seed+layer+.4);
  }
 }
 return g;
}
