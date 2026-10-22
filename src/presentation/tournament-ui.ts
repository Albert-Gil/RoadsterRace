import { circuits, findCircuit } from '../content/circuits';
import { championshipStandings } from '../core/tournament';
import { escapeHtml } from './race-settings';
import type { SavedTournament } from './tournament-storage';

export interface TourSetup { enabled: boolean; custom: boolean; schedule: string[] }
export function tournamentSetupMarkup(setup: TourSetup, count: number) {
  if (count === 1) return '';
  return `<div class="setup-section-label"><span>RACE FORMAT</span><span>Real contact · every position counts</span></div>
    <div class="format-options" role="group" aria-label="Race format"><button class="secondary-button" data-action="format-single" aria-pressed="${!setup.enabled}">Single race</button><button class="secondary-button" data-action="format-tournament" aria-pressed="${setup.enabled}">Tournament</button></div>
    ${!setup.enabled ? '' : `<div class="tour-editor"><div class="format-options" role="group" aria-label="Tournament schedule"><button class="secondary-button" data-action="tour-full" aria-pressed="${!setup.custom}">Full Tour</button><button class="secondary-button" data-action="tour-custom" aria-pressed="${setup.custom}">Custom Tour</button></div>
    <p class="tour-scoring">1ST <b>10</b> · 2ND <b>6</b> · 3RD <b>4</b> · 4TH <b>0</b> POINTS<br>Shared places share points. Fresh lines every round.</p>
    ${setup.custom ? `<label class="schedule-count">Number of races<select aria-label="Number of tournament races" data-schedule-count>${Array.from({ length: 11 }, (_, i) => i + 2).map(n => `<option value="${n}" ${setup.schedule.length === n ? 'selected' : ''}>${n} races</option>`).join('')}</select></label>` : ''}
    <ol class="tour-itinerary">${(setup.custom ? setup.schedule : circuits.map(c => c.id)).map((id, i, list) => `<li><span class="round-number">${String(i + 1).padStart(2, '0')}</span>${setup.custom ? `<select aria-label="Round ${i + 1} circuit" data-schedule-index="${i}">${circuits.map(c => `<option value="${c.id}" ${c.id === id ? 'selected' : ''}>${escapeHtml(c.track.name)}</option>`).join('')}</select><button class="schedule-move" data-action="round-up" data-round="${i}" aria-label="Move round ${i + 1} up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="schedule-move" data-action="round-down" data-round="${i}" aria-label="Move round ${i + 1} down" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>` : `<strong>${escapeHtml(findCircuit(id).track.name)}</strong><span class="itinerary-tag">${i === 0 ? 'OPENING RACE' : i === list.length - 1 ? 'FINALE' : 'ROUND TWO'}</span>`}</li>`).join('')}</ol></div>`}`;
}
export function tournamentResultsMarkup(saved: SavedTournament, roundIndex: number) {
  const state = saved.state, complete = state.results.length === state.rounds.length, result = state.results[roundIndex], rows = championshipStandings(state), winners = rows.filter(r => r.rank === 1);
  const name = (p: number) => `<span class="player-chip" style="--identity:var(--player-${p + 1});--identity-ink:var(--player-${p + 1}-ink)">${p + 1}</span> ${escapeHtml(saved.drivers[p].name)}`;
  return `<span class="eyebrow">${complete ? 'TOURNAMENT COMPLETE' : `ROUND ${roundIndex + 1} / ${state.rounds.length} · ${escapeHtml(findCircuit(state.rounds[roundIndex].circuitId).track.name.toUpperCase())}`}</span>
    <h2>${complete ? winners.length > 1 ? 'Shared champions.' : `${escapeHtml(saved.drivers[winners[0].player].name)} wins the tour.` : 'The title race continues.'}</h2>
    <div class="championship-results">${result ? `<table class="standings round-results"><caption>Race ${roundIndex + 1} results</caption><thead><tr><th>Place</th><th>Driver</th><th>Time</th><th>Pts</th></tr></thead><tbody>${[...result.finishes].sort((a, b) => a.rank - b.rank || a.player - b.player).map(f => `<tr><td>${f.rank}</td><th scope="row">${name(f.player)}</th><td>${f.finishTime.toFixed(2)}s</td><td>+${result.points[f.player]}</td></tr>`).join('')}</tbody></table>` : ''}
    <table class="standings championship-table"><caption>Championship standings</caption><thead><tr><th>Place</th><th>Driver</th><th>Total</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.rank}</td><th scope="row">${name(r.player)}</th><td><strong>${r.points}</strong></td></tr>`).join('')}</tbody></table>
    ${complete ? `<div class="round-breakdown"><table class="standings"><caption>Points by round</caption><thead><tr><th>Race</th>${saved.drivers.map((_, p) => `<th>P${p + 1}</th>`).join('')}</tr></thead><tbody>${state.results.map(r => `<tr><th>${r.round + 1} · ${escapeHtml(findCircuit(state.rounds[r.round].circuitId).track.name)}</th>${r.points.map(n => `<td>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}</div>
    <div class="panel-actions"><button class="primary-button" data-action="${complete ? 'tour-again' : 'tour-next'}">${complete ? 'Race tournament again' : 'Next race'} ↗</button><button class="text-button" data-action="home">${complete ? 'Back to menu' : 'Save and exit'}</button></div>`;
}
