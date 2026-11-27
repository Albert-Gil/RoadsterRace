import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DuelRoom, duelTracks } from '../../server/duel-room';
import { createPracticeSamples, compileRoute, COMPILER_VERSION } from '../../src/core/route';
import { LocalRace } from '../../src/core/local-race';
import { RULES } from '../../src/core/simulation';
import { findCircuit } from '../../src/content/circuits';
import { DUEL_PROTOCOL, offeredVenues, unpackFrame, type WireFrame, type RaceFrame, type RoomView } from '../../src/duels/protocol';

const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate:()=>unknown){
  const deadline=Date.now()+6500;
  while(!predicate() && Date.now()<deadline)await delay(8);
  expect(predicate()).toBeTruthy();
}
class Driver {
  view?:RoomView;
  frame?:RaceFrame;
  error?:{category:string;reason:string;detail?:string};
  line:unknown;
  cooldowns?:{round:number;hopReadyAt:number;thrustReadyAt:number};
  frames:RaceFrame[]=[];
  results:{round:number;sequence:number;ability:string;outcome:string}[]=[];
  constructor(readonly room:Room) {
    room.onMessage('room',(v:RoomView)=>this.view=v);
    room.onMessage('frame',(f:WireFrame)=>{this.frame=unpackFrame(f);this.frames.push(this.frame);});
    room.onMessage('ownLine',data=>this.line=data);
    room.onMessage('error',e=>this.error=e);
    room.onMessage('cooldowns',c=>this.cooldowns=c);
    room.onMessage('ability-result',r=>this.results.push(r));
    room.send('sync');
  }
}
describe('private duel transport and authority',()=>{
  const http=createServer();
  let server:Server,client:Client;
  beforeAll(async()=>{
    server=new Server({transport:new WebSocketTransport({server:http,maxPayload:768*1024}),greet:false,gracefullyShutdown:false});
    server.define('private_duel',DuelRoom);
    await server.listen(0,'127.0.0.1');
    client=new Client('http://127.0.0.1:'+(http.address() as AddressInfo).port);
  });
  afterAll(async()=>{await server.gracefullyShutdown(false);});
  it('offers San Diego Fleet only when the server flag lists it',async()=>{
    const fleet=findCircuit('san-diego-fleet').track;
    const opts={circuit:fleet.id,laps:1,protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,versions:{[fleet.id]:fleet.version},name:'A',paint:'glacier'};
    const before=process.env.DUEL_EXTRA_VENUES;
    try{
      delete process.env.DUEL_EXTRA_VENUES;
      expect([...duelTracks().keys()]).toEqual(['coastal-launch','golden-gate','santa-monica']);
      await expect(client.create('private_duel',opts)).rejects.toThrow('settings-invalid');
      process.env.DUEL_EXTRA_VENUES=' san-diego-fleet ,not-a-venue';
      expect(duelTracks().get(fleet.id)?.version).toBe(fleet.version);
      const room=await client.create('private_duel',opts);
      const host=new Driver(room);
      await until(()=>host.view?.circuit===fleet.id&&host.view.trackVersion===fleet.version);
      await room.leave();
    }finally{ if(before===undefined)delete process.env.DUEL_EXTRA_VENUES; else process.env.DUEL_EXTRA_VENUES=before; }
    expect(offeredVenues({venues:['golden-gate','san-diego-fleet','bogus']})).toEqual(['golden-gate','san-diego-fleet']);
    expect(offeredVenues({})).toEqual(['coastal-launch','golden-gate','santa-monica']);
    expect(offeredVenues({venues:[]})).toEqual(['coastal-launch','golden-gate','santa-monica']);
  });
  it('races San Diego Fleet online with the same routes, presses, flights, recoveries and finish times as a local race',async()=>{
    const track=findCircuit('san-diego-fleet').track, before=process.env.DUEL_EXTRA_VENUES;
    process.env.DUEL_EXTRA_VENUES='san-diego-fleet';
    const options={name:'A',paint:'glacier',protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,versions:{[track.id]:track.version},circuit:track.id,laps:1};
    const drivers:Driver[]=[];
    try{
      drivers.push(new Driver(await client.create('private_duel',options)));
      const code=drivers[0].room.roomId;
      for(let i=1;i<4;i++)drivers.push(new Driver(await client.joinById(code,{...options,name:'D'+(i+1)})));
      await until(()=>drivers[0].view?.drivers.length===4);
      drivers[0].room.send('start');
      await until(()=>drivers.every(d=>d.view?.phase==='drawing'));
      // Main route at 8 s (clears every ramp), main route at 9 s (misses landings and
      // recovers), and both support-ship shortcuts, whose Hop is pressed over the wire.
      const lines=[createPracticeSamples(track,8),createPracticeSamples(track,9),createPracticeSamples(track,8,'support-a-lane'),createPracticeSamples(track,8,'support-b-lane')].map(line=>line.map(p=>[p.x,p.z,p.time]));
      const presses=new Map([[700,3],[1100,2]]);
      drivers.forEach((d,i)=>d.room.send('line',{round:1,samples:lines[i]}));
      await until(()=>drivers.every(d=>d.frame?.countdown));
      const room=matchMaker.getLocalRoomById(code) as DuelRoom;
      room.setTimestep();
      const routes=lines.map(line=>{const r=compileRoute(line.map(([x,z,time])=>({x,z,time})),track);if(!r.ok)throw new Error(r.message);return r.route;});
      // The server compiled each private line to exactly the deck crossings the client compiles.
      routes.forEach((route,i)=>expect(JSON.parse(JSON.stringify(room['seats'][i].route))).toEqual(JSON.parse(JSON.stringify(route))));
      expect(routes[2].crossings?.map(c=>c.id)).toContain('support-a-hop');
      expect(routes[3].crossings?.map(c=>c.id)).toContain('support-b-hop');
      const tickMs=1000/60, race=()=>room['race']!;
      for(let i=0;i<4000 && drivers[0].view?.phase!=='results';i++){
        const next=[...presses.keys()].find(t=>t>=(race()?.tick??0)&&t<(race()?.tick??0)+60);
        if(race() && next!==undefined){
          while(race().tick<next)room['advance'](tickMs);
          expect(race().tick).toBe(next);
          const seat=presses.get(next)!;
          drivers[seat].room.send('ability',{round:1,sequence:next,tick:next,ability:'hop'});
          await until(()=>room['seats'][seat].lastSequence===next);
          presses.delete(next);
        }
        room['advance'](12*tickMs);await delay(0);
      }
      expect(presses.size).toBe(0);
      await until(()=>drivers.every(d=>d.view?.phase==='results'));
      const local=new LocalRace(routes,track,1), states=new Map<number,{elevation:number;recoveryCount:number;movement:string}[]>();
      const kinds=new Set<string>();
      while(!local.finished&&local.tick<20000){
        if(local.tick===700)local.pressHop(3);
        if(local.tick===1100)local.pressHop(2);
        local.step();for(const e of local.drainEvents())kinds.add(e.type);
        states.set(local.tick,local.racers.map(({state:s})=>({elevation:s.elevation,recoveryCount:s.recoveryCount,movement:s.movement})));
      }
      expect(local.finished).toBe(true);
      expect([...kinds]).toEqual(expect.arrayContaining(['takeoff','landing','recovery','finish']));
      // Every snapshot the host saw matches the local race at that tick through flight and recovery.
      const seen=drivers[0].frames.filter(f=>f.round===1&&states.has(f.tick));
      expect(seen.length).toBeGreaterThan(100);
      expect(seen.some(f=>f.cars.some(c=>c.movement==='airborne'))).toBe(true);
      expect(seen.some(f=>f.cars.some(c=>c.recoveryCount>0))).toBe(true);
      for(const f of seen)f.cars.forEach((c,i)=>{
        const s=states.get(f.tick)![i];
        expect(Math.abs(c.elevation-s.elevation)).toBeLessThanOrEqual(.006);
        expect(c.recoveryCount).toBe(s.recoveryCount);expect(c.movement).toBe(s.movement);
      });
      const online=drivers[0].frame!.order;
      expect(online.map(s=>s.player)).toEqual(local.standings().map(s=>s.player));
      online.forEach(s=>expect(s.finishTime).toBeCloseTo(local.racers[s.player].state.finishTime!,3));
      for(const d of drivers)expect(d.frame!.order).toEqual(online);
    }finally{
      await Promise.allSettled(drivers.map(d=>d.room.leave()));
      if(before===undefined)delete process.env.DUEL_EXTRA_VENUES; else process.env.DUEL_EXTRA_VENUES=before;
    }
  },90000);
  it('replies privately to each ability command with the outcome the rules decided',async()=>{
    const track=findCircuit('coastal-launch').track;
    const options={name:'A',paint:'glacier',protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,versions:{[track.id]:track.version},circuit:track.id,laps:1};
    const host=new Driver(await client.create('private_duel',options));
    const guest=new Driver(await client.joinById(host.room.roomId,{...options,name:'B'}));
    try{
      await until(()=>host.view?.drivers.length===2);
      host.room.send('start');await until(()=>guest.view?.phase==='drawing');
      const samples=createPracticeSamples(track,7).map(p=>[p.x,p.z,p.time]);
      for(const d of [host,guest])d.room.send('line',{round:1,samples});
      await until(()=>host.frame?.countdown);
      // A press during the countdown cannot apply.
      host.room.send('ability',{round:1,sequence:1,tick:0,ability:'thrust'});
      await until(()=>host.results.length===1);expect(host.results[0]).toMatchObject({sequence:1,outcome:'unavailable'});
      const room=matchMaker.getLocalRoomById(host.room.roomId) as DuelRoom;room.setTimestep();
      const tickMs=1000/60,advance=async(ticks:number)=>{for(let i=0;i<ticks;i++)room['advance'](tickMs);await delay(0);};
      while(room['view'].phase!=='racing')await advance(12);
      await advance(120);
      const tick=()=>room['race']!.tick,send=(sequence:number,ability:string,at=tick())=>host.room.send('ability',{round:1,sequence,tick:at,ability});
      const result=async(sequence:number)=>{await until(()=>host.results.some(r=>r.sequence===sequence));return host.results.find(r=>r.sequence===sequence)!.outcome;};
      send(2,'thrust');await delay(40);await advance(1);
      expect(await result(2)).toBe('fired');
      send(2,'thrust');expect(await result(2)).toBe('fired'); // the original reply; the resend is a duplicate
      await until(()=>host.results.filter(r=>r.sequence===2).length===2);expect(host.results.filter(r=>r.sequence===2)[1].outcome).toBe('duplicate');
      send(3,'thrust');await delay(40);await advance(1);
      expect(await result(3)).toBe('recharging');
      // Hop and Thrust pressed together get one reply each.
      send(4,'hop');send(5,'thrust');await delay(40);await advance(1);
      expect(await result(4)).toBe('fired');expect(await result(5)).toBe('recharging');
      send(6,'hop',tick()-61);expect(await result(6)).toBe('too-late');
      host.room.send('ability',{round:0,sequence:7,tick:tick(),ability:'hop'});await delay(60);
      expect(host.results.some(r=>r.sequence===7)).toBe(false);
      // Other seats never hear another seat's outcomes.
      expect(guest.results).toEqual([]);
    }finally{await Promise.allSettled([host,guest].map(d=>d.room.leave()));}
  },60000);
  it('lets only the host change circuit and laps, forces fresh lines after a circuit change, and removes a slow drawer after the grace period',async()=>{
    const newport=findCircuit('coastal-launch').track,gate=findCircuit('golden-gate').track,versions={[newport.id]:newport.version,[gate.id]:gate.version};
    const opts={circuit:newport.id,laps:1,protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,versions,name:'A',paint:'glacier'};
    const host=new Driver(await client.create('private_duel',opts)),guest=new Driver(await client.joinById(host.room.roomId,{...opts,name:'B'}));
    try{
      await until(()=>host.view?.drivers.length===2);
      guest.room.send('settings',{circuit:gate.id,laps:3});await delay(60);expect(host.view!.circuit).toBe(newport.id);
      host.room.send('settings',{circuit:gate.id,laps:3});await until(()=>guest.view?.circuit===gate.id&&guest.view.laps===3);
      host.room.send('start');await until(()=>guest.view?.phase==='drawing');
      const room=matchMaker.getLocalRoomById(host.room.roomId) as DuelRoom;
      host.room.send('remove',{id:guest.room.sessionId});await delay(60);expect(host.view!.drivers).toHaveLength(2);
      (room as unknown as {drawingSince:number}).drawingSince=Date.now()-100_000;
      host.room.send('remove',{id:guest.room.sessionId});await until(()=>host.view?.drivers.length===1);
      expect(host.view!.phase).toBe('lobby');
    }finally{await Promise.allSettled([host.room.leave(),guest.room.leave()]);}
  });
  it('rejects mismatched versions, declines a fifth seat and hands room controls to the next driver',async()=>{
    const track=findCircuit('coastal-launch').track, opts={circuit:track.id,laps:1,protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,versions:{[track.id]:track.version}};
    await expect(client.create('private_duel',{...opts,protocol:0})).rejects.toThrow('version-mismatch');
    const host=new Driver(await client.create('private_duel',opts));
    const drivers=[host];
    try{
      for(let i=0;i<3;i++)drivers.push(new Driver(await client.joinById(host.room.roomId,opts)));
      await expect(client.joinById(host.room.roomId,opts)).rejects.toThrow();
      await expect(client.create('private_duel',{...opts,laps:9})).rejects.toThrow('settings-invalid');
      await host.room.leave();drivers.shift();
      await until(()=>drivers[0].view?.host===drivers[0].room.sessionId);
      drivers[0].room.send('start');
      await until(()=>drivers.every(d=>d.view?.phase==='drawing'));
      drivers[0].room.send('line',{round:1,samples:[[0,0,0],[0,1,1],[0,2,2],[0,3,-1]]});
      await until(()=>drivers[0].error);
      expect(drivers[0].error).toMatchObject({category:'drawing',reason:'line-unreadable'});
      expect(drivers.slice(1).every(d=>!d.error)).toBe(true);
      expect(drivers.every(d=>!d.view?.drivers.some(s=>s.ready))).toBe(true);
    }finally{await Promise.allSettled(drivers.map(d=>d.room.leave()));}
  });
  it.each([
    ['coastal-launch',2,1],['coastal-launch',4,1],['golden-gate',4,6],['santa-monica',4,1],['golden-gate',3,1],
  ] as const)('%s with %i browsers and %i laps',async(circuit,count,laps)=>{
    const track=findCircuit(circuit).track;
    const options={name:'Test driver',paint:'glacier',protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,versions:{[circuit]:track.version},circuit,laps};
    const drivers=[new Driver(await client.create('private_duel',options))];
    const host=drivers[0], code=host.room.roomId;
    try{
      for(let i=1;i<count;i++)drivers.push(new Driver(await client.joinById(code,{...options,name:'Driver '+(i+1)})));
      await until(()=>host.view?.drivers.length===count);
      host.room.send('start');
      await until(()=>drivers.every(d=>d.view?.phase==='drawing'));
      const samples=createPracticeSamples(track,6,circuit==='santa-monica').map(p=>[p.x,p.z,p.time]);
      for(const d of drivers)d.room.send('line',{round:1,samples});
      await until(()=>drivers.every(d=>d.frame?.countdown));
      const room=matchMaker.getLocalRoomById(code) as DuelRoom;
      // Advance the same room and fixed simulation ticks; omit wall-clock waits in long races.
      const before=host.frame!.countdown;
      await delay(650);
      expect(before-host.frame!.countdown).toBeGreaterThan(19);
      room.setTimestep();
      const advance=async(ticks:number)=>{
        for(let done=0;done<ticks;done+=12){room['advance'](Math.min(ticks-done,12)*1000/60);await delay(0);}
      };
      await advance(193);
      await until(()=>drivers.every(d=>d.frame && d.frame.tick>=9));
      const command={round:1,sequence:1,tick:host.frame!.tick,ability:'hop'};
      host.room.send('ability',command);host.room.send('ability',command);
      await delay(30);await advance(6);
      await until(()=>host.frame?.cars[0].hopCount===1);
      // Only the pressing seat learns its new Hop readiness.
      await until(()=>(host.cooldowns?.hopReadyAt??0)>0);
      expect(drivers[1].cooldowns?.hopReadyAt??0).toBe(0);
      expect(host.frame!.cars.slice(1).every(s=>s.hopCount===0)).toBe(true);
      const dropped=drivers.at(-1)!;const token=dropped.room.reconnectionToken,id=dropped.room.sessionId;
      dropped.room.reconnection.enabled=false;
      dropped.room.connection.close(4001);
      await until(()=>host.view!.drivers.some(s=>s.id===id&&!s.connected));
      await advance(24);
      const restored=new Driver(await client.reconnect(token));
      drivers[drivers.length-1]=restored;
      await until(()=>restored.line && restored.frame);
      expect(restored.room.sessionId).toBe(id);
      expect(restored.frame!.tick).toBeGreaterThan(command.tick);
      for(let i=0;i<300 && host.view?.phase!=='results';i++)await advance(60);
      await until(()=>drivers.every(d=>d.view?.phase==='results'));
      expect(host.frame!.order.every(s=>s.finished && s.finishTime!>0)).toBe(true);
      for(const d of drivers)expect(d.frame!.order).toEqual(host.frame!.order);
      const vote=circuit==='santa-monica'?'redraw':'same';
      if(count>=3){
        // The vote stays open until every driver has chosen, and choices can change until then.
        drivers[0].room.send('rematch',{round:1,vote:'redraw'});
        for(const d of drivers.slice(1,-1))d.room.send('rematch',{round:1,vote:'same'});
        drivers[0].room.send('rematch',{round:1,vote:'same'});
        await until(()=>host.view?.drivers.filter(s=>s.vote).length===count-1 && host.view.drivers[0].vote==='same');
        expect(host.view?.round).toBe(1);
        // One redraw vote from the last driver decides for everyone.
        if(vote==='redraw'){drivers.at(-1)!.room.send('rematch',{round:1,vote:'redraw'});await until(()=>drivers.every(d=>d.view?.round===2));}
      }
      for(const d of drivers)d.room.send('rematch',{round:1,vote});
      await until(()=>drivers.every(d=>d.view?.round===2));
      if(vote==='redraw')expect(host.view?.drivers.every(s=>!s.ready)).toBe(true);
      else {await until(()=>host.frame?.round===2);expect(host.frame!.cars[0].hopCount).toBe(0);}
    }finally{await Promise.allSettled(drivers.map(d=>d.room.leave()));}
  },90000);
});
