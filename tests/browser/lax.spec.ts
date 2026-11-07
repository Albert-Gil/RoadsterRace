import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const root='artifacts/lax-v2';mkdirSync(root,{recursive:true});

for(const view of[{width:1440,height:900,touch:false},{width:844,height:390,touch:true},{width:390,height:844,touch:true},{width:1024,height:768,touch:true}])test(`LAX real ${view.touch?'touch':'mouse'} drawing and fixed framing ${view.width}`,async({browser})=>{
 const context=await browser.newContext({viewport:view,hasTouch:view.touch,isMobile:view.touch,deviceScaleFactor:view.touch?2:1}),page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('/?circuit=lax&graphics=medium');
 await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const camera=await page.evaluate(()=>(window as any).__roadster.getWorld().camera.position.asArray());
 const framing=await page.evaluate(async()=>{
  const api=(window as any).__roadster,t=api.getTrack(),edgeModule='/src/core/road-geometry.ts',heightModule='/src/core/elevation.ts',gateModule='/src/core/start-finish.ts';
  const [{roadEdges},{roadHeight},{drawingStartBounds}]=await Promise.all([import(edgeModule),import(heightModule),import(gateModule)]);
  const paths=[t.centerline,...t.hopShortcuts.map((h:any)=>h.branch)],points=paths.flatMap((path:any[],i:number)=>roadEdges(path,16,i===0).flatMap((edge:any[])=>edge.map((p:any,n:number)=>api.project({...p,y:roadHeight(t,path[n].courseProgress)}))))
   .concat(drawingStartBounds(t).corners.map((p:any)=>api.project({...p,y:0})));
  return{rect:document.querySelector('#course-space')!.getBoundingClientRect().toJSON(),points};
 });
 const margin=view.touch&&Math.min(view.width,view.height)<=500?18:4;
 for(const p of framing.points){expect(p.x).toBeGreaterThanOrEqual(framing.rect.left+margin);expect(p.x).toBeLessThanOrEqual(framing.rect.right-margin);expect(p.y).toBeGreaterThanOrEqual(framing.rect.top+margin);expect(p.y).toBeLessThanOrEqual(framing.rect.bottom-margin);}
 await page.screenshot({path:`${root}/drawing-${view.width}.png`});
 const points=await page.evaluate(()=>{const g=(window as any).__roadster,t=g.getTrack();return t.centerline.filter((_:any,i:number)=>i%2===0||i===t.centerline.length-1).map((p:any)=>({...g.project(p),fraction:t.distances[t.centerline.indexOf(p)]/t.length}));});
 for(const p of points){expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(view.width);expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(view.height);}
 const cdp=await context.newCDPSession(page),epoch=Date.now()/1000;
 if(view.touch){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:points[0].x,y:points[0].y,id:9}],timestamp:epoch});
  for(const p of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y,id:9}],timestamp:epoch+7*p.fraction});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:epoch+7});
 }else{
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:points[0].x,y:points[0].y,button:'left',buttons:1,clickCount:1,timestamp:epoch});
  for(const p of points.slice(1))await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y,button:'left',buttons:1,timestamp:epoch+7*p.fraction});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:points.at(-1)!.x,y:points.at(-1)!.y,button:'left',buttons:0,clickCount:1,timestamp:epoch+7});
 }
 await cdp.detach();await expect(page.getByRole('button',{name:'Race this line',exact:true})).toBeVisible();
 const route=await page.evaluate(()=>(window as any).__roadster.getRoute());expect(route.hazards??[]).toHaveLength(0);expect(route.drawingDuration).toBeCloseTo(7,1);
 await page.screenshot({path:`${root}/preview-${view.width}.png`});await page.getByRole('button',{name:'Race this line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='racing');
 expect(await page.evaluate(()=>(window as any).__roadster.getWorld().camera.position.asArray())).toEqual(camera);expect(errors).toEqual([]);await context.close();
});

test('LAX solo race, automatic jumps, effects budget and complete results',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:`${root}/video`,size:{width:1280,height:720}}}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?circuit=lax&graphics=medium');await page.getByRole('button',{name:'Solo Race',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='racing');
 await page.keyboard.press('Space');await page.keyboard.press('KeyH');await page.waitForFunction(()=>(window as any).__roadster.getState().race.elevation>3);
 const active=await page.evaluate(()=>(window as any).__roadster.getGraphics());expect(active.drawCalls).toBeLessThanOrEqual(150);await page.screenshot({path:`${root}/four-car-hop.png`});
 await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s.flightOrigin==='ski';},undefined,{timeout:90000});await page.screenshot({path:`${root}/automatic-jump.png`});
 await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='results',undefined,{timeout:180000});
 const result=await page.evaluate(()=>(window as any).__roadster.getState());expect(result.players).toHaveLength(4);expect(result.players.every((p:any)=>p.finished)).toBe(true);expect(errors).toEqual([]);await page.screenshot({path:`${root}/results.png`});writeFileSync(`${root}/race-report.json`,JSON.stringify({active,result},null,2));const video=page.video();await context.close();await video?.saveAs(`${root}/gameplay.webm`);
});

test('LAX Time Trial keeps its actual lap ghost cosmetic and within the effects budget',async({page})=>{
 await page.goto('/?circuit=lax&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'2 laps',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();
 await page.waitForFunction(()=>{const g=(window as any).__roadster;return g.getState().race?.lap===2&&g.getGraphics().ghostVisible;},undefined,{timeout:150000});
 await page.keyboard.press('Space');await page.keyboard.press('KeyH');await page.waitForFunction(()=>(window as any).__roadster.getState().race.elevation>3);
 const before=await page.evaluate(()=>({state:(window as any).__roadster.getState(),graphics:(window as any).__roadster.getGraphics()}));expect(before.state.players).toHaveLength(1);expect(before.graphics.ghostVisible).toBe(true);expect(before.graphics.drawCalls).toBeLessThanOrEqual(90);await page.screenshot({path:`${root}/time-trial-ghost.png`});
 const frames=await page.evaluate(()=>new Promise<number[]>(resolve=>{const samples:number[]=[];let last=performance.now();const frame=(time:number)=>{samples.push(time-last);last=time;if(samples.length===180)resolve(samples);else requestAnimationFrame(frame);};requestAnimationFrame(frame);}));frames.sort((a,b)=>a-b);
 writeFileSync(`${root}/ghost-budget.json`,JSON.stringify({drawCalls:before.graphics.drawCalls,physicalCars:before.state.players.length,ghostVisible:before.graphics.ghostVisible,medianFrameMs:frames[Math.floor(frames.length/2)],p95FrameMs:frames[Math.floor(frames.length*.95)]},null,2));
});

test('LAX hidden horseshoe connection clears its equipment with a real Hop button press',async({page})=>{
 await page.goto('/?circuit=lax&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);await page.evaluate(()=>(window as any).__roadster.usePracticeLine('center-way'));await page.screenshot({path:`${root}/horseshoe-connection.png`});await page.getByRole('button',{name:'Race this line',exact:true}).click();
 await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race,p=s?.position;return p&&p.x>10&&p.x<14&&Math.abs(p.z-16)<2&&s.movement==='grounded'&&s.velocity.x<0;},undefined,{timeout:120000});
 await page.getByRole('button',{name:'Activate hop',exact:true}).click();await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s.elevation>9&&s.hopCount===1;});await page.screenshot({path:`${root}/horseshoe-hop.png`});
 await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='results',undefined,{timeout:120000});const s=await page.evaluate(()=>(window as any).__roadster.getState().race);expect(s.recoveryCount).toBe(0);expect(s.collisionCount).toBe(0);expect(s.hopCount).toBe(1);writeFileSync(`${root}/shortcut-race.json`,JSON.stringify(s,null,2));
});

for(const count of[2,4])test(`LAX ${count}-player local race keeps private turns and complete results`,async({browser})=>{
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),page=await context.newPage();
 await page.goto('/?circuit=lax&graphics=medium');await page.getByRole('button',{name:'Multiplayer',exact:true}).click();await page.getByRole('button',{name:`${count} players`,exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Plan your lines',exact:true}).click();
 for(let i=0;i<count;i++){
  if(i)await page.getByRole('button',{name:`I'm Player ${i+1}`,exact:false}).click();
  expect(await page.evaluate(()=>(window as any).__roadster.getState().visibleRouteCount)).toBe(0);
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Lock in my line',exact:true}).click();
 }
 for(const key of['KeyA','KeyL','KeyQ','KeyP'].slice(0,count))await page.keyboard.press(key);
 await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='racing');
 const initial=await page.evaluate(()=>(window as any).__roadster.getState());expect(initial.humanCount).toBe(count);expect(initial.ghostStartRemaining).toBeGreaterThan(4);await expect(page.locator('.racer-pad')).toHaveCount(count);
 await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='results',undefined,{timeout:150000});const final=await page.evaluate(()=>(window as any).__roadster.getState());expect(final.players.every((p:any)=>p.finished)).toBe(true);await expect(page.getByRole('button',{name:'Home',exact:true})).toBeVisible();await page.screenshot({path:`${root}/multiplayer-${count}.png`});await context.close();
});
