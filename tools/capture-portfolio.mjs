import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const folder='artifacts/portfolio'; mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const report={browser:browser.version(),note:'Unedited screenshots of the running game. Phone captures use Chrome touch/viewport emulation, not physical Safari.',captures:[],errors:[]};
async function open(options,circuit){const context=await browser.newContext(options),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:5173/?circuit=${circuit}`);await page.waitForFunction(()=>window.__roadster?.getGraphics().renderReady);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);return {context,page};}
async function shot(page,name){await page.screenshot({path:`${folder}/${name}.png`});report.captures.push({file:`${name}.png`,viewport:page.viewportSize()});}
try{
 let {context,page}=await open({viewport:{width:1920,height:1080},deviceScaleFactor:1.5},'golden-gate');
 await shot(page,'desktop-golden-gate-hero');await context.close();
 ({context,page}=await open({viewport:{width:1920,height:1080},deviceScaleFactor:1.5},'coastal-launch'));
 await page.getByRole('button',{name:'Multiplayer'}).click();await page.getByRole('button',{name:'4 players',exact:true}).click();await page.getByRole('button',{name:'Plan your lines'}).click();
 for(let i=0;i<4;i++){if(i)await page.getByRole('button',{name:`I'm Player ${i+1}`}).click();await page.evaluate(() => window.__roadster.usePracticeLine());await page.getByRole('button',{name:'Lock in my line'}).click();}
 await page.waitForFunction(()=>window.__roadster.getGraphics().renderReady);for(const key of ['KeyA','KeyL','KeyQ','KeyP'])await page.keyboard.press(key);
 await page.waitForFunction(()=>{const s=window.__roadster.getState();return s.phase==='racing'&&s.race.time>1.8;});for(const key of ['KeyA','KeyL','KeyQ','KeyP'])await page.keyboard.press(key);await page.waitForTimeout(200);
 await shot(page,'desktop-coastal-multiplayer');await context.close();
 ({context,page}=await open({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true},'golden-gate'));
 await shot(page,'phone-portrait-golden-gate');await context.close();
 ({context,page}=await open({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true},'golden-gate'));
 await page.getByRole('button',{name:"Time Trial"}).click();await page.getByRole('button',{name:'Draw racing line'}).click();await page.evaluate(() => window.__roadster.usePracticeLine());await page.waitForFunction(()=>window.__roadster.getGraphics().renderReady);await page.waitForTimeout(150);
 await shot(page,'phone-landscape-racing-line');
 await page.getByRole('button',{name:'Race this line'}).click();await page.waitForFunction(()=>{const s=window.__roadster.getState();return s.phase==='racing'&&Math.abs(s.race.position.x)<25&&s.race.position.z>37&&s.race.position.z<47;},undefined,{timeout:90000});
 await page.getByRole('button',{name:'Activate thrust',exact:true}).click();await page.waitForTimeout(150);await shot(page,'phone-landscape-bridge-race');await context.close();
 writeFileSync(`${folder}/capture-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(report.errors.length)throw new Error('Capture page errors');
}finally{await browser.close();}
