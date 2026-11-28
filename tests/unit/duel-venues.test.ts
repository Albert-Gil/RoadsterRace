import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DuelRoom, duelTracks } from '../../server/duel-room';
import { compileRoute, createPracticeSamples, COMPILER_VERSION } from '../../src/core/route';
import { LocalRace } from '../../src/core/local-race';
import { RULES } from '../../src/core/simulation';
import { findCircuit } from '../../src/content/circuits';
import type { CompiledRoute, TrackDefinition } from '../../src/core/types';
import { DUEL_PROTOCOL, defaultDuelVenues, duelVenues, offeredVenues, unpackFrame, type RaceFrame, type RoomView, type WireFrame } from '../../src/duels/protocol';

// Plan step 5.1–5.2: the six further circuits are offered only with DUEL_EXTRA_VENUES, and a 4-seat room on each
// races exactly like a local race: compiled routes, Hop presses over the wire, every snapshot's elevation,
// movement and recovery count, standings and finish times.
const NEW_VENUES = ['orbital-launchyard', 'canyon-south-rim', 'la-nights', 'snowy-tahoe', 'capitan-yosemite', 'lax'] as const;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate: () => unknown, ms = 8000) {
  const deadline = Date.now() + ms;
  while (!predicate() && Date.now() < deadline) await delay(8);
  expect(predicate()).toBeTruthy();
}
class Driver {
  view?: RoomView; frame?: RaceFrame; frames: RaceFrame[] = [];
  constructor(readonly room: Room) {
    room.onMessage('room', (v: RoomView) => this.view = v);
    room.onMessage('frame', (f: WireFrame) => { this.frame = unpackFrame(f); this.frames.push(this.frame); });
    for (const type of ['ownLine', 'error', 'cooldowns', 'ability-result']) room.onMessage(type, () => {});
    room.send('sync');
  }
}

/** Four lines: three paces of the centreline and, where the circuit has one, its first Hop shortcut. */
function linesFor(track: TrackDefinition) {
  const shortcut = track.hopShortcuts?.[0]?.id;
  const lines = [createPracticeSamples(track, 7), createPracticeSamples(track, 8), createPracticeSamples(track, 9.5), createPracticeSamples(track, 8, shortcut ?? false)];
  return lines.map(line => line.map(p => [p.x, p.z, p.time] as [number, number, number]));
}
const compile = (line: [number, number, number][], track: TrackDefinition) => { const r = compileRoute(line.map(([x, z, time]) => ({ x, z, time })), track); if (!r.ok) throw new Error(r.message); return r.route; };
/** The tick at which seat 3 presses Hop: 6 m before the middle of its shortcut traversal in a local race. */
function hopTick(routes: CompiledRoute[], track: TrackDefinition) {
  const traversal = routes[3].hopShortcuts?.[0];
  if (!traversal) return undefined;
  const at = (traversal.entryDistance + traversal.exitDistance) / 2 - 6, race = new LocalRace(routes, track, 1);
  while (!race.finished && race.tick < 20000) {
    if (race.racers[3].state.distance >= at) return race.tick;
    race.step(); race.drainEvents();
  }
  return undefined;
}

describe('further circuits in private rooms', () => {
  const http = createServer();
  let server: Server, client: Client, before: string | undefined;
  beforeAll(async () => {
    before = process.env.DUEL_EXTRA_VENUES;
    server = new Server({ transport: new WebSocketTransport({ server: http, maxPayload: 768 * 1024 }), greet: false, gracefullyShutdown: false });
    server.define('private_duel', DuelRoom);
    await server.listen(0, '127.0.0.1');
    client = new Client('http://127.0.0.1:' + (http.address() as AddressInfo).port);
  });
  afterAll(async () => { if (before === undefined) delete process.env.DUEL_EXTRA_VENUES; else process.env.DUEL_EXTRA_VENUES = before; await server.gracefullyShutdown(false); });

  it('names every circuit and offers the further ones only when the flag lists them', async () => {
    for (const id of NEW_VENUES) { expect(duelVenues[id]).toBeTruthy(); expect(findCircuit(id).track.id).toBe(id); }
    delete process.env.DUEL_EXTRA_VENUES;
    expect([...duelTracks().keys()]).toEqual([...defaultDuelVenues]);
    const lax = findCircuit('lax').track;
    const options = { name: 'A', paint: 'glacier', protocol: DUEL_PROTOCOL, physics: RULES.version, compiler: COMPILER_VERSION, versions: { [lax.id]: lax.version }, circuit: lax.id, laps: 1 };
    await expect(client.create('private_duel', options)).rejects.toThrow('settings-invalid');
    process.env.DUEL_EXTRA_VENUES = 'snowy-tahoe, lax';
    expect([...duelTracks().keys()]).toEqual([...defaultDuelVenues, 'snowy-tahoe', 'lax']);
    expect(offeredVenues({ venues: ['coastal-launch', 'lax', 'snowy-tahoe'] })).toEqual(['coastal-launch', 'lax', 'snowy-tahoe']);
  });

  for (const id of NEW_VENUES) it(`${duelVenues[id]}: a 4-seat room matches a local race`, async () => {
    const track = findCircuit(id).track;
    process.env.DUEL_EXTRA_VENUES = id;
    const options = { name: 'A', paint: 'glacier', protocol: DUEL_PROTOCOL, physics: RULES.version, compiler: COMPILER_VERSION, versions: { [track.id]: track.version }, circuit: track.id, laps: 1 };
    const drivers: Driver[] = [];
    try {
      drivers.push(new Driver(await client.create('private_duel', options)));
      const code = drivers[0].room.roomId;
      for (let i = 1; i < 4; i++) drivers.push(new Driver(await client.joinById(code, { ...options, name: 'D' + (i + 1) })));
      await until(() => drivers[0].view?.drivers.length === 4);
      drivers[0].room.send('start');
      await until(() => drivers.every(d => d.view?.phase === 'drawing'));
      const lines = linesFor(track), routes = lines.map(line => compile(line, track)), press = hopTick(routes, track);
      // Where the circuit has a manual shortcut, seat 3 takes it and presses Hop over the wire.
      if (track.hopShortcuts?.length) expect(press).toBeDefined();
      drivers.forEach((d, i) => d.room.send('line', { round: 1, samples: lines[i] }));
      await until(() => drivers.every(d => d.frame?.countdown));
      const room = matchMaker.getLocalRoomById(code) as DuelRoom;
      room.setTimestep();
      routes.forEach((route, i) => expect(JSON.parse(JSON.stringify(room['seats'][i].route))).toEqual(JSON.parse(JSON.stringify(route))));
      const tickMs = 1000 / 60, race = () => room['race']!;
      let pressed = press === undefined;
      for (let i = 0; i < 6000 && drivers[0].view?.phase !== 'results'; i++) {
        if (!pressed && race() && race().tick + 12 > press!) {
          while (race().tick < press!) room['advance'](tickMs);
          expect(race().tick).toBe(press);
          drivers[3].room.send('ability', { round: 1, sequence: 1, tick: press, ability: 'hop' });
          await until(() => room['seats'][3].lastSequence === 1);
          pressed = true;
        }
        room['advance'](12 * tickMs); await delay(0);
      }
      await until(() => drivers.every(d => d.view?.phase === 'results'));
      let hopped = false;
      const local = new LocalRace(routes, track, 1), states = new Map<number, { elevation: number; recoveryCount: number; movement: string }[]>();
      while (!local.finished && local.tick < 20000) {
        if (local.tick === press) local.pressHop(3);
        local.step(); for (const e of local.drainEvents()) if (e.player === 3 && e.type === 'hop') hopped = true;
        states.set(local.tick, local.racers.map(({ state: s }) => ({ elevation: s.elevation, recoveryCount: s.recoveryCount, movement: s.movement })));
      }
      expect(local.finished).toBe(true);
      expect(hopped).toBe(press !== undefined);
      const seen = drivers[0].frames.filter(f => f.round === 1 && states.has(f.tick));
      expect(seen.length).toBeGreaterThan(100);
      for (const f of seen) f.cars.forEach((c, i) => {
        const s = states.get(f.tick)![i];
        expect(Math.abs(c.elevation - s.elevation)).toBeLessThanOrEqual(.006);
        expect(c.recoveryCount).toBe(s.recoveryCount); expect(c.movement).toBe(s.movement);
      });
      const online = drivers[0].frame!.order;
      expect(online.map(s => s.player)).toEqual(local.standings().map(s => s.player));
      online.forEach(s => expect(s.finishTime).toBeCloseTo(local.racers[s.player].state.finishTime!, 3));
      for (const d of drivers) expect(d.frame!.order).toEqual(online);
    } finally {
      await Promise.allSettled(drivers.map(d => d.room.leave()));
      await until(() => !matchMaker.getLocalRoomById(drivers[0]?.room.roomId ?? ''), 8000).catch(() => {});
    }
  }, 120_000);
});
