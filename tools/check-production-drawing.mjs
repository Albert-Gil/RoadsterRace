import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const options={viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true};
const report={note:'Production uses recorded real browser touch input; no development API or automatic practice plan.',errors:[]};
try {
  let context=await browser.newContext(options),page=await context.newPage();
  await page.goto('http://127.0.0.1:5173/?circuit=launchsite');await page.getByRole('button',{name:"Time Trial"}).click();await page.getByRole('button',{name:'Draw racing line'}).click();await page.waitForFunction(()=>window.__roadster.getGraphics().renderReady);
  const points=await page.evaluate(()=>{const g=window.__roadster,t=g.getTrack();return t.centerline.map((p,i)=>({...g.project(p),time:t.distances[i]/t.length*7})).filter((p,i)=>i%2===0||i===t.centerline.length-1);});
  writeFileSync('artifacts/drawing-layout/production-recorded-input.json',JSON.stringify({viewport:options.viewport,points},null,2));await context.close();
  context=await browser.newContext(options);page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:4176/?circuit=launchsite');await page.getByRole('button',{name:"Time Trial"}).click();await page.getByRole('button',{name:'Draw racing line'}).click();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
  if(await page.evaluate(()=> '__roadster' in window))throw new Error('Development helper in production');
  if(await page.getByRole('button',{name:'Try a practice line'}).count())throw new Error('Practice shortcut present');
  await page.screenshot({path:'artifacts/drawing-layout/production-phone-drawing.png'});
  const cdp=await context.newCDPSession(page),epoch=Date.now()/1000;
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:points[0].x,y:points[0].y,id:1}],timestamp:epoch});
  for(const p of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y,id:1}],timestamp:epoch+p.time});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:epoch+7});await cdp.detach();
  await page.getByRole('button',{name:'Race this line'}).waitFor();await page.screenshot({path:'artifacts/drawing-layout/production-phone-preview.png'});
  await page.getByRole('button',{name:'Race this line'}).click();await page.waitForFunction(()=>document.querySelector('main').dataset.phase==='racing'&&document.querySelector('#race-time').textContent!=='00:00.00');
  await page.waitForTimeout(300);report.result=await page.evaluate(()=>({phase:document.querySelector('main').dataset.phase,time:document.querySelector('#race-time').textContent,testApiAbsent:!('__roadster'in window),bodyScroll:document.documentElement.scrollHeight>innerHeight+1}));
  await page.screenshot({path:'artifacts/drawing-layout/production-phone-racing.png'});await context.close();
  if(report.errors.length||report.result.phase!=='racing'||report.result.bodyScroll)throw new Error(JSON.stringify(report));
  writeFileSync('artifacts/drawing-layout/production-touch-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
