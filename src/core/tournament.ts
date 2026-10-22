import { validateLapCount } from './race-options';
import { RULES } from './simulation';
import { COMPILER_VERSION } from './route';

export interface TournamentRound { circuitId: string; trackVersion: number }
export interface RoundFinish { player: number; rank: number; finishTime: number }
export interface RoundResult { round: number; finishes: RoundFinish[]; points: number[] }
export interface TournamentState {
  version: 1; rulesVersion: number; compilerVersion: number; playerCount: number; laps: number;
  rounds: TournamentRound[]; results: RoundResult[];
}
export const CHAMPIONSHIP_POINTS = [10, 6, 4, 0] as const;
export function createTournament(rounds: TournamentRound[], playerCount: number, laps: number): TournamentState {
  validateLapCount(laps);
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 4) throw new Error('Choose two to four drivers.');
  if (rounds.length < 2 || rounds.length > 12 || rounds.some(r => !r.circuitId || !Number.isInteger(r.trackVersion))) throw new Error('Choose two to twelve races.');
  return { version: 1, rulesVersion: RULES.version, compilerVersion: COMPILER_VERSION, playerCount, laps, rounds: rounds.map(r => ({ ...r })), results: [] };
}
/** A complete round is committed once, in schedule order. Names and paint never enter scoring. */
export function finalizeRound(state: TournamentState, round: number, circuit: TournamentRound, finishes: RoundFinish[]): TournamentState {
  if (state.rulesVersion !== RULES.version || state.compilerVersion !== COMPILER_VERSION) throw new Error('Incompatible tournament rules.');
  const expected = state.rounds[round];
  if (round !== state.results.length || !expected || expected.circuitId !== circuit.circuitId || expected.trackVersion !== circuit.trackVersion) throw new Error('This round cannot be scored.');
  if (finishes.length !== state.playerCount || new Set(finishes.map(f => f.player)).size !== state.playerCount || finishes.some(f => !Number.isInteger(f.player) || f.player < 0 || f.player >= state.playerCount || !Number.isFinite(f.finishTime) || f.finishTime <= 0)) throw new Error('Every driver must finish.');
  const ordered = [...finishes].sort((a, b) => Math.round(a.finishTime * 100) - Math.round(b.finishTime * 100) || a.player - b.player);
  let rank = 1;
  ordered.forEach((finish, i) => { if (i && Math.round(finish.finishTime * 100) !== Math.round(ordered[i - 1].finishTime * 100)) rank = i + 1; if (finish.rank !== rank) throw new Error('Invalid finishing places.'); });
  const points = Array(state.playerCount).fill(0) as number[];
  finishes.forEach(f => points[f.player] = CHAMPIONSHIP_POINTS[f.rank - 1]);
  return { ...state, results: [...state.results, { round, finishes: finishes.map(f => ({ ...f })), points }] };
}
export function championshipStandings(state: TournamentState) {
  const rows = Array.from({ length: state.playerCount }, (_, player) => ({ player, points: state.results.reduce((n, r) => n + r.points[player], 0), rank: 0 }));
  rows.sort((a, b) => b.points - a.points || a.player - b.player);
  rows.forEach((row, i) => row.rank = i && row.points === rows[i - 1].points ? rows[i - 1].rank : i + 1);
  return rows;
}
