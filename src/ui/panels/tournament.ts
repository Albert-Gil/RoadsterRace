// Pure panel markup. Callers pass already-resolved display data; nothing here touches the DOM or game state.
import { championshipStandings } from '../../core/tournament';
import { findCircuit } from '../../content/circuits';
import { escapeHtml } from '../../presentation/race-settings';
import type { SavedTournament } from '../../presentation/tournament-storage';
import { arrow, chevronIcon, tags } from './common';

/** The tour's rounds as slanted cells: completed (red), the current or next round (white), then the rest. */
function roundStrip(names: string[], current: number, completed: number) {
  return `<ol class="round-strip" aria-label="Rounds: ${completed} of ${names.length} complete">${names.map((name, i) => `<li class="${i === current ? 'current' : i < completed ? 'done' : ''}"${i === current ? ' aria-current="step"' : ''}><b>${String(i + 1).padStart(2, '0')}</b><span>${escapeHtml(name)}</span></li>`).join('')}</ol>`;
}

export interface TourIntroView { roundIndex: number; roundNames: string[]; trackName: string; tagline: string; playerCount: number; lapCount: number; saveFailed: boolean }
export function tourIntroPanel({ roundIndex, roundNames, trackName, tagline, playerCount, lapCount, saveFailed }: TourIntroView) {
  return `<span class="eyebrow">TOURNAMENT · ROUND ${roundIndex + 1} / ${roundNames.length}</span><h2>${escapeHtml(trackName)}.</h2><p>${escapeHtml(tagline)} ${playerCount} drivers · ${lapCount} ${lapCount === 1 ? 'lap' : 'laps'}. Fresh lines, same rivals.</p>${roundStrip(roundNames, roundIndex, roundIndex)}${saveFailed ? '<p class="save-status">Progress could not be saved on this browser. Keep this page open.</p>' : ''}<div class="panel-actions"><button class="primary-button" data-action="tour-draw">Draw your lines ${arrow}</button><button class="secondary-button" data-action="home">Save and exit</button></div>`;
}
export const tourExitPanel = () => `<span class="eyebrow">TOURNAMENT SAVED BETWEEN ROUNDS</span><h2>Take a pit stop?</h2><p>Completed points are kept. This unfinished race will need fresh lines when you return.</p><div class="panel-actions"><button class="primary-button" data-action="tour-continue">Keep playing ${arrow}</button><button class="secondary-button" data-action="tour-save-exit">Save and exit</button></div>`;
export const tourReplacePanel = () => `<span class="eyebrow">A TOURNAMENT IS ALREADY SAVED</span><h2>Continue the rivalry?</h2><p>Resume your championship, or replace it with the new setup.</p><div class="panel-actions"><button class="primary-button" data-action="tour-resume">Resume tournament ${arrow}</button><button class="secondary-button" data-action="tour-replace-confirm">Discard and start new</button><button class="text-button" data-action="tour-back-setup">Back</button></div>`;
export const tourDiscardPanel = () => `<span class="eyebrow">DISCARD SAVED TOURNAMENT</span><h2>Start fresh?</h2><p>This removes the saved championship and its points.</p><div class="panel-actions"><button class="primary-button" data-action="tour-discard-confirm">Discard tournament</button><button class="secondary-button" data-action="tour-discard-cancel">Keep it</button></div>`;

/** Championship standings after a round (and the round's finishing times), or the final table when the tour is complete. */
export function tournamentResultsMarkup(saved: SavedTournament, roundIndex: number) {
  const state = saved.state, complete = state.results.length === state.rounds.length, result = state.results[roundIndex], rows = championshipStandings(state), winners = rows.filter(r => r.rank === 1);
  const roundName = (round: number) => findCircuit(state.rounds[round].circuitId).track.name;
  const name = (p: number) => `<span class="player-chip" style="--identity:var(--player-${p + 1});--identity-ink:var(--player-${p + 1}-ink)">${p + 1}</span> ${escapeHtml(saved.drivers[p].name)}${saved.drivers[p].controller === 'computer' ? ' <small class="cpu-tag">CPU</small>' : ''}`;
  const next = complete ? '' : roundName(state.results.length);
  return `${tags(complete ? 'TOURNAMENT COMPLETE' : 'CHAMPIONSHIP', complete ? `${state.rounds.length} ROUNDS` : `AFTER ROUND ${roundIndex + 1} OF ${state.rounds.length}`)}
    <h2>${complete ? winners.length > 1 ? 'Shared champions.' : `${escapeHtml(saved.drivers[winners[0].player].name)} wins the tour.` : 'The title race continues.'}</h2>
    ${roundStrip(state.rounds.map((_, i) => roundName(i)), complete ? -1 : state.results.length, state.results.length)}
    <div class="championship-results"><table class="standings championship-table"><caption class="sr-only">Championship standings</caption><thead><tr><th>Place</th><th>Driver</th><th>Round</th><th>Total</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.rank}</td><th scope="row">${name(r.player)}</th><td class="round-points">${result ? `+${result.points[r.player]}` : ''}</td><td><strong>${r.points}</strong><small>PTS</small></td></tr>`).join('')}</tbody></table>
    ${result ? `<table class="standings round-results"><caption>Race ${roundIndex + 1} · ${escapeHtml(roundName(roundIndex))}</caption><thead><tr><th>Place</th><th>Driver</th><th>Time</th><th>Pts</th></tr></thead><tbody>${[...result.finishes].sort((a, b) => a.rank - b.rank || a.player - b.player).map(f => `<tr><td>${f.rank}</td><th scope="row">${name(f.player)}</th><td>${f.finishTime.toFixed(2)}s</td><td>+${result.points[f.player]}</td></tr>`).join('')}</tbody></table>` : ''}
    ${complete ? `<div class="round-breakdown"><table class="standings"><caption>Points by round</caption><thead><tr><th>Race</th>${saved.drivers.map((_, p) => `<th>P${p + 1}</th>`).join('')}</tr></thead><tbody>${state.results.map(r => `<tr><th>${r.round + 1} · ${escapeHtml(roundName(r.round))}</th>${r.points.map(n => `<td>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}</div>
    <div class="panel-actions"><button class="primary-button" data-action="${complete ? 'tour-again' : 'tour-next'}">${complete ? 'Race tournament again' : `Next race · ${escapeHtml(next)}`} ${chevronIcon}</button><button class="secondary-button" data-action="home">${complete ? 'Back to menu' : 'Save and exit'}</button></div>`;
}
