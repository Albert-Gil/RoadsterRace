import { circuits } from '../content/circuits';
import { createTournament, finalizeRound, type TournamentState } from '../core/tournament';
import { cleanDriverName, finishFor, type DriverProfile } from './race-settings';

export interface SavedTournament { state: TournamentState; drivers: DriverProfile[] }
export const TOURNAMENT_KEY = 'roadster-race.tournament.v1';
export function parseTournament(value: string | null): SavedTournament | null {
  try {
    const data = JSON.parse(value ?? 'null') as SavedTournament;
    if (!data || data.state.version !== 1 || !Array.isArray(data.drivers) || data.drivers.length !== data.state.playerCount) return null;
    if (!data.state.rounds.every(round => circuits.some(c => c.id === round.circuitId && c.track.version === round.trackVersion))) return null;
    let state = createTournament(data.state.rounds, data.state.playerCount, data.state.laps);
    const legacy = data.state.rulesVersion === 7 && data.state.compilerVersion === 7 && data.state.rounds.every(r => ['coastal-launch', 'orbital-launchyard', 'golden-gate'].includes(r.circuitId));
    if ((!legacy && (state.rulesVersion !== data.state.rulesVersion || state.compilerVersion !== data.state.compilerVersion)) || data.state.results.length > state.rounds.length) return null;
    for (const result of data.state.results) state = finalizeRound(state, result.round, state.rounds[result.round], result.finishes);
    const drivers = data.drivers.map((driver, i) => {
      if (typeof driver.name !== 'string' || finishFor(driver.paint).id !== driver.paint) throw new Error('Invalid driver');
      return { name: cleanDriverName(driver.name, i), paint: driver.paint };
    });
    return { state, drivers };
  } catch { return null; }
}
export function loadTournament(): SavedTournament | null { try { return parseTournament(localStorage.getItem(TOURNAMENT_KEY)); } catch { return null; } }
export function storeTournament(value: SavedTournament): boolean { try { localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(value)); return true; } catch { return false; } }
export function discardTournament() { try { localStorage.removeItem(TOURNAMENT_KEY); } catch { /* In-memory session still works. */ } }
