import { registerHooks } from 'node:module';
import { writeFile } from 'node:fs/promises';
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier))specifier+='.ts';
  return next(specifier,context);
}});
const {findCircuit}=await import('../src/content/circuits.ts');
const {compileRoute,createPracticeSamples,COMPILER_VERSION}=await import('../src/core/route.ts');
const {LocalRace}=await import('../src/core/local-race.ts');
const {RULES}=await import('../src/core/simulation.ts');
const {DUEL_PROTOCOL}=await import('../src/duels/protocol.ts');
const refs=[];
for(const circuit of ['coastal-launch','golden-gate','santa-monica','san-diego-fleet','orbital-launchyard','canyon-south-rim','la-nights','snowy-tahoe','capitan-yosemite','lax']){
  const track=findCircuit(circuit).track;
  const lines=[0,1].map(i=>createPracticeSamples(track,circuit==='santa-monica'?(i?6.5:13):circuit==='golden-gate'?(i?6:9):circuit==='san-diego-fleet'?(i?8.5:8):6+i/3,circuit==='santa-monica').map(p=>[p.x,p.z,p.time]));
  const race=new LocalRace(lines.map(line=>{
    const result=compileRoute(line.map(([x,z,time])=>({x,z,time})),track);
    if(!result.ok)throw Error(result.message);return result.route;
  }),track,1);
  const inputs=[{tick:90,player:0,ability:'thrust'},{tick:360,player:1,ability:'hop'}];
  const checkpoints=[],events=[];
  while(!race.finished && race.tick<12000){
    for(const c of inputs.filter(c=>c.tick===race.tick)){
      if(c.ability==='hop')race.pressHop(c.player);else race.pressThrust(c.player);
    }
    race.step();
    for(const e of race.drainEvents())if(['finish','car-impact','recovery','takeoff','landing','splash'].includes(e.type))events.push({tick:race.tick,player:e.player,type:e.type});
    if(race.tick%300===0||race.finished||events.at(-1)?.tick===race.tick)checkpoints.push({tick:race.tick,positions:race.racers.map(({state:s})=>[s.position.x,s.position.z,s.elevation].map(n=>+n.toFixed(6)))});
  }
  if(!race.finished)throw Error('Reference failed to finish: '+circuit);
  console.log(circuit,race.tick,[...new Set(events.map(e=>e.type))]);
  refs.push({protocol:DUEL_PROTOCOL,circuit,trackVersion:track.version,physics:RULES.version,compiler:COMPILER_VERSION,laps:1,lines,inputs,events,checkpoints,order:race.standings().map(s=>s.player),finish:race.racers.map(r=>r.state.finishTime)});
}
await writeFile(new URL('../tests/fixtures/duel-reference.json',import.meta.url),JSON.stringify(refs)+'\n');
