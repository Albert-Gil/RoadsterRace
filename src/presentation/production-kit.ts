import {CompositionShapes} from './composition-shapes';
import {hex,mix} from './landscape/mesh';
import {productionAppearance} from './themes';

/** Offline/native kit contract: metres, +Y up, +Z forward; no hidden support or collider.
 * Parts occupy the supplied envelope, reuse vertex colours and existing material roles. */
export const PRODUCTION_KIT = Object.freeze({version:1,units:'metres',up:'+Y',forward:'+Z',
 roles:['architecture','foliage','rock','timber','metal'] as const,maxCrownTriangles:260});

export function productionCrown(x:number,z:number,w:number,d:number,eave:number,top:number,roof:string,trim:string,variant:number){
 const g=new CompositionShapes(),a=productionAppearance,span=top-eave;
 if(variant%3===0){
  // Steep lower mansard with a recessed, contrasting flat upper roof.
  g.hipRoof(x,z,w-.06,d-.06,eave,eave+span*.70,roof);
  g.box(x,eave+span*.70,z,w*.45,.12,d*.45,a.roofInset);
  for(const side of[-1,1]){
   g.box(x+side*w*.19,eave+span*.53,z-d*.28,w*.18,span*.42,d*.16,trim);
   g.panelZ(x+side*w*.19,eave+span*.53,z-d*.36-.005,w*.11,span*.23,a.bayGlass,-1);
   g.hipRoof(x+side*w*.19,z-d*.28,w*.20,d*.19,eave+span*.74,top-.025,roof);
  }
 }else if(variant%3===1){
  // Two street-facing gables give a strong silhouette without a taller footprint.
  g.hipRoof(x,z,w-.06,d-.06,eave,top-.04,roof);
  for(const side of[-1,1]){
   const cx=x+side*w*.23,hw=w*.22,front=z-d*.499,back=front+d*.29;
   g.quad([[cx-hw,eave,front],[cx,eave+span*.96,front],[cx,eave+span*.96,back],[cx-hw,eave,back]],roof);
   g.quad([[cx,eave+span*.96,front],[cx+hw,eave,front],[cx+hw,eave,back],[cx,eave+span*.96,back]],mix(hex(roof),hex('#ffffff'),.10));
   const q=[[cx-hw,eave,front],[cx+hw,eave,front],[cx,eave+span*.96,front]].map(p=>g.vertex(p[0],p[1],p[2],hex(trim)));g.triangle(q[0],q[1],q[2]);
   g.panelZ(cx,eave+span*.35,front-.001,w*.10,span*.30,a.bayGlass,-1);
  }
 }else{
  g.hipRoof(x,z,w-.06,d-.06,eave,top-.04,roof);
  g.box(x,top-.08,z,w*.40,.12,d*.42,a.roofInset);
  g.box(x-w*.27,eave+span*.48,z+d*.22,w*.12,span*.92,d*.14,trim);
 }
 return g;
}

/** Broad, recessed bays and shadow courses remain within the building's envelope. */
export function productionFacade(x:number,z:number,w:number,d:number,wall:number,trim:string,index:number){
 const g=new CompositionShapes(),a=productionAppearance;
 for(const side of[-1,1]){
  const front=z+side*(d/2-.04),depth=Math.min(.38,d*.045),count=Math.min(4,Math.max(1,Math.floor(w/3.2)));
  for(let i=0;i<count;i++){
   const xx=x+(i+.5-count/2)*w*.84/count,bw=w*.68/count;
   if(wall>4){
    g.box(xx,wall*.59,front-side*depth/2,bw,Math.min(2.15,wall*.34),depth,trim);
    g.panelZ(xx,wall*.59,front-side*.012,bw*.77,Math.min(1.75,wall*.26),a.bayGlass,side);
    g.box(xx,wall*.59,front-side*.006,.075,Math.min(1.8,wall*.28),.025,trim);
   }
  }
  g.box(x,.32,front-side*.015,w-.16,.24,.025,a.foundation);
  g.box(x,2.53,front-side*.04,w-.25,.11,.08,a.eaveShadow);
  if(index%2===0)g.box(x,2.65,front-side*.24,w-.35,.14,.42,a.awnings[index%a.awnings.length]);
 }
 return g;
}
