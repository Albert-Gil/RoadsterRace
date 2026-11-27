import { describe, expect, it } from 'vitest';
import { checkRoomCode, compareVersions, newRoomCode, ROOM_CODE_ALPHABET } from '../../src/duels/codes';

describe('room codes', () => {
  it('uses six unambiguous characters', () => {
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01OIL]/);
    let seed = 1; const random = (n: number) => Uint8Array.from({ length: n }, () => (seed = (seed * 1103515245 + 12345) & 0xff));
    for (let i = 0; i < 200; i++) { const code = newRoomCode(random); expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/); }
  });
  it('accepts typed codes loosely and recognises old invites', () => {
    expect(checkRoomCode(' ab3-d7k ')).toEqual({ ok: true, code: 'AB3D7K' });
    expect(checkRoomCode('0A1B2C3D4E')).toEqual({ ok: false, reason: 'old-invite' });
    expect(checkRoomCode('ABCDE')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkRoomCode('ABCDE0')).toEqual({ ok: false, reason: 'invalid' });
  });
  it('tells which side is stale', () => {
    const v = { protocol: 2, physics: 22, compiler: 21, tracks: { a: 8, b: 6 } };
    expect(compareVersions(v, v)).toBe('match');
    expect(compareVersions({ ...v, physics: 23 }, v)).toBe('client-outdated');
    expect(compareVersions({ ...v, tracks: { a: 7 } }, v)).toBe('server-outdated');
    expect(compareVersions({ ...v, tracks: { a: 8, c: 9 } }, v)).toBe('match');
  });
});
