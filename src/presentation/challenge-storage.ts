import { CHALLENGES, emptyChallenges, mergeChallenges, validChallengeEvidence, type ChallengeEvidence, type ChallengeProgress } from '../core/challenges';
export const CHALLENGE_KEY = 'roadster-race.challenges.v1';
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export function parseChallenges(raw: string | null): ChallengeProgress {
  try { const p = JSON.parse(raw ?? 'null'); return p?.version === 1 && Array.isArray(p.completed) ? { version: 1, completed: CHALLENGES.filter(c => p.completed.includes(c.id)).map(c => c.id) } : emptyChallenges(); }
  catch { return emptyChallenges(); }
}
function browserStorage() { try { return localStorage; } catch { return undefined; } }
/** Separate from medals/preferences so older tabs cannot erase challenge completion. */
export class ChallengeStore {
  state = emptyChallenges();
  persistent = true;
  constructor(private storage: StorageLike | undefined = browserStorage()) {
    try { this.state = parseChallenges(storage?.getItem(CHALLENGE_KEY) ?? null); this.persistent = !!storage; } catch { this.persistent = false; }
  }
  record(e: ChallengeEvidence): boolean {
    if (!validChallengeEvidence(e)) return false;
    try { this.state = mergeChallenges(this.state, parseChallenges(this.storage?.getItem(CHALLENGE_KEY) ?? null)); } catch { this.persistent = false; }
    const fresh = !this.state.completed.includes(e.id);
    this.state = mergeChallenges(this.state, { version: 1, completed: [e.id] });
    try { if (this.storage) this.storage.setItem(CHALLENGE_KEY, JSON.stringify(this.state)); else this.persistent = false; } catch { this.persistent = false; }
    return fresh;
  }
}
