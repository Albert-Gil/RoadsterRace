export interface Point { x: number; z: number }
export interface DrawSample extends Point { time: number }
export interface TrackBarrier { id: string; footprint: Point[]; height: number; kind?: 'infield' | 'bridge-rail' | 'bridge-support'; bridgeId?: string }
export interface StartFinishGate { center: Point; forward: Point; width: number; leadIn: number }
export interface TrackBridge { id: string; from: Point; to: Point; width: number }
export interface TrackDefinition {
  id: string;
  version: number;
  name: string;
  centerline: Point[];
  roadWidth: number;
  carWidth: number;
  carLength: number;
  barriers: TrackBarrier[];
  length: number;
  distances: number[];
  checkpoints: Point[];
  start: Point;
  startFinish?: StartFinishGate;
  bridges?: TrackBridge[];
}
export interface RoutePoint extends Point {
  distance: number;
  desiredSpeed: number;
  curvature: number;
}
export interface CompiledRoute {
  version: number;
  trackId: string;
  trackVersion: number;
  points: RoutePoint[];
  length: number;
  drawingDuration: number;
  cleanup?: { removedPoints: number; removedSeconds: number };
}
export interface DrawingTrim { leadIn: DrawSample[]; tail: DrawSample[]; joined: boolean }
export type RouteResult = { ok: true; route: CompiledRoute; drawing?: DrawingTrim } | { ok: false; message: string; point?: Point; section?: Point[] };
export type RaceEvent = { type: 'thrust' | 'drift' | 'lap' | 'finish' | 'collision' | 'car-impact' | 'scrape' | 'recovery'; time: number; point?: Point; intensity?: number; otherPlayer?: number };
export interface RaceState {
  tick: number;
  time: number;
  distance: number;
  speed: number;
  lap: number;
  lapTimes: number[];
  lapStartedAt: number;
  thrustUntil: number;
  thrustReadyAt: number;
  position: Point;
  velocity: Point;
  heading: number;
  steeringRate: number;
  acceleration: number;
  desiredSpeed: number;
  slipAngle: number;
  lineError: number;
  drifting: boolean;
  driftCount: number;
  sandAmount: number;
  surface: 'asphalt' | 'sand';
  checkpoint: number;
  thrustCount: number;
  finished: boolean;
  finishTime: number | null;
  collisionCount: number;
  recoveryCount: number;
  recoveringUntil: number;
}
