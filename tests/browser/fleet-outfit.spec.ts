import{test,expect}from'@playwright/test';
for(const viewport of[{width:844,height:390},{width:390,height:844}])test(`Fleet animated details stay on their ships and respect reduced motion ${viewport.width}`,async({browser})=>{
 const c=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:'no-preference'}),p=await c.newPage();const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('/?circuit=san-diego-fleet&graphics=medium');await p.getByRole('button',{name:'Time Trial',exact:true}).click();await p.getByRole('button',{name:'Draw racing line',exact:true}).click();await p.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 const positions=()=>p.evaluate(()=>Array.from((window as any).__roadster.getWorld().scene.getMeshByName('fleet-radars').getVerticesData('position')) as number[]);
 const a=await positions();await p.waitForTimeout(450);const b=await positions();expect(a.some((v,i)=>Math.abs(v-b[i])>.1)).toBe(true);
 const bounded=await p.evaluate(()=>{const g=(window as any).__roadster,t=g.getTrack(),ps=g.getWorld().scene.getMeshByName('fleet-radars').getVerticesData('position'),owners=t.barriers.filter((b:any)=>!b.deckSurfaceId&&(b.id.includes('island')||b.id.includes('bridge')||b.id.includes('aircraft')&&b.id.endsWith('-92')));
  const inside=(x:number,z:number,points:any[])=>{let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;};
  for(let i=0;i<ps.length;i+=3)if(!owners.some((b:any)=>ps[i+1]>=b.baseHeight&&ps[i+1]<=b.baseHeight+b.height+.01&&inside(ps[i],ps[i+2],b.footprint)))return false;return true;});expect(bounded).toBe(true);
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);const frozen=await positions();await p.waitForTimeout(180);expect(await positions()).toEqual(frozen);
 expect(await p.evaluate(()=>(window as any).__roadster.getGraphics().drawCalls)).toBeLessThanOrEqual(90);expect(errors).toEqual([]);await c.close();
});
