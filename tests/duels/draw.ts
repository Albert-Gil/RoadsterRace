import type { Page } from '@playwright/test';
import { waitForPhase } from '../browser/ui';

/** Draws the course centreline as a real stroke (mouse or touch) and locks the line. */
export async function draw(page:Page,touch:boolean){
  await waitForPhase(page,'drawing',35000);
  await page.waitForFunction(()=>Boolean((window as any).__roadster?.getGraphics().renderReady));
  const points=await page.evaluate(()=>{
    const g=(window as any).__roadster,t=g.getTrack();
    return t.centerline.flatMap((p:unknown,i:number)=>i%Math.max(1,Math.floor(t.centerline.length/54))===0||i===t.centerline.length-1?[{...g.project(p),time:t.distances[i]/t.length*6}]:[]) as {x:number;y:number;time:number}[];
  });
  const cdp=await page.context().newCDPSession(page),epoch=Date.now()/1000;
  if(touch)await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  for(const [i,p] of points.entries()){
    if(touch)await cdp.send('Input.dispatchTouchEvent',{type:i?'touchMove':'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}],timestamp:epoch+p.time});
    else await cdp.send('Input.dispatchMouseEvent',{type:i?'mouseMoved':'mousePressed',button:i?'none':'left',buttons:1,x:p.x,y:p.y,timestamp:epoch+p.time});
  }
  const last=points.at(-1)!;
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:epoch+last.time+.01});
  else await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',x:last.x,y:last.y,timestamp:epoch+last.time+.01});
  await cdp.detach();await waitForPhase(page,'preview',18000);await page.locator('[data-action=confirm]').click();
}
