import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('artifacts/golden-city', {recursive:true});
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}}), errors=[], samples=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/?circuit=golden-gate'); await page.waitForFunction(()=>window.__roadster?.getGraphics().renderReady);
 await page.screenshot({path:'artifacts/golden-city/welcome.png'});
 await page.getByRole('button',{name:"Let's race"}).click(); await page.getByRole('button',{name:'1 lap',exact:true}).click(); await page.getByRole('button',{name:'Draw racing line'}).click();
 await page.screenshot({path:'artifacts/golden-city/drawing-desktop.png'});
 await page.evaluate(() => window.__roadster.usePracticeLine()); await page.waitForFunction(()=>window.__roadster.getGraphics().renderReady); await page.waitForTimeout(150); await page.screenshot({path:'artifacts/golden-city/after.png'});
 if(process.env.CAPTURE_VIEWS_ONLY!=='1') {
 await page.getByRole('button',{name:'Race this line'}).click(); await page.waitForFunction(()=>window.__roadster.getState().phase==='racing');
 await page.keyboard.press('Space'); let bridgeCaptured=false;
 while (true) {
   const data=await page.evaluate(()=>({graphics:window.__roadster.getGraphics(), state:window.__roadster.getState()})); if(data.state.phase==='racing') samples.push(data.graphics);
   if (!bridgeCaptured && data.state.race.position.z>37 && data.state.race.position.z<47 && Math.abs(data.state.race.position.x)<35) {await page.screenshot({path:'artifacts/golden-city/solo-bridge.png'}); bridgeCaptured=true;}
   if(data.state.phase==='results')break;
   if(samples.length>400)throw new Error('Solo capture did not finish'); await page.waitForTimeout(150);
 }
 await page.screenshot({path:'artifacts/golden-city/solo-results.png'});
 const report={browser:browser.version(),errors,bridgeCaptured,maxDrawCalls:Math.max(...samples.map(s=>s.drawCalls)),meanFps:samples.slice(5).reduce((n,s)=>n+s.fps,0)/Math.max(1,samples.length-5),samples};
 writeFileSync('artifacts/golden-city/solo-visual-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({errors,bridgeCaptured,maxDrawCalls:report.maxDrawCalls,meanFps:report.meanFps}));
 if(errors.length||!bridgeCaptured||report.maxDrawCalls>90)throw new Error('Solo visual acceptance failed');
 }
} finally {await browser.close();}
