import{test,expect}from'@playwright/test';
import{mkdirSync,writeFileSync}from'node:fs';

test('rendered tyres and contact shadows follow the real uphill/downhill snow surface',async({page})=>{
 test.setTimeout(180000);mkdirSync('artifacts/tahoe-grounded',{recursive:true});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?circuit=snowy-tahoe&graphics=medium');await page.getByRole('button',{name:'Time Trial',exact:true}).click();await page.getByRole('button',{name:'1 lap',exact:true}).click();await page.getByRole('button',{name:'Draw racing line',exact:true}).click();await page.waitForFunction(()=>(window as any).__roadster.getGraphics().renderReady);
 await page.evaluate(async()=>{
  const url='/src/presentation/surface-height.ts',{snowSurfaceHeight}=await import(url),g=(window as any).__roadster,w=g.getWorld(),track=g.getTrack(),car=w.vehicles[0],V=car.root.position.constructor;
  const M=w.camera.getViewMatrix().constructor,R=w.scene.createPickingRay(0,0,M.Identity(),w.camera).constructor;
  (window as any).groundingChecks={ground:[],air:[],meshGaps:[]};let last=-1,lastMesh=-1;
  w.scene.onAfterRenderObservable.add(()=>{
   const s=g.getState().race;if(!s||s.time-last<.15)return;last=s.time;
   if(s.movement==='airborne'){const floor=snowSurfaceHeight({x:car.root.position.x,z:car.root.position.z},track);(window as any).groundingChecks.air.push(car.root.position.y-floor);return;}
   if(s.elevation<12||s.elevation>50)return;
   car.root.computeWorldMatrix(true);
   const sampleMesh=s.time-lastMesh>1;if(sampleMesh)lastMesh=s.time;
   const gaps=car.wheels.map((wheel:any)=>{
    const p=V.TransformCoordinates(new V(0,-wheel.radius,0),wheel.pivot.computeWorldMatrix(true));
    if(sampleMesh){const hit=w.scene.pickWithRay(new R(new V(p.x,p.y+2,p.z),new V(0,-1,0),5),(m:any)=>m.isEnabled()&&m.isVisible&&['asphalt','shoulder'].includes(m.material?.name));if(hit?.hit)(window as any).groundingChecks.meshGaps.push(p.y-hit.pickedPoint.y);}
    return p.y-(w.groundSurface?.height(p.x,p.z)??snowSurfaceHeight({x:p.x,z:p.z},track));
   });
   (window as any).groundingChecks.ground.push({time:s.time,pitch:car.root.rotation.x,roll:car.root.rotation.z,shadowProjected:car.shadow.metadata?.surfaceProjected,shadowTriangles:car.shadow.subMeshes[0].indexCount/3,gaps});
  });
  g.usePracticeLine();
 });
 await page.getByRole('button',{name:'Race this line',exact:true}).click();
 await page.waitForFunction(()=>(window as any).groundingChecks.ground.length>=6,null,{timeout:90000});
 await page.screenshot({path:'artifacts/tahoe-grounded/uphill-contact.png'});
 await page.waitForFunction(()=>(window as any).__roadster.getState().phase==='results',null,{timeout:90000});
 const report=await page.evaluate(()=>(window as any).groundingChecks);
 writeFileSync('artifacts/tahoe-grounded/contact.json',JSON.stringify({report,errors},null,2));
 expect(report.ground.length).toBeGreaterThan(12);expect(Math.max(...report.air)).toBeGreaterThan(.5);
 for(const sample of report.ground){
  for(const gap of sample.gaps)expect(Math.abs(gap-.01)).toBeLessThan(.065);
  expect(sample.shadowProjected).toBe(true);expect(sample.shadowTriangles).toBeGreaterThan(2);expect(sample.shadowTriangles).toBeLessThanOrEqual(512);
 }
 expect(report.ground.some((s:any)=>s.pitch<-.3)).toBe(true);expect(report.ground.some((s:any)=>s.pitch>.3)).toBe(true);expect(errors).toEqual([]);
 expect(report.meshGaps.length).toBeGreaterThan(8);for(const gap of report.meshGaps)expect(Math.abs(gap-.01)).toBeLessThan(.1);
});
