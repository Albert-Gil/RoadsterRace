/** Cosmetic suspension/attitude only. Nothing here writes to simulation state. */
export interface ContactPoint {x:number;y:number;z:number}
export interface SurfacePose {x:number;z:number;heading:number;pitch?:number;roll?:number}
export type SurfaceSampler=(x:number,z:number)=>number|undefined;

/** Babylon's yaw/pitch/roll order, with positive pitch meaning nose up. */
export function rotateContact(p:ContactPoint,heading:number,pitch=0,roll=0):ContactPoint{
 const cr=Math.cos(roll),sr=Math.sin(roll),cp=Math.cos(pitch),sp=Math.sin(pitch),ch=Math.cos(heading),sh=Math.sin(heading);
 const x=p.x*cr-p.y*sr,y=p.x*sr+p.y*cr,z=p.z*cp-y*sp;
 return{x:x*ch+z*sh,y:y*cp+p.z*sp,z:-x*sh+z*ch};
}

/** Fit the actual tyre footprint, then absorb small non-planar differences in the wheels. */
export function fitVehicleToSurface(p:SurfacePose,tyres:ContactPoint[],heightAt:SurfaceSampler,lift:number,travel:number){
 const ch=Math.cos(p.heading),sh=Math.sin(p.heading);
 const seed=tyres.map(t=>rotateContact(t,p.heading,p.pitch,p.roll));
 const heights=seed.map(t=>heightAt(p.x+t.x,p.z+t.z));if(heights.some(h=>h===undefined))return null;
 const u=seed.map(t=>t.x*ch-t.z*sh),v=seed.map(t=>t.x*sh+t.z*ch),n=tyres.length;
 const mean=(a:number[])=>a.reduce((s,x)=>s+x,0)/n,mu=mean(u),mv=mean(v),mh=mean(heights as number[]);
 let uu=0,vv=0,uv=0,uh=0,vh=0;
 for(let i=0;i<n;i++){const x=u[i]-mu,z=v[i]-mv,h=heights[i]!-mh;uu+=x*x;vv+=z*z;uv+=x*z;uh+=x*h;vh+=z*h;}
 const det=uu*vv-uv*uv;if(Math.abs(det)<1e-8)return null;
 const side=(uh*vv-vh*uv)/det,along=(vh*uu-uh*uv)/det;
 const pitch=Math.atan(along),roll=Math.atan(side/Math.sqrt(1+along*along)),normalY=Math.cos(pitch)*Math.cos(roll);
 const rotated=tyres.map(t=>rotateContact(t,p.heading,pitch,roll));
 const floor=rotated.map(t=>heightAt(p.x+t.x,p.z+t.z));if(floor.some(h=>h===undefined))return null;
 const y=mean(rotated.map((t,i)=>floor[i]!+lift-t.y));
 const surfaceY=mean(rotated.map((t,i)=>floor[i]!-side*(t.x*ch-t.z*sh)-along*(t.x*sh+t.z*ch)));
 const suspension=rotated.map((t,i)=>Math.max(-travel,Math.min(travel,(floor[i]!+lift-y-t.y)*normalY)));
 const contacts=tyres.map((t,i)=>{const r=rotateContact({...t,y:t.y+suspension[i]},p.heading,pitch,roll);return{x:p.x+r.x,y:y+r.y,z:p.z+r.z};});
 return{y,pitch,roll,surfaceY,suspension,contacts};
}
