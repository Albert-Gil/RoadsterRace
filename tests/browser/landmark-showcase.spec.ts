import{expect,test}from'@playwright/test';
import{waitForPhase}from'./ui';
import{mkdirSync,writeFileSync}from'node:fs';
for(const view of[{width:844,height:390},{width:390,height:844},{width:1024,height:768},{width:1440,height:900}])test(`downtown towers keep roads visible at ${view.width}x${view.height}`,async({browser})=>{
 const c=await browser.newContext({viewport:view,hasTouch:view.width<1440,isMobile:view.width<1000}),p=await c.newPage();
 await p.goto('/?circuit=la-nights');await p.getByRole('button',{name:'Time Trial',exact:true}).click();await p.getByRole('button',{name:'Draw racing line',exact:true}).click();await p.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const hidden=await p.evaluate(async()=>{
  const artPath='/src/content/la-night-art.ts',edgePath='/src/core/road-geometry.ts';const{laBuildings}=await import(/* @vite-ignore */artPath),{roadEdges}=await import(/* @vite-ignore */edgePath);
  const g=(window as any).__roadster,t=g.getTrack(),eye=g.getWorld().camera.position.asArray(),paths=[t.centerline,...t.jumps.map((j:any)=>j.branch),...t.hopShortcuts.map((h:any)=>h.branch)];
  const ps=paths.flatMap((a:any[],i:number)=>[...a,...roadEdges(a,16,i===0).flat()]);
  const hits=(q:any,lo:number[],hi:number[])=>{let near=0,far=.999;const to=[q.x,.15,q.z];for(let i=0;i<3;i++){const d=to[i]-eye[i];if(Math.abs(d)<1e-9){if(eye[i]<lo[i]||eye[i]>hi[i])return false;continue;}const a=(lo[i]-eye[i])/d,b=(hi[i]-eye[i])/d;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(far<near)return false;}return near>0&&far>=near;};
  return laBuildings.filter((b:any)=>b.h>=32).map((b:any)=>({x:b.x,z:b.z,hidden:ps.filter((q:any)=>hits(q,[b.x-b.w*.35,6.18,b.z-b.d*.35],[b.x+b.w*.35,b.h*.88+.18,b.z+b.d*.35])||hits(q,[b.x-b.w*.238,b.h*.88+.18,b.z-b.d*.238],[b.x+b.w*.238,b.h*.96+.18,b.z+b.d*.238])).length})).filter((v:any)=>v.hidden);
 });expect(hidden).toEqual([]);await c.close();
});
test('rocket boil-off stays one bounded cosmetic batch and freezes with reduced motion',async({page})=>{
 await page.goto('/?circuit=launchsite&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const read=()=>page.evaluate(()=>{const w=(window as any).__roadster.getWorld(),m=w.scene.meshes.find((m:any)=>m.name==='launchsite-bounded-boiloff');return{count:w.scene.meshes.filter((m:any)=>m.name==='launchsite-bounded-boiloff').length,capacity:m.metadata.particleCapacity,p:Array.from(m.getVerticesData('position')),alpha:Array.from(m.getVerticesData('color')),triangles:m.getTotalIndices()/3,casts:w.scene.lights.flatMap((l:any)=>l.getShadowGenerator?.()?.getShadowMap?.()?.renderList??[]).some((v:any)=>v===m)};});
 const a=await read();await page.waitForTimeout(250);const b=await read();expect(b.count).toBe(1);expect(b.capacity).toBe(96);expect(b.triangles).toBe(192);expect(b.p).not.toEqual(a.p);expect(b.casts).toBe(false);expect(b.p.every(Number.isFinite)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(120);const c=await read();await page.waitForTimeout(250);expect(await read()).toEqual(c);
 const excluded=await page.evaluate(()=>{const w=(window as any).__roadster.getWorld();w.setGraphics('high');const m=w.scene.meshes.find((m:any)=>m.name==='launchsite-bounded-boiloff');return w.scene.prePassRenderer.excludedMaterials.includes(m.material);});expect(excluded).toBe(true);
});
for(const id of['santa-monica','la-nights'])test(`${id} prominent landmarks preserve the fixed phone camera through a race`,async({browser})=>{
 const errors:string[]=[],c=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`/?circuit=${id}&graphics=medium`);await p.getByRole('button',{name:'Time Trial',exact:true}).click();await p.getByRole('button',{name:'Draw racing line',exact:true}).click();await p.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const read=()=>p.evaluate(()=>{const g=(window as any).__roadster;return g.getTrack().centerline.map((v:any)=>g.project(v));});const before=await read();
 await p.evaluate(()=>(window as any).__roadster.usePracticeLine());expect(await read()).toEqual(before);await p.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(p,'racing');expect(await read()).toEqual(before);expect(errors).toEqual([]);
 mkdirSync('artifacts/landmark-scale',{recursive:true});writeFileSync(`artifacts/landmark-scale/${id}-framing.json`,JSON.stringify({phase:'racing',points:before,errors},null,2));await c.close();
});
