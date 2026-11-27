/**
 * Test-only race speed. `?simRate=N` (1–16) runs the fixed 60 Hz simulation N times faster than
 * the wall clock and lets a slow frame catch up instead of pausing, so browser tests on software
 * WebGL finish races in bounded time. Steps, inputs and results are identical to normal speed.
 * Production builds ignore the parameter.
 */
export function testSimRate(search: string, dev: boolean): number {
  if (!dev) return 1;
  const rate = Number(new URLSearchParams(search).get('simRate'));
  return Number.isFinite(rate) && rate >= 1 ? Math.min(16, Math.floor(rate)) : 1;
}
