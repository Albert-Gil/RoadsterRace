/** Room codes players can type on a phone: no 0/O, 1/I/L look-alikes. 31^6 ≈ 8.9 × 10^8 codes. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

export function newRoomCode(random: (n: number) => Uint8Array): string {
  const bytes = random(ROOM_CODE_LENGTH * 2);
  let code = '';
  // Rejection sampling keeps every symbol equally likely (256 is not a multiple of 31).
  for (let i = 0; code.length < ROOM_CODE_LENGTH; i++) {
    const byte = i < bytes.length ? bytes[i] : random(1)[0];
    if (byte < 248) code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

export type CodeCheck = { ok: true; code: string } | { ok: false; reason: 'old-invite' | 'invalid' };
/** Normalizes what a player typed or an invite carried. Old 10-character hex invites get their own message. */
export function checkRoomCode(input: string): CodeCheck {
  const code = input.trim().toUpperCase().replace(/[\s-]/g, '');
  if (code.length === ROOM_CODE_LENGTH && [...code].every(c => ROOM_CODE_ALPHABET.includes(c))) return { ok: true, code };
  if (/^[0-9A-F]{10}$/.test(code)) return { ok: false, reason: 'old-invite' };
  return { ok: false, reason: 'invalid' };
}

export interface ServerVersions { protocol: number; physics: number; compiler: number; tracks: Record<string, number> }
export type Compatibility = 'match' | 'client-outdated' | 'server-outdated';
/** Versions only increase, so whichever side reports a lower number is the stale one. */
export function compareVersions(server: ServerVersions, local: ServerVersions): Compatibility {
  const pairs: [number, number][] = [[server.protocol, local.protocol], [server.physics, local.physics], [server.compiler, local.compiler],
    ...Object.entries(server.tracks).filter(([id]) => id in local.tracks).map(([id, v]) => [v, local.tracks[id]] as [number, number])];
  if (pairs.some(([s, l]) => s > l)) return 'client-outdated';
  if (pairs.some(([s, l]) => s < l)) return 'server-outdated';
  return 'match';
}
