import { describe, expect, it } from 'vitest';
import { judgeHealth, recheckWhileUpdating, type HealthVerdict } from '../../src/duels/compatibility';

const local = { protocol: 3, physics: 22, compiler: 21, tracks: { 'coastal-launch': 8 } };
const body = (extra: object = {}) => ({ kind: 'http' as const, status: 200, body: { ok: true, ...local, venues: ['coastal-launch'], ...extra } });

describe('Private Duel entry compatibility', () => {
  it('keeps wake-up, connectivity and version mismatches distinct', () => {
    expect(judgeHealth(body(), local)).toEqual({ kind: 'ok', venues: ['coastal-launch'] });
    expect(judgeHealth({ kind: 'timeout' }, local)).toEqual({ kind: 'asleep' });
    expect(judgeHealth({ kind: 'error' }, local)).toEqual({ kind: 'unreachable' });
    expect(judgeHealth({ kind: 'http', status: 503, body: null }, local)).toEqual({ kind: 'unreachable' });
    expect(judgeHealth(body({ protocol: 4 }), local)).toEqual({ kind: 'updating', ahead: 'server' });
    expect(judgeHealth(body({ protocol: 2 }), local)).toEqual({ kind: 'updating', ahead: 'client' });
    expect(judgeHealth({ kind: 'http', status: 200, body: { ok: true } }, local)).toEqual({ kind: 'updating', ahead: 'client' });
    expect(judgeHealth(body({ tracks: { 'coastal-launch': 9 } }), local)).toEqual({ kind: 'updating', ahead: 'server' });
  });
  it('rechecks every 3 s and stops at the first answer that is not updating', async () => {
    let clock = 0, probes = 0;
    const replies: HealthVerdict[] = [{ kind: 'updating', ahead: 'server' }, { kind: 'ok', venues: [] }];
    const io = { now: () => clock, delay: async (ms: number) => { clock += ms; }, probe: async () => replies[Math.min(probes++, replies.length - 1)] };
    expect(await recheckWhileUpdating(io, { kind: 'updating', ahead: 'server' })).toEqual({ kind: 'ok', venues: [] });
    expect(clock).toBe(6000);
  });
  it('keeps the whole loop within 15 s even when every check waits out its timeout', async () => {
    let clock = 0;
    const timeouts: number[] = [];
    const io = { now: () => clock, delay: async (ms: number) => { clock += ms; },
      probe: async (left: number) => { timeouts.push(left); clock += left; return { kind: 'asleep' } as HealthVerdict; } };
    expect((await recheckWhileUpdating(io, { kind: 'updating', ahead: 'client' })).kind).toBe('updating');
    expect(clock).toBeLessThanOrEqual(15000);
    expect(timeouts).toEqual([12000]);
  });
  it('stops at once when the player leaves', async () => {
    let clock = 0, stopped = false, probes = 0;
    const io = { now: () => clock, delay: async (ms: number) => { clock += ms; stopped = true; }, stopped: () => stopped,
      probe: async () => { probes++; return { kind: 'ok', venues: [] } as HealthVerdict; } };
    expect((await recheckWhileUpdating(io, { kind: 'updating', ahead: 'server' })).kind).toBe('updating');
    expect(probes).toBe(0);
  });
});
