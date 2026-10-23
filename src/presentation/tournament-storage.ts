import { controllerFor, type DriverController, type SessionOptions } from '../core/session';
import { circuits } from '../content/circuits';
import { createTournament, finalizeRound, type TournamentState } from '../core/tournament';
import { cleanDriverName, finishFor, type DriverProfile } from './race-settings';

export interface SavedTournament { state: TournamentState; drivers: (DriverProfile & {controller?: DriverController})[]; options?: SessionOptions }
export const TOURNAMENT_KEY = 'roadster-race.tournament.v1';
export function parseTournament(value: string | null): SavedTournament | null {
  try {
    const data = JSON.parse(value ?? 'null') as SavedTournament;
    if (!data || data.state.version !== 1 || !Array.isArray(data.drivers) || data.drivers.length !== data.state.playerCount) return null;
    if (!data.state.rounds.every(round => circuits.some(c => c.id === round.circuitId && c.track.version === round.trackVersion))) return null;
    let state = createTournament(data.state.rounds, data.state.playerCount, data.state.laps);
    if(state.rulesVersion!==data.state.rulesVersion||state.compilerVersion!==data.state.compilerVersion||data.state.results.length>state.rounds.length)return null;
    const options:SessionOptions=data.options??{mode:'multiplayer',difficulty:'normal',seed:1};
    if(!['solo-race','multiplayer'].includes(options.mode)||!['easy','normal','hard'].includes(options.difficulty)||!Number.isInteger(options.seed)||options.mode==='solo-race'&&data.state.playerCount!==4)return null;
    for (const result of data.state.results) state = finalizeRound(state, result.round, state.rounds[result.round], result.finishes);
    const drivers = data.drivers.map((driver, i) => {
      if (driver.controller!==undefined&&driver.controller!==controllerFor(options.mode,i))throw new Error('Invalid controller');
      if (typeof driver.name !== 'string' || finishFor(driver.paint).id !== driver.paint) throw new Error('Invalid driver');
      return { name: cleanDriverName(driver.name, i), paint: driver.paint, controller:controllerFor(options.mode,i) };
    });
    return { state, drivers, options };
  } catch { return null; }
}
export function loadTournament(): SavedTournament | null { try { return parseTournament(localStorage.getItem(TOURNAMENT_KEY)); } catch { return null; } }
export function storeTournament(value: SavedTournament): boolean { try { localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(value)); return true; } catch { return false; } }
export function discardTournament() { try { localStorage.removeItem(TOURNAMENT_KEY); } catch { /* In-memory session still works. */ } }

export function incompatibleTournament(){try{return !!localStorage.getItem(TOURNAMENT_KEY)&&!loadTournament();}catch{return false;}}
