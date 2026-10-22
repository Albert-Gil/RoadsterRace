import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const folder='artifacts/drawing-layout'; mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
try { const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await page.goto('http://127.0.0.1:5173/?circuit=launchsite');await page.getByRole('button',{name:"Let's race"}).click();await page.getByRole('button',{name:'Draw racing line'}).click();await page.waitForFunction(()=>window.__roadster.getGraphics().renderReady);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
const name=process.argv[2]??'before';await page.screenshot({path:`${folder}/${name}.png`});
const bounds=await page.evaluate(()=>{const g=window.__roadster,points=g.getTrack().centerline.map(p=>g.project(p)),xs=points.map(p=>p.x),ys=points.map(p=>p.y);return {viewport:{width:innerWidth,height:innerHeight},track:{width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys),left:Math.min(...xs),top:Math.min(...ys)}};});writeFileSync(`${folder}/${name}.json`,JSON.stringify(bounds,null,2));console.log(JSON.stringify(bounds));
}finally{await browser.close();}
