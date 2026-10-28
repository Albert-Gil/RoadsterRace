import { expect,test } from '@playwright/test';
import { mkdirSync,writeFileSync } from 'node:fs';

for(const circuit of ['coastal-launch','grand-canyon'])test(`${circuit}: recorded touch pace survives phone framing, zoom and pixel density`,async({browser})=>{
  test.setTimeout(300000);mkdirSync('artifacts/driving-update',{recursive:true});
  const views=[{width:1440,height:900,dpr:1,zoom:1},{width:844,height:390,dpr:2,zoom:1},{width:390,height:844,dpr:3,zoom:1},{width:844,height:390,dpr:2,zoom:1.18}];
  const records:{view:typeof views[number];duration:number;pace:number[]}[]=[];
  for(const view of views){
    const context=await browser.newContext({viewport:{width:view.width,height:view.height},deviceScaleFactor:view.dpr,hasTouch:true,isMobile:true});
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`/?circuit=${circuit}`);await page.getByRole('button',{name:'Time Trial',exact:true}).click();
    await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
    await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
    const points=await page.evaluate(async zoom=>{
      const g=(window as any).__roadster,t=g.getTrack();
      g.getWorld().camera.fov*=zoom;
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      return t.centerline.filter((_:any,i:number)=>i%2===0||i===t.centerline.length-1).map((p:any)=>({...g.project(p),fraction:t.distances[t.centerline.indexOf(p)]/t.length}));
    },view.zoom);
    const cdp=await context.newCDPSession(page),epoch=Date.now()/1000;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:points[0].x,y:points[0].y,id:7}],timestamp:epoch});
    for(const p of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y,id:7}],timestamp:epoch+10*p.fraction});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:epoch+10});await cdp.detach();
    await expect(page.getByRole('button',{name:'Race this line',exact:true})).toBeVisible();
    const record=await page.evaluate(()=>{
      const r=(window as any).__roadster.getRoute();
      return {duration:r.drawingDuration,pace:Array.from({length:60},(_,i)=>r.points[Math.floor(i/60*(r.points.length-1))].desiredSpeed)};
    });
    expect(record.duration).toBeCloseTo(10,1);expect(errors).toEqual([]);records.push({view,...record});
    await page.screenshot({path:`artifacts/driving-update/${circuit}-${view.width}-${view.zoom}.png`});
    await context.close();
  }
  for(const record of records)expect(Math.max(...record.pace.map((p,i)=>Math.abs(p-records[0].pace[i])))).toBeLessThan(.45);
  writeFileSync(`artifacts/driving-update/${circuit}-projections.json`,JSON.stringify(records,null,2));
});
