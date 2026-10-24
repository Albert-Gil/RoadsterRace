import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';
mkdirSync('artifacts/grand-canyon',{recursive:true});
const state=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).__roadster.getState());

for(const viewport of [{width:844,height:390},{width:390,height:844}])test(`Grand Canyon mouse drawing selects the upper and lower road at ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?circuit=grand-canyon');await page.getByRole('button',{name:'Time Trial',exact:true}).click();
 await expect(page.locator('.circuit-card')).toHaveCount(5);await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 await page.screenshot({path:`artifacts/grand-canyon/drawing-${viewport.width}.png`});
 const points=await page.evaluate(()=>{const g=(window as any).__roadster,t=g.getTrack();return t.centerline.filter((_:any,i:number)=>i%2===0||i===t.centerline.length-1).map((p:any)=>g.project(p));});
 await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();for(const p of points.slice(1))await page.mouse.move(p.x,p.y);await page.mouse.up();
 await expect(page.getByRole('button',{name:'Race this line',exact:true})).toBeVisible();
 const raw=await page.evaluate(()=>(window as any).__roadster.getRawStroke());
 expect(raw.some((p:any)=>p.sectionId==='air-crossing')).toBe(true);expect(raw.some((p:any)=>p.sectionId==='lower-crossing')).toBe(true);
 await page.screenshot({path:`artifacts/grand-canyon/preview-${viewport.width}.png`});expect(errors).toEqual([]);
});

test('Grand Canyon crossing, landing and lower return complete an actual race',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:'artifacts/grand-canyon/video',size:{width:1280,height:720}}}),page=await context.newPage();
 await page.goto('/?circuit=grand-canyon');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');
 await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s.flightOrigin==='crest'&&s.elevation>11;});
 const flight=await page.evaluate(()=>({state:(window as any).__roadster.getState(),graphics:(window as any).__roadster.getGraphics()}));
 expect(flight.graphics.drawCalls).toBeLessThanOrEqual(90);await page.screenshot({path:'artifacts/grand-canyon/airborne-crossing.png'});
 await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s.supportSectionId==='lower-crossing'&&Math.abs(s.position.z)<5;});
 await page.screenshot({path:'artifacts/grand-canyon/lower-crossing.png'});
 await waitForPhase(page,'results');const result=await state(page);expect(result.race.recoveryCount).toBe(0);expect(result.race.hopCount).toBe(0);
 writeFileSync('artifacts/grand-canyon/gameplay.json',JSON.stringify({flight,result},null,2));const video=page.video();await context.close();await video?.saveAs('artifacts/grand-canyon/gameplay.webm');
});


test('Grand Canyon four-car effects remain bounded and Time Trial replays the elevated record',async({page})=>{
 await page.goto('/?circuit=grand-canyon');await page.getByRole('button',{name:'Solo Race',exact:true}).click();
 await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');
 await page.waitForFunction(()=>(window as any).__roadster.getState().race.time>3.2);await page.keyboard.press('Space');await page.keyboard.press('h');
 await page.waitForFunction(()=>{const g=(window as any).__roadster;return g.getState().race.hopCount===1&&g.getGraphics().vaporParticles.some((n:number)=>n>0);});
 const samples=[];for(let i=0;i<10;i++){samples.push(await page.evaluate(()=>(window as any).__roadster.getGraphics()));await page.waitForTimeout(30);}
 expect(Math.max(...samples.map(g=>g.drawCalls))).toBeLessThanOrEqual(150);await page.screenshot({path:'artifacts/grand-canyon/four-car-effects.png'});
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Home',exact:true}).click();
 await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'results');
 const best=(await state(page)).personalBestLap;expect(best).toBeGreaterThan(0);
 await page.reload();await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getState().personalBestLap!==null);
 await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');
 await page.keyboard.press('Space');await page.keyboard.press('h');await page.waitForFunction(()=>(window as any).__roadster.getState().race.hopCount===1);
 const ghost=await page.evaluate(()=>({state:(window as any).__roadster.getState(),graphics:(window as any).__roadster.getGraphics()}));
 expect(ghost.state.personalBestLap).toBe(best);expect(ghost.state.players).toHaveLength(1);expect(ghost.graphics.ghostVisible).toBe(true);expect(ghost.graphics.drawCalls).toBeLessThanOrEqual(90);
 writeFileSync('artifacts/grand-canyon/effects-budget.json',JSON.stringify({fourCar:samples,timeTrialWithGhost:ghost},null,2));
});
