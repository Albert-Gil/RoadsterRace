import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const root='artifacts/recovery-refill';mkdirSync(root,{recursive:true});
for(const viewport of[{width:1440,height:900},{width:844,height:390}]){
 test(`a missed Fleet shortcut returns both abilities ready in the HUD ${viewport.width}`,async({browser})=>{
  const touch=viewport.width<1000,context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch}),page=await context.newPage();
  await page.goto('/?circuit=san-diego-fleet&graphics=medium');
  await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();
  await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
  await page.evaluate(()=>(window as any).__roadster.usePracticeLine('support-a-lane'));
  await page.getByRole('button',{name:'Race this line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='racing');
  // Spend the abilities before the water entry, then deliberately miss the required Hop.
  await page.keyboard.press('KeyH');await page.keyboard.press('Space');
  await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s.recoveryCount>0&&s.time<s.recoveringUntil;},undefined,{timeout:90000});
  const recovery=await page.evaluate(()=>{const s=(window as any).__roadster.getState().race;return{time:s.time,hold:s.recoveringUntil,hop:s.hopReadyAt,thrust:s.thrustReadyAt,hopCount:s.hopCount,thrustCount:s.thrustCount};});
  expect(recovery.hop).toBe(recovery.hold);expect(recovery.thrust).toBe(recovery.hold);expect(recovery.hopCount).toBe(1);expect(recovery.thrustCount).toBe(1);
  await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race,hop=document.querySelector<HTMLButtonElement>('#hop-button')!,thrust=document.querySelector<HTMLButtonElement>('#thrust-button')!;return s.recoveryCount===1&&s.time>=s.recoveringUntil&&!s.recoveryWaiting&&s.movement==='grounded'&&!hop.disabled&&!thrust.disabled&&hop.dataset.ready==='true'&&thrust.dataset.ready==='true';});
  await expect(page.locator('#hop-button .hop-status')).toHaveText('READY');await expect(page.locator('#thrust-status')).toHaveText('READY');
  await page.screenshot({path:`${root}/ready-after-recovery-${viewport.width}.png`});
  const hop=page.getByRole('button',{name:'Activate hop',exact:true}),thrust=page.getByRole('button',{name:'Activate thrust',exact:true});
  if(touch){await hop.tap();await thrust.tap();}else{await hop.click();await thrust.click();}
  await page.waitForFunction(()=>{const s=(window as any).__roadster.getState().race;return s.hopCount===2&&s.thrustCount===2;});
  writeFileSync(`${root}/browser-${viewport.width}.json`,JSON.stringify({recovery,after:await page.evaluate(()=>(window as any).__roadster.getState().race)},null,2));await context.close();
 });
}
