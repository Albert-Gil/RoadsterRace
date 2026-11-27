import { describe, expect, it } from 'vitest';
import { contractHash, releaseDecision } from '../../server/contract';

describe('room server release contract', () => {
  const sources = [{ path: 'src/core/rules.ts', content: 'export const a = 1;\n' }, { path: 'server/index.ts', content: 'listen();\n' }];
  it('is stable across order and line endings and changes with any source', () => {
    const hash = contractHash(sources);
    expect(contractHash([...sources].reverse())).toBe(hash);
    expect(contractHash(sources.map(s => ({ ...s, content: s.content.replace(/\n/g, '\r\n') })))).toBe(hash);
    expect(contractHash(sources.map(s => ({ ...s, path: s.path.replaceAll('/', '\\') })))).toBe(hash);
    expect(contractHash([{ ...sources[0], content: 'export const a = 2;\n' }, sources[1]])).not.toBe(hash);
    expect(contractHash([...sources, { path: 'pnpm-lock.yaml', content: 'x' }])).not.toBe(hash);
  });
  it('keeps live rooms when unchanged, publishes website-only releases and holds an outdated server without a hook', () => {
    const base = { contract: 'abc', liveContract: 'abc', serverConfigured: true, hookConfigured: true };
    expect(releaseDecision(base).action).toBe('skip-current');
    expect(releaseDecision({ ...base, liveContract: 'old' }).action).toBe('deploy');
    expect(releaseDecision({ ...base, liveContract: null }).action).toBe('deploy');
    expect(releaseDecision({ ...base, liveContract: 'old', hookConfigured: false }).action).toBe('hold');
    expect(releaseDecision({ ...base, liveContract: null, hookConfigured: false }).action).toBe('hold');
    expect(releaseDecision({ ...base, hookConfigured: false }).action).toBe('skip-current');
    expect(releaseDecision({ ...base, serverConfigured: false, hookConfigured: false }).action).toBe('skip-unconfigured');
  });
});
