import { expect, test, type Page } from '@playwright/test';
import { waitForPhase } from '../browser/ui';
import { draw } from './draw';

// San Diego Fleet is offered only when the room server sets DUEL_EXTRA_VENUES
// (playwright.duels.config.ts does). Four devices: landscape mouse, portrait touch,
// and one driver on each support-ship shortcut; one of those reloads mid-drawing.
test('san-diego-fleet with 4 devices, both shortcuts, portrait drawing and private lines across a reload and new lines',async({browser})=>{
  const softwareGraphics = process.env.WEBGL_BACKEND !== 'd3d11';
  test.setTimeout(softwareGraphics ? 420_000 : 240_000);
  const scale = softwareGraphics ? 0.5 : 1;
  const viewports = [{width:640,height:440},{width:390,height:844},{width:640,height:440},{width:640,height:440}];
  const contexts = await Promise.all(viewports.map(viewport => browser.newContext({viewport, deviceScaleFactor:scale, hasTouch:viewport.height>viewport.width})));
  if (softwareGraphics) await Promise.all(contexts.map(context => context.addInitScript(() => {
    const timer = window.setInterval(() => {
      const engine = (window as any).__roadster?.getWorld()?.engine;
      if (engine) { engine.maxFPS = 10; window.clearInterval(timer); }
    }, 100);
  })));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  const [host, portrait, laneA, laneB] = pages;
  const errors: string[] = [];
  pages.forEach(p => p.on('pageerror', e => { errors.push(e.message); console.error('Page error:', e.message); }));
  const routes = (p: Page) => p.evaluate(() => (window as any).__roadster.getState().visibleRouteCount as number);
  try {
    await host.goto('/');
    await host.getByRole('button',{name:'Multiplayer'}).click();
    await host.getByRole('button',{name:'Private Duel'}).click();
    await host.getByLabel('Driver name',{exact:true}).fill('Harbor Racer');
    const picker = host.getByRole('dialog').getByLabel('Circuit',{exact:true});
    await expect(picker.locator('option[value="san-diego-fleet"]')).toHaveCount(1,{timeout:30000});
    await picker.selectOption('san-diego-fleet');
    await host.getByRole('button',{name:'Create room'}).click();
    await expect(host.getByText('Private room',{exact:true})).toBeVisible({timeout:45000});
    const invite = host.url();
    for (const [i,guest] of pages.slice(1).entries()) {
      await guest.goto(invite,{waitUntil:'domcontentloaded'});
      await guest.getByLabel('Driver name',{exact:true}).fill('Guest '+(i+1));
      await guest.getByRole('button',{name:'Join room',exact:true}).click();
      await expect(guest.getByRole('dialog').getByText('Private room',{exact:true})).toBeVisible({timeout:60000});
    }
    await expect(host.getByRole('dialog').locator('p').filter({hasText:'Joined'})).toHaveCount(4,{timeout:30000});
    await host.getByRole('button',{name:'Start drawing'}).click();

    await test.step('Draw: landscape main route, portrait touch, then a reload before the shortcut lines', async () => {
      await Promise.all([draw(host,false), draw(portrait,true)]);
      // A driver who reloads mid-drawing gets the drawing board back and sees nobody else's line.
      await waitForPhase(laneB,'drawing',35000);
      await laneB.reload({waitUntil:'domcontentloaded'});
      await waitForPhase(laneB,'drawing',60000);
      expect(await routes(laneB)).toBe(0);
      // Locked drivers see at most their own line while they wait.
      for (const p of [host,portrait]) expect(await routes(p)).toBeLessThanOrEqual(1);
      await Promise.all([draw(laneA,false,'support-a-lane'), draw(laneB,false,'support-b-lane')]);
      // Each stroke compiled to its own deck crossings: the main route crosses every ramp
      // automatically, while each shortcut adds its Hop onto a support ship.
      const crossings = (p: Page) => p.evaluate(() => (window as any).__roadster.getState().route?.crossings as string[]);
      expect(await crossings(host)).toEqual(expect.arrayContaining(['carrier-a-crossing','carrier-b-crossing']));
      expect(await crossings(laneA)).toContain('support-a-hop');
      expect(await crossings(laneB)).toContain('support-b-hop');
    });
    await Promise.all(pages.map(p => waitForPhase(p,'racing',20000)));
    for (const p of pages) {
      expect(await routes(p)).toBe(0);
      await expect(p.locator('.own-car-bracket:not([hidden])')).toHaveCount(1);
    }
    // Hop at the support-ship lip; whether it lands or recovers, every device must agree on the result.
    await Promise.all([laneA,laneB].map(p => p.locator('#hop-button').click()));
    const results = await Promise.all(pages.map(async p => {
      const d = p.getByRole('dialog');
      await expect(d.getByRole('heading',{name:'Race results'})).toBeVisible({timeout:180000});
      return (await d.locator('.seat-result').allTextContents()).slice(0,4);
    }));
    for (const result of results) {
      expect(result.every(row => /^\d+\. .+ · \d+\.\d{2} s$/.test(row))).toBe(true);
      expect(result).toEqual(results[0]);
    }
    // New lines: a fresh drawing round where nobody sees any line from the last race.
    await Promise.all(pages.map(p => p.getByRole('button',{name:'New lines',exact:true}).click()));
    await Promise.all(pages.map(p => waitForPhase(p,'drawing',30000)));
    for (const p of pages) expect(await routes(p)).toBe(0);
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
