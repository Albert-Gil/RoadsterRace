import type {TrackDefinition} from '../core/types';
import {CompositionShapes} from './composition-shapes';
import {edgeDistance,insidePolygon,hex,mix,type Rgb} from './landscape/mesh';
import {fbm2,smoothstep} from './landscape/noise';
import {venueComposition as art} from './themes';

/** Baked broad snow/rock transitions reveal the authoritative hillside. Heights
 * and tire surfaces are never inferred from these cosmetic colors. */
export function alpineGroundColor(x:number,z:number,height:number,slope:number,roadDistance:number):Rgb{
 const a=art.mountain,relief=smoothstep(5,68,height),gully=.5+.5*fbm2(x/27+height*.014,z/35,3,147),away=smoothstep(10.5,20,roadDistance);
 // TerrainArrays supplies 1-normal.y: a substantial 60% grade is about .14.
 const face=smoothstep(.015,.22,slope),shade=Math.min(.86,relief*.36+face*.35+gully*relief*.28);
 let c=mix(hex(a.snowLight),hex(a.snowShade),shade);
 const exposed=away*relief*smoothstep(.04,.20,slope)*smoothstep(.38,.68,gully)*.72;
 const beds=.5+.5*Math.sin(height*.34+fbm2(x/22,z/22,2,98)*1.1);
 c=mix(c,mix(hex(a.granite),hex(a.snowGully),beds*.48),exposed);
 return c;
}

/** Granite outcrops retain exact footprint/base/height but gain broad exposed
 * shoulders and snow-covered crowns instead of a single pyramidal cap. */
export function alpineOutcrops(track:TrackDefinition){
 const g=new CompositionShapes(),a=art.mountain;
 for(const b of track.barriers.filter(b=>b.kind==='rock')){
  const cx=b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,cz=b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length,base=b.baseHeight??0;
  const radii=[1,.97,.84,.68,.39,0],heights=[0,.15,.45,.72,.91,1],rows=radii.map((r,k)=>b.footprint.map((p,i)=>{
   const variation=k===0||k===5?1:.95+.05*Math.sin(i*2.7+k*.8),y=base+b.height*heights[k]*variation;
   const color=k>=4?hex(a.snowLight):mix(hex(a.granite),hex(a.snowGully),.18+.12*(i%2));
   return g.vertex(cx+(p.x-cx)*r,y,cz+(p.z-cz)*r,color);
  }));
  for(let k=0;k<rows.length-1;k++)for(let i=0;i<b.footprint.length;i++){const j=(i+1)%b.footprint.length;g.triangle(rows[k][i],rows[k+1][i],rows[k+1][j]);g.triangle(rows[k][i],rows[k+1][j],rows[k][j]);}
 }
 return g;
}

/** Ground-level talus color joins the granite feet visually. It grants no new
 * support and cannot create an uncollidable wall in the planning corridor. */
export function valleyApronColor(track:TrackDefinition){
 const boxes=track.barriers.filter(b=>b.kind==='rock').map(b=>({b,minX:Math.min(...b.footprint.map(p=>p.x))-18,maxX:Math.max(...b.footprint.map(p=>p.x))+18,minZ:Math.min(...b.footprint.map(p=>p.z))-18,maxZ:Math.max(...b.footprint.map(p=>p.z))+18}));
 return(x:number,z:number,distance:number,original:Rgb)=>{
  if(distance<11)return original;const p={x,z};let influence=0;
  for(const box of boxes){if(x<box.minX||x>box.maxX||z<box.minZ||z>box.maxZ)continue;const d=insidePolygon(p,box.b.footprint)?0:edgeDistance(p,box.b.footprint);influence=Math.max(influence,(1-smoothstep(1,17,d))*.70);}
  const grain=.5+.5*fbm2(x/13,z/13,3,331),weight=influence*smoothstep(11,17,distance)*(.70+grain*.30);
  return mix(original,hex(art.mountain.talus),weight);
 };
}
