/**
 * Test-only race clock. `?simRate=N` (1–16) runs the fixed 60 Hz simulation N times faster than the
 * wall clock and lets a slow frame catch up instead of pausing, so browser tests on software WebGL
 * finish races in bounded time; `simRate=1` keeps real speed but still catches up instead of pausing.
 * Steps, inputs and results are identical to normal play. Production builds ignore the parameter.
 */
export function testSimRate(search: string, dev: boolean): number {
  if (!dev) return 1;
  const rate = Number(new URLSearchParams(search).get('simRate'));
  return Number.isFinite(rate) && rate >= 1 ? Math.min(16, Math.floor(rate)) : 1;
}

/** True when a test clock was requested (any valid `simRate`, including 1). */
export function testClockActive(search: string, dev: boolean): boolean {
  return dev && Number(new URLSearchParams(search).get('simRate')) >= 1;
}
