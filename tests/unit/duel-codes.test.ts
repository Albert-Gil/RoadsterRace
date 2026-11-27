import { describe, expect, it } from 'vitest';
import { checkRoomCode, compareVersions, newRoomCode, ROOM_WORDS } from '../../src/duels/codes';

describe('room codes', () => {
  it('is one of 256 distinct, short, plain English words, each equally likely', () => {
    expect(ROOM_WORDS).toHaveLength(256);
    expect(new Set(ROOM_WORDS).size).toBe(256);
    for (const word of ROOM_WORDS) expect(word).toMatch(/^[A-Z]{3,7}$/);
    const seen = new Set<string>();
    for (let byte = 0; byte < 256; byte++) seen.add(newRoomCode(() => Uint8Array.of(byte)));
    expect(seen.size).toBe(256);
  });
  it('accepts a typed word in any case and recognises codes from older releases', () => {
    expect(checkRoomCode(' tiger ')).toEqual({ ok: true, code: 'TIGER' });
    expect(checkRoomCode('Ti-ger')).toEqual({ ok: true, code: 'TIGER' });
    expect(checkRoomCode('0A1B2C3D4E')).toEqual({ ok: false, reason: 'old-invite' });
    expect(checkRoomCode('xK3pQ9aB2')).toEqual({ ok: false, reason: 'old-invite' });
    expect(checkRoomCode('AB3D7K')).toEqual({ ok: false, reason: 'old-invite' });
    expect(checkRoomCode('TIGGER')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkRoomCode('')).toEqual({ ok: false, reason: 'invalid' });
  });
  it('tells which side is stale', () => {
    const v = { protocol: 2, physics: 22, compiler: 21, tracks: { a: 8, b: 6 } };
    expect(compareVersions(v, v)).toBe('match');
    expect(compareVersions({ ...v, physics: 23 }, v)).toBe('client-outdated');
    expect(compareVersions({ ...v, tracks: { a: 7 } }, v)).toBe('server-outdated');
    expect(compareVersions({ ...v, tracks: { a: 8, c: 9 } }, v)).toBe('match');
  });
});
