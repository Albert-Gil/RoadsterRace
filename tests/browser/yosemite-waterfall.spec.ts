import{expect,test}from'@playwright/test';
import{mkdirSync,writeFileSync}from'node:fs';

test('freefall stays visible from fixed desktop and phone cameras; droplets descend and reduced motion freezes the water',async({browser})=>{
 test.setTimeout(240000);const reports:any[]=[];mkdirSync('artifacts/yosemite-waterfall',{recursive:true});
 for(const viewport of[{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?circuit=capitan-yosemite&graphics=high');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
  const view=await page.evaluate(async()=>{
   const path='/src/presentation/yosemite-waterfall-shape.ts',{yosemiteWaterfallSites,waterfallPoint}=await import(path),g=(window as any).__roadster,w=g.getWorld(),site=yosemiteWaterfallSites(g.getTrack())[0],c=w.camera,V=c.position.constructor,M=c.getViewMatrix().constructor,canvas=w.engine.getRenderingCanvas(),r=canvas.getBoundingClientRect();
   const a=g.project(site.lip),b=g.project(site.impact);
   const hidden=Array.from({length:9},(_,i)=>{
    const p=waterfallPoint(site,i/8),screen=g.project(p),ray=w.scene.createPickingRay((screen.x-r.left)*w.engine.getRenderWidth()/r.width*w.engine.getHardwareScalingLevel(),(screen.y-r.top)*w.engine.getRenderHeight()/r.height*w.engine.getHardwareScalingLevel(),M.Identity(),c),hit=w.scene.pickWithRay(ray,(m:any)=>m.name==='weathered-yosemite-granite');
    return !!hit?.hit&&hit.distance<V.Distance(ray.origin,new V(p.x,p.y,p.z))-.1;
   });
   return{drop:site.lip.y-site.impact.y,pixels:Math.hypot(a.x-b.x,a.y-b.y),hidden,triangles:w.scene.getMeshByName('yosemite-freefall-curtains').getTotalIndices()/3};
  });
  expect(view.drop).toBeGreaterThan(35);expect(view.pixels).toBeGreaterThan(12);expect(view.hidden,JSON.stringify({viewport,hidden:view.hidden})).not.toContain(true);expect(view.triangles).toBeLessThan(2500);
  const sample=()=>page.evaluate(()=>{
   const w=(window as any).__roadster.getWorld(),m=w.scene.getMeshByName('bounded-yosemite-mist'),p=m.getVerticesData('position'),n=m.metadata.fallingWaterCount,first=p.length/12-n;
   return{drops:Array.from({length:n},(_,i)=>(p[(first+i)*12+1]+p[(first+i)*12+4]+p[(first+i)*12+7]+p[(first+i)*12+10])/4),enabled:m.isEnabled(),offset:w.scene.getMaterialByName('yosemite-waterfall').diffuseTexture.vOffset,ripples:Array.from(w.scene.getMeshByName('yosemite-impact-ripples').getVerticesData('position'))};
  });
  const a=await sample();await page.waitForTimeout(180);const b=await sample();
  expect(b.drops.filter((y:any,i:number)=>y<a.drops[i]).length).toBeGreaterThan(34);expect(a.offset).not.toBe(b.offset);expect(a.ripples).not.toEqual(b.ripples);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);const c=await sample();await page.waitForTimeout(200);const d=await sample();expect(d.enabled).toBe(false);expect(d.offset).toBe(c.offset);expect(d.ripples).toEqual(c.ripples);
  expect(errors).toEqual([]);reports.push({viewport,...view,errors});await context.close();
 }
 writeFileSync('artifacts/yosemite-waterfall/visibility.json',JSON.stringify(reports,null,2));
});

test('Yosemite falling water renders on WebGPU or its supported WebGL fallback',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/?circuit=capitan-yosemite&graphics=medium&renderer=webgpu');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 expect(await page.evaluate(()=>(window as any).__roadster.getWorld().scene.getMeshByName('yosemite-freefall-curtains').isEnabled())).toBe(true);expect(errors).toEqual([]);
});
