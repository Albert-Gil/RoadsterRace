import { CompositionShapes } from './composition-shapes';
import { fleetFlagAppearance as art, fleetAppearance } from './themes';

/** Original static cloth geometry: visible naval ensigns, no simulation or per-frame cloth work. */
export function navalEnsign(g:CompositionShapes,w:number,d:number,h:number){
 const width=Math.min(6.5,w*.40,d*1.1),height=width*.52,top=Math.min(h*.96,h*.88+height),z=d*.12;
 const point=(u:number,v:number,offset=0)=>[u*width,top-v*height,z+Math.sin(u*Math.PI*1.4)*.22+offset];
 g.beam([0,top-height-.7,z],[0,top+.15,z],.055,fleetAppearance.coping,5);
 const panel=(u0:number,u1:number,v0:number,v1:number,color:string,offset=0)=>{
  for(let i=0;i<4;i++){const a=u0+(u1-u0)*i/4,b=u0+(u1-u0)*(i+1)/4;g.quad([point(a,v0,offset),point(b,v0,offset),point(b,v1,offset),point(a,v1,offset)],color);}
 };
 for(let row=0;row<13;row++)panel(0,1,row/13,(row+1)/13,row%2?art.white:art.red);
 panel(0,.40,0,7/13,art.blue,-.025);
 for(let row=0;row<9;row++)for(let n=0;n<(row%2?5:6);n++){
  const u=.034+n*.064+(row%2?.032:0),v=.038+row*.057;
  g.quad([point(u-.009,v-.014,-.04),point(u+.009,v-.014,-.04),point(u+.009,v+.014,-.04),point(u-.009,v+.014,-.04)],art.white);
 }
 // Both faces carry the canton/stars rather than losing it from the opposite overview.
 panel(0,.40,0,7/13,art.blue,.025);
 for(let row=0;row<9;row++)for(let n=0;n<(row%2?5:6);n++){
  const u=.034+n*.064+(row%2?.032:0),v=.038+row*.057;
  g.quad([point(u-.009,v-.014,.04),point(u+.009,v-.014,.04),point(u+.009,v+.014,.04),point(u-.009,v+.014,.04)],art.white);
 }
}
