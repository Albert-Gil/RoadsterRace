import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { waitForPhase } from './ui';

const dir = 'artifacts/pro-polish/interface';
mkdirSync(dir, { recursive: true });
for (const [width,height] of [[844,390],[390,844],[1024,768],[1440,900]]) test(`venue artwork and reachable setup at ${width}×${height}`, async ({page}) => {
  await page.setViewportSize({width,height});
  await page.goto('/?graphics=medium');
  await page.getByRole('button',{name:'Solo Race',exact:true}).click();
  for (const image of await page.locator('.circuit-art').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('naturalWidth',480);
    await expect(image).toHaveJSProperty('naturalHeight',270);
  }
  await page.locator('.driver-name-input').scrollIntoViewIfNeeded();
  const field=await page.locator('.driver-name-input').boundingBox(),footer=await page.locator('.setup-footer').boundingBox();
  expect(field!.y+field!.height).toBeLessThanOrEqual(footer!.y+1);
  await page.locator('.setup-scroll').evaluate(e=>e.scrollTop=0);
  await page.getByRole('button',{name:'Golden Gate circuit',exact:true}).click();
  const scroll=await page.locator('.setup-scroll').evaluate(e=>e.scrollTop);
  await page.getByRole('button',{name:'Santa Monica circuit',exact:true}).click();
  expect(await page.locator('.setup-scroll').evaluate(e=>e.scrollTop)).toBe(scroll);
  await page.screenshot({path:`${dir}/setup-${width}.png`});
});

test('missing artwork leaves a full circuit map and usable selection', async ({page})=>{
  await page.route('**/assets/circuits/coastal-launch.webp*',route=>route.abort());
  await page.goto('/'); await page.getByRole('button',{name:'Solo Race',exact:true}).click();
  const card=page.getByRole('button',{name:'Newport Island circuit',exact:true});
  await expect(card.locator('img')).toBeHidden();
  const map=await card.locator('svg').boundingBox(),visual=await card.locator('.circuit-visual').boundingBox();
  expect(map!.width).toBeGreaterThan(visual!.width*.8);
  await card.click(); await expect(card).toHaveAttribute('aria-pressed','true');
});

test('starting lights and classification preserve a complete race and direct exit actions', async ({page})=>{
  await page.goto('/?circuit=coastal-launch&graphics=medium');
  await page.getByRole('button',{name:'Solo Race',exact:true}).click();
  await page.getByRole('button',{name:'1 lap',exact:true}).click();
  await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine());
  await page.getByRole('button',{name:'Race this line',exact:true}).click();
  await expect(page.locator('.countdown')).toHaveAttribute('data-lights','1');
  expect(await page.evaluate(()=>(window as any).__roadster.getState().race.time)).toBe(0);
  await page.screenshot({path:`${dir}/countdown.png`});
  await waitForPhase(page,'results',120000);
  await expect(page.locator('.finish-gap')).toHaveCount(4);
  await expect(page.locator('.finish-gap').first()).toContainText('Winner');
  await page.getByText('Lap splits',{exact:true}).click();
  await expect(page.locator('.standing-laps').first()).toBeVisible();
  await page.getByText('Lap splits',{exact:true}).click();
  await page.waitForTimeout(350);
  await page.screenshot({path:`${dir}/results.png`});
  for(const name of ['Restart','Draw new lines','Home'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Home',exact:true}).click();await waitForPhase(page,'welcome');
});

test('repeated venue selection retains one scene and stable resource counts', async ({page})=>{
  test.setTimeout(600000);
  await page.goto('/?graphics=medium');
  await page.getByRole('button',{name:'Solo Race',exact:true}).click();
  const counts = new Map<string,{meshes:number;textures:number}>();
  for(let cycle=0;cycle<2;cycle++)for(const name of ['Newport Island','Launchsite','Golden Gate','Santa Monica','Grand Canyon','LA nights','Snowy Tahoe','Capitan Yosemite']){
    await page.getByRole('button',{name:`${name} circuit`,exact:true}).click();
    await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
    await page.waitForTimeout(200);
    const graphics=await page.evaluate(()=>(window as any).__roadster.getGraphics());
    expect(graphics.engineScenes).toBe(1);
    if(cycle){expect(graphics.meshes).toBe(counts.get(name)!.meshes);expect(graphics.textures).toBeLessThanOrEqual(counts.get(name)!.textures+1);}
    else counts.set(name,{meshes:graphics.meshes,textures:graphics.textures});
  }
});

test('an equal Time Trial retry is not announced as a new personal best', async ({page})=>{
  await page.goto('/?circuit=coastal-launch&graphics=medium');
  await page.getByRole('button',{name:'Time Trial',exact:true}).click();
  await page.getByRole('button',{name:'1 lap',exact:true}).click();
  await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine());
  await page.getByRole('button',{name:'Race this line',exact:true}).click();
  await waitForPhase(page,'results',120000);await expect(page.getByRole('heading',{name:'Personal best lap.'})).toBeVisible();
  const time=await page.locator('.finish-time').textContent();
  await page.getByRole('button',{name:'Restart',exact:true}).click();
  await waitForPhase(page,'racing');await waitForPhase(page,'results',120000);
  await expect(page.locator('.finish-time')).toHaveText(time!);
  await expect(page.getByRole('heading',{name:'Time trial complete.'})).toBeVisible();
});
