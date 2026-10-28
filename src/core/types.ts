export interface Point { x: number; z: number; y?: number; sectionId?: string; courseProgress?: number }
export interface DrawSample extends Point { time: number }
export interface TrackBarrier { id: string; footprint: Point[]; height: number; baseHeight?: number; sectionId?: string; kind?: 'infield' | 'building' | 'bridge-rail' | 'bridge-support' | 'pier-rail' | 'service-barrier' | 'cliff-rail' | 'cliff-face' | 'rock'; bridgeId?: string; /** Explicit constrained lane, city median or approved broad infield protection. */ runoffException?: 'hop-lane' | 'urban-median' | 'cut-protection'; /** A real sloping cliff, not an extruded invisible wall. */ slopedFace?: { lip: Point; toe: Point; lipWidth: number; toeWidth: number; lipHeight: number; toeHeight: number } }
export interface RoadSection { id: string; from: number; to: number; heights: [number, number][]; supportWidth: number; /** Optional distance/width profile for continuous shoulders, relative to section.from. */ supportWidths?: [number, number][]; flight?: boolean }
export interface SupportSurface { id: string; footprint: Point[] }
export interface TrackJump {
  id: string; from: Point; forward: Point; width: number; rampLength: number; lipHeight: number;
  gap: number; runout: number; corridorLength: number;
  /** Alternate road coordinates, mapped onto the bypass's ordered course distance. */
  branch: Point[]; entryProgress: number; exitProgress: number;
  kind?: 'crest'; takeoffElevation?: number; landingElevation?: number; launchBoost?: number; launchSlope?: number;
}
/** A manual-hop branch, independent of automatic ramps and water support. */
export interface HopShortcut {
  id: string; branch: Point[]; width: number; obstacleId: string;
  entryProgress: number; exitProgress: number;
}
export interface HopTraversal { id: string; entryDistance: number; exitDistance: number }
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
  start: Point;
  startFinish?: StartFinishGate;
  bridges?: TrackBridge[];
  supports?: SupportSurface[];
  waterOpenings?: SupportSurface[];
  jumps?: TrackJump[];
  hopShortcuts?: HopShortcut[];
  sections?: RoadSection[];
  surface?: 'packed-dirt';
}
export interface RoutePoint extends Point {
  distance: number;
  desiredSpeed: number;
  curvature: number;
}
/**
 * A stretch of the drawn line the car cannot physically drive (through a solid barrier or
 * off support). Route distances in metres; `to` is the clear reset point beyond it and may
 * pass the lap end. `course` is the circuit distance the reset skips, which sets its penalty.
 */
export interface RouteHazard { from: number; to: number; course: number; kind: 'barrier' | 'support' }
export interface CompiledRoute {
  version: number;
  trackId: string;
  trackVersion: number;
  points: RoutePoint[];
  length: number;
  drawingDuration: number;
  cleanup?: { removedPoints: number; removedSeconds: number };
  jumps?: string[];
  hopShortcuts?: HopTraversal[];
  hazards?: RouteHazard[];
}
export interface DrawingTrim { leadIn: DrawSample[]; tail: DrawSample[]; joined: boolean }
export type RouteResult = { ok: true; route: CompiledRoute; drawing?: DrawingTrim } | { ok: false; message: string; point?: Point; section?: Point[] };
export type Ability = 'thrust' | 'hop';
export type RaceEvent = { type: 'thrust' | 'hop' | 'drift' | 'lap' | 'finish' | 'collision' | 'car-impact' | 'scrape' | 'recovery' | 'takeoff' | 'landing' | 'splash'; time: number; point?: Point; intensity?: number; otherPlayer?: number; /** Extra reset hold (s) after crashing into a hazard. */ penalty?: number };
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
  hopReadyAt: number;
  hopCount: number;
  flightOrigin: 'hop' | 'ramp' | 'crest' | 'fall' | null;
  flightStartedAt: number;
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
  surface: 'asphalt' | 'sand' | 'packed-dirt';
  supportSectionId?: string;
  checkpoint: number;
  thrustCount: number;
  finished: boolean;
  finishTime: number | null;
  collisionCount: number;
  recoveryCount: number;
  recoveringUntil: number;
  recoveryWaiting: boolean;
}
