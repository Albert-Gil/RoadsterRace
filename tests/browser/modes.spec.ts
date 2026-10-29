import { circuits } from '../../src/content/circuits';
import { expect,test } from '@playwright/test';
import { waitForPhase } from './ui';
const state=(page:any)=>page.evaluate(()=>(window as any).__roadster.getState());
async function plan(page:any){await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();}
async function finish(page:any){
 const deadline=Date.now()+150000;
 while(Date.now()<deadline){
  if((await state(page)).phase==='paused'){console.log('Resuming headless interruption:',(await state(page)).pauseReason);await page.getByRole('button',{name:'Resume',exact:true}).click();}
  try{await waitForPhase(page, 'results', 5000);return;}catch(error){if((error as Error).name!=='TimeoutError')throw error;}
 }
 const stalled=await state(page),saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('roadster-race.tournament.v1')??'null'));await test.info().attach('unfinished-race',{body:JSON.stringify({...stalled,savedOptions:saved?.options},null,2),contentType:'application/json'});throw new Error(`Race did not complete on ${stalled.circuitId}: ${JSON.stringify(stalled.players.map((p:any)=>({finished:p.finished,distance:p.distance,recovery:p.recoveryCount,position:p.position})))}`);
}

test('Solo Race has three CPU cars, one human control and a deterministic rematch',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?circuit=santa-monica');await page.getByRole('button',{name:'Solo Race',exact:true}).click();
  await expect(page.getByRole('button',{name:'Normal',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line'}).click();await plan(page);
  await waitForPhase(page, 'racing');
  expect((await state(page)).humanCount).toBe(1);expect((await state(page)).players.length).toBe(4);
  await expect(page.locator('.racer-pad')).toHaveCount(1);
  expect((await state(page)).visibleRouteCount).toBe(1);
  await page.keyboard.press('KeyL');expect((await state(page)).players[1].thrustCount).toBe(0);
  await page.keyboard.press('Space');expect((await state(page)).raceInputs.activations[1]).toBe(0);
  await finish(page);expect((await state(page)).players.every((p:any)=>p.finished)).toBe(true);
  await expect(page.locator('.standings')).toContainText('Apex');await expect(page.locator('.standings')).toContainText('CPU');
  await page.screenshot({path:'artifacts/phone-upgrade/solo-results.png'});
  await page.getByRole('button',{name:'Restart',exact:false}).click();const fresh=await state(page);expect(fresh.phase).toBe('countdown');expect(fresh.ghostStartRemaining).toBe(5);expect(fresh.players.every((p:any)=>p.thrustCount===0)).toBe(true);
  expect(errors).toEqual([]);
});

test('Time Trial stores lap replay, reloads it and keeps the ghost outside the car simulation',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Time Trial',exact:true}).click();
  await expect(page.getByRole('button',{name:'Tournament',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'2 laps',exact:true}).click();await page.getByRole('button',{name:'Draw racing line'}).click();await plan(page);await finish(page);
  const completed=await state(page);expect(completed.players.length).toBe(1);expect(completed.personalBestLap).toBe(Math.min(...completed.race.lapTimes));
  await page.reload();await page.getByRole('button',{name:'Time Trial',exact:true}).click();
  await page.waitForFunction(()=>(window as any).__roadster.getState().personalBestLap!==null);
  expect((await state(page)).personalBestLap).toBe(completed.personalBestLap);
  await page.getByRole('button',{name:'Draw racing line'}).click();await plan(page);
  await waitForPhase(page, 'racing');
  const metrics=await page.evaluate(()=>{const g=(window as any).__roadster;return {state:g.getState(),graphics:g.getGraphics()};});
  expect(metrics.state.players.length).toBe(1);expect(metrics.graphics.ghostVisible).toBe(true);expect(metrics.graphics.drawCalls).toBeLessThanOrEqual(90);
  await page.keyboard.press('Escape');const before=await state(page);await page.waitForTimeout(300);expect((await state(page)).race.time).toBe(before.race.time);
  await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Time Trial',exact:true}).click();
  await page.getByRole('button',{name:'Best-lap ghost on',exact:true}).click();await expect(page.getByRole('button',{name:'Best-lap ghost off',exact:true})).toHaveAttribute('aria-pressed','false');
});

test('solo Full Tour scores all registered venues and resumes controller types and difficulty',async({page})=>{
  test.setTimeout(540000);
  // A recorded session seed makes collision-heavy tour regressions reproducible.
  await page.addInitScript(()=>{Math.random=()=>92/0x7fffffff;});
  await page.goto('/');await page.getByRole('button',{name:'Solo Race',exact:true}).click();
  await page.getByRole('button',{name:'Hard',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();
  await page.getByRole('button',{name:'Tournament',exact:true}).click();await page.getByRole('button',{name:'Start tournament',exact:true}).click();
  for(let round=0;round<circuits.length;round++){
    console.log('Solo tour round',round+1,(await state(page)).circuitId);
    if(round===1){await page.reload();await page.getByRole('button',{name:'Resume tournament',exact:false}).click();const resumed=await state(page);expect(resumed.mode).toBe('solo-race');expect(resumed.difficulty).toBe('hard');expect(resumed.humanCount).toBe(1);}
    await page.getByRole('button',{name:'Draw your lines',exact:false}).click();await plan(page);await finish(page);
    const completed=await state(page);expect(completed.tournament.results.length).toBe(round+1);
    for(const f of completed.tournament.results[round].finishes)expect(completed.tournament.results[round].points[f.player]).toBe([10,6,4,0][f.rank-1]);
    if(round<circuits.length-1)await page.getByRole('button',{name:'Next race',exact:false}).click();
  }
  await expect(page.locator('#panel')).toContainText('TOURNAMENT COMPLETE');
});

test('storage-disabled time trial still retains its best lap in memory',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw new Error('unavailable');}}));
  await page.goto('/');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line'}).click();await plan(page);await finish(page);
  expect((await state(page)).personalBestLap).toBeGreaterThan(0);
});
