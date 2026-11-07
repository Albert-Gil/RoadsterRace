import type { Point } from '../core/types';

/** Ear clipping keeps concave ship ends faithful to their support footprint. */
export function deckTriangles(ps:Point[]){
 const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),area=ps.reduce((v,p,i)=>v+p.x*ps[(i+1)%ps.length].z-ps[(i+1)%ps.length].x*p.z,0),ids=ps.map((_,i)=>i),out:number[]=[];if(area<0)ids.reverse();
 let budget=ps.length*ps.length;while(ids.length>3&&budget-->0){let found=false;for(let i=0;i<ids.length;i++){const a=ids[(i+ids.length-1)%ids.length],b=ids[i],c=ids[(i+1)%ids.length];if(cross(ps[a],ps[b],ps[c])<=1e-8)continue;if(ids.some(j=>j!==a&&j!==b&&j!==c&&cross(ps[a],ps[b],ps[j])>=-1e-8&&cross(ps[b],ps[c],ps[j])>=-1e-8&&cross(ps[c],ps[a],ps[j])>=-1e-8))continue;out.push(a,b,c);ids.splice(i,1);found=true;break;}if(!found)throw Error('Invalid deck polygon');}if(ids.length===3)out.push(...ids);return out;
}
