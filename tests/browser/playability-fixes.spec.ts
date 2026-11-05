import {test,expect} from '@playwright/test';
import {waitForPhase} from './ui';
import {mkdirSync} from 'node:fs';

for(const tier of['low','medium','high','ultra'])test(`desktop mouse stroke is visibly rendered at ${tier}`,async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/?graphics=${tier}`);await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
 await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady,null,{timeout:120000});
 const ps=await page.evaluate(()=>{const g=(window as any).__roadster;return g.getTrack().centerline.filter((_:any,i:number)=>i%3===0).map((p:any)=>g.project(p));});
 await page.mouse.move(ps[0].x,ps[0].y);await page.mouse.down();for(const p of ps.slice(1,Math.floor(ps.length/2)))await page.mouse.move(p.x,p.y);
 await page.waitForFunction(()=>(window as any).__roadster.getRawStroke().length>10);await page.waitForTimeout(200);
 // Read actual framebuffer pixels, not only mesh visibility: the old simple shader had meshes
 // marked ready/active while drawing no pixels on desktop ANGLE/D3D11.
 const changed=await page.evaluate(async()=>{
  const g=(window as any).__roadster,w=g.getWorld(),lines=w.scene.meshes.filter((m:any)=>m.name==='pace-route');
  const frame=(visible:boolean)=>new Promise<string>(resolve=>{for(const m of lines)m.isVisible=visible;w.scene.onAfterRenderObservable.addOnce(()=>resolve(w.engine.getRenderingCanvas().toDataURL()));});
  const read=async(url:string)=>{const i=new Image();i.src=url;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d')!;x.drawImage(i,0,0);return x.getImageData(0,0,c.width,c.height).data;};
  const off=await read(await frame(false)),on=await read(await frame(true));let green=0;
  for(let i=0;i<on.length;i+=4)if(on[i+1]>120&&on[i+1]>on[i]*1.25&&Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>60)green++;
  return green;
 });expect(changed).toBeGreaterThan(1500);
 mkdirSync('artifacts/playability-fixes',{recursive:true});await page.screenshot({path:`artifacts/playability-fixes/desktop-line-${tier}.png`});await page.mouse.up();expect(errors).toEqual([]);
});

for(const view of[{width:844,height:390},{width:740,height:320},{width:390,height:844},{width:1440,height:900}])test(`pause actions remain centered and reachable at ${view.width}x${view.height}`,async({browser})=>{
 const c=await browser.newContext({viewport:view,hasTouch:view.width<1000,isMobile:view.width<1000,reducedMotion:'no-preference'}),p=await c.newPage();
 await p.goto('/');await p.getByRole('button',{name:'Time Trial',exact:true}).click();await p.getByRole('button',{name:'Draw racing line',exact:true}).click();await p.evaluate(()=>(window as any).__roadster.usePracticeLine());await p.getByRole('button',{name:'Race this line',exact:true}).click();await waitForPhase(p,'racing');await p.keyboard.press('Escape');await waitForPhase(p,'paused');await p.waitForTimeout(250);
 const box=await p.locator('#panel').boundingBox();expect(box).not.toBeNull();expect(Math.abs(box!.x+box!.width/2-view.width/2)).toBeLessThan(2);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(view.height+1);
 for(const name of['Resume','Restart race','Draw new lines','Home']){const b=p.getByRole('button',{name,exact:true});await b.scrollIntoViewIfNeeded();const r=await b.boundingBox();expect(r!.y).toBeGreaterThanOrEqual(0);expect(r!.y+r!.height).toBeLessThanOrEqual(view.height+1);}
 mkdirSync('artifacts/playability-fixes',{recursive:true});await p.screenshot({path:`artifacts/playability-fixes/pause-${view.width}.png`});await p.getByRole('button',{name:'Draw new lines',exact:true}).click();await waitForPhase(p,'drawing');await c.close();
});

test('Yosemite canoe hulls translate, stay batched and freeze with reduced motion',async({page})=>{
 await page.goto('/?circuit=capitan-yosemite&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const read=()=>page.evaluate(()=>{const s=(window as any).__roadster.getWorld().scene,m=s.meshes.find((m:any)=>m.name==='yosemite-river-canoes');return{count:s.meshes.filter((m:any)=>m.name==='yosemite-river-canoes').length,p:Array.from(m.getVerticesData('position'))as number[]};});
 const a=await read();await page.waitForTimeout(1200);const b=await read();expect(b.count).toBe(1);expect(Math.hypot(b.p[0]-a.p[0],b.p[2]-a.p[2])).toBeGreaterThan(.1);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);const fixed=await read();await page.waitForTimeout(250);expect(await read()).toEqual(fixed);
});
