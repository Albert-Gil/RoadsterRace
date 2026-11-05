import assert from 'node:assert/strict';
import { SourceTextModule } from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import { performance } from 'node:perf_hooks';

// Offline seeded regression evidence. Never imports rendering or browser state.
const ref=process.argv[2]==='current'?null:process.argv[2]??'HEAD';
const output=process.argv[3]??'artifacts/venue-rivals/cpu-current.json';
const selected=process.env.CPU_CIRCUIT, seeds=(process.env.CPU_SEEDS??'1,71,502').split(',').map(Number), laps=Number(process.env.CPU_LAPS??2);
const cache=new Map();
async function module(path) {
  if(!cache.has(path))cache.set(path,(async()=>new SourceTextModule(stripTypeScriptTypes(ref?execFileSync('git',['show',`${ref}:${path}`],{encoding:'utf8'}):await readFile(path,'utf8'),{mode:'transform'}),{identifier:path}))());
  return cache.get(path);
}
async function load(path) { const m=await module(path);if(m.status==='unlinked')await m.link((s,p)=>module(posix.normalize(posix.join(posix.dirname(p.identifier),`${s}.ts`))));if(m.status!=='evaluated')await m.evaluate();return m.namespace; }
const {circuits}=await load('src/content/circuits.ts'), {computerRoute,stepComputers}=await load('src/core/computer.ts'), {LocalRace}=await load('src/core/local-race.ts');
const report={baseline:ref??'working-copy',laps,seeds,rows:[]};
await mkdir(posix.dirname(output),{recursive:true});
for(const {id,track} of circuits) {
  if(selected&&selected!==id)continue;
  for(const difficulty of ['easy','normal','hard'])for(const seed of seeds) {
    const planning=performance.now(), routes=[0,0,1,2].map(i=>computerRoute(track,difficulty,i,seed)),planMs=performance.now()-planning;
    const race=new LocalRace(routes,track,laps),stats=Array.from({length:4},()=>({offRoadTicks:0,slideTicks:0,followingTicks:0})),start=performance.now();
    let ticks=0;
    for(;ticks<24000&&!race.finished;ticks++) {
      if(ticks%300===0)race.pressThrust(0);
      stepComputers(race,difficulty);race.step();
      for(let i=1;i<4;i++){const s=race.racers[i].state;if(s.finished)continue;stats[i].offRoadTicks+=+(s.sandAmount>.25);stats[i].slideTicks+=+(Math.abs(s.slipAngle)>.25);stats[i].followingTicks+=+(s.movement==='grounded'&&s.speed<8&&s.time>6&&!s.recoveryWaiting&&s.time>=s.recoveringUntil);}
    }
    const row={id,difficulty,seed,finished:race.finished,ticks,planMs,simulationMs:performance.now()-start,contacts:race.contactCount,cpu:race.racers.slice(1).map((r,i)=>({time:r.state.finishTime,recoveries:r.state.recoveryCount,thrusts:r.state.thrustCount,hops:r.state.hopCount,...stats[i+1]}))};
    report.rows.push(row);await writeFile(output,JSON.stringify(report,null,2));
    console.log(id,difficulty,seed,row.finished,row.cpu.map(c=>`${c.time?.toFixed(2)??'DNF'}/${c.recoveries}`).join(' '));
    assert.ok(row.finished,`${id}/${difficulty}/${seed} did not finish`);
  }
}
