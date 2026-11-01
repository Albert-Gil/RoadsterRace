import { describe, expect, it } from 'vitest';
import { staleBuildRecovery } from '../../src/app/stale-build';
import type { Phase } from '../../src/app/phases';

function host(phase: Phase, clock = { t: 1_000_000 }) {
  const store = new Map<string, string>(), state = { phase, reloads: 0 };
  const recovery = staleBuildRecovery({ phase: () => state.phase, reload: () => { state.reloads++; }, now: () => clock.t, storage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); } } });
  return { recovery, state, clock, store };
}

describe('stale build recovery', () => {
  it('reloads at once on Home or race setup', () => {
    for (const phase of ['welcome', 'setup', 'tour-intro'] as Phase[]) { const h = host(phase); h.recovery.failed(); expect(h.state.reloads, phase).toBe(1); }
  });
  it('never interrupts drawing or a race; reloads on the way back to setup or Home', () => {
    const h = host('racing'); h.recovery.failed(); expect(h.state.reloads).toBe(0); expect(h.recovery.pending).toBe(true);
    for (const phase of ['paused', 'racing', 'results', 'drawing', 'preview'] as Phase[]) { h.state.phase = phase; h.recovery.phaseChanged(); }
    expect(h.state.reloads).toBe(0);
    h.state.phase = 'setup'; h.recovery.phaseChanged(); expect(h.state.reloads).toBe(1);
    h.recovery.phaseChanged(); expect(h.state.reloads).toBe(1);
  });
  it('does not reload again within a minute of a reload (e.g. offline)', () => {
    const h = host('welcome'); h.recovery.failed(); expect(h.state.reloads).toBe(1);
    const again = staleBuildRecovery({ phase: () => 'welcome', reload: () => { h.state.reloads++; }, now: () => h.clock.t + 30_000, storage: { getItem: k => h.store.get(k) ?? null, setItem: () => {} } });
    again.failed(); expect(h.state.reloads).toBe(1);
    const later = staleBuildRecovery({ phase: () => 'welcome', reload: () => { h.state.reloads++; }, now: () => h.clock.t + 90_000, storage: { getItem: k => h.store.get(k) ?? null, setItem: () => {} } });
    later.failed(); expect(h.state.reloads).toBe(2);
  });
});
