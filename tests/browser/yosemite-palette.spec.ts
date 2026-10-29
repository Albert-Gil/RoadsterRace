import {expect,test} from '@playwright/test';

test('Yosemite native surface palettes survive theme changes without double tinting or moving the route',async({page})=>{
 await page.goto('/?circuit=capitan-yosemite&graphics=medium');
 await page.getByRole('button',{name:'Time Trial',exact:true}).click();
 await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 await page.evaluate(()=>(window as any).__roadster.usePracticeLine());
 const result=await page.evaluate(async()=>{
  const g=(window as any).__roadster,w=g.getWorld(),path='/src/presentation/themes.ts',{themes}=await import(path);
  const read=()=>({colors:['terrain','asphalt','shoulder','water'].map(name=>w.scene.getMaterialByName(name).diffuseColor.asArray()),points:g.getRoute().points,projected:g.getTrack().centerline.filter((_:any,i:number)=>i%12===0).map((p:any)=>g.project(p))});
  const before=read();w.setTheme(themes.graphite);const graphite=read();w.setTheme(themes.coastal);const after=read();
  return{before,graphite,after,dressingTriangles:w.scene.meshes.filter((m:any)=>m.metadata?.protectedDressing).reduce((n:number,m:any)=>n+m.getTotalIndices()/3,0)};
 });
 expect(result.before.colors).toEqual(Array.from({length:4},()=>[1,1,1]));
 expect(result.graphite).toEqual(result.before);expect(result.after).toEqual(result.before);
 expect(result.dressingTriangles).toBeGreaterThan(1000);expect(result.dressingTriangles).toBeLessThan(5000);
});
