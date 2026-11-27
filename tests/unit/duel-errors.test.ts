import { describe, expect, it } from 'vitest';
import { describeDuelError, duelError, duelErrorAction, DuelFailure, mapConnectionFailure } from '../../src/duels/errors';

describe('typed Private Duel errors', () => {
  it('give each reason a fixed category and action', () => {
    expect(duelError('line-unreadable').category).toBe('drawing');
    expect(duelError('circuit-version').category).toBe('lobby');
    expect(duelError('server-full')).toEqual({ category: 'connection', reason: 'server-full' });
    expect(duelErrorAction(duelError('server-asleep'))).toBe('retry');
    expect(duelErrorAction(duelError('version-mismatch'))).toBe('updating');
    expect(duelErrorAction(duelError('line-invalid'))).toBe('none');
  });
  it('shows a compiler message only for an invalid line', () => {
    expect(describeDuelError(duelError('line-invalid', 'Follow the arrows.'))).toBe('Follow the arrows.');
    expect(describeDuelError(duelError('server-full', 'raw text'))).not.toContain('raw');
  });
  it('maps SDK and server failures at the network boundary, never showing raw text', () => {
    const sdk = (message: string, code?: number) => Object.assign(new Error(message), { code });
    expect(mapConnectionFailure(sdk('server-full', 429), 'create').reason).toBe('server-full');
    expect(mapConnectionFailure(sdk('room-started', 409), 'join').reason).toBe('room-started');
    expect(mapConnectionFailure(sdk('version-mismatch', 409), 'join').reason).toBe('version-mismatch');
    expect(mapConnectionFailure(sdk('room "TIGER7" not found', 4212), 'join').reason).toBe('room-not-found');
    expect(mapConnectionFailure(sdk('anything', 500), 'reconnect').reason).toBe('seat-expired');
    expect(mapConnectionFailure(sdk('Failed to fetch'), 'create').reason).toBe('server-unreachable');
    expect(mapConnectionFailure(sdk('Internal stack trace at foo.js:12'), 'create').reason).toBe('unknown');
    expect(mapConnectionFailure(new DuelFailure(duelError('server-asleep')), 'join').reason).toBe('server-asleep');
  });
});
