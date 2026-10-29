import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';

for (const mode of ['Time Trial', 'Solo Race']) test(`${mode} keeps larger cars within budget with ground effects, thrust and impact dust`, async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:844,height:390});
  await page.goto('/?circuit=la-nights&graphics=medium');
  await page.getByRole('button',{name:mode,exact:true}).click();
  await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine());
  await page.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(page,'racing');
  await page.waitForFunction(()=>(window as any).__roadster.getState().race.time>1.2);
  await page.evaluate((ghost)=>{
    const g=(window as any).__roadster,w=g.getWorld();
    // Rendering-only stress poses. The simulation, command stream and times are untouched.
    for(const car of w.vehicles){
      const update=car.update.bind(car);car.clearEffects();
      car.update=(pose:any,...args:any[])=>{car.impact(args[2]);update({...pose,y:0,airborne:false,hopAge:undefined},20,true,args[2],.15,true,0,-2);};
    }
    if(ghost){const set=w.setGhost.bind(w);w.setGhost=()=>{const s=g.getState().race;set({t:s.time,x:s.position.x+6,z:s.position.z,y:0,heading:s.heading,thrust:false});};}
  },mode==='Time Trial');
  await page.waitForTimeout(200);
  const samples:any[]=[];
  for(let i=0;i<10;i++){
    samples.push(await page.evaluate(()=>{
      const g=(window as any).__roadster,w=g.getWorld();return {...g.getGraphics(),dust:w.scene.meshes.filter((m:any)=>m.name==='sand-puff-cloud'&&m.isVisible&&m.isEnabled()).length};
    }));await page.waitForTimeout(40);
  }
  expect(samples.every(s=>s.dust===(mode==='Time Trial'?1:4))).toBe(true);
  expect(Math.max(...samples.map(s=>s.drawCalls))).toBeLessThanOrEqual(mode==='Time Trial'?90:150);
  if(mode==='Time Trial')expect(samples.every(s=>s.ghostVisible)).toBe(true);
  expect(errors).toEqual([]);
  mkdirSync('artifacts/aero-followup',{recursive:true});writeFileSync(`artifacts/aero-followup/ground-effects-${mode.replace(' ','-')}.json`,JSON.stringify({samples,errors},null,2));
});
