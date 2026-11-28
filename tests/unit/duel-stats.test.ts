import { describe, expect, it } from 'vitest';
import { ServerStats } from '../../server/stats';

describe('room server stats', () => {
  it('summarises step times per circuit for the current minute and logs one line per circuit', () => {
    const lines: string[] = [], stats = new ServerStats(0, line => lines.push(line));
    stats.roomOpened('coastal-launch'); stats.roomOpened('lax'); stats.roomOpened('lax');
    for (let i = 1; i <= 100; i++) stats.recordStep('coastal-launch', i / 100);
    stats.recordStep('lax', 2.5); stats.recordBehind('lax', 120);
    const live = stats.snapshot(30_000);
    expect(live.uptimeSeconds).toBe(30);
    expect(live.rooms).toEqual({ 'coastal-launch': 1, lax: 2 });
    expect(live.stepsLastMinute['coastal-launch']).toMatchObject({ samples: 100, medianMs: 0.51, p95Ms: 0.96, maxMs: 1, behindMs: 0 });
    expect(live.stepsLastMinute.lax).toMatchObject({ samples: 1, medianMs: 2.5, behindMs: 120 });
    stats.rollMinute(60_000);
    expect(lines.map(l => JSON.parse(l))).toEqual([
      { type: 'duel-steps', circuit: 'coastal-launch', rooms: 1, samples: 100, medianMs: 0.51, p95Ms: 0.96, maxMs: 1, behindMs: 0 },
      { type: 'duel-steps', circuit: 'lax', rooms: 2, samples: 1, medianMs: 2.5, p95Ms: 2.5, maxMs: 2.5, behindMs: 120 },
    ]);
    const after = stats.snapshot(61_000);
    expect(after.stepsLastMinute).toEqual({});
    expect(after.stepsLastHour.lax).toMatchObject({ samples: 1, minutes: 1, behindMs: 120 });
  });

  it('keeps one hour of minutes and weights the hourly median by samples', () => {
    const stats = new ServerStats(0, () => {});
    stats.recordStep('lax', 1); stats.rollMinute(60_000);
    for (let i = 0; i < 3; i++) stats.recordStep('lax', 3);
    stats.rollMinute(120_000);
    expect(stats.snapshot(120_000).stepsLastHour.lax).toMatchObject({ samples: 4, medianMs: 2.5, maxMs: 3, minutes: 2 });
    stats.rollMinute(60_000 + 3_600_001);
    expect(stats.snapshot().stepsLastHour.lax).toMatchObject({ samples: 3, minutes: 1 });
  });

  it('counts rooms by circuit and never goes negative', () => {
    const stats = new ServerStats(0, () => {});
    stats.roomOpened('lax'); stats.roomOpened('yosemite');
    expect(stats.openRooms).toBe(2);
    stats.roomClosed('lax'); stats.roomClosed('lax');
    expect(stats.snapshot().rooms).toEqual({ yosemite: 1 });
    expect(stats.openRooms).toBe(1);
  });

  it('reports the cold-start time once the server listens', () => {
    const stats = new ServerStats(0, () => {});
    expect(stats.snapshot(1).readyMs).toBeNull();
    stats.readyMs = 4200;
    expect(stats.snapshot(1).readyMs).toBe(4200);
  });
});
