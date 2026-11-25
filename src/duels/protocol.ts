import type { RaceState, RaceEvent, Ability } from '../core/types';
import type { Standing } from '../core/local-race';

export const DUEL_PROTOCOL = 1;
export const duelVenues = {
  'coastal-launch': 'Newport Island', 'golden-gate': 'Golden Gate', 'santa-monica': 'Santa Monica',
} as const;
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
// Ordered fields keep repeated property names out of the 20 Hz packets. Additions require a protocol bump.
export const carFields = [
  'position','heading','elevation','speed','velocity','time','lap','finished','finishTime',
  'hopReadyAt','thrustReadyAt','thrustUntil','hopCount','flightOrigin','flightStartedAt',
  'movement','verticalVelocity','recoveringUntil','recoveryWaiting','recoveryCount',
  'surface','sandAmount','drifting','steeringRate','acceleration','slipAngle','lapStartedAt',
] as const satisfies readonly (keyof RaceState)[];
export type CarView = Pick<RaceState,typeof carFields[number]>;
export interface WireFrame extends Omit<RaceFrame,'cars'> { cars: CarView[keyof CarView][][] }
export function packFrame(frame:RaceFrame):WireFrame {
  return {...frame,cars:frame.cars.map(car=>carFields.map(key=>car[key]))};
}
export function unpackFrame(frame:WireFrame):RaceFrame {
  return {...frame,cars:frame.cars.map(row=>Object.fromEntries(carFields.map((key,i)=>[key,row[i]])) as CarView)};
}
export interface AbilityCommand { round: number; sequence: number; tick: number; ability: Ability }
export type DrawingPacket = [x: number, z: number, milliseconds: number][];
