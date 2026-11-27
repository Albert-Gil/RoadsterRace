/** One seat's choice after a race: race the same lines again, draw new lines, or go home. */
export type BallotChoice = 'same' | 'redraw' | 'home';
export type BallotOutcome = 'pending' | BallotChoice;

/**
 * Shared rule for local multiplayer and Private Duels. Pending until every eligible seat has
 * voted; then any Home sends the group home, otherwise any redraw means fresh lines for
 * everyone, otherwise (unanimous) the same lines are raced again.
 */
export function resolveBallot(votes: readonly (BallotChoice | null | undefined)[]): BallotOutcome {
  if (!votes.length || votes.some(vote => !vote)) return 'pending';
  if (votes.includes('home')) return 'home';
  if (votes.includes('redraw')) return 'redraw';
  return 'same';
}
