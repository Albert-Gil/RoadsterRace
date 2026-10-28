import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

async function raceStage(page:Page,stage:'window'|'airborne'|'results',id:string){
  for(let attempt=0;attempt<5;attempt++){
    await page.waitForFunction(({stage,id})=>{
      const s=(window as any).__roadster.getState(),r=s.race;
      if(s.phase==='paused')return true;
      if(stage==='results')return s.phase==='results';
      if(s.phase!=='racing')return false;
      if(stage==='airborne')return r.flightOrigin==='hop'&&r.elevation>3;
      return id==='launchsite'?Math.abs(r.position.x-52)<3&&r.position.z>-29&&r.position.z<-25&&r.velocity.z>15
        :Math.abs(r.position.x+62)<3&&r.position.z>15&&r.position.z<19&&r.velocity.z<-15;
    },{stage,id},{polling:'raf',timeout:150000});
    const s=await page.evaluate(()=>(window as any).__roadster.getState());
    if(s.phase!=='paused')return s;
    expect(s.pauseReason).toBe('render-delay');await page.getByRole('button',{name:'Resume',exact:true}).click();
  }
  throw Error('Repeated render interruptions');
}

for(const [id,lane] of [['launchsite','service-hop'],['la-nights','backlot-alley']] as const)test(`${id}: compact Hop obstacle clears in an actual race`,async({page})=>{
  test.setTimeout(300000);mkdirSync('artifacts/hop-obstacles',{recursive:true});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/?circuit=${id}`);await page.getByRole('button',{name:'Time Trial',exact:true}).click();
  await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
  await page.evaluate(lane=>(window as any).__roadster.usePracticeLine(lane),lane);
  await page.getByRole('button',{name:'Race this line',exact:true}).click();await raceStage(page,'window',id);
  await page.keyboard.press('h');await raceStage(page,'airborne',id);
  const graphics=await page.evaluate(()=>(window as any).__roadster.getGraphics());expect(graphics.drawCalls).toBeLessThanOrEqual(90);
  await page.screenshot({path:`artifacts/hop-obstacles/${id}-actual-hop.png`});
  const result=await raceStage(page,'results',id);
  expect(result.race.finished).toBe(true);expect(result.race.hopCount).toBe(1);
  expect(result.race.collisionCount).toBe(0);expect(result.race.recoveryCount).toBe(0);expect(errors).toEqual([]);
  writeFileSync(`artifacts/hop-obstacles/${id}-race.json`,JSON.stringify({graphics,result,errors},null,2));
});
