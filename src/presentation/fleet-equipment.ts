import type{TrackBarrier}from'../core/types';
import{CompositionShapes}from'./composition-shapes';
import{navalEllipsoid,deckCrew}from'./fleet-outfit';
import{fleetAppearance as art}from'./themes';
/** Original metre-scale naval equipment, contained by each authoritative equipment envelope. */
export function navalEquipment(b:TrackBarrier,g:CompositionShapes,w:number,d:number,h:number){
 if(!b.equipmentKind)return false;
 const tyre=(x:number,z:number,r=.55)=>navalEllipsoid(g,x,r,z,r,r,.40,art.dark,10,6);
 if(b.equipmentKind==='early-warning-aircraft'){
  navalEllipsoid(g,-w*.05,1.95,0,w*.34,1.10,d*.105,art.aircraft,18,9);
  // High shoulder wings, twin turboprops, four tail fins and the unmistakable radar disc.
  g.box(-w*.04,2.65,0,w*.31,.30,d*.89,art.aircraft);
  for(const sign of[-1,1]){
   g.quad([[-w*.19,2.75,sign*d*.12],[w*.12,2.75,sign*d*.12],[-w*.03,2.76,sign*d*.46],[-w*.24,2.76,sign*d*.46]],art.aircraft);
   g.quad([[-w*.24,2.76,sign*d*.46],[-w*.03,2.76,sign*d*.46],[-w*.10,4.3,sign*d*.47],[-w*.24,4.3,sign*d*.47]],art.hullShade);
   navalEllipsoid(g,w*.03,2.25,sign*d*.235,w*.12,.63,.65,art.hull,12,7);
   for(let n=0;n<4;n++){const a=n*Math.PI/2;g.beam([w*.155,2.25,sign*d*.235],[w*.155,2.25+Math.sin(a)*2.0,sign*d*.235+Math.cos(a)*2.0],.12,art.dark,5);}
   g.box(-w*.29,2.75,sign*d*.16,w*.20,.22,d*.40,art.aircraft);
   for(const z of[sign*d*.12,sign*d*.32])g.quad([[-w*.39,2.7,z],[-w*.39,5.8,z],[-w*.28,5.6,z],[-w*.21,2.7,z]],art.navy);
   tyre(-w*.08,sign*d*.13,.55);g.beam([-w*.08,.5,sign*d*.13],[-w*.08,1.6,sign*d*.10],.07,art.coping,5);
  }
  g.box(w*.225,2.43,0,w*.14,.65,d*.135,art.glass);tyre(w*.25,0,.42);
  for(const z of[-.65,.65])g.beam([-w*.07,2.8,z],[-w*.07,4.3,z],.14,art.coping,7);
  navalEllipsoid(g,-w*.05,4.8,0,Math.min(w*.22,d*.35),.50,Math.min(w*.22,d*.35),art.navy,24,8);
  navalEllipsoid(g,-w*.05,5.0,0,Math.min(w*.215,d*.343),.37,Math.min(w*.215,d*.343),art.superstructure,24,7);
  deckCrew(g,w*.36,d*.36,art.equipment);
 }else if(b.equipmentKind==='transport-helicopter'){
  navalEllipsoid(g,0,2.15,0,w*.35,1.4,d*.15,art.navalHelicopter,18,10);
  g.box(w*.26,2.6,0,w*.15,1.0,d*.26,art.glass);
  for(const sign of[-1,1]){
   g.box(-w*.03,2.5,sign*d*.152,w*.31,.65,.06,art.glass);g.box(-w*.24,1.7,sign*d*.15,w*.10,1.2,.07,art.dark);
   for(const x of[-w*.24,w*.23]){tyre(x,sign*d*.17,.56);g.beam([x,.5,sign*d*.17],[x,1.6,sign*d*.13],.10,art.coping,6);}
  }
  for(const sign of[-1,1]){
   const x=sign*w*.27,y=sign===1?h*.70:h*.89,r=Math.min(w*.20,d*.39);
   navalEllipsoid(g,x,3.5,0,w*.07,1.3,d*.085,art.hull,12,7);g.beam([x,3.8,0],[x,y,0],.18,art.coping,8);
   for(let n=0;n<3;n++){const a=n*Math.PI*2/3,dx=Math.cos(a),dz=Math.sin(a);g.quad([[x-dz*.17,y,dx*.17],[x+dx*r-dz*.23,y,dz*r+dx*.23],[x+dx*r+dz*.23,y,dz*r-dx*.23],[x+dz*.17,y,-dx*.17]],art.dark);g.beam([x+dx*r*.91,y+.02,dz*r*.91],[x+dx*r,y+.02,dz*r],.12,art.equipment,4);}
  }
  g.box(-w*.30,1.25,0,.18,1.4,d*.23,art.dark);g.beam([-w*.33,.45,-d*.1],[-w*.33,1.9,-d*.1],.07,art.coping,5);deckCrew(g,w*.39,d*.30,art.rescueOrange);
 }else if(b.equipmentKind==='deck-crane'){
  g.box(0,1.6,0,w*.88,1.65,d*.63,art.equipment);g.box(-w*.28,3.0,0,w*.22,1.9,d*.57,art.equipment);g.box(-w*.28,3.4,0,w*.23,1.1,d*.59,art.glass);
  for(const x of[-w*.32,-w*.12,w*.12,w*.32])for(const sign of[-1,1])tyre(x,sign*d*.30,.78);
  for(const x of[-w*.34,w*.32])for(const sign of[-1,1]){g.beam([x,1.6,0],[x,.35,sign*d*.43],.16,art.hullShade,6);g.box(x,.18,sign*d*.43,1.0,.26,.75,art.dark);}
  g.beam([-w*.15,2.3,0],[-w*.15,3.4,0],1.0,art.dark,12);
  const a=[-w*.18,3.2,0],end=[w*.37,h*.90,0];g.beam(a,end,.62,art.equipment,6);g.beam([-w*.28,2.4,0],[w*.13,h*.60,0],.18,art.coping,7);g.beam([w*.37,h*.90,0],[w*.37,3.5,0],.055,art.dark,6);
  for(const sign of[-1,1])g.beam([w*.37,3.5,0],[w*.37-sign*.4,3.0,sign*.25],.14,art.dark,6);
  for(let n=0;n<5;n++)g.box(w*(.0+n*.055),h*(.42+n*.073),.55,.35,.30,.07,art.dark);
  g.box(-w*.05,2.75,0,w*.15,.30,d*.69,art.navy);
 }else if(b.equipmentKind==='crash-truck'){
  g.box(0,1.6,0,w*.92,1.8,d*.72,art.emergencyRed);g.box(w*.27,2.35,0,w*.30,1.25,d*.72,art.navalHelicopter);g.box(w*.30,2.5,0,w*.25,.65,d*.74,art.glass);
  for(const x of[-w*.32,0,w*.31])for(const sign of[-1,1])tyre(x,sign*d*.35,.66);
  g.box(-w*.19,2.6,0,w*.48,.30,d*.75,art.coping);for(const sign of[-1,1]){g.box(-w*.15,1.7,sign*d*.367,w*.44,.55,.07,art.hullShade);g.box(0,1.05,sign*d*.374,w*.82,.16,.08,art.equipment);for(let n=0;n<5;n++)g.box(-w*.34+n*w*.08,1.7,sign*d*.38,.06,.58,.06,art.coping);}
  g.beam([w*.05,2.7,0],[w*.05,3.35,0],.13,art.dark,7);g.beam([w*.05,3.35,0],[w*.23,3.60,0],.14,art.coping,7);g.box(w*.38,2.95,0,.50,.18,d*.5,art.equipment);
 }else if(b.equipmentKind==='missile-launcher'){
  g.box(0,h*.43,0,w*.94,h*.86,d*.96,art.hullShade);g.box(0,h*.90,0,w*.96,.14,d*.98,art.coping);
  for(const sign of[-1,1])for(let n=0;n<6;n++){g.box(sign*w*.23,h*.94,(n-2.5)*d*.15,w*.39,.10,d*.125,art.dark);g.box(sign*w*.23,h*.96,(n-2.5)*d*.15,w*.32,.06,d*.105,art.hull);}
  for(const sign of[-1,1])for(let n=0;n<4;n++)g.box(sign*w*.475,h*.45,(n-1.5)*d*.22,.03,.60,d*.12,art.dark);
 }else if(b.equipmentKind==='command-annex'){
  g.box(0,h*.34,0,w*.93,h*.68,d*.93,art.hullShade);g.box(0,h*.70,0,w*.96,.30,d*.96,art.coping);g.box(0,h*.55,-d*.47,w*.85,h*.07,.04,art.glass);
  for(const sign of[-1,1])for(let n=0;n<5;n++)g.box(sign*w*.47,h*(.18+n*.07),0,.04,.14,d*.60,art.dark);
  g.box(0,h*.78,0,w*.45,h*.14,d*.40,art.hull);navalEllipsoid(g,0,h*.87,0,Math.min(w,d)*.13,Math.min(w,d)*.13,Math.min(w,d)*.13,art.superstructure,12,8);
 }else if(b.equipmentKind==='fuel-bowser'){
  g.box(0,1.25,0,w*.90,.65,d*.67,art.hullShade);
  for(const x of[-w*.32,0,w*.31])for(const sign of[-1,1])tyre(x,sign*d*.31,.62);
  const radius=Math.min(d*.27,h*.30);
  g.beam([-w*.35,2.35,0],[w*.10,2.35,0],radius,art.superstructure,16);
  for(const x of[-w*.33,-w*.12,w*.08])g.beam([x,2.35,0],[x+.10,2.35,0],radius+.06,art.coping,16);
  g.box(w*.31,2.15,0,w*.25,1.65,d*.63,art.navy);g.box(w*.34,2.43,0,w*.24,.78,d*.65,art.glass);g.box(w*.31,3.04,0,w*.29,.15,d*.69,art.superstructure);
  for(const sign of[-1,1]){
   g.box(-w*.10,1.43,sign*d*.35,w*.46,.38,.16,art.equipment);
   for(let n=0;n<16;n++){const a=n*Math.PI/8,bb=(n+1)*Math.PI/8;g.beam([-w*.22+Math.cos(a)*.70,2.45+Math.sin(a)*.70,sign*d*.365],[-w*.22+Math.cos(bb)*.70,2.45+Math.sin(bb)*.70,sign*d*.365],.07,art.dark,4);}
   for(let n=0;n<5;n++)g.box(-w*.39,1.45+n*.24,sign*d*.21,.08,.07,d*.20,art.coping);
  }
  g.box(-w*.10,3.67,0,w*.20,.20,d*.26,art.hullShade);g.box(w*.43,1.35,0,.13,.20,d*.67,art.equipment);
 }else if(b.equipmentKind==='deck-workshop'){
  g.box(0,.35,0,w*.97,.60,d*.95,art.dark);g.box(0,h*.42,0,w*.94,h*.72,d*.92,art.hullShade);
  g.box(0,h*.79,0,w*.98,.18,d*.97,art.coping);
  for(const sign of[-1,1]){
   for(let n=0;n<13;n++)g.box((n-6)*w*.069,h*.43,sign*d*.465,.10,h*.64,.06,art.ribs);
   for(const x of[-w*.25,w*.23]){g.box(x,h*.40,sign*d*.474,w*.30,h*.48,.05,art.hangar);for(let n=0;n<7;n++)g.box(x,h*(.18+n*.062),sign*d*.482,w*.29,.07,.025,art.coping);}
   g.box(0,h*.63,sign*d*.478,w*.13,h*.11,.04,art.glass);
  }
  for(const x of[-w*.28,w*.22]){g.box(x,h*.86,0,w*.23,h*.12,d*.43,art.superstructure);for(let n=0;n<6;n++)g.box(x+(n-2.5)*w*.029,h*.925,0,.10,.025,d*.37,art.dark);}
  for(const sign of[-1,1])g.beam([-w*.47,.70,sign*d*.42],[w*.47,.70,sign*d*.42],.10,art.equipment,5);
 }else if(b.equipmentKind==='cable-winch'){
  g.box(0,.30,0,w*.94,.55,d*.92,art.hullShade);
  const r=Math.min(w*.18,d*.28,h*.32),cy=.7+r;
  for(const sign of[-1,1]){
   const x=sign*w*.23;g.beam([x,cy,-d*.28],[x,cy,d*.28],r,art.dark,16);
   for(const z of[-d*.28,d*.28]){g.beam([x,cy,z],[x,cy,z+.10],r+.12,art.navy,16);g.box(x,.70,z,w*.20,1.15,.25,art.coping);}
   for(let k=0;k<4;k++)for(let n=0;n<12;n++){const a=n*Math.PI/6,bb=(n+1)*Math.PI/6,z=(k-1.5)*d*.115;g.beam([x+Math.cos(a)*(r+.035),cy+Math.sin(a)*(r+.035),z],[x+Math.cos(bb)*(r+.035),cy+Math.sin(bb)*(r+.035),z],.055,art.ribs,4);}
  }
  g.box(0,h*.79,-d*.30,w*.15,h*.20,d*.24,art.equipment);g.box(0,h*.88,-d*.32,w*.12,.12,d*.18,art.dark);
 }else if(b.equipmentKind==='jet-deflector'){
  g.box(0,.18,0,w*.98,.28,d*.92,art.hullShade);
  for(let n=0;n<5;n++){
   const x=(n-2)*w*.19,ww=w*.18;
   g.quad([[x-ww/2,.32,-d*.36],[x+ww/2,.32,-d*.36],[x+ww/2,h*.93,d*.32],[x-ww/2,h*.93,d*.32]],art.superstructure);
   for(const side of[-1,1]){g.beam([x+side*ww*.40,.31,-d*.34],[x+side*ww*.40,h*.92,d*.33],.07,art.coping,4);g.beam([x+side*ww*.31,.3,d*.42],[x+side*ww*.31,h*.70,d*.18],.10,art.ribs,5);}
   for(let k=1;k<5;k++){const u=k/5;g.beam([x-ww*.44,.32+(h*.93-.32)*u,-d*.36+d*.68*u],[x+ww*.44,.32+(h*.93-.32)*u,-d*.36+d*.68*u],.05,art.ribs,4);}
  }
 }else if(b.equipmentKind==='engine-rack'){
  g.box(0,.5,0,w*.94,.8,d*.90,art.equipment);for(const sign of[-1,1])g.beam([-w*.40,1.6,sign*d*.25],[w*.40,1.6,sign*d*.25],Math.min(d*.20,h*.25),art.hull,12);for(const sign of[-1,1]){g.beam([-w*.44,.7,sign*d*.36],[-w*.44,h*.93,sign*d*.36],.08,art.coping,4);g.beam([w*.44,.7,sign*d*.36],[w*.44,h*.93,sign*d*.36],.08,art.coping,4);g.beam([-w*.44,h*.93,sign*d*.36],[w*.44,h*.93,sign*d*.36],.08,art.equipment,4);}
 }
 return true;
}
