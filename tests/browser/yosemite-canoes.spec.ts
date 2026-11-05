import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';

test('river canoes animate in one noninteractive batch, stay visible on phones and respect reduced motion',async({browser})=>{
 test.setTimeout(180000);mkdirSync('artifacts/yosemite-canoes',{recursive:true});const reports:any[]=[];
 for(const viewport of[{width:844,height:390},{width:390,height:844}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:2,hasTouch:true,isMobile:true}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?circuit=capitan-yosemite&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
  const initial=await page.evaluate(async()=>{
   const g=(window as any).__roadster,w=g.getWorld(),mesh=w.scene.getMeshByName('yosemite-river-canoes'),path='/src/presentation/yosemite-river-life.ts',{yosemiteCanoes}=await import(path);
   return{count:mesh.metadata.canoeCount,triangles:mesh.getTotalIndices()/3,pickable:mesh.isPickable,shadow:w.scene.lights.some((l:any)=>l.getShadowGenerator?.()?.getShadowMap()?.renderList?.includes(mesh)),points:yosemiteCanoes(g.getTrack()).map((b:any)=>g.project({...b.position,y:b.level}))};
  });
  expect(initial.count).toBe(3);expect(initial.triangles).toBeLessThan(3000);expect(initial.pickable).toBe(false);expect(initial.shadow).toBe(false);
  for(const p of initial.points){expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(viewport.width);expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(viewport.height);}
  const sample=()=>page.evaluate(()=>Array.from((window as any).__roadster.getWorld().scene.getMeshByName('yosemite-river-canoes').getVerticesData('position')));
  const before=await sample();await expect.poll(async()=>JSON.stringify(await sample())!==JSON.stringify(before)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(250);const reduced=await sample();await page.waitForTimeout(250);expect(await sample()).toEqual(reduced);
  expect(errors).toEqual([]);await page.screenshot({path:`artifacts/yosemite-canoes/phone-${viewport.width}.png`});reports.push({viewport,...initial,errors});await context.close();
 }
 writeFileSync('artifacts/yosemite-canoes/browser.json',JSON.stringify(reports,null,2));
});
