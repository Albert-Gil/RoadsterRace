import { registerHooks } from 'node:module';
import { performance } from 'node:perf_hooks';
import { getMessageBytes, Protocol } from '@colyseus/core';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?s+'.ts':s,c);}});
const {findCircuit}=await import('../src/content/circuits.ts');
const {compileRoute,createPracticeSamples}=await import('../src/core/route.ts');
const {LocalRace}=await import('../src/core/local-race.ts');
const {packFrame}=await import('../src/duels/protocol.ts');
const setups=['coastal-launch','golden-gate','santa-monica'].map(circuit=>{
  const t=findCircuit(circuit).track;
  const r=compileRoute(createPracticeSamples(t),t);if(!r.ok)throw Error(r.message);
  return {track:t,routes:Array(4).fill(r.route)};
});
for(const n of [1,4,8,16]){
  const rooms=Array.from({length:n},(_,i)=>new LocalRace(setups[i%3].routes,setups[i%3].track,6));
  const times=[];let bytes=0;
  for(let tick=0;tick<600;tick++){
    const start=performance.now();
    for(const room of rooms){
      room.step();
      const events=room.drainEvents();
      if(tick%3===0){
        const wire=packFrame({round:1,tick:room.tick,countdown:0,cars:room.racers.map(r=>r.state),order:room.standings(),events});
        const payload=getMessageBytes.raw(Protocol.ROOM_DATA,'frame',wire);
        bytes+=payload.byteLength;
      }
    }
    if(tick>=60)times.push(performance.now()-start);
  }
  times.sort((a,b)=>a-b);
  console.log(JSON.stringify({rooms:n,players:n*4,medianTickMs:+times[Math.floor(times.length*.5)].toFixed(2),p95TickMs:+times[Math.floor(times.length*.95)].toFixed(2),bytesPerPlayerMinute:Math.round(bytes/n*6)}));
}
