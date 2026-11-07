import { expect, test } from 'vitest';
import { ChallengeLapTracker, emptyChallenges, frontierChallengeComplete, frontierChallengeConfig } from '../../src/core/challenges';
import { ChallengeStore, CHALLENGE_KEY, parseChallenges } from '../../src/presentation/challenge-storage';
import { CUPS } from '../../src/core/progression';
import { createTournament, finalizeRound } from '../../src/core/tournament';
import { circuits } from '../../src/content/circuits';
import { parseTournament } from '../../src/presentation/tournament-storage';
import { COMPUTER_VERSION } from '../../src/core/computer';
import { compileRoute } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
import { jumpCoordinates } from '../../src/core/support';
import { sanDiegoFleetTrack as track } from '../../src/core/tracks/san-diego-fleet';
import { fleetExplorerSamples } from '../fixtures/challenge-lines';
import type { RaceEvent } from '../../src/core/types';
import { challengesPanel } from '../../src/ui/panels/challenges';
import { phaseLayout } from '../../src/app/phases';

const config = { trackId: track.id, mode: 'time-trial', laps: 1, human: true, source: 'live' as const };
const route = { crossings: ['support-a-hop', 'support-a-return', 'support-b-hop', 'support-b-return'].map(id => ({ id, entryDistance: 1, exitDistance: 2, activation: id.endsWith('hop') ? 'hop' as const : 'automatic' as const })) };
const landing = (id: string, flightOrigin: 'hop' | 'ramp' = id.endsWith('hop') ? 'hop' : 'ramp'): RaceEvent => ({ type: 'landing', time: 10, crossingId: id, flightOrigin });
const finish: RaceEvent = { type: 'finish', time: 30, lapSummary: { lap: 1, duration: 30, barrierContacts: 0, carContacts: 0, recoveries: 0 } };
const pair = (t: ChallengeLapTracker, prefix: string) => { t.observe(landing(`support-${prefix}-hop`)); t.observe(landing(`support-${prefix}-return`)); };
test('Fleet requires successful manual entries and automatic returns in the same completed lap', () => {
  const t = new ChallengeLapTracker('fleet-explorer', config, route);
  expect(t.observe(finish)).toBe(false); // Merely drawing both branches is not completion.
  pair(t, 'a'); expect(t.vessels).toBe(1); expect(t.observe(finish)).toBe(false);
  pair(t, 'b'); expect(t.observe(finish)).toBe(false); // Never carry a vessel across lap boundaries.
  pair(t, 'a'); pair(t, 'b'); expect(t.observe(finish)).toBe(true); expect(t.completed).toBe(true);
});
test('misses, wrong origins, recovery and skipped entry cannot counterfeit a support sequence', () => {
  for (const events of [
    [landing('support-a-return')],
    [landing('support-a-hop', 'ramp'), landing('support-a-return')],
    [landing('support-a-hop'), landing('support-a-return', 'hop')],
    [landing('support-a-hop'), { type: 'recovery', time: 11 } as RaceEvent, landing('support-a-return')],
  ]) { const t = new ChallengeLapTracker('fleet-explorer', config, route); events.forEach(e => t.observe(e)); pair(t, 'b'); expect(t.observe(finish)).toBe(false); }
  const missing = new ChallengeLapTracker('fleet-explorer', config, { crossings: route.crossings.slice(0, 2) }); pair(missing, 'a'); pair(missing, 'b'); expect(missing.observe(finish)).toBe(false); expect(missing.vessels).toBe(1);
});
test('challenge ownership and exact curated configuration exclude CPUs, practice, ghosts and other sessions', () => {
  for (const change of [{ human: false }, { source: 'practice' as const }, { source: 'tutorial' as const }, { source: 'ghost' as const }, { mode: 'solo-race' }, { trackId: 'golden-gate' }, { laps: 2 }]) {
    const t = new ChallengeLapTracker('fleet-explorer', { ...config, ...change }, route); pair(t, 'a'); pair(t, 'b'); expect(t.observe(finish)).toBe(false);
  }
});
test('Tahoe accepts standing-start clean laps and abilities; every fixed-step incident blocks completion', () => {
  const c = { ...config, trackId: 'snowy-tahoe' };
  const t = new ChallengeLapTracker('alpine-precision', c, {}); for (const type of ['hop', 'thrust', 'drift'] as const) t.observe({ type, time: 3 }); expect(t.observe(finish)).toBe(true);
  for (const key of ['barrierContacts', 'carContacts', 'recoveries'] as const) { const t = new ChallengeLapTracker('alpine-precision', c, {}); expect(t.observe({ ...finish, lapSummary: { ...finish.lapSummary!, [key]: 1 } })).toBe(false); }
  expect(new ChallengeLapTracker('alpine-precision', c, {}).observe({ ...finish, lapSummary: { ...finish.lapSummary!, duration: NaN } })).toBe(false);
});

const rounds = CUPS.find(c => c.id === 'frontier')!.rounds.map(id => ({ circuitId: id, trackVersion: circuits.find(c => c.id === id)!.track.version }));
function cup(times = [20, 21, 22, 23]) {
  let state = createTournament(rounds, 4, 1);
  rounds.forEach((r, i) => { const finishes = times.map((finishTime, player) => ({ finishTime, player, rank: times.filter(t => t < finishTime).length + 1 })); state = finalizeRound(state, i, r, finishes); }); return state;
}
test('Hard Frontier requires the actual complete schedule and a shared or outright title', () => {
  const options = { mode: 'solo-race', difficulty: 'hard' };
  expect(frontierChallengeComplete(cup(), options, 'frontier')).toBe(true);
  expect(frontierChallengeComplete(cup([20, 20, 22, 23]), options, 'frontier')).toBe(true);
  expect(frontierChallengeComplete(cup([21, 20, 22, 23]), options, 'frontier')).toBe(false);
  expect(frontierChallengeComplete(createTournament(rounds, 4, 1), options, 'frontier')).toBe(false);
  for (const change of [{ difficulty: 'normal' }, { mode: 'multiplayer' }]) expect(frontierChallengeComplete(cup(), { ...options, ...change }, 'frontier')).toBe(false);
  expect(frontierChallengeConfig({ ...options, laps: 1, cupId: 'frontier', rounds: [...rounds].reverse() })).toBe(false);
  expect(frontierChallengeConfig({ ...options, laps: 6, cupId: 'frontier', rounds })).toBe(false);
});
test('saved challenge cups retain provenance including practice invalidation; ordinary tours never become challenges', () => {
  const saved = { state: cup(), options: { mode: 'solo-race', difficulty: 'hard', seed: 73149 }, computerVersion: COMPUTER_VERSION, cupId: 'frontier', cupVersion: 1, challengeId: 'frontier-champion', challengeEligible: true, drivers: [0, 1, 2, 3].map(i => ({ name: `P${i}`, paint: 'glacier', controller: i ? 'computer' : 'human' })) };
  expect(parseTournament(JSON.stringify(saved))).toMatchObject({ challengeId: 'frontier-champion', challengeEligible: true });
  expect(parseTournament(JSON.stringify({ ...saved, challengeEligible: false }))).toMatchObject({ challengeId: 'frontier-champion', challengeEligible: false });
  for (const change of [{ options: { ...saved.options, difficulty: 'normal' } }, { challengeId: undefined }, { challengeEligible: undefined }, { cupId: 'pacific' }]) expect(parseTournament(JSON.stringify({ ...saved, ...change }))?.challengeId).toBeUndefined();
});
test('challenge persistence is idempotent, union-only and isolated from preferences/medals', () => {
  const data = new Map([['roadster-race.preferences.v1', 'unchanged'], ['roadster-race.progression.v1', 'medals']]); const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  const a = new ChallengeStore(storage), b = new ChallengeStore(storage), evidence = { id: 'alpine-precision' as const, source: 'live' as const, human: true, completed: true };
  expect(a.record(evidence)).toBe(true); expect(a.record(evidence)).toBe(false); b.record({ ...evidence, id: 'fleet-explorer' }); a.record(evidence);
  expect(a.state.completed).toEqual(['fleet-explorer', 'alpine-precision']); expect(data.get('roadster-race.preferences.v1')).toBe('unchanged'); expect(data.get('roadster-race.progression.v1')).toBe('medals'); expect(new ChallengeStore(storage).state).toEqual(a.state); expect(data.has(CHALLENGE_KEY)).toBe(true);
  let writes = 0; const guarded = new ChallengeStore({ getItem: () => null, setItem: () => { writes++; } });
  for (const source of ['practice', 'tutorial', 'ghost'] as const) guarded.record({ ...evidence, source }); guarded.record({ ...evidence, human: false }); guarded.record({ ...evidence, completed: false }); expect(writes).toBe(0);
});
test('bad/full/blocked storage cannot interrupt challenge completion', () => {
  for (const raw of ['{', 'null', '{"version":99}', '{"version":1,"completed":null}']) expect(parseChallenges(raw)).toEqual(emptyChallenges());
  expect(parseChallenges('{"version":1,"completed":["fleet-explorer","fleet-explorer","unknown"]}').completed).toEqual(['fleet-explorer']);
  const s = new ChallengeStore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } }); expect(s.record({ id: 'alpine-precision', source: 'live', human: true, completed: true })).toBe(true); expect(s.persistent).toBe(false); expect(s.state.completed).toEqual(['alpine-precision']);
});
test('challenge menu stays separate from live race UI', () => {
  const html = challengesPanel({ version: 1, completed: ['alpine-precision'] }, true); expect(html.match(/data-action="challenge-start"/g)).toHaveLength(3); expect(html).toContain('Play again'); expect(html).toContain('data-action="home"');
  const layout = phaseLayout('challenges'); expect(layout.sceneLayout).toBe('setup'); expect(layout.menuMusic).toBe(true); expect(layout.hudVisible).toBe(false); expect(layout.padVisible('hop')).toBe(false);
});
test('both Fleet branches physically land in one lap and produce challenge evidence without physics assistance', () => {
  const compiled = compileRoute(fleetExplorerSamples(track), track); if (!compiled.ok) throw Error(compiled.message);
  expect(compiled.route.hazards).toBeUndefined(); expect(compiled.route.crossings).toHaveLength(6);
  const t = new ChallengeLapTracker('fleet-explorer', config, compiled.route), sim = new RaceSimulation(compiled.route, track, 1);
  const entries = track.jumps!.filter(j => j.activation === 'hop'); const landings: string[] = [];
  for (let tick = 0; tick < 12000 && !sim.state.finished; tick++) {
    for (const j of entries) { const q = jumpCoordinates(sim.state.position, j); if (q.along >= -5 && q.along <= -4 && Math.abs(q.across) < 5) sim.pressHop(); }
    sim.step(); for (const event of sim.drainEvents()) { if (event.type === 'landing' && event.crossingId) landings.push(event.crossingId); t.observe(event); }
  }
  expect(sim.state.finished).toBe(true); expect(sim.state.recoveryCount).toBe(0); expect(sim.state.hopCount).toBe(2); expect(landings).toEqual(compiled.route.crossings!.map(c=>c.id)); expect(t.completed).toBe(true);
}, 120000);
