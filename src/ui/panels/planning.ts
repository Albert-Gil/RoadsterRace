// Pure panel markup. Callers pass already-resolved display data; nothing here touches the DOM or game state.
import { escapeHtml } from '../../presentation/race-settings';
import { CORNERS as corners } from '../../input/router';
import { arrow, exitIcon, homeIcon, playerChip, restartIcon, setupIcon } from './common';

type Name = (player: number) => string;
export interface HandoffView { confirmedCount: number; playerCount: number; turn: number; playerName: Name }
export function handoffPanel({ confirmedCount, playerCount, turn, playerName }: HandoffView) {
  return `<span class="eyebrow">${confirmedCount} OF ${playerCount} LINES LOCKED IN</span><h2>Pass to ${playerName(turn)}.</h2><p>The previous line is hidden. Draw your own plan, then take your place at the ${corners[turn]}.</p><div class="panel-actions"><button class="primary-button" data-action="take-turn">I'm ${playerName(turn)} ${arrow}</button></div>`;
}
export interface PlanningView { preview: boolean; playerCount: number; turn: number; playerName: Name; humans: () => number; inTour: boolean; tutorial?: boolean; message?: string; note?: string }
export function planningPanel({ preview, playerCount, turn, playerName, humans, inTour, tutorial = false, message, note }: PlanningView) {
  const exampleIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  const leave = inTour || tutorial;
  const flagIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m8 4 3 1v4L8 8zm6 2 3-1v4l-3 1zM8 8l3 1v4l-3-1zm6 2 3-1v4l-3 1z" fill="currentColor"/></svg>';
  return `<h2 class="sr-only">${preview ? 'Your line is ready.' : 'Draw your line.'}</h2>${playerCount > 1 ? `<span class="planning-driver" aria-label="${playerName(turn)}, player ${turn + 1} of ${playerCount}" title="${playerName(turn)}">${playerChip(turn)}</span>` : ''}<div class="panel-actions">${preview ? `<button class="planning-button primary-button" data-action="confirm" aria-label="${humans() > 1 ? 'Lock in my line' : 'Race this line'}">${flagIcon}<span>${humans() > 1 ? 'Lock in' : 'Race'}</span></button>` : ''}<button class="planning-button secondary-button" data-action="redraw" aria-label="${preview ? 'Redraw' : 'Start again'}">${restartIcon}<span>Redraw</span></button>${tutorial && !preview ? `<button class="planning-button secondary-button" data-action="tutorial-example" aria-label="Show an example line">${exampleIcon}<span>Example</span></button>` : ''}<button class="planning-button secondary-button" data-action="${leave ? 'home' : 'configure-race'}" aria-label="${tutorial ? 'Leave tutorial' : inTour ? 'Leave tournament' : 'Race setup'}">${leave ? exitIcon : setupIcon}<span>${leave ? 'Exit' : 'Setup'}</span></button>${leave ? '' : `<button class="planning-button secondary-button" data-action="home" aria-label="Home">${homeIcon}<span>Home</span></button>`}</div>${message ? `<div class="planning-error instruction" role="alert">${escapeHtml(message)}</div>` : note ? `<div class="planning-error planning-note" role="status">${escapeHtml(note)}</div>` : ''}`;
}
