export interface Point { x: number; z: number }
export interface DrawSample extends Point { time: number }
export interface TrackBarrier { id: string; footprint: Point[]; height: number; baseHeight?: number; kind?: 'infield' | 'bridge-rail' | 'bridge-support' | 'pier-rail'; bridgeId?: string }
export interface SupportSurface { id: string; footprint: Point[] }
export interface TrackJump {
  id: string; from: Point; forward: Point; width: number; rampLength: number; lipHeight: number;
  gap: number; runout: number; corridorLength: number;
  /** Alternate road coordinates, mapped onto the bypass's ordered course distance. */
  branch: Point[]; entryProgress: number; exitProgress: number;
}
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
  supports?: SupportSurface[];
  waterOpenings?: SupportSurface[];
  jumps?: TrackJump[];
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
  jumps?: string[];
}
export interface DrawingTrim { leadIn: DrawSample[]; tail: DrawSample[]; joined: boolean }
export type RouteResult = { ok: true; route: CompiledRoute; drawing?: DrawingTrim } | { ok: false; message: string; point?: Point; section?: Point[] };
export type RaceEvent = { type: 'thrust' | 'drift' | 'lap' | 'finish' | 'collision' | 'car-impact' | 'scrape' | 'recovery' | 'takeoff' | 'landing' | 'splash'; time: number; point?: Point; intensity?: number; otherPlayer?: number };
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
  elevation: number;
  verticalVelocity: number;
  movement: 'grounded' | 'airborne';
  activeJump: string | null;
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
  recoveryWaiting: boolean;
}
