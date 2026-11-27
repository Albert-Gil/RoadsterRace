import type { RaceState, RaceEvent, Ability } from '../core/types';
import type { Standing } from '../core/local-race';

export const DUEL_PROTOCOL = 2;
export const duelVenues = {
  'coastal-launch': 'Newport Island', 'golden-gate': 'Golden Gate', 'santa-monica': 'Santa Monica', 'san-diego-fleet': 'San Diego Fleet',
} as const;
/** Offered by every room server. Others (San Diego Fleet) need the server's DUEL_EXTRA_VENUES flag; /health lists what is on. */
export const defaultDuelVenues = ['coastal-launch', 'golden-gate', 'santa-monica'] as const;
/** Circuits to offer, from a /health body: its venue list (known ids only), else the defaults. */
export function offeredVenues(health: unknown): string[] {
  const listed = (health as { venues?: unknown } | null)?.venues;
  if (!Array.isArray(listed)) return [...defaultDuelVenues];
  const known = listed.filter((id): id is string => typeof id === 'string' && Object.prototype.hasOwnProperty.call(duelVenues, id));
  return known.length ? known : [...defaultDuelVenues];
}
export type DuelVenue = keyof typeof duelVenues;
export type DuelPhase = 'lobby' | 'drawing' | 'countdown' | 'racing' | 'results';
export type Rematch = 'same' | 'redraw';
export interface DriverSeat {
  id: string;
  name: string;
  paint: string;
  connected: boolean;
  ready: boolean;
  withdrawn: boolean;
  vote: Rematch | null;
}
export interface RoomView {
  phase: DuelPhase;
  circuit: DuelVenue;
  laps: number;
  round: number;
  host: string;
  drivers: DriverSeat[];
  physics: number;
  compiler: number;
  trackVersion: number;
}
// Axes in metres, heading in radians clockwise from +Z. Times in seconds except drawing timestamps (ms).
export interface RaceFrame {
  round: number;
  tick: number;
  countdown: number;
  cars: CarView[];
  order: Standing[];
  events: (RaceEvent & { player: number })[];
}
// Protocol 2: each car is a flat array of integers in this order, quantized to what the display
// needs (positions in cm, angles in mrad, times in ms). Thrust/Hop cooldowns are not broadcast;
// each seat receives its own through the 'cooldowns' message. Additions require a protocol bump.
type Codec = readonly [key: string, kind: 'scale', factor: number] | readonly [key: string, kind: 'bool'] | readonly [key: string, kind: 'enum', values: readonly (string | null)[]];
const movements = ['grounded', 'airborne'] as const;
const origins = [null, 'hop', 'ramp', 'crest', 'ski', 'fall'] as const;
const surfaces = ['asphalt', 'sand', 'packed-dirt', 'packed-snow', 'deep-snow'] as const;
export const carCodec = [
  ['position.x', 'scale', 100], ['position.z', 'scale', 100], ['elevation', 'scale', 100], ['heading', 'scale', 1000],
  ['speed', 'scale', 100], ['verticalVelocity', 'scale', 100], ['time', 'scale', 1000], ['lap', 'scale', 1],
  ['finished', 'bool'], ['finishTime', 'scale', 1000], ['thrustUntil', 'scale', 1000], ['flightStartedAt', 'scale', 1000],
  ['recoveringUntil', 'scale', 1000], ['recoveryWaiting', 'bool'], ['recoveryCount', 'scale', 1], ['movement', 'enum', movements],
  ['flightOrigin', 'enum', origins], ['surface', 'enum', surfaces], ['sandAmount', 'scale', 1000], ['drifting', 'bool'],
  ['steeringRate', 'scale', 1000], ['acceleration', 'scale', 100], ['slipAngle', 'scale', 1000],
  ['hopCount', 'scale', 1],
] as const satisfies readonly Codec[];
type Broadcast = 'position' | 'elevation' | 'heading' | 'speed' | 'verticalVelocity' | 'time' | 'lap' | 'finished' | 'finishTime' | 'thrustUntil' | 'flightStartedAt'
  | 'recoveringUntil' | 'recoveryWaiting' | 'recoveryCount' | 'movement' | 'flightOrigin' | 'surface' | 'sandAmount' | 'drifting' | 'steeringRate' | 'acceleration' | 'slipAngle' | 'hopCount';
/** What every device renders; cooldowns are present only for your own seat. */
export type CarView = Pick<RaceState, Broadcast> & Partial<Pick<RaceState, 'hopReadyAt' | 'thrustReadyAt' | 'lapStartedAt'>>;
export interface Cooldowns { round: number; hopReadyAt: number; thrustReadyAt: number }
export type WireCar = (number | null)[];
export type WireStanding = [player: number, rank: number, progressCm: number, finished: 0 | 1, finishMs: number | null];
export interface WireFrame { round: number; tick: number; countdown: number; cars: WireCar[]; order: WireStanding[]; events: RaceFrame['events'] }

const read = (car: Record<string, unknown>, key: string) => key.startsWith('position.') ? (car.position as Record<string, number>)[key.slice(9)] : car[key];
export function packCar(car: CarView): WireCar {
  return carCodec.map(([key, kind, arg]) => {
    const value = read(car as unknown as Record<string, unknown>, key);
    if (kind === 'bool') return value ? 1 : 0;
    if (kind === 'enum') return (arg as readonly (string | null)[]).indexOf(value as string | null);
    return value === null || value === undefined ? null : Math.round((value as number) * (arg as number));
  });
}
export function unpackCar(row: WireCar): CarView {
  const car: Record<string, unknown> = { position: { x: 0, z: 0 } };
  carCodec.forEach(([key, kind, arg], i) => {
    const raw = row[i], value = kind === 'bool' ? raw === 1 : kind === 'enum' ? (arg as readonly (string | null)[])[raw ?? -1] ?? null : raw === null ? null : raw / (arg as number);
    if (key.startsWith('position.')) (car.position as Record<string, number>)[key.slice(9)] = value as number;
    else car[key] = value;
  });
  return car as unknown as CarView;
}
export function packFrame(frame: RaceFrame): WireFrame {
  return { round: frame.round, tick: frame.tick, countdown: frame.countdown, cars: frame.cars.map(packCar), events: frame.events,
    order: frame.order.map(s => [s.player, s.rank, Math.round(s.progress * 100), s.finished ? 1 : 0, s.finishTime === null ? null : Math.round(s.finishTime * 1000)]) };
}
export function unpackFrame(frame: WireFrame): RaceFrame {
  return { round: frame.round, tick: frame.tick, countdown: frame.countdown, cars: frame.cars.map(unpackCar), events: frame.events,
    order: frame.order.map(([player, rank, progress, finished, finish]) => ({ player, rank, progress: progress / 100, finished: finished === 1, finishTime: finish === null ? null : finish / 1000 })) };
}
export interface AbilityCommand { round: number; sequence: number; tick: number; ability: Ability }
export type DrawingPacket = [x: number, z: number, milliseconds: number][];
