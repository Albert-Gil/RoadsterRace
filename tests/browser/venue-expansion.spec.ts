import {expect,test} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {waitForPhase} from './ui';
const root='artifacts/venue-expansion';mkdirSync(root,{recursive:true});
for(const id of['coastal-launch','capitan-yosemite','canyon-south-rim'])for(const viewport of[{width:844,height:390},{width:390,height:844}])test(`${id}: real touch lap and whole-course framing at ${viewport.width}`,async({browser})=>{
 const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:2}),page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`/?circuit=${id}&graphics=medium`);await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const points=await page.evaluate(()=>{const g=(window as any).__roadster,t=g.getTrack();return t.centerline.map((p:any,i:number)=>({...g.project(p),fraction:t.distances[i]/t.length})).filter((_:any,i:number)=>i%2===0||i===t.centerline.length-1);});
 for(const p of points){expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(viewport.width);expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(viewport.height);}
 const session=await context.newCDPSession(page),epoch=Date.now()/1000;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:points[0].x,y:points[0].y,id:4}],timestamp:epoch});
 for(const p of points.slice(1))await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y,id:4}],timestamp:epoch+p.fraction*7});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:epoch+7});await session.detach();await expect(page.getByRole('button',{name:'Race this line',exact:true})).toBeVisible();
 const report=await page.evaluate(()=>{const g=(window as any).__roadster,r=g.getRoute();return{jumps:r.jumps,hazards:r.hazards,sections:[...new Set(g.getRawStroke().map((p:any)=>p.sectionId))],graphics:g.getGraphics()};});
 expect(report.hazards).toBeUndefined();if(id==='canyon-south-rim'){expect(report.sections).toContain('air-crossing');expect(report.sections).toContain('lower-crossing');expect(report.jumps).toContain('south-rim-crossing');}if(id==='capitan-yosemite')expect(report.jumps).toHaveLength(3);
 expect(errors).toEqual([]);await page.screenshot({path:`${root}/touch-${id}-${viewport.width}.png`});writeFileSync(`${root}/touch-${id}-${viewport.width}.json`,JSON.stringify({viewport,...report,errors},null,2));await context.close();
});
test('the retired Grand Canyon link opens the surviving Grand Canyon',async({page})=>{
 await page.goto('/?circuit=grand-canyon');await page.getByRole('button',{name:'Time Trial',exact:true}).click();
 await expect(page.getByRole('button',{name:'Grand Canyon circuit',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>(window as any).__roadster.getTrack().id)).toBe('canyon-south-rim');
});
test('South Rim actual airborne crossing and lower road finish a race within the scene budget',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:`${root}/video`,size:{width:1280,height:720}}}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?circuit=canyon-south-rim&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s.flightOrigin==='crest'&&s.elevation>15;},{},{timeout:90000});
 await page.screenshot({path:`${root}/south-rim-flight.png`});const flight=await page.evaluate(()=>(window as any).__roadster.getGraphics());expect(flight.drawCalls).toBeLessThanOrEqual(90);
 await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s.supportSectionId==='lower-crossing'&&Math.abs(s.position.z)<5;});await page.screenshot({path:`${root}/south-rim-lower-road.png`});await waitForPhase(page,'results',120000);
 const state=await page.evaluate(()=>(window as any).__roadster.getState());expect(state.race.recoveryCount).toBe(0);expect(errors).toEqual([]);writeFileSync(`${root}/south-rim-race.json`,JSON.stringify({state,flight,errors},null,2));const video=page.video();await context.close();await video?.saveAs(`${root}/south-rim-gameplay.webm`);
});
test('LA causeway renders on phone without changing its eight metre physical approach',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:844,height:390});await page.goto('/?circuit=la-nights&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const r=await page.evaluate(()=>{const g=(window as any).__roadster;return{jump:g.getTrack().jumps[0],graphics:g.getGraphics()};});expect(r.jump.rampLength).toBe(8);expect(r.jump.lipHeight).toBe(1.2);expect(r.graphics.drawCalls).toBeLessThanOrEqual(90);expect(errors).toEqual([]);
});
