import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

async function live(page: Page, predicate: (s: any) => boolean) {
  const deadline=Date.now()+150000;let interruptions=0;
  while(Date.now()<deadline){
    const s=await page.evaluate(()=>(window as any).__roadster.getState());
    if(s.phase==='paused'){
      expect(s.pauseReason).toBe('render-delay');expect(++interruptions).toBeLessThanOrEqual(4);
      await page.getByRole('button',{name:'Resume',exact:true}).click();
    }else if(predicate(s))return;
    await page.waitForTimeout(100);
  }
  throw Error(`Live race timed out: ${JSON.stringify(await page.evaluate(()=>(window as any).__roadster.getState()))}`);
}
async function plan(page: Page) {
  await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine());
  await page.getByRole('button',{name:'Race this line',exact:true}).click();
  await live(page,s=>s.phase==='racing'&&s.race.time>3.2);
}
async function effects(page: Page, limit: number) {
  await page.keyboard.press('Space');await page.keyboard.press('h');
  await live(page,s=>s.phase==='racing'&&s.race.hopCount===1);
  const samples=[];
  for(let i=0;i<8;i++){samples.push(await page.evaluate(()=>(window as any).__roadster.getGraphics()));await page.waitForTimeout(25);}
  expect(Math.max(...samples.map(g=>g.drawCalls))).toBeLessThanOrEqual(limit);
  expect(samples.some(g=>g.vaporParticles.some((v:number)=>v>0))).toBe(true);
  return samples;
}

for(const circuit of ['coastal-launch','launchsite','golden-gate','la-nights'])test(`${circuit}: lighter parcels support four-car effects and a one-car replay within budget`,async({page})=>{
  test.setTimeout(360000);mkdirSync('artifacts/parcel-presentation',{recursive:true});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/?circuit=${circuit}`);await page.getByRole('button',{name:'Solo Race',exact:true}).click();
  await page.getByRole('button',{name:'1 lap',exact:true}).click();await plan(page);
  const fourCar=await effects(page,150);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Home',exact:true}).click();
  await page.getByRole('button',{name:'Time Trial',exact:true}).click();await plan(page);
  await live(page,s=>s.phase==='results');
  expect(await page.evaluate(()=>(window as any).__roadster.getState().personalBestLap)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Time Trial',exact:true}).click();
  await plan(page);const oneCar=await effects(page,90);
  expect(oneCar.some(g=>g.ghostVisible)).toBe(true);expect(errors).toEqual([]);
  writeFileSync(`artifacts/parcel-presentation/${circuit}.json`,JSON.stringify({fourCar,oneCar,errors},null,2));
});
