import { describe, expect, it } from 'vitest';
import { testClockActive, testSimRate } from '../../src/app/test-clock';
import { FixedStepClock } from '../../src/core/simulation';

describe('test-only race speed', () => {
  it('is ignored in production builds and bounded in development', () => {
    expect(testSimRate('?simRate=4', false)).toBe(1);
    expect(testSimRate('?simRate=4', true)).toBe(4);
    expect(testSimRate('?simRate=99', true)).toBe(16);
    expect(testSimRate('?simRate=abc', true)).toBe(1);
    expect(testSimRate('', true)).toBe(1);
    expect(testClockActive('?simRate=1', true)).toBe(true);
    expect(testClockActive('?simRate=1', false)).toBe(false);
    expect(testClockActive('', true)).toBe(false);
  });
  it('keeps 60 steps per real second at 5 fps when sped up, and the same step count either way', () => {
    const normal = new FixedStepClock(), fast = new FixedStepClock(4);
    let a = 0, b = 0;
    for (let i = 0; i < 5; i++) { normal.advance(0.2, () => a++); fast.advance(0.2, () => b++); }
    expect(a).toBe(45);   // 0.15 s cap per frame: the race falls behind the wall clock
    expect(b).toBe(240);  // 4x: one real second covers four race seconds
    const realtime = new FixedStepClock(1, true); let r = 0;
    for (let i = 0; i < 5; i++) realtime.advance(0.2, () => r++);
    expect(r).toBe(60);   // real speed, but a slow frame catches up
    const steady = new FixedStepClock(); let c = 0;
    for (let i = 0; i < 60; i++) steady.advance(1 / 60, () => c++);
    expect(c).toBeGreaterThanOrEqual(59);
  });
});
