import {expect,test} from '@playwright/test';
import {waitForPhase} from './ui';

test('closed car caster fills the cabin shadow without appearing in the colour pass',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?graphics=medium');
  await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');await page.keyboard.press('Escape');
  const result=await page.evaluate(async()=>{
    const g=(window as any).__roadster,w=g.getWorld(),v=w.vehicles[0],t=g.getTrack(),base={x:t.start.x+t.startFinish.forward.x*14,z:t.start.z+t.startFinish.forward.z*14};
    w.showStart(false);for(const m of w.scene.meshes.filter((m:any)=>m.name==='pace-route'))m.setEnabled(false);
    const update=v.update.bind(v);v.update=()=>update({...base,y:5,shadowY:.1,airborne:true,heading:.45},0,false,0);v.update();
    w.camera.position.set(base.x+13,18,base.z+17);const target=w.camera.getTarget().clone();target.set(base.x+2,1.8,base.z+1);w.camera.setTarget(target);w.scene.updateTransformMatrix(true);
    const proxy=w.scene.meshes.find((m:any)=>m.metadata?.shadowOnly),casters=w.scene.lights.flatMap((l:any)=>l.getShadowGenerator?.()?.getShadowMap?.()?.renderList??[]);
    const frame=()=>new Promise<Uint8Array>(resolve=>w.scene.onAfterRenderObservable.addOnce(async()=>resolve(new Uint8Array(await w.engine.readPixels(0,0,w.engine.getRenderWidth(),w.engine.getRenderHeight())))));
    await frame();proxy.isVisible=false;const open=await frame();proxy.isVisible=true;const closed=await frame();let darker=0,lighter=0;
    for(let i=0;i<open.length;i+=4){const change=closed[i]+closed[i+1]+closed[i+2]-open[i]-open[i+1]-open[i+2];if(change<-24)darker++;if(change>24)lighter++;}
    return{triangles:proxy.getTotalIndices()/3,mask:proxy.layerMask,active:w.scene.getActiveMeshes().data.includes(proxy),casts:casters.includes(proxy),darker,lighter};
  });
  expect(result).toMatchObject({triangles:92,mask:0,active:false,casts:true});expect(result.darker).toBeGreaterThan(200);expect(result.lighter).toBeLessThan(result.darker*.2);
});

for(const viewport of[{width:844,height:390},{width:390,height:844},{width:1024,height:768}])test(`larger abilities preserve touch scaling at ${viewport.width}x${viewport.height}`,async({browser})=>{
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2}),page=await context.newPage();
  await page.goto('/');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');
  const sizes=await page.locator('.ability-control').evaluateAll(es=>es.map(e=>({ability:(e as HTMLElement).dataset.ability,width:e.getBoundingClientRect().width})));
  const scale=Math.min(1.6,Math.max(1,Math.min(viewport.width,viewport.height)/430));for(const s of sizes)expect(s.width).toBeCloseTo((s.ability==='hop'?66:73.6)*scale,1);
  await context.close();
});
