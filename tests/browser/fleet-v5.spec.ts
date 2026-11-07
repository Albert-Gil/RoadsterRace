import { test, expect } from '@playwright/test';

for (const viewport of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]) {
  test(`Fleet working decks and enlarged islands keep a readable fixed race view ${viewport.width}`, async ({browser}) => {
    const context=await browser.newContext({viewport,hasTouch:viewport.width<1000,isMobile:viewport.width<1000});
    const page=await context.newPage();
    await page.goto('/?circuit=san-diego-fleet&graphics=medium');
    await page.getByRole('button',{name:'Time Trial',exact:true}).click();
    await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
    await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
    const camera=()=>page.evaluate(()=>(window as any).__roadster.getWorld().camera.position.asArray());
    const initial=await camera();
    await page.evaluate(()=>(window as any).__roadster.usePracticeLine());
    const visibility=await page.evaluate(()=>{
      const g=(window as any).__roadster,w=g.getWorld(),c=w.camera,points=g.getRoute().points;
      let hidden=0,streak=0,longest=0;
      for(const p of points){
        const dx=p.x-c.position.x,dy=p.y+.6-c.position.y,dz=p.z-c.position.z,length=Math.hypot(dx,dy,dz),ray=c.getForwardRay();
        ray.origin.copyFrom(c.position);ray.direction.set(dx/length,dy/length,dz/length);ray.length=length-.4;
        const hit=w.scene.pickWithRay(ray,(m:any)=>m.material?.name==='fleet-equipment');
        if(hit?.hit){hidden++;longest=Math.max(longest,++streak);}else streak=0;
      }
      return {hidden,longest,decks:g.getTrack().decks.every((d:any)=>d.racingSurface),paintedRoad:!!w.scene.getMeshByName('fleet-roads')};
    });
    // At most isolated thin aerial fittings may cross a sightline; no island can hide a car-length stretch.
    expect(visibility).toMatchObject({decks:true,paintedRoad:false});
    expect(visibility.hidden).toBeLessThanOrEqual(2);expect(visibility.longest).toBeLessThanOrEqual(1);
    expect(await camera()).toEqual(initial);
    await page.getByRole('button',{name:'Race this line',exact:true}).click();
    await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='racing');
    expect(await camera()).toEqual(initial);
    await context.close();
  });
}
