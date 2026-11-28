import { expect, test } from 'vitest';
import { FramePlayback } from '../../src/duels/playback';
import type { RaceFrame } from '../../src/duels/protocol';

const frame = (tick: number): RaceFrame => ({ round: 1, tick, countdown: 0, cars: [], order: [], events: [] });
const shownTick = (p: FramePlayback, now: number) => { const s = p.sample(now)!; return s.from.tick + (s.to.tick - s.from.tick) * s.alpha; };

test('countdown packets at tick zero do not age the race clock, including on rematch', () => {
  const p = new FramePlayback();
  for (const round of [1, 2]) {
    const start = round * 10_000;
    for (let tick = 0; tick < 180; tick += 3) {
      p.push({ ...frame(0), round, countdown: 180 - tick }, start + tick * 1000 / 60);
    }
    for (let tick = 0; tick <= 12; tick += 3) {
      p.push({ ...frame(tick), round }, start + 3000 + tick * 1000 / 60);
    }
    expect(shownTick(p, start + 3200)).toBeCloseTo(6, 6);
    expect(p.aheadOf(p.latest!, start + 3225, 10)).toBeCloseTo(45, 6);
  }
});

test('steady frames play back smoothly 100 ms behind the server', () => {
  const p = new FramePlayback();
  for (let k = 0; k <= 10; k++) p.push(frame(k * 3), 1000 + k * 50);
  // At arrival of tick 30 (t=1500) the display shows tick 30 - 6 (100 ms).
  expect(shownTick(p, 1500)).toBeCloseTo(24, 6);
  expect(shownTick(p, 1525)).toBeCloseTo(25.5, 6);
});
test('a late frame does not freeze the cars, and bunched frames do not jump them', () => {
  const p = new FramePlayback();
  for (let k = 0; k <= 4; k++) p.push(frame(k * 3), 1000 + k * 50);     // ticks 0..12, on time
  const before = [1200, 1230, 1260, 1290].map(t => shownTick(p, t));    // frame 15 is late
  for (let i = 1; i < before.length; i++) expect(before[i]).toBeGreaterThan(before[i - 1]);
  p.push(frame(15), 1300); p.push(frame(18), 1302);                        // arrives bunched with 18
  const after = [1300, 1330, 1360].map(t => shownTick(p, t));
  expect(after[0]).toBeGreaterThanOrEqual(before.at(-1)! - 1e-9);
  for (let i = 1; i < after.length; i++) expect(after[i] - after[i - 1]).toBeCloseTo(1.8, 6);
});
test('extrapolation stops after 100 ms and a new round starts clean', () => {
  const p = new FramePlayback();
  for (let k = 0; k <= 4; k++) p.push(frame(k * 3), 1000 + k * 50);
  expect(shownTick(p, 5000)).toBeCloseTo(12 + 6, 6);
  p.push({ ...frame(0), round: 2 }, 5000);
  expect(p.sample(5000)!.to.round).toBe(2);
});
