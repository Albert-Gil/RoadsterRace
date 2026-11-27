// Pure markup for the shared-screen vote after a multiplayer race or championship.
import { playerChip } from './common';

export interface BallotOption { vote: string; label: string }
export interface BallotView {
  /** Seats in vote order; `player` is the car/seat number used for colour and the chip. */
  seats: { player: number; name: string }[];
  votes: readonly (string | null)[];
  options: BallotOption[];
  heading: string;
}

/** Each seat taps one choice and may change it until everyone has voted. */
export function ballotMarkup({ seats, votes, options, heading }: BallotView) {
  const waiting = seats.filter((_, i) => !votes[i]);
  const status = waiting.length ? `Waiting for ${waiting.map(s => `${s.player + 1} · ${s.name}`).join(', ')}.` : 'Everyone has chosen.';
  return `<section class="ballot" aria-label="${heading}"><p class="ballot-heading">${heading}</p>${seats.map((seat, i) => `<div class="ballot-seat" role="group" aria-label="Player ${seat.player + 1}, ${seat.name}">${playerChip(seat.player)}<span class="ballot-name">${seat.name}</span><span class="ballot-options">${options.map(o => `<button class="ballot-option" type="button" data-action="vote" data-seat="${i}" data-vote="${o.vote}" aria-pressed="${votes[i] === o.vote}" aria-label="Player ${seat.player + 1}: ${o.label}">${o.label}</button>`).join('')}</span></div>`).join('')}<p class="ballot-status" role="status" aria-live="polite">${status}</p></section>`;
}
