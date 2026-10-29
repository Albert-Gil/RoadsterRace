import { expect,test,type Page } from '@playwright/test';
import { mkdirSync,writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';
import { circuits } from '../../src/content/circuits';

const root='artifacts/yosemite';mkdirSync(root,{recursive:true});
const state=(page:Page)=>page.evaluate(()=>(window as any).__roadster.getState());
async function ready(page:Page){await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);}

test('Capitan Yosemite accepts real phone drawing in both orientations and retains projection-consistent pace',async({browser})=>{
  const records:any[]=[];
  for(const viewport of [{width:844,height:390},{width:390,height:844}]){
    const context=await browser.newContext({viewport,deviceScaleFactor:2,hasTouch:true,isMobile:true}),page=await context.newPage();
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/?circuit=capitan-yosemite');await page.getByRole('button',{name:'Time Trial',exact:true}).click();
    await expect(page.locator('.circuit-card')).toHaveCount(circuits.length);
    await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await ready(page);
    expect(await page.evaluate(()=>(window as any).__roadster.getWorld().scene.getMeshByName('yosemite-ponderosa-forest')?.isEnabled())).toBe(true);
    const inverse=await page.evaluate(()=>{const g=(window as any).__roadster,w=g.getWorld(),t=g.getTrack();return t.centerline.filter((_:any,i:number)=>i%4===0).map((p:any)=>{const screen=g.project(p),hit=w.groundPoint(screen.x,screen.y);return hit?Math.hypot(hit.x-p.x,hit.z-p.z):Infinity;});});
    expect(Math.max(...inverse)).toBeLessThan(.08);
    const points=await page.evaluate(()=>{const g=(window as any).__roadster,t=g.getTrack();return t.centerline.map((p:any,i:number)=>({...g.project(p),fraction:t.distances[i]/t.length})).filter((_:any,i:number)=>i%2===0||i===t.centerline.length-1);});
    for(const p of points){expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(viewport.width);expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(viewport.height);}
    const cdp=await context.newCDPSession(page),epoch=Date.now()/1000;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:7}],timestamp:epoch});
    for(const p of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y,id:7}],timestamp:epoch+p.fraction*10});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:epoch+10});await cdp.detach();
    await expect(page.getByRole('button',{name:'Race this line',exact:true})).toBeVisible();
    const route=await page.evaluate(()=>{const r=(window as any).__roadster.getRoute();return{duration:r.drawingDuration,pace:Array.from({length:60},(_,i)=>r.points[Math.floor(i/60*(r.points.length-1))].desiredSpeed),hazards:r.hazards};});
    expect(route.duration).toBeCloseTo(10,1);expect(route.hazards).toBeUndefined();expect(errors).toEqual([]);records.push({viewport,...route});
    await page.screenshot({path:`${root}/touch-${viewport.width}.png`});await context.close();
  }
  expect(Math.max(...records[0].pace.map((v:number,i:number)=>Math.abs(v-records[1].pace[i])))).toBeLessThan(.45);
  writeFileSync(`${root}/touch-report.json`,JSON.stringify(records,null,2));
});

test('Capitan Yosemite completes a solo race with three CPUs, Hop and Thrust, then a replayed time trial',async({page})=>{
  test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?circuit=yosemite&graphics=medium');await page.getByRole('button',{name:'Solo Race',exact:true}).click();
  await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await ready(page);
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');
  await page.keyboard.press('h');await page.keyboard.press('Space');
  await page.waitForFunction(()=>(window as any).__roadster.getState().race.elevation>2);
  await page.screenshot({path:`${root}/hop-racing.png`});
  expect((await state(page)).players).toHaveLength(4);
  expect((await page.evaluate(()=>(window as any).__roadster.getGraphics())).drawCalls).toBeLessThanOrEqual(150);
  await waitForPhase(page,'results',120000);expect((await state(page)).players.every((p:any)=>p.finished)).toBe(true);
  await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Time Trial',exact:true}).click();
  await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'results',120000);
  expect((await state(page)).personalBestLap).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Restart',exact:false}).click();await waitForPhase(page,'racing');
  const graphics=await page.evaluate(()=>(window as any).__roadster.getGraphics());expect(graphics.ghostVisible).toBe(true);expect(graphics.drawCalls).toBeLessThanOrEqual(90);expect(errors).toEqual([]);
  writeFileSync(`${root}/solo-report.json`,JSON.stringify({state:await state(page),graphics,errors},null,2));
});

test('four local drivers finish Capitan Yosemite and a new Full Tour appends it without rewriting a saved schedule',async({page})=>{
  test.setTimeout(240000);
  await page.goto('/?circuit=capitan-yosemite');await page.getByRole('button',{name:'Multiplayer',exact:true}).click();
  await page.getByRole('button',{name:'4 players',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();
  await page.getByRole('button',{name:'Plan your lines',exact:true}).click();await ready(page);
  for(let i=0;i<4;i++){
    if(i)await page.getByRole('button',{name:`I'm Player ${i+1}`,exact:false}).click();
    await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Lock in my line',exact:true}).click();
  }
  for(const key of ['KeyA','KeyL','KeyQ','KeyP'])await page.keyboard.press(key);
  await waitForPhase(page,'racing');await expect(page.locator('.racer-pad')).toHaveCount(4);
  await waitForPhase(page,'results',120000);expect((await state(page)).players.every((p:any)=>p.finished)).toBe(true);
  await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Multiplayer',exact:true}).click();
  await page.getByRole('button',{name:'Tournament',exact:true}).click();await page.getByRole('button',{name:'Start tournament',exact:true}).click();
  const tour=(await state(page)).tournament;expect(tour.rounds).toHaveLength(circuits.length);expect(tour.rounds.at(-1).circuitId).toBe(circuits.at(-1)!.id);
  await page.getByRole('button',{name:'Save and exit',exact:true}).click();await page.getByRole('button',{name:'Save and exit',exact:true}).click();
  // A valid older six-venue schedule retains its exact authored rounds on reload.
  await page.evaluate(()=>{const key='roadster-race.tournament.v1',saved=JSON.parse(localStorage.getItem(key)!);saved.state.rounds=saved.state.rounds.slice(0,6);localStorage.setItem(key,JSON.stringify(saved));});
  await page.reload();await page.getByRole('button',{name:'Resume tournament',exact:false}).click();expect((await state(page)).tournament.rounds).toHaveLength(6);
  writeFileSync(`${root}/multiplayer-tour-report.json`,JSON.stringify({finished:true,newRounds:tour.rounds,resumedRounds:(await state(page)).tournament.rounds},null,2));
});

test('Yosemite waterfall and mist animate without obscuring road samples; reduced motion freezes them',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?circuit=capitan-yosemite&graphics=high');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await ready(page);
 const sample=()=>page.evaluate(()=>{const w=(window as any).__roadster.getWorld(),snow=w.scene.getMeshByName('bounded-yosemite-mist');return{offset:w.scene.getMaterialByName('water').diffuseTexture.vOffset,positions:Array.from(snow.getVerticesData('position')).slice(0,60),enabled:snow.isEnabled(),excluded:w.scene.prePassRenderer?.excludedMaterials.map((m:any)=>m.name)??[]};});
 const a=await sample();await page.waitForTimeout(300);const b=await sample();expect(a.offset).not.toBe(b.offset);expect(a.positions).not.toEqual(b.positions);expect(b.excluded).toContain('yosemite-mist-overlay');expect(b.excluded).toContain('yosemite-waterfall');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);const c=await sample();await page.waitForTimeout(250);const d=await sample();expect(d.enabled).toBe(false);expect(c.offset).toBe(d.offset);expect(c.positions).toEqual(d.positions);expect(errors).toEqual([]);
 writeFileSync(`${root}/atmosphere-report.json`,JSON.stringify({animated:true,reducedMotion:true,errors},null,2));
});
