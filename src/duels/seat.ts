import type { Room } from '@colyseus/sdk';

const seatStorageKey = 'roadster-duel-seat-v1';
/** Development and test builds only: `?duelServer=` points a client at another room server (the latency proxy in tests/duels). */
const testEndpoint = import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('duelServer') : null;
export const duelEndpoint = testEndpoint || import.meta.env.VITE_DUEL_SERVER ||
  (import.meta.env.DEV && typeof location !== 'undefined' ? location.protocol + '//' + location.hostname + ':2567' : '');

let lastWake = -Infinity;
/**
 * Opening the Multiplayer menu starts waking a sleeping room server (Render Free sleeps after 15 min idle), so
 * it is closer to ready when Private Duel is chosen. Fire-and-forget, at most once a minute; no credentials.
 */
export function wakeDuelServer(now = Date.now()) {
  if (!duelEndpoint || now - lastWake < 60_000) return;
  lastWake = now;
  void fetch(new URL('/health', duelEndpoint), { cache: 'no-store', credentials: 'omit' }).catch(() => {});
}

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
