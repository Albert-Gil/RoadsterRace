import {expect,test} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';

test('alpine lift and snowfall animate, respect reduced motion and stay out of the pre-pass',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?circuit=snowy-tahoe&graphics=high');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
  const projectionError=await page.evaluate(()=>{const g=(window as any).__roadster,w=g.getWorld();return Math.max(...g.getTrack().centerline.filter((_:any,i:number)=>i%4===0).map((p:any)=>{const s=g.project(p),q=w.groundPoint(s.x,s.y);return q?Math.hypot(q.x-p.x,q.z-p.z):Infinity;}));});
  expect(projectionError).toBeLessThan(.08);
  const sample=()=>page.evaluate(()=>{const w=(window as any).__roadster.getWorld(),s=w.scene,c=s.getMeshByName('moving-ski-lift-chairs'),snow=s.getMeshByName('bounded-alpine-snowfall');return{chairs:Array.from(c.getVerticesData('position')).slice(0,90),flakes:Array.from(snow.getVerticesData('position')).slice(0,90),snowEnabled:snow.isEnabled(),excluded:s.prePassRenderer?.excludedMaterials.map((m:any)=>m.name)??[]};});
  const a=await sample();await page.waitForTimeout(350);const b=await sample();
  expect(await page.evaluate(()=>(window as any).__roadster.getWorld().scene.getMeshByName('bounded-alpine-snowfall').getTotalVertices())).toBeGreaterThanOrEqual(4000);
  expect(a.chairs).not.toEqual(b.chairs);expect(a.flakes).not.toEqual(b.flakes);expect(b.excluded).toContain('alpine-snowfall');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(120);const reduced=await sample();await page.waitForTimeout(250);const stopped=await sample();
  expect(stopped.snowEnabled).toBe(false);expect(reduced.chairs).toEqual(stopped.chairs);expect(errors).toEqual([]);
  mkdirSync('artifacts/tahoe-ski',{recursive:true});writeFileSync('artifacts/tahoe-ski/weather.json',JSON.stringify({animated:true,reducedMotion:true,projectionError,excluded:b.excluded,errors},null,2));
});

test('the regular summit ski jump launches and lands without Hop or Thrust',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?circuit=snowy-tahoe&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine());await page.getByRole('button',{name:'Race this line',exact:true}).click();
  await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s?.flightOrigin==='ski'&&s.elevation>60;},null,{timeout:90000});
  const launch=await page.evaluate(()=>{const g=(window as any).__roadster;return{state:g.getState().race,graphics:g.getGraphics()};});
  expect(launch.state.movement).toBe('airborne');expect(launch.state.hopCount).toBe(0);expect(launch.state.thrustCount).toBe(0);expect(launch.state.elevation).toBeGreaterThan(60);
  await page.waitForTimeout(250);await page.screenshot({path:'artifacts/tahoe-ski/automatic-ski-jump.png'});
  await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='results',null,{timeout:90000});
  expect(errors).toEqual([]);writeFileSync('artifacts/tahoe-ski/automatic-jump.json',JSON.stringify({launch,errors,finished:true},null,2));
});
