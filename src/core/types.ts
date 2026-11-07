export interface Point { x: number; z: number; y?: number; sectionId?: string; courseProgress?: number }
export interface DrawSample extends Point { time: number }
export interface TrackBarrier { deckSurfaceId?:string; id: string; footprint: Point[]; height: number; baseHeight?: number; /** Resolve a level foundation from the authored terrain before baking its ground grid. */ terrainAnchor?:boolean; sectionId?: string; kind?: 'infield' | 'building' | 'bridge-rail' | 'bridge-support' | 'pier-rail' | 'service-barrier' | 'cliff-rail' | 'cliff-face' | 'rock'; bridgeId?: string; /** Explicit constrained lane, city median or approved broad infield protection. */ runoffException?: 'hop-lane' | 'urban-median' | 'cut-protection'; /** A real sloping cliff, not an extruded invisible wall. */ slopedFace?: { lip: Point; toe: Point; lipWidth: number; toeWidth: number; lipHeight: number; toeHeight: number } }
export interface RoadSection { id: string; from: number; to: number; heights: [number, number][]; supportWidth: number; /** Optional distance/width profile for continuous shoulders, relative to section.from. */ supportWidths?: [number, number][]; flight?: boolean }
export interface SupportSurface { id: string; footprint: Point[] }
/** Stationary physical deck. A transfer can grade continuously between two heights. */
export interface DeckSurface extends SupportSurface {elevation:number;toElevation?:number;from?:Point;to?:Point;gradeNormal?:Point;kind:'carrier'|'destroyer'|'support-ship'|'transfer'; /** The entire authored working deck has ordinary road grip. */ racingSurface?:boolean; /** Physical wedge support belonging to an automatic crossing. */ rampId?:string; /** Stationary vessel axes for hull/deck construction. Does not add support. */ vessel?:{origin:Point;forward:Point}}
export interface TrackJump {
  id: string; from: Point; forward: Point; width: number; rampLength: number; lipHeight: number;
  gap: number; runout: number; corridorLength: number;
  /** Alternate road coordinates, mapped onto the bypass's ordered course distance. */
  branch: Point[]; entryProgress: number; exitProgress: number;
  kind?: 'crest'; takeoffElevation?: number; landingElevation?: number; launchBoost?: number; launchSlope?: number;
  /** Main-road crossing, included by every legal main route and every CPU difficulty. */
  mandatory?:boolean;
  activation?:'automatic'|'hop';
  takeoffSurfaceId?:string;landingSurfaceId?:string;
}
/** A manual-hop branch, independent of automatic ramps and water support. */
export interface HopShortcut {
  id: string; branch: Point[]; width: number; obstacleId?: string;
  /** An alternate water sector: manual entry and automatic return, in this order. */
  crossings?:[string,string];
  /** Wider authored flight allowance at a low obstacle; never exempts neighbouring parcels. */
  clearanceWidth?: number;
  entryProgress: number; exitProgress: number;
}
export interface HopTraversal { id: string; entryDistance: number; exitDistance: number }
export interface StartFinishGate { center: Point; forward: Point; width: number; leadIn: number }
export interface TrackBridge { id: string; from: Point; to: Point; width: number }
/** Authoritative continuous ground, independent of graphics quality or cosmetic noise. */
export interface TerrainSurface { minX:number;minZ:number;cell:number;cols:number;rows:number;heights:Float32Array;roadHeights:[number,number][];branchHeights?:Record<string,number> }
/** Main-road snow crest over continuous terrain; not an alternate or water corridor. */
export interface TerrainTakeoff { id:string;center:Point;forward:Point;width:number;progress:number;launchBoost:number;launchSlope:number;minimumSpeed:number;planningSpeed:number }
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
  surface?: 'packed-dirt' | 'packed-snow';
  terrain?: TerrainSurface;
  terrainTakeoffs?:TerrainTakeoff[];
  decks?:DeckSurface[];
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
  crossings?:{id:string;entryDistance:number;exitDistance:number;activation:'automatic'|'hop'}[];
}
export interface DrawingTrim { leadIn: DrawSample[]; tail: DrawSample[]; joined: boolean }
export type RouteResult = { ok: true; route: CompiledRoute; drawing?: DrawingTrim } | { ok: false; message: string; point?: Point; section?: Point[] };
export type Ability = 'thrust' | 'hop';
export interface LapSummary {lap:number;duration:number;barrierContacts:number;carContacts:number;recoveries:number}
export type RaceEvent = { type: 'thrust' | 'hop' | 'drift' | 'lap' | 'finish' | 'collision' | 'car-impact' | 'scrape' | 'recovery' | 'takeoff' | 'landing' | 'splash'; time: number; point?: Point; intensity?: number; otherPlayer?: number; lapSummary?:LapSummary; /** Successful landing provenance; telemetry only, never used to drive physics. */ crossingId?: string; flightOrigin?: RaceState['flightOrigin']; /** Extra reset hold (s) after crashing into a hazard. */ penalty?: number };
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
  flightOrigin: 'hop' | 'ramp' | 'crest' | 'ski' | 'fall' | null;
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
  surface: 'asphalt' | 'sand' | 'packed-dirt' | 'packed-snow' | 'deep-snow';
  supportSectionId?: string;
  supportSurfaceId?:string;intendedLandingSurfaceId?:string;
  checkpoint: number;
  thrustCount: number;
  finished: boolean;
  finishTime: number | null;
  collisionCount: number;
  recoveryCount: number;
  recoveringUntil: number;
  recoveryWaiting: boolean;
}
