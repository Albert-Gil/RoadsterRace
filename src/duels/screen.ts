import type { Standing } from '../core/local-race';
import { duelVenues, type DriverSeat, type RoomView } from './protocol';

/**
 * What the Private Duels paddock shows, decided without the DOM (plan paddock-circuits-cup, step 4.1).
 * The network client feeds it the room view and its own connection state; the paddock renders the result.
 */
export type DuelScreenKind = 'entry' | 'connecting' | 'room' | 'waiting' | 'loading' | 'race' | 'menu' | 'reconnecting' | 'results';
export type SeatStatus = 'joined' | 'drawing' | 'sending' | 'ready' | 'reconnecting' | 'racing' | 'finished' | 'out' | 'deciding' | 'race-again' | 'new-lines';
export const SEAT_STATUS_TEXT: Record<SeatStatus, string> = {
  joined: 'Joined', drawing: 'Drawing', sending: 'Sending line', ready: 'Ready', reconnecting: 'Reconnecting', racing: 'Racing',
  finished: 'Finished', out: 'DNF', deciding: 'Choosing', 'race-again': 'Race again', 'new-lines': 'New lines',
};
export const MAX_SEATS = 4;

export interface SeatCard {
  /** The room's stable seat id (session id): cards are updated in place by it. */
  id: string;
  /** Grid number shown on the car chip (1-based seat order). */
  number: number;
  name: string;
  paint: string;
  you: boolean;
  host: boolean;
  status: SeatStatus;
  /** Results only. */
  rank?: number;
  finishTime?: number | null;
}

export interface DuelScreen {
  kind: DuelScreenKind;
  title: string;
  circuit?: string;
  circuitName?: string;
  laps?: number;
  cards: SeatCard[];
  openSeats: number;
  isHost: boolean;
  /** Host settings (circuit and laps) are offered on this screen. */
  settings: boolean;
  /** Start drawing: shown to the host in the lobby; `startBlocked` says why it is disabled. */
  canStart: boolean;
  startBlocked?: 'needs-two' | 'reconnecting';
  /** Results: drivers still choosing, and whether another race is possible. */
  waitingFor: string[];
  enoughForRematch: boolean;
  /** The host changing the circuit on Results means everyone draws new lines. */
  circuitChangeRedraws: boolean;
  /** Your own seat's vote on Results. */
  ownVote: DriverSeat['vote'];
}

export interface DuelScreenInput {
  view?: RoomView;
  /** Your session id in the room. */
  sessionId?: string;
  connection: 'idle' | 'connecting' | 'connected' | 'reconnecting';
  /** The 3D scene can draw this room's circuit (course and grid). */
  sceneReady: boolean;
  /** Your line was sent and the room has not yet marked you ready. */
  sendingLine: boolean;
  /** The race menu (pause) is open on this device; the race continues. */
  menu: boolean;
  /** Final standings (Results). */
  order?: readonly Standing[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function seatStatus(view: RoomView, seat: DriverSeat, you: boolean, sendingLine: boolean, standing?: Standing): SeatStatus {
  if (!seat.connected) return 'reconnecting';
  switch (view.phase) {
    case 'lobby': return 'joined';
    case 'drawing': return seat.ready ? 'ready' : you && sendingLine ? 'sending' : 'drawing';
    case 'countdown': return 'ready';
    case 'racing': return seat.withdrawn ? 'out' : standing?.finished ? 'finished' : 'racing';
    case 'results': return seat.vote === 'same' ? 'race-again' : seat.vote === 'redraw' ? 'new-lines' : 'deciding';
  }
}

export function duelScreen(input: DuelScreenInput): DuelScreen {
  const { view, sessionId, connection } = input;
  const empty: DuelScreen = { kind: 'entry', title: 'Private Duel', cards: [], openSeats: 0, isHost: false, settings: false, canStart: false, waitingFor: [], enoughForRematch: false, circuitChangeRedraws: false, ownVote: null };
  if (!view) return connection === 'connecting' ? { ...empty, kind: 'connecting', title: 'Connecting' } : empty;
  const isHost = !!sessionId && view.host === sessionId, seatIndex = view.drivers.findIndex(d => d.id === sessionId), own = view.drivers[seatIndex];
  const standings = new Map((input.order ?? []).map(s => [s.player, s]));
  const cards: SeatCard[] = view.drivers.map((d, i) => {
    const standing = standings.get(i);
    const card: SeatCard = { id: d.id, number: i + 1, name: d.name, paint: d.paint, you: d.id === sessionId, host: d.id === view.host, status: seatStatus(view, d, d.id === sessionId, input.sendingLine, standing) };
    if (view.phase === 'results') { card.rank = d.withdrawn ? 0 : standing?.rank; card.finishTime = d.withdrawn ? null : standing?.finishTime ?? null; }
    return card;
  });
  if (view.phase === 'results') cards.sort((a, b) => (a.rank || 99) - (b.rank || 99) || a.number - b.number);
  const base: DuelScreen = {
    ...empty, cards, isHost, circuit: view.circuit, circuitName: duelVenues[view.circuit] ?? view.circuit, laps: view.laps,
    openSeats: view.phase === 'lobby' ? Math.max(0, MAX_SEATS - view.drivers.length) : 0, ownVote: own?.vote ?? null,
  };
  if (connection === 'reconnecting') return { ...base, kind: 'reconnecting', title: 'Reconnecting…' };
  switch (view.phase) {
    case 'lobby': {
      const startBlocked = view.drivers.length < 2 ? 'needs-two' as const : view.drivers.some(d => !d.connected) ? 'reconnecting' as const : undefined;
      return { ...base, kind: 'room', title: 'Private room', settings: isHost, canStart: isHost, startBlocked };
    }
    case 'drawing':
      // Your own drawing uses the full screen; once your line is in (or on its way), the paddock returns.
      return own && !own.ready && !input.sendingLine ? { ...base, kind: 'race', title: 'Draw your line' } : { ...base, kind: 'waiting', title: 'Waiting for lines' };
    case 'countdown': case 'racing':
      if (!input.sceneReady) return { ...base, kind: 'loading', title: 'Loading circuit' };
      return input.menu ? { ...base, kind: 'menu', title: 'Race menu' } : { ...base, kind: 'race', title: duelVenues[view.circuit] ?? 'Race' };
    case 'results': {
      const here = view.drivers.filter(d => d.connected);
      return {
        ...base, kind: 'results', title: 'Race results', settings: isHost, circuitChangeRedraws: true,
        waitingFor: here.filter(d => !d.vote).map(d => d.name), enoughForRematch: here.length >= 2,
      };
    }
  }
}

/** One line describing the room's settings, e.g. "Newport Island · 2 laps". */
export function settingsLine(screen: DuelScreen) {
  return screen.circuitName && screen.laps ? `${screen.circuitName} · ${plural(screen.laps, 'lap')}` : '';
}
