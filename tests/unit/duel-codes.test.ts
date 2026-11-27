import { describe, expect, it } from 'vitest';
import { checkRoomCode, compareVersions, decodeSince, encodeSince, newRoomCode, ROOM_DIGITS, ROOM_WORDS } from '../../src/duels/codes';

describe('room codes', () => {
  it('is a plain English word and a digit from 2 to 9, every combination equally likely', () => {
    expect(ROOM_WORDS).toHaveLength(256);
    expect(new Set(ROOM_WORDS).size).toBe(256);
    for (const word of ROOM_WORDS) expect(word).toMatch(/^[A-Z]{3,7}$/);
    expect(ROOM_DIGITS).toBe('23456789');
    const seen = new Set<string>();
    for (let word = 0; word < 256; word++) for (let digit = 0; digit < 8; digit++) seen.add(newRoomCode(() => Uint8Array.of(word, digit)));
    expect(seen.size).toBe(2048);
    for (const code of seen) expect(checkRoomCode(code)).toEqual({ ok: true, code });
  });
  it('accepts a typed code in any case and recognises codes from older releases', () => {
    expect(checkRoomCode(' tiger7 ')).toEqual({ ok: true, code: 'TIGER7' });
    expect(checkRoomCode('Ti-ger 7')).toEqual({ ok: true, code: 'TIGER7' });
    expect(checkRoomCode('TIGER')).toEqual({ ok: false, reason: 'old-invite' });
    expect(checkRoomCode('0A1B2C3D4E')).toEqual({ ok: false, reason: 'old-invite' });
    expect(checkRoomCode('xK3pQ9aB2')).toEqual({ ok: false, reason: 'old-invite' });
    expect(checkRoomCode('AB3D7K')).toEqual({ ok: false, reason: 'old-invite' });
    expect(checkRoomCode('TIGER1')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkRoomCode('TIGGER7')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkRoomCode('')).toEqual({ ok: false, reason: 'invalid' });
  });
  it('round-trips the invite stamp and rejects malformed ones', () => {
    expect(decodeSince(encodeSince(1_795_000_000_000))).toBe(1_795_000_000);
    expect(decodeSince('zz!')).toBeUndefined();
    expect(decodeSince(null)).toBeUndefined();
  });
  it('tells which side is stale', () => {
    const v = { protocol: 2, physics: 22, compiler: 21, tracks: { a: 8, b: 6 } };
    expect(compareVersions(v, v)).toBe('match');
    expect(compareVersions({ ...v, physics: 23 }, v)).toBe('client-outdated');
    expect(compareVersions({ ...v, tracks: { a: 7 } }, v)).toBe('server-outdated');
    expect(compareVersions({ ...v, tracks: { a: 8, c: 9 } }, v)).toBe('match');
  });
});
