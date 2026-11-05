import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';
mkdirSync('artifacts/la-nights',{recursive:true});
test('LA nights automatic channel shortcut completes an actual recorded race',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1280,height:720},hasTouch:true,recordVideo:{dir:'artifacts/la-nights/video',size:{width:1280,height:720}}}),page=await context.newPage();
 await page.goto('/?circuit=la-nights');await page.getByRole('button',{name:'Time Trial',exact:true}).click();
 await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 // Match the existing unit fixture's normal 20+ m/s approach. The generic 7 s
 // practice stroke reaches only 19 m/s and fails this jump even on the old build.
 const points=await page.evaluate(async()=>{const g=(window as any).__roadster,path='/src/core/route.ts',{createPracticeSamples}=await import(path);return createPracticeSamples(g.getTrack(),6.5,true).map((p:any)=>({...g.project(p),time:p.time/1000}));});
 const cdp=await context.newCDPSession(page),epoch=Date.now()/1000;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:points[0].x,y:points[0].y,id:7}],timestamp:epoch});
 for(const p of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y,id:7}],timestamp:epoch+p.time});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:epoch+6.5});await cdp.detach();
 await page.screenshot({path:'artifacts/la-nights/jump-plan.png'});await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');
 await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s.flightOrigin==='ramp'&&s.elevation>1.5;});
 await page.screenshot({path:'artifacts/la-nights/channel-flight.png'});
 await waitForPhase(page,'results');const result=await page.evaluate(()=>(window as any).__roadster.getState());
 expect(result.race.recoveryCount).toBe(0);expect(result.race.finished).toBe(true);
 writeFileSync('artifacts/la-nights/channel-race.json',JSON.stringify(result,null,2));const video=page.video();await context.close();await video?.saveAs('artifacts/la-nights/gameplay.webm');
});
test('LA nights hidden alley needs a live Hop and completes a race',async({page})=>{
 await page.goto('/?circuit=la-nights');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.evaluate(()=>(window as any).__roadster.usePracticeLine('backlot-alley'));await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');
 await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return Math.abs(s.position.x+62)<3&&s.position.z<20&&s.position.z>15&&s.velocity.z<-15;},null,{polling:'raf'});
 await page.keyboard.press('h');await page.waitForFunction(()=>(window as any).__roadster.getState().race.elevation>3);
 await page.screenshot({path:'artifacts/la-nights/backlot-hop.png'});await waitForPhase(page,'results');
 const result=await page.evaluate(()=>(window as any).__roadster.getState());expect(result.race.hopCount).toBe(1);expect(result.race.collisionCount).toBe(0);expect(result.race.recoveryCount).toBe(0);
});
