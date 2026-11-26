import type { Room } from '@colyseus/sdk';

const seatStorageKey = 'roadster-duel-seat-v1';
export const duelEndpoint = import.meta.env.VITE_DUEL_SERVER ||
  (import.meta.env.DEV && typeof location !== 'undefined' ? location.protocol + '//' + location.hostname + ':2567' : '');

export function storeSeat(token: string | null) {
  try {
    if (token) sessionStorage.setItem(seatStorageKey, token);
    else sessionStorage.removeItem(seatStorageKey);
  } catch { /* Play still works without tab storage. */ }
}

export function savedSeat(code: string) {
  try {
    const token = sessionStorage.getItem(seatStorageKey);
    return token?.startsWith(code + ':') ? token : undefined;
  } catch { return undefined; }
}

/** An invited tab has 30 seconds to reclaim its seat, including cold GPU startup. */
export async function reclaimBeforeGraphics(code: string): Promise<Room | undefined> {
  const token = savedSeat(code);
  if (!token || !duelEndpoint) return;
  try {
    const { Client } = await import('@colyseus/sdk');
    const room = await new Client(duelEndpoint).reconnect(token);
    storeSeat(room.reconnectionToken);
    return room;
  } catch {
    // The normal connection screen can retry and report a network or expiry error.
    return undefined;
  }
}
