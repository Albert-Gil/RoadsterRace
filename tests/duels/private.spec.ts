import { expect, test, type Page } from '@playwright/test';
import { waitForPhase } from '../browser/ui';
import { draw } from './draw';

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
      // Your own car carries corner brackets, and the HUD shows your position out of all drivers.
      for(const page of pages){
        await expect(page.locator('.own-car-bracket:not([hidden])')).toHaveCount(1);
        await expect(page.locator('#pace-label')).toHaveText(/POSITION|GHOST START/);
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
      await Promise.all(pages.map(p=>p.getByRole('button',{name:redraw?'New lines':'Race again',exact:true}).click()));
      await Promise.all(pages.map(p=>waitForPhase(p,redraw?'drawing':'racing')));
      expect(errors).toEqual([]);
    }finally{await Promise.all(contexts.map(c=>c.close()));}
  });
}

test('an invite from the old 10-character format explains itself instead of failing silently', async ({ page }) => {
  await page.goto('/?duel=0A1B2C3D4E');
  await expect(page.getByRole('dialog')).toContainText('older version of the game');
  await page.getByRole('dialog').getByLabel('Room code').fill('tigger');
  await page.getByRole('button', { name: 'Join room', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Enter the room code');
  // A real word with no open room reaches the server and says so.
  await page.getByRole('dialog').getByLabel('Room code').fill('zebra9');
  await page.getByRole('button', { name: 'Join room', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('No open race uses this code', { timeout: 30000 });
});

test('an outdated room server shows Online play is updating, keeps the invite and offers Try again', async ({ page }) => {
  // A server from before version reporting answers /health without a protocol.
  await page.route('**/health', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.goto('/?duel=TIGER7');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Online play is updating')).toBeVisible({ timeout: 30000 });
  await expect(dialog.getByRole('button', { name: 'Create room' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Join room', exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('Room code')).toHaveValue('TIGER7');
  await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Private room', { exact: true })).toHaveCount(0);
  // The server catches up: Try again re-enables Create and Join.
  await page.unroute('**/health');
  await dialog.getByRole('button', { name: 'Try again' }).click();
  await expect(dialog.getByRole('button', { name: 'Create room' })).toBeEnabled({ timeout: 30000 });
  await expect(dialog.getByText('Online play is updating')).toBeHidden();
});

test('a server ahead of this tab offers Reload game once a newer website build is deployed', async ({ page }) => {
  await page.route('**/health', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, protocol: 99, physics: 99, compiler: 99, tracks: {} }) }));
  await page.goto('/');
  // Later fetches of the page itself see a different entry script: a newer deployment.
  await page.route(url => url.pathname === '/' , async route => {
    const html = await (await route.fetch()).text();
    await route.fulfill({ contentType: 'text/html', body: html.replace(/(<script type="module"[^>]*src=")([^"]+)"/, '$1$2?next"') });
  });
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('button', { name: 'Private Duel' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Online play is updating')).toBeVisible({ timeout: 30000 });
  await expect(dialog.getByRole('button', { name: 'Reload game' })).toBeVisible({ timeout: 30000 });
  await expect(dialog.getByRole('button', { name: 'Create room' })).toBeDisabled();
});

test('the updating screen gives up within its 15 s window when the server stops answering, and Home leaves at once', async ({ page }) => {
  let first = true;
  await page.route('**/health', async route => {
    if (first) { first = false; await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) }); return; }
    // Later checks never answer.
  });
  await page.goto('/?duel=TIGER7');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Online play is updating')).toBeVisible({ timeout: 30000 });
  const shown = Date.now();
  await expect(dialog.getByRole('button', { name: 'Home', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible({ timeout: 25000 });
  expect(Date.now() - shown).toBeLessThan(20000);
  // Leaving during a check: nothing reopens afterwards.
  await dialog.getByRole('button', { name: 'Try again' }).click();
  await dialog.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.waitForTimeout(16000);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.playground')).toHaveAttribute('data-phase', 'welcome');
});

test('opening Multiplayer starts waking the room server before Private Duel is chosen', async ({ page }) => {
  await page.goto('/');
  const wake = page.waitForRequest(request => new URL(request.url()).pathname === '/health', { timeout: 10000 });
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await wake;
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
