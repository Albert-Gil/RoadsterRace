// Pure panel markup. Callers pass already-resolved display data; nothing here touches the DOM or game state.
import { escapeHtml } from '../../presentation/race-settings';
import { CORNERS as corners } from '../../input/router';
import { arrow, playerChip } from './common';

type Name = (player: number) => string;
export interface HandoffView { confirmedCount: number; playerCount: number; turn: number; playerName: Name }
export function handoffPanel({ confirmedCount, playerCount, turn, playerName }: HandoffView) {
  return `<span class="eyebrow">${confirmedCount} OF ${playerCount} LINES LOCKED IN</span><h2>Pass to ${playerName(turn)}.</h2><p>The previous line is hidden. Draw your own plan, then take your place at the ${corners[turn]}.</p><div class="panel-actions"><button class="primary-button" data-action="take-turn">I'm ${playerName(turn)} ${arrow}</button><button class="text-button" data-action="home">Change mode</button></div>`;
}
export interface PlanningView { preview: boolean; playerCount: number; turn: number; playerName: Name; humans: () => number; inTour: boolean; message?: string }
export function planningPanel({ preview, playerCount, turn, playerName, humans, inTour, message }: PlanningView) {
  const resetIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.4 7M4 4v6h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const setupIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const flagIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m8 4 3 1v4L8 8zm6 2 3-1v4l-3 1zM8 8l3 1v4l-3-1zm6 2 3-1v4l-3 1z" fill="currentColor"/></svg>';
  return `<h2 class="sr-only">${preview ? 'Your line is ready.' : 'Draw your line.'}</h2>${playerCount > 1 ? `<span class="planning-driver" aria-label="${playerName(turn)}, player ${turn + 1} of ${playerCount}" title="${playerName(turn)}">${playerChip(turn)}</span>` : ''}<div class="panel-actions">${preview ? `<button class="planning-button primary-button" data-action="confirm" aria-label="${humans() > 1 ? 'Lock in my line' : 'Race this line'}">${flagIcon}<span>${humans() > 1 ? 'Lock in' : 'Race'}</span></button>` : ''}<button class="planning-button secondary-button" data-action="redraw" aria-label="${preview ? 'Redraw' : 'Start again'}">${resetIcon}<span>Redraw</span></button><button class="planning-button secondary-button" data-action="${inTour ? 'home' : 'configure-race'}" aria-label="${inTour ? 'Leave tournament' : 'Race setup'}">${setupIcon}<span>${inTour ? 'Exit' : 'Setup'}</span></button></div>${message ? `<div class="planning-error instruction" role="alert">${escapeHtml(message)}</div>` : ''}`;
}
