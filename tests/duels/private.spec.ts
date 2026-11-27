import { expect, test, type Page } from '@playwright/test';
import { waitForPhase } from '../browser/ui';

async function draw(page:Page,touch:boolean){
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
for(const [venue,count] of [['coastal-launch',2],['coastal-launch',4],['golden-gate',4],['santa-monica',4]] as const){
  test(venue+' with '+count+' devices',async({browser})=>{
    // CI renders every client's WebGL scene on one CPU. Keep the real canvas,
    // input, clocks and network, but spend fewer pixels on each client.
    const softwareGraphics = process.env.WEBGL_BACKEND !== 'd3d11';
    if (softwareGraphics) test.setTimeout(360_000);
    const contexts=await Promise.all(Array.from({length:count},()=>browser.newContext({
      viewport: softwareGraphics ? {width:640,height:440} : {width:800,height:600},
      deviceScaleFactor: softwareGraphics ? 0.5 : 1,
    })));
    if (softwareGraphics) {
      await Promise.all(contexts.map(context => context.addInitScript(() => {
        // Limit only Babylon presentation, including the reloaded guest. The
        // server still steps at 60 Hz and pointer and socket clocks stay real.
        const timer = window.setInterval(() => {
          const engine = (window as any).__roadster?.getWorld()?.engine;
          if (engine) {
            engine.maxFPS = 10;
            window.clearInterval(timer);
          }
        }, 100);
      })));
    }
    const pages=await Promise.all(contexts.map(c=>c.newPage()));const [host,...guests]=pages;
    const errors:string[]=[];pages.forEach(p=>p.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.message);}));
    try{
      await host.goto('/');await host.getByRole('button',{name:'Multiplayer'}).click();
      await host.getByRole('button',{name:'Private Duel'}).click();
      await host.getByLabel('Driver name',{exact:true}).fill('Harbor Racer');
      await host.getByLabel('Car color',{exact:true}).selectOption('crimson');
      await host.getByRole('dialog').getByLabel('Circuit',{exact:true}).selectOption(venue);
      await host.getByRole('button',{name:'Create room'}).click();
      await expect(host.getByText('Private room',{exact:true})).toBeVisible({timeout:45000});
      const invite = host.url();
      expect(new URL(invite).searchParams.get('duelCircuit')).toBe(venue);
      for (const [i,guest] of guests.entries()) {
        await guest.goto(invite, {waitUntil:'domcontentloaded'});
        await guest.getByLabel('Driver name',{exact:true}).fill('Guest '+(i+1));
        await guest.getByLabel('Car color',{exact:true}).selectOption(['cobalt','solar','verdant'][i]);
        await guest.getByRole('button',{name:'Join room',exact:true}).click();
        await expect(guest.getByRole('dialog').getByText('Private room',{exact:true})).toBeVisible({timeout:60000});
      }
      await expect(host.getByRole('dialog').locator('p').filter({hasText:'Joined'})).toHaveCount(count,{timeout:30000});
      await expect(host.getByRole('dialog')).toContainText('Harbor Racer');
      await expect(host.getByRole('dialog')).toContainText('Guest 1');
      await host.getByRole('button',{name:'Start drawing'}).click();
      await test.step('Draw and lock every private line',async()=>{await Promise.all(pages.map((p,i)=>draw(p,i===1)));});
      await Promise.all(pages.map(p=>waitForPhase(p,'racing',20000)));
      for(const [i,page] of pages.entries()){
        const presentation=await page.evaluate(()=>{
          const game=(window as any).__roadster;
          return {lines:game.getState().visibleRouteCount,drivers:game.getState().drivers};
        });
        expect(presentation.lines).toBe(0);
        expect(presentation.drivers[0].name).toBe('Harbor Racer');
        expect(presentation.drivers[0].paint).toBe('crimson');
        expect(presentation.drivers[i].paint).toBe(['crimson','cobalt','solar','verdant'][i]);
      }
      await Promise.all([
        guests[0].reload({waitUntil:'domcontentloaded'}),
        (async()=>{await host.locator('#hop-button').click();await host.locator('#thrust-button').click();})(),
      ]);
      // The server keeps racing during reload. A short sprint can already be
      // over when the reclaimed seat receives its first authoritative frame.
      await expect.poll(() => guests[0].evaluate(() => {
        const phase = document.querySelector<HTMLElement>('.playground')?.dataset.phase;
        return ['racing','results'].includes(phase ?? '') ? phase : [
          phase, document.querySelector('dialog[open] h2')?.textContent,
          document.querySelector('dialog[open] [role=status]')?.textContent,
        ].filter(Boolean).join(' · ');
      }), {timeout:softwareGraphics ? 90000 : 45000}).toMatch(/^(racing|results)$/);
      const results=await Promise.all(pages.map(async p=>{
        const d=p.getByRole('dialog');await expect(d.getByRole('heading',{name:'Race results'})).toBeVisible({timeout:120000});
        return d.locator('section > p').allTextContents();
      }));
      for(const result of results){
        const standings = result.slice(0,count);
        expect(standings).toHaveLength(count);
        expect(standings.every(row=>/^\d+\. .+ · \d+\.\d{2} s$/.test(row))).toBe(true);
        expect(standings).toEqual(results[0].slice(0,count));
      }
      const redraw=venue==='santa-monica';
      await Promise.all(pages.map(p=>p.getByRole('button',{name:redraw?'Draw New Lines':'Race Again',exact:true}).click()));
      await Promise.all(pages.map(p=>waitForPhase(p,redraw?'drawing':'racing')));
      expect(errors).toEqual([]);
    }finally{await Promise.all(contexts.map(c=>c.close()));}
  });
}
