import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DuelRoom } from '../../server/duel-room';
import { createPracticeSamples, COMPILER_VERSION } from '../../src/core/route';
import { RULES } from '../../src/core/simulation';
import { findCircuit } from '../../src/content/circuits';
import { DUEL_PROTOCOL, unpackFrame, type WireFrame, type RaceFrame, type RoomView } from '../../src/duels/protocol';

const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate:()=>unknown){
  const deadline=Date.now()+6500;
  while(!predicate() && Date.now()<deadline)await delay(8);
  expect(predicate()).toBeTruthy();
}
class Driver {
  view?:RoomView;
  frame?:RaceFrame;
  notice='';
  line:unknown;
  constructor(readonly room:Room) {
    room.onMessage('room',(v:RoomView)=>this.view=v);
    room.onMessage('frame',(f:WireFrame)=>this.frame=unpackFrame(f));
    room.onMessage('ownLine',data=>this.line=data);
    room.onMessage('notice',message=>this.notice=message);
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
  it('rejects mismatched versions, declines a fifth seat and hands room controls to the next driver',async()=>{
    const track=findCircuit('coastal-launch').track, opts={circuit:track.id,laps:1,protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,versions:{[track.id]:track.version}};
    await expect(client.create('private_duel',{...opts,protocol:0})).rejects.toThrow();
    const host=new Driver(await client.create('private_duel',opts));
    const drivers=[host];
    try{
      for(let i=0;i<3;i++)drivers.push(new Driver(await client.joinById(host.room.roomId,opts)));
      await expect(client.joinById(host.room.roomId,opts)).rejects.toThrow();
      await host.room.leave();drivers.shift();
      await until(()=>drivers[0].view?.host===drivers[0].room.sessionId);
      drivers[0].room.send('start');
      await until(()=>drivers.every(d=>d.view?.phase==='drawing'));
      drivers[0].room.send('line',{round:1,samples:[[0,0,0],[0,1,1],[0,2,2],[0,3,-1]]});
      await until(()=>drivers[0].notice.length>0);
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
