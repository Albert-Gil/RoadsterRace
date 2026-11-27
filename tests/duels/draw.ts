import type { Page } from '@playwright/test';
import { waitForPhase } from '../browser/ui';

/** Draws the course centreline, or a Hop shortcut when named, as a real stroke (mouse or touch) and locks the line. */
export async function draw(page:Page,touch:boolean,shortcut?:string){
  await waitForPhase(page,'drawing',35000);
  await page.waitForFunction(()=>Boolean((window as any).__roadster?.getGraphics().renderReady));
  const points=await page.evaluate((shortcut?:string)=>{
    type P={x:number;z:number};
    const g=(window as any).__roadster,t=g.getTrack();
    let path:P[]=t.centerline;
    if(shortcut){
      // Same splice as createPracticeSamples: centreline, the shortcut branch, then centreline again.
      const s=t.hopShortcuts.find((h:{id:string})=>h.id===shortcut);
      const a=t.distances.findIndex((d:number)=>d>=s.entryProgress),b=t.distances.findIndex((d:number)=>d>=s.exitProgress);
      path=[...t.centerline.slice(0,a),...s.branch,...t.centerline.slice(b)];
    }
    const along=[0];for(let i=1;i<path.length;i++)along.push(along[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z));
    const total=along.at(-1)!,count=72,out:{x:number;y:number;time:number}[]=[];
    for(let k=0,j=0;k<=count;k++){
      const d=k/count*total;while(j<path.length-2&&along[j+1]<d)j++;
      const f=(d-along[j])/Math.max(1e-9,along[j+1]-along[j]);
      out.push({...g.project({x:path[j].x+(path[j+1].x-path[j].x)*f,z:path[j].z+(path[j+1].z-path[j].z)*f}),time:d/total*6});
    }
    return shortcut?out:t.centerline.flatMap((p:unknown,i:number)=>i%Math.max(1,Math.floor(t.centerline.length/54))===0||i===t.centerline.length-1?[{...g.project(p),time:t.distances[i]/t.length*6}]:[]) as {x:number;y:number;time:number}[];
  },shortcut);
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
