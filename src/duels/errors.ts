/**
 * Typed Private Duel errors (protocol 4). Every failure has a category, which decides where it is shown,
 * and a stable reason code, which decides the words and the offered action. Raw SDK or server text is
 * never shown: failures are mapped here, at the network boundary.
 *   drawing    → back to the player's retained line ("Check your line").
 *   lobby      → stays in the lobby or on Results, keeping the current selections.
 *   connection → the entry or room screen, with Try again, Rejoin race or Reload game.
 */
export type DuelErrorCategory = 'drawing' | 'lobby' | 'connection';
export type DuelAction = 'retry' | 'rejoin' | 'reload' | 'updating' | 'none';

const REASONS = {
  'line-too-soon': { category: 'drawing', text: 'Wait a moment before submitting again.' },
  'line-unreadable': { category: 'drawing', text: 'This drawing is too long or could not be read. Please redraw.' },
  'line-invalid': { category: 'drawing', text: 'This line cannot be raced. Please redraw.' },
  'circuit-version': { category: 'lobby', text: 'Someone in this room has a different version of that circuit.' },
  'settings-invalid': { category: 'lobby', text: 'Choose a circuit and 1–6 laps.' },
  'server-full': { category: 'connection', text: 'The race server is full right now. Try again shortly.', action: 'retry' },
  'server-asleep': { category: 'connection', text: 'The race server did not wake up. Try again in a minute.', action: 'retry' },
  'server-unreachable': { category: 'connection', text: 'The race server is unreachable right now. Check your connection and try again.', action: 'retry' },
  'version-mismatch': { category: 'connection', text: 'Your game and this room are on different versions.', action: 'updating' },
  'room-started': { category: 'connection', text: 'This race has already started. Ask for an invite to the next one.', action: 'none' },
  'room-not-found': { category: 'connection', text: 'No open race uses this code. Check it, or ask for a new invite.', action: 'none' },
  'invite-expired': { category: 'connection', text: 'This invite has expired. Ask your friend for a new one.', action: 'none' },
  'old-invite': { category: 'connection', text: 'This invite is from an older version of the game. Ask your friend for a new invite.', action: 'none' },
  'seat-expired': { category: 'connection', text: 'Your seat in that race has expired. Join again with the room code.', action: 'none' },
  'removed': { category: 'connection', text: 'The host removed you from the race because your line took too long.', action: 'none' },
  'too-many-attempts': { category: 'connection', text: 'Too many attempts. Wait a minute, then try again.', action: 'retry' },
  'not-configured': { category: 'connection', text: 'The private race server is not configured for this build.', action: 'none' },
  'unknown': { category: 'connection', text: 'Could not connect. Try again.', action: 'retry' },
} as const satisfies Record<string, { category: DuelErrorCategory; text: string; action?: DuelAction }>;

export type DuelReason = keyof typeof REASONS;
/** What the server sends as an `error` message, and what connection failures become. `detail` is a compiler message for line-invalid only. */
export interface DuelError { category: DuelErrorCategory; reason: DuelReason; detail?: string }

export const isDuelReason = (value: unknown): value is DuelReason => typeof value === 'string' && Object.prototype.hasOwnProperty.call(REASONS, value);
export function duelError(reason: DuelReason, detail?: string): DuelError {
  return { category: REASONS[reason].category, reason, ...(detail ? { detail } : {}) };
}
/** Player-facing words. A compiler message (our own text, from the route rules) may replace the generic line text. */
export function describeDuelError(error: DuelError): string {
  return error.reason === 'line-invalid' && error.detail ? error.detail : REASONS[error.reason].text;
}
export function duelErrorAction(error: DuelError): DuelAction {
  return 'action' in REASONS[error.reason] ? (REASONS[error.reason] as { action: DuelAction }).action : 'none';
}
/** The thrown form, so connection code can carry a typed error through `catch`. */
export class DuelFailure extends Error {
  constructor(readonly error: DuelError) { super(error.reason); }
}
/**
 * Maps anything a join, create or reconnect threw. The room server puts a reason code in its ServerError
 * message; the SDK's own failures are recognised by code or wording. Unrecognised text becomes `unknown`.
 */
export function mapConnectionFailure(failure: unknown, attempt: 'create' | 'join' | 'reconnect'): DuelError {
  if (failure instanceof DuelFailure) return failure.error;
  const message = failure instanceof Error ? failure.message : typeof failure === 'string' ? failure : '';
  const code = (failure as { code?: unknown } | null)?.code;
  if (isDuelReason(message)) return duelError(message);
  if (attempt === 'reconnect') return duelError('seat-expired');
  if (code === 429) return duelError('server-full');
  if (attempt === 'join' && /not found|invalid|locked|no rooms/i.test(message)) return duelError('room-not-found');
  if (/failed to fetch|network|ECONNREFUSED|timed? ?out/i.test(message)) return duelError('server-unreachable');
  return duelError('unknown');
}
