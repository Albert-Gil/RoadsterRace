import { describe, expect, test } from 'vitest';
import { championshipStandings, createTournament, finalizeRound } from '../../src/core/tournament';
import { circuits, findCircuit } from '../../src/content/circuits';
import { parseTournament } from '../../src/presentation/tournament-storage';
import { defaultPreferences } from '../../src/presentation/race-settings';
const rounds = circuits.map(c => ({ circuitId: c.id, trackVersion: c.track.version }));
const finishes = (times: number[]) => times.map((finishTime, player) => ({ player, finishTime, rank: 1 + times.filter(t => Math.round(t * 100) < Math.round(finishTime * 100)).length }));
describe('local championship', () => {
  test.each([2, 3, 4])('%i drivers score a complete four-circuit tour', count => {
    let state = createTournament(rounds, count, 6);
    for (let i = 0; i < rounds.length; i++) state = finalizeRound(state, i, rounds[i], finishes(Array.from({ length: count }, (_, p) => 30 + (p + i) % count)));
    expect(state.results).toHaveLength(rounds.length); expect(state.results[0].points).toEqual([10, 6, 4, 0].slice(0, count));
    expect(championshipStandings(state).reduce((sum, p) => sum + p.points, 0)).toBe([16, 20, 20][count - 2] * rounds.length);
  });
  test('hundredth ties share points, skip places and share champions', () => {
    let state = createTournament(rounds.slice(0, 2), 4, 1);
    state = finalizeRound(state, 0, rounds[0], finishes([30.001, 30.004, 31, 32]));
    expect(state.results[0].points).toEqual([10, 10, 4, 0]);
    state = finalizeRound(state, 1, rounds[1], finishes([30, 30, 31, 32]));
    expect(championshipStandings(state).map(r => r.rank)).toEqual([1, 1, 3, 4]);
  });
  test('custom repeated visits, minimum/maximum schedules and all lap lengths', () => {
    for (const n of [2, 12]) for (let laps = 1; laps <= 6; laps++) expect(createTournament(Array(n).fill(rounds[0]), 2, laps).rounds).toHaveLength(n);
    for (const n of [0, 1, 13]) expect(() => createTournament(Array(n).fill(rounds[0]), 2, 1)).toThrow();
    expect(() => createTournament(rounds, 1, 1)).toThrow(); expect(() => createTournament(rounds, 4, 7)).toThrow();
  });
  test('a complete round scores once and mismatched/incomplete results are rejected', () => {
    const state = createTournament(rounds, 4, 2), result = finishes([30, 31, 32, 33]);
    expect(() => finalizeRound(state, 0, rounds[1], result)).toThrow();
    expect(() => finalizeRound(state, 1, rounds[1], result)).toThrow();
    expect(() => finalizeRound(state, 0, rounds[0], result.slice(0, 3))).toThrow();
    expect(() => finalizeRound(state, 0, rounds[0], result.map(r => ({ ...r, player: 0 })))).toThrow();
    expect(() => finalizeRound(state, 0, rounds[0], result.map(r => ({ ...r, rank: 1 })))).toThrow();
    const next = finalizeRound(state, 0, rounds[0], result);
    expect(state.results).toHaveLength(0); expect(() => finalizeRound(next, 0, rounds[0], result)).toThrow();
  });
  test('saved rounds are revalidated; arbitrary points and incompatible rules are never trusted', () => {
    const saved = { state: finalizeRound(createTournament(rounds, 2, 2), 0, rounds[0], finishes([30, 31])), drivers: defaultPreferences().drivers.slice(0, 2) };
    saved.state.results[0].points[0] = 999;
    expect(parseTournament(JSON.stringify(saved))!.state.results[0].points).toEqual([10, 6]);
    expect(parseTournament(JSON.stringify({ ...saved, state: { ...saved.state, rulesVersion: 0 } }))).toBeNull();
    expect(parseTournament(JSON.stringify({ ...saved, state: { ...saved.state, rounds: [{ circuitId: 'unknown', trackVersion: 1 }] } }))).toBeNull();
    for (const value of [null, '{', '{}']) expect(parseTournament(value)).toBeNull();
  });
  test('Launchsite aliases preserve old preferences and Golden Gate has a distinct map and length', () => {
    expect(findCircuit('launchsite').id).toBe('orbital-launchyard'); expect(findCircuit('launchsite').track.name).toBe('Launchsite');
    expect(findCircuit('newport').id).toBe('coastal-launch'); expect(findCircuit('newport').track.name).toBe('Newport');
    const track = findCircuit('golden-gate').track;
    expect(track.name).toBe('Golden Gate'); expect(track.length).toBeGreaterThan(430); expect(track.length).toBeLessThan(520);
  });
  test('solo save retains CPU controllers, difficulty and seed and rejects contradictory controllers',()=>{
    const drivers=defaultPreferences().drivers.map((d,i)=>({...d,controller:i===0?'human':'computer'}));
    const saved={state:createTournament(rounds,4,3),drivers,options:{mode:'solo-race',difficulty:'hard',seed:103}};
    const restored=parseTournament(JSON.stringify(saved));expect(restored?.options).toEqual(saved.options);expect(restored?.drivers).toEqual(drivers);
    expect(parseTournament(JSON.stringify({...saved,drivers:drivers.map(d=>({...d,controller:'computer'}))}))).toBeNull();
    expect(parseTournament(JSON.stringify({...saved,options:{...saved.options,seed:NaN}}))).toBeNull();
  });
});
