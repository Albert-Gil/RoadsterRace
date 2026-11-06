import { CUPS } from './progression';
import { championshipStandings, type TournamentState } from './tournament';
import type { CompiledRoute, RaceEvent } from './types';

/** Curated sessions use ordinary rules. Completion never changes car performance or medals. */
export const CHALLENGES = [
  { id: 'fleet-explorer', name: 'Fleet Explorer', venue: 'San Diego Fleet', circuitId: 'san-diego-fleet', mode: 'time-trial', objective: 'Complete one lap using both support vessels. Hop onto each vessel, then take its automatic return jump.', format: 'Time Trial · 1 lap', number: '01' },
  { id: 'alpine-precision', name: 'Alpine Precision', venue: 'Snowy Tahoe', circuitId: 'snowy-tahoe', mode: 'time-trial', objective: 'Complete one lap without barrier contact or recovery. Drifting, Thrust and Hop are allowed.', format: 'Time Trial · 1 lap', number: '02' },
  { id: 'frontier-champion', name: 'Frontier Champion', venue: 'Frontier Cup', circuitId: 'grand-canyon', mode: 'solo-race', objective: 'Win the four-round Frontier Cup against Hard computer drivers. A shared championship title counts.', format: 'Solo Race · Hard · 4 rounds · 1 lap each', number: '03' },
] as const;
export type ChallengeId = typeof CHALLENGES[number]['id'];
export const findChallenge = (id: string | undefined) => CHALLENGES.find(c => c.id === id);
export interface ChallengeProgress { version: 1; completed: ChallengeId[] }
export const emptyChallenges = (): ChallengeProgress => ({ version: 1, completed: [] });
export const mergeChallenges = (a: ChallengeProgress, b: ChallengeProgress): ChallengeProgress => ({ version: 1, completed: CHALLENGES.filter(c => a.completed.includes(c.id) || b.completed.includes(c.id)).map(c => c.id) });
export type ChallengeSource = 'live' | 'tutorial' | 'practice' | 'ghost';
export interface ChallengeEvidence { id: ChallengeId; human: boolean; source: ChallengeSource; completed: boolean }
export const validChallengeEvidence = (e: ChallengeEvidence) => !!findChallenge(e.id) && e.human && e.source === 'live' && e.completed;

export interface ChallengeRaceConfig { trackId: string; mode: string; laps: number; human: boolean; source: ChallengeSource }
const supportPairs = [['support-a-hop', 'support-a-return'], ['support-b-hop', 'support-b-return']] as const;
/** Only physical landings count. A planned line, a missed deck or an unrelated Hop cannot earn a traversal. */
export class ChallengeLapTracker {
  private pending = new Set<number>();
  private traversed = new Set<number>();
  private approved: Set<string>;
  readonly eligible: boolean;
  completed = false;
  vessels = 0;
  constructor(readonly id: ChallengeId, config: ChallengeRaceConfig, route: Pick<CompiledRoute, 'crossings'>) {
    const definition = findChallenge(id)!;
    this.approved = new Set(route.crossings?.map(c => c.id));
    this.eligible = id !== 'frontier-champion' && config.human && config.source === 'live' && config.trackId === definition.circuitId && config.mode === definition.mode && config.laps === 1;
  }
  observe(event: RaceEvent): boolean {
    if (!this.eligible) return false;
    if (event.type === 'recovery') this.pending.clear();
    if (event.type === 'landing') supportPairs.forEach(([entry, exit], i) => {
      if (!this.approved.has(entry) || !this.approved.has(exit)) return;
      if (event.crossingId === entry && event.flightOrigin === 'hop') this.pending.add(i);
      if (event.crossingId === exit) {
        if (event.flightOrigin === 'ramp' && this.pending.has(i)) this.traversed.add(i);
        this.pending.delete(i);
      }
    });
    this.vessels = this.traversed.size;
    if (!event.lapSummary) return false;
    const lap = event.lapSummary;
    const success = Number.isFinite(lap.duration) && lap.duration > 0 && (this.id === 'fleet-explorer' ? this.traversed.size === 2 : lap.barrierContacts === 0 && lap.carContacts === 0 && lap.recoveries === 0);
    this.completed ||= success;
    this.pending.clear(); this.traversed.clear();
    return success;
  }
}

/** Validate the actual saved schedule, never infer a cup from its label or an incomplete results screen. */
export function frontierChallengeConfig(config: { mode?: string; difficulty?: string; laps: number; cupId?: string; rounds: readonly { circuitId: string }[] }) {
  const cup = CUPS.find(c => c.id === 'frontier')!;
  return config.mode === 'solo-race' && config.difficulty === 'hard' && config.laps === 1 && config.cupId === cup.id && config.rounds.length === cup.rounds.length && cup.rounds.every((id, i) => config.rounds[i].circuitId === id);
}
export function frontierChallengeComplete(state: TournamentState, options: { mode?: string; difficulty?: string }, cupId: string | undefined) {
  return frontierChallengeConfig({ ...options, laps: state.laps, cupId, rounds: state.rounds }) && state.results.length === state.rounds.length && championshipStandings(state).some(r => r.player === 0 && r.rank === 1);
}
