import {test,expect} from '@playwright/test';

for(const circuit of ['coastal-launch','santa-monica'])test(`${circuit} surf stays bounded, cosmetic and still with reduced motion`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:844,height:390});await page.goto(`/?circuit=${circuit}&graphics=medium`);
 await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const sample=()=>page.evaluate(()=>{const m=(window as any).__roadster.getWorld().scene.getMeshByName('coherent-shore-surf');return{p:Array.from(m.getVerticesData('position')),pickable:m.isPickable,triangles:m.getTotalIndices()/3};});
 const before=await sample();expect(before.pickable).toBe(false);expect(before.triangles).toBeLessThanOrEqual(1200);expect(before.p.every(Number.isFinite)).toBe(true);
 await expect.poll(async()=>JSON.stringify((await sample()).p)!==JSON.stringify(before.p)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);const still=await sample();await page.waitForTimeout(200);expect(await sample()).toEqual(still);
 expect(errors).toEqual([]);
});

test('the pier wheel rotates with upright gondolas in its existing single batch',async({page})=>{
 await page.goto('/?circuit=santa-monica&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const result=await page.evaluate(()=>{
  const w=(window as any).__roadster.getWorld(),m=w.scene.getMeshByName('animated-pacific-wheel');
  const pose=(t:number)=>{w.sceneryRuntime.update(t,false);return{p:Array.from(m.getVerticesData('position')) as number[],n:Array.from(m.getVerticesData('normal')) as number[]};};
  const a=pose(0),b=pose(10),ranges=m.metadata.cabinRanges;
  return{count:m.metadata.uprightGondolas,pickable:m.isPickable,batches:w.scene.meshes.filter((v:any)=>v.name==='animated-pacific-wheel').length,
   rimMoved:a.p[0]!==b.p[0],upright:ranges.every(({start,count}:{start:number,count:number})=>{
    for(let i=start;i<start+count;i++)for(let k=0;k<3;k++)if(Math.abs(a.n[i*3+k]-b.n[i*3+k])>1e-6)return false;return true;
   })};
 });
 expect(result).toEqual({count:12,pickable:false,batches:1,rimMoved:true,upright:true});
});
