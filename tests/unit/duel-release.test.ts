import { describe, expect, it } from 'vitest';
import { releaseRoomServer } from '../../tools/duel-release';

const revision = 'a'.repeat(40), server = 'https://duels.example.com', hook = 'https://api.render.com/deploy/srv-1?key=k';
function io(health: (call: number) => unknown, deploy: () => Response = () => new Response(null, { status: 200 })) {
  let clock = 0, healthCalls = 0; const calls: string[] = [], lines: string[] = [];
  return {
    calls, lines,
    io: {
      fetch: (async (url: URL | string, init?: RequestInit) => {
        const u = String(url); calls.push((init?.method ?? 'GET') + ' ' + u.split('?')[0]);
        if (u.includes('api.render.com')) return deploy();
        const body = health(healthCalls++);
        if (body instanceof Error) throw body;
        return new Response(JSON.stringify(body), { status: 200 });
      }) as typeof fetch,
      delay: async (ms: number) => { clock += ms; }, now: () => clock, log: (l: string) => lines.push(l), deployWaitMs: 60_000,
    },
  };
}

describe('room server release step', () => {
  it('publishes at once when the live contract matches, without touching Render', async () => {
    const t = io(() => ({ ok: true, contract: 'new' }));
    await expect(releaseRoomServer({ revision, contract: 'new', server, hook }, t.io)).resolves.toBe('skip-current');
    expect(t.calls.filter(c => c.startsWith('POST'))).toEqual([]);
  });
  it('publishes website-only releases when Private Duels is deliberately unconfigured', async () => {
    const t = io(() => { throw new Error('no server expected'); });
    await expect(releaseRoomServer({ revision, contract: 'new' }, t.io)).resolves.toBe('skip-unconfigured');
    expect(t.calls).toEqual([]);
  });
  it('deploys a mismatched or unreachable server and waits for /health to report the contract', async () => {
    for (const first of [{ ok: true, contract: 'old' }, new Error('asleep')]) {
      const t = io(call => call === 0 ? first : call < 3 ? { ok: true, contract: 'old' } : { ok: true, contract: 'new' });
      await expect(releaseRoomServer({ revision, contract: 'new', server, hook }, t.io)).resolves.toBe('deployed');
      expect(t.calls.filter(c => c.startsWith('POST'))).toEqual(['POST https://api.render.com/deploy/srv-1']);
    }
  });
  it('holds Pages when the server is outdated or unverifiable and the hook is missing or invalid', async () => {
    for (const bad of [undefined, 'https://example.com/deploy/x?key=k', 'https://api.render.com/deploy/srv-1']) {
      const t = io(() => ({ ok: true, contract: 'old' }));
      await expect(releaseRoomServer({ revision, contract: 'new', server, hook: bad }, t.io)).rejects.toThrow(/website is held/);
    }
    const t = io(() => ({ ok: true }));
    await expect(releaseRoomServer({ revision, contract: 'new', server }, t.io)).rejects.toThrow(/website is held/);
  });
  it('fails when the deployment never reports the contract or Render refuses it', async () => {
    const stuck = io(() => ({ ok: true, contract: 'old' }));
    await expect(releaseRoomServer({ revision, contract: 'new', server, hook }, stuck.io)).rejects.toThrow(/did not report the new contract/);
    const refused = io(() => ({ ok: true, contract: 'old' }), () => new Response(null, { status: 403 }));
    await expect(releaseRoomServer({ revision, contract: 'new', server, hook }, refused.io)).rejects.toThrow(/HTTP 403/);
  });
});
