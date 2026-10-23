import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
  const {RaceSimulation}=await server.ssrLoadModule('/src/core/simulation.ts');
  const {compileRoute,createPracticeSamples,sampleRoute}=await server.ssrLoadModule('/src/core/route.ts');
  const {circuits}=await server.ssrLoadModule('/src/content/circuits.ts');
  const {jumpPoint}=await server.ssrLoadModule('/src/core/support.ts');
  const {distance}=await server.ssrLoadModule('/src/core/geometry.ts');
  const compile=(t,branch=false)=>{const r=compileRoute(createPracticeSamples(t,7,branch),t);if(!r.ok)throw Error(r.message);return r.route;};
  const t=circuits[0].track, sim=new RaceSimulation(compile(t),t);
  sim.pressHop(); let peak=0,landing;
  while(sim.state.time<2&&!landing){sim.step();peak=Math.max(peak,sim.state.elevation);landing=sim.drainEvents().find(e=>e.type==='landing');}
  const ramp=[];
  for(const speed of [20,30,42]){
    const t=circuits[3].track,j=t.jumps[0],route=compile(t,true),sim=new RaceSimulation(route,t),s=sim.state;
    Object.assign(s,{position:jumpPoint(j,7.9),elevation:1.185,speed,heading:Math.PI/2,velocity:{x:speed,z:0}});
    s.distance=route.points.reduce((best,p)=>distance(p,s.position)<distance(sampleRoute(route,best),s.position)?p.distance:best,0);
    let takeoff,landing,peak=0;
    while(s.time<3&&!landing){sim.step();peak=Math.max(peak,s.elevation);for(const e of sim.drainEvents()){if(e.type==='takeoff')takeoff=e;if(e.type==='landing')landing=e;}}
    ramp.push({speed,airtime:landing&&takeoff?landing.time-takeoff.time:null,peak,recoveries:s.recoveryCount,landed:!!landing});
  }
  const launch=circuits[1].track,normal=compile(launch),shortcut=compile(launch,'service-hop');
  const report={manual:{peak,airtime:landing?.time,simulationTick:sim.state.tick},ramp,launchsite:{normalLength:normal.length,shortcutLength:shortcut.length,saving:normal.length-shortcut.length,traversals:shortcut.hopShortcuts}};
  await mkdir('artifacts/heavy-hop',{recursive:true});await writeFile('artifacts/heavy-hop/measurements.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await server.close();}
