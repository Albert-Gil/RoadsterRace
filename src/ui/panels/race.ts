// Pure panel markup. Callers pass already-resolved display data; nothing here touches the DOM or game state.
import { arrow, drawIcon, homeIcon, playIcon, restartIcon, setupIcon } from './common';
import { soundToggle } from './settings';

/** Compact ready bar along the top of the course; the numbered pads below do the readying. */
export interface ReadyView { playerCount: number; lapCount: number; readyPlayers: boolean[]; ghostSeconds: number; playerName: (player: number) => string }
export function readyPanel({ playerCount, lapCount, readyPlayers, ghostSeconds, playerName }: ReadyView) {
  const chips = readyPlayers.map((ready, i) => `<span class="ready-chip" data-car="${i}" data-ready="${ready}" title="${playerName(i)}"><b>${i + 1}</b>${ready ? 'Ready' : 'Waiting'}</span>`).join('');
  return `<div class="ready-head"><div><span class="eyebrow">${playerCount} PLAYERS · ${lapCount} ${lapCount === 1 ? 'LAP' : 'LAPS'}</span><h2>Take your corner.</h2></div><div class="ready-status"><span class="ready-summary sr-only">${readyPlayers.filter(Boolean).length} / ${playerCount} ready</span>${chips}</div></div>
    <div class="ready-foot"><p>Tap your numbered pad. Cars pass through each other for the first ${ghostSeconds} s.</p><div class="ready-actions"><button class="text-button" data-action="redraw-all" aria-label="Draw new lines">${drawIcon}New lines</button><button class="text-button" data-action="configure-race" aria-label="Race setup">${setupIcon}Setup</button><button class="text-button" data-action="home" aria-label="Home">${homeIcon}Home</button></div></div>`;
}

/** Pause sheet. `status` is the race position at the moment of pausing (lap and time). */
export interface PausedView { soundOn: boolean; status: string }
export function pausedPanel({ soundOn, status }: PausedView) {
  return `<span class="eyebrow">RACE PAUSED${status ? ` · ${status}` : ''}</span><h2>Paused.</h2>
    <div class="pause-actions"><button class="primary-button" data-action="resume">Resume ${playIcon}</button><button class="secondary-button" data-action="retry" aria-label="Restart race">${restartIcon}Restart</button><button class="secondary-button" data-action="redraw-all" aria-label="Draw new lines">${drawIcon}New lines</button></div>
    <div class="pause-footer">${soundToggle(soundOn)}<button class="text-button" data-action="home" aria-label="Home">${homeIcon}Home</button></div>`;
}
export const errorPanel = (message?: string) => `<span class="eyebrow">A QUICK PIT STOP</span><h2>Let's get you racing.</h2><p>${message ?? 'The 3D circuit could not start. Try reloading in a current Safari or Chrome browser.'}</p><div class="panel-actions"><button class="primary-button" data-action="reload">Try again ${arrow}</button></div>`;
