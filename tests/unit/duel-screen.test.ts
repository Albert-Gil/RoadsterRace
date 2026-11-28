import { describe, expect, it } from 'vitest';
import { duelScreen, settingsLine, type DuelScreenInput } from '../../src/duels/screen';
import type { DriverSeat, RoomView } from '../../src/duels/protocol';

const seat = (id: string, extra: Partial<DriverSeat> = {}): DriverSeat => ({ id, name: id.toUpperCase(), paint: 'glacier', connected: true, ready: false, withdrawn: false, vote: null, ...extra });
const room = (extra: Partial<RoomView> = {}): RoomView => ({ phase: 'lobby', circuit: 'coastal-launch', laps: 2, round: 0, host: 'a', drivers: [seat('a'), seat('b')], physics: 22, compiler: 21, trackVersion: 8, created: 1, ...extra });
const input = (extra: Partial<DuelScreenInput> = {}): DuelScreenInput => ({ view: room(), sessionId: 'a', connection: 'connected', sceneReady: true, sendingLine: false, menu: false, ...extra });

describe('Private Duels screen model', () => {
  it('starts on the entry screen and shows Connecting while a room is being reached', () => {
    expect(duelScreen(input({ view: undefined, connection: 'idle' })).kind).toBe('entry');
    expect(duelScreen(input({ view: undefined, connection: 'connecting' }))).toMatchObject({ kind: 'connecting', title: 'Connecting' });
  });

  it('lobby: numbered cards, open seats, and Start only for the host with two connected drivers', () => {
    const host = duelScreen(input());
    expect(host).toMatchObject({ kind: 'room', isHost: true, settings: true, canStart: true, openSeats: 2 });
    expect(host.startBlocked).toBeUndefined();
    expect(host.cards.map(c => [c.number, c.name, c.you, c.host, c.status])).toEqual([[1, 'A', true, true, 'joined'], [2, 'B', false, false, 'joined']]);
    expect(settingsLine(host)).toBe('Newport Island · 2 laps');
    const guest = duelScreen(input({ sessionId: 'b' }));
    expect(guest).toMatchObject({ isHost: false, settings: false, canStart: false });
    expect(duelScreen(input({ view: room({ drivers: [seat('a')] }) })).startBlocked).toBe('needs-two');
    expect(duelScreen(input({ view: room({ drivers: [seat('a'), seat('b', { connected: false })] }) }))).toMatchObject({ startBlocked: 'reconnecting', cards: [{}, { status: 'reconnecting' }] });
  });

  it('drawing: your own drawing is full screen; after sending, the paddock shows who is still drawing', () => {
    const drawing = room({ phase: 'drawing', round: 1, drivers: [seat('a'), seat('b', { ready: true })] });
    expect(duelScreen(input({ view: drawing })).kind).toBe('race');
    const sending = duelScreen(input({ view: drawing, sendingLine: true }));
    expect(sending).toMatchObject({ kind: 'waiting', title: 'Waiting for lines' });
    expect(sending.cards.map(c => c.status)).toEqual(['sending', 'ready']);
    const ready = duelScreen(input({ view: room({ phase: 'drawing', round: 1, drivers: [seat('a', { ready: true }), seat('b')] }) }));
    expect(ready.cards.map(c => c.status)).toEqual(['ready', 'drawing']);
    expect(ready.openSeats).toBe(0);
  });

  it('a device still loading its circuit shows Loading circuit through the countdown and the race, never a replayed start', () => {
    for (const phase of ['countdown', 'racing'] as const) {
      expect(duelScreen(input({ view: room({ phase, round: 1 }), sceneReady: false }))).toMatchObject({ kind: 'loading', title: 'Loading circuit' });
      expect(duelScreen(input({ view: room({ phase, round: 1 }) })).kind).toBe('race');
    }
    expect(duelScreen(input({ view: room({ phase: 'racing', round: 1 }), menu: true })).kind).toBe('menu');
  });

  it('reconnecting keeps the room context', () => {
    const screen = duelScreen(input({ view: room({ phase: 'racing', round: 1 }), connection: 'reconnecting' }));
    expect(screen).toMatchObject({ kind: 'reconnecting', circuit: 'coastal-launch', laps: 2 });
    expect(screen.cards).toHaveLength(2);
  });

  it('results: cards by rank with times and DNF, votes, who is still choosing, and the host keeps settings', () => {
    const view = room({ phase: 'results', round: 1, drivers: [seat('a', { vote: 'same' }), seat('b'), seat('c', { withdrawn: true })] });
    const order = [{ player: 1, rank: 1, progress: 1, finished: true, finishTime: 31.5 }, { player: 0, rank: 2, progress: 1, finished: true, finishTime: 33.25 }, { player: 2, rank: 3, progress: 0.5, finished: false, finishTime: null }];
    const screen = duelScreen(input({ view, order }));
    expect(screen).toMatchObject({ kind: 'results', settings: true, circuitChangeRedraws: true, enoughForRematch: true, ownVote: 'same' });
    expect(screen.cards.map(c => [c.name, c.rank, c.finishTime, c.status])).toEqual([['B', 1, 31.5, 'deciding'], ['A', 2, 33.25, 'race-again'], ['C', 0, null, 'deciding']]);
    expect(screen.waitingFor).toEqual(['B', 'C']);
    const alone = duelScreen(input({ view: room({ phase: 'results', round: 1, drivers: [seat('a'), seat('b', { connected: false })] }), order }));
    expect(alone.enoughForRematch).toBe(false);
    expect(alone.waitingFor).toEqual(['A']);
    expect(duelScreen(input({ view, order, sessionId: 'b' })).settings).toBe(false);
  });
});
