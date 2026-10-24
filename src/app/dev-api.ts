import type { Phase } from './phases';
import type { SessionOptions } from '../core/session';
import type { LapRecord } from '../core/lap-replay';
import type { RacePreferences } from '../presentation/race-settings';
import type { SavedTournament } from '../presentation/tournament-storage';
import type { LocalRace } from '../core/local-race';
import type { CircuitDefinition } from '../content/circuits';
import type { PresentationTheme } from '../presentation/themes';
import type { CompiledRoute, DrawSample, DrawingTrim, TrackDefinition } from '../core/types';
import type { GameScene } from '../presentation/scene';
import type { PointerOwnership } from '../input/ownership';
import type { GameAudio } from '../presentation/audio';
import { controllerFor } from '../core/session';
import { distance } from '../core/geometry';
import { finishFor } from '../presentation/race-settings';

/** Live session values read by the development inspector at call time. */
export interface DevContext {
  phase: Phase; pauseReason: string; sessionOptions: SessionOptions; humans: () => number; playerCount: number;
  personalLap: LapRecord | null; preferences: RacePreferences; activeTour: SavedTournament | null; roundIndex: number;
  race: LocalRace | null; activeCircuit: CircuitDefinition; theme: PresentationTheme; lapCount: number; turn: number;
  confirmedRoutes: CompiledRoute[]; readyPlayers: boolean[]; world: GameScene; route: CompiledRoute | null;
  drawingTrim: DrawingTrim | undefined; best: number | null; stroke: DrawSample[]; activeTrack: TrackDefinition;
  raceTouches: PointerOwnership; ownership: PointerOwnership; audio: GameAudio;
  usePractice: (jumpBranch?: boolean | string) => void; driverName: (i: number) => string; driverPaint: (i: number) => string;
}

/**
 * Development-only inspector used by browser tests and capture tools (`window.__roadster`).
 * Production builds never install it. Each property access reads the current session.
 */
export function installDevApi(read: () => DevContext) {
  Object.assign(window, { __roadster: new Proxy({}, { get: (_, key) => (devApi(read()) as Record<string | symbol, unknown>)[key] }) });
}

function devApi({ phase, pauseReason, sessionOptions, humans, playerCount, personalLap, preferences, activeTour, roundIndex, race, activeCircuit, theme, lapCount, turn, confirmedRoutes, readyPlayers, world, route, drawingTrim, best, stroke, activeTrack, raceTouches, ownership, audio, usePractice, driverName, driverPaint }: DevContext) {
  return {
    // Fixture only: normal play has no practice-line shortcut. A future tutorial can reuse the compiler fixture.
    usePracticeLine: usePractice,
    getState: () => ({ phase,pauseReason,mode:sessionOptions.mode,difficulty:sessionOptions.difficulty,humanCount:humans(),controllers:Array.from({length:playerCount},(_,i)=>controllerFor(sessionOptions.mode,i)),personalBestLap:personalLap?.duration??null,ghostEnabled:preferences.ghost!==false, tournament: activeTour ? structuredClone(activeTour.state) : null, roundIndex, contactCount: race?.contactCount ?? 0, circuitId: activeCircuit.id, theme: theme.id, playerCount, lapCount, drivers: preferences.drivers.map((driver, i) => ({ name: driverName(i), paint: driverPaint(i), color: finishFor(driverPaint(i)).color })), turn, confirmedCount: confirmedRoutes.length, readyPlayers: [...readyPlayers], visibleRouteCount: world.visibleRouteCount, route: route ? { length: route.length, drawingDuration: route.drawingDuration, joined: drawingTrim?.joined ?? false, leadInCount: drawingTrim?.leadIn.length ?? 0, tailCount: drawingTrim?.tail.length ?? 0, cleanup: route.cleanup ? { ...route.cleanup } : null } : null, race: race ? { ...race.racers[0].state } : null, best,
      players: race?.racers.map(racer => ({ ...racer.state })) ?? [], standings: race?.standings() ?? [], ghostStartRemaining: race?.ghostStartRemaining ?? 0,
      renderedPlayers: world.vehicles.slice(0, playerCount).map(vehicle => ({ x: vehicle.root.position.x, y: vehicle.root.position.y, z: vehicle.root.position.z, heading: vehicle.root.rotation.y })),
      raceInputs: { activations: [...raceTouches.activations], cancellations: [...raceTouches.cancellations], active: [0, 1, 2, 3].map(i => raceTouches.active(i)) },
      abilityInputs: { thrust: [0,1,2,3].map(i => raceTouches.active(i, 'thrust')), hop: [0,1,2,3].map(i => raceTouches.active(i, 'hop')) },
      inputs: { activations: [...ownership.activations], cancellations: [...ownership.cancellations], active: [0, 1, 2, 3].map(i => ownership.active(i)) } }),
    getAudio: () => audio.getStatus(),
    getShowcaseProjection: () => world.showcaseProjection,
    inspectVehicle: (view: 'front' | 'side' | 'rear') => world.inspectVehicle(view),
    getGraphics: () => ({ circuitId: activeCircuit.id, engineScenes: world.engine.scenes.length, ...world.depthFeatures, roadVisible: !!world.scene.getMeshByName('asphalt') && world.scene.getActiveMeshes().contains(world.scene.getMeshByName('asphalt')!), vaporParticles: world.vehicles.map(v => v.vapor.liveCount), meshes: world.scene.meshes.length, activeMeshes: world.scene.getActiveMeshes().length, drawCalls: world.drawCalls, fps: world.engine.getFps(), textures: world.scene.textures.length, hardwareScaling: world.engine.getHardwareScalingLevel() }),
    project: (point: { x: number; z: number }) => world.project(point), getTrack: () => ({ ...activeTrack, centerline: activeTrack.centerline.map(p => ({ ...p })) }),
    getRawStroke: () => structuredClone(stroke),
    getRoute: () => route ? structuredClone(route) : null,
    getProjectionError: () => { const p = world.project(activeTrack.start), ground = world.groundPoint(p.x, p.y); return ground ? distance(ground, activeTrack.start) : Infinity; },
  };
}
