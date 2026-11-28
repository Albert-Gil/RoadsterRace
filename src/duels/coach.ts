import type { DuelScreenKind } from './screen';

/**
 * Guided first online race (plan step 4.4): short, dismissible cards in the paddock on a device's first
 * Private Duels. Never during racing (the race and loading screens have none). Dismissed cards are
 * remembered on this device; Settings can show them again.
 */
export type CoachId = 'invite' | 'private-lines' | 'pads' | 'rematch';
export const COACH_CARDS: Record<CoachId, { title: string; text: string }> = {
  invite: { title: 'Invite your friends', text: 'Share the invite or read out the room code. Two to four drivers, each on their own device.' },
  'private-lines': { title: 'Your line stays private', text: 'When the host starts, everyone draws their own line. Nobody sees another line until the cars race.' },
  pads: { title: 'Hop and Thrust', text: 'During the race, tap Hop to jump a gap and Thrust for a burst of speed. The room decides when each one fires.' },
  rematch: { title: 'Race again or new lines', text: 'Everyone votes. Once all drivers still here have chosen, any New lines vote starts a fresh drawing round.' },
};
/** Which cards each screen may show, in order (the first one not yet dismissed is shown). */
export function coachOrder(kind: DuelScreenKind, isHost: boolean): CoachId[] {
  switch (kind) {
    case 'room': return isHost ? ['invite', 'private-lines'] : ['private-lines'];
    case 'waiting': return ['pads'];
    case 'results': return ['rematch'];
    default: return [];
  }
}

export const COACH_STORAGE_KEY = 'roadster-duel-coach-v1';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const browserStorage = (): Store | undefined => { try { return localStorage; } catch { return undefined; } };

export class CoachCards {
  private seen: Set<string>;
  constructor(private readonly storage: Store | undefined = browserStorage()) {
    let saved: unknown = [];
    try { saved = JSON.parse(storage?.getItem(COACH_STORAGE_KEY) ?? '[]'); } catch { /* A damaged entry shows the cards again. */ }
    this.seen = new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []);
  }
  next(kind: DuelScreenKind, isHost: boolean): CoachId | undefined { return coachOrder(kind, isHost).find(id => !this.seen.has(id)); }
  dismiss(id: CoachId) {
    this.seen.add(id);
    try { this.storage?.setItem(COACH_STORAGE_KEY, JSON.stringify([...this.seen])); } catch { /* Private browsing: dismissed for this visit only. */ }
  }
  /** Settings: show every card again on the next Private Duels. */
  static reset(storage: Store | undefined = browserStorage()) { try { storage?.removeItem(COACH_STORAGE_KEY); } catch { /* Nothing stored. */ } }
}
