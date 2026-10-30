import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const captures='artifacts/home-art-refresh';mkdirSync(captures,{recursive:true});
for(const [name,viewport] of [
 ['desktop',{width:1440,height:900}],['phone-landscape',{width:844,height:390}],
 ['phone-portrait',{width:390,height:844}],['tablet',{width:810,height:1080}],
] as const){
 test(`all supplied Home pictures load and rotate without moving the menus: ${name}`,async({browser})=>{
  test.setTimeout(180000);
  const context=await browser.newContext({viewport,hasTouch:name!=='desktop',deviceScaleFactor:name==='phone-portrait'?2:1}),page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Choose index zero initially, then the next different picture on every Home arrival.
  // This exercises the real Home navigation/rotation with repeatable random choices.
  await page.addInitScript(()=>{Math.random=()=>0;});await page.goto('/');
  const {heroImages,heroArtRevision}=await page.evaluate(async()=>{
   const path='/src/presentation/themes.ts',{heroImages,heroArtRevision}=await import(path);return{heroImages,heroArtRevision};
  });
  const report:{id:string;source:string;width:number;height:number}[]=[];
  for(const art of heroImages){
   const expected=`${art.id}-${viewport.height>viewport.width?'tall':'wide'}.webp?v=${heroArtRevision}`;
   await page.waitForFunction(expected=>{const img=document.querySelector<HTMLImageElement>('.home-hero img');return img?.complete&&img.naturalWidth>0&&img.currentSrc.endsWith(expected);},expected);
   await expect(page.locator('.home-hero')).toHaveClass(/loaded/);
   await expect(page.locator('.home-hero img')).toHaveCSS('opacity','1');
   const image=await page.locator('.home-hero img').evaluate(img=>({source:(img as HTMLImageElement).currentSrc,width:(img as HTMLImageElement).naturalWidth,height:(img as HTMLImageElement).naturalHeight}));
   expect(image.width/image.height).toBeCloseTo(viewport.height>viewport.width?941/1672:1672/941,2);
   for(const action of['Solo Race','Multiplayer','Time Trial','Tutorial'])await expect(page.getByRole('button',{name:action,exact:true})).toBeVisible();
   await page.screenshot({path:`${captures}/${name}-${art.id}.png`});report.push({id:art.id,...image});
   await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Close settings',exact:true}).click();
   expect(await page.locator('.home-hero img').evaluate(img=>(img as HTMLImageElement).currentSrc)).toBe(image.source);
   if(art!==heroImages.at(-1)){
    await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'Home',exact:true}).click();
   }
  }
  // Rotation switches the responsive source while retaining the selected picture.
  await page.setViewportSize({width:viewport.height,height:viewport.width});
  const other=`${heroImages.at(-1)!.id}-${viewport.width>viewport.height?'tall':'wide'}.webp?v=${heroArtRevision}`;
  await page.waitForFunction(expected=>{const img=document.querySelector<HTMLImageElement>('.home-hero img');return img?.complete&&img.naturalWidth>0&&img.currentSrc.endsWith(expected);},other);
  expect(errors).toEqual([]);writeFileSync(`${captures}/${name}.json`,JSON.stringify({viewport,report,rotation:true,errors},null,2));await context.close();
 });
}
