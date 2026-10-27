import type { SessionOptions } from '../core/session';
import { tournamentSetupMarkup, type TourSetup } from './tournament-ui';
import type { RacePreferences } from './race-settings';
import { cleanDriverName, escapeHtml, finishFor, paintFinishes } from './race-settings';
import { circuits, circuitMapPath, findCircuit } from '../content/circuits';

const corners = ['Bottom left', 'Bottom right', 'Top left', 'Top right'];
const keys = ['A', 'L', 'Q', 'P'], hopKeys = ['Z', 'K', 'W', 'O'];
const chevron = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
const laps = (n: number) => `${n} ${n === 1 ? 'lap' : 'laps'}`;

/**
 * Race setup in two columns (one in narrow portrait): format and circuit, then grid, distance and drivers,
 * with a summary and the start button in a fixed footer. Home lives in the header; device settings in Settings.
 */
export function raceSetupMarkup(preferences: RacePreferences, count: number, tour?: TourSetup, options: SessionOptions = { mode: 'multiplayer', difficulty: 'normal', seed: 1 }, ghost = true) {
  const selected = findCircuit(preferences.circuitId);
  // Sections are numbered in screen order; Solo Race and Multiplayer open with the race format.
  let section = 0;
  const label = (name: string, hint = '') => `<h3 class="setup-label"><span class="setup-number">${String(++section).padStart(2, '0')} /</span> ${name}${hint ? `<small>${hint}</small>` : ''}</h3>`;
  const racers = options.mode === 'solo-race' ? 4 : count, touring = !!tour?.enabled && options.mode !== 'time-trial' && racers > 1;
  const format = tour && options.mode !== 'time-trial' && racers > 1 ? tournamentSetupMarkup(tour, racers, label('RACE FORMAT', 'Real contact · every position counts')) : '';
  const circuitSection = `<section class="setup-section">${label('CIRCUIT', 'Choose your venue')}
      <div class="circuit-options" role="group" aria-label="Circuit">${circuits.map(circuit => `<button class="circuit-card" data-action="circuit" data-circuit="${circuit.id}" aria-label="${escapeHtml(circuit.track.name)} circuit" aria-pressed="${selected.id === circuit.id}">
        <span class="circuit-card-meta"><span>${circuit.number} · ${circuit.difficulty}</span><span class="circuit-length">${Math.round(circuit.track.length)} m</span></span><svg viewBox="0 0 180 92" aria-hidden="true"><path class="circuit-map-edge" d="${circuitMapPath(circuit.track)}"/><path class="circuit-map-line" d="${circuitMapPath(circuit.track)}"/></svg><strong>${escapeHtml(circuit.track.name)}</strong>
      </button>`).join('')}</div></section>`;
  const grid = options.mode === 'multiplayer'
    ? `${label('GRID', 'One device · 2–4 drivers')}<div class="segmented player-options" role="group" aria-label="Number of players">${[2, 3, 4].map(n => `<button data-action="player-count" data-count="${n}" aria-pressed="${count === n}">${n} players</button>`).join('')}</div>`
    : options.mode === 'solo-race'
      ? `${label('GRID', 'Three computer rivals')}<div class="segmented difficulty-options" role="group" aria-label="Computer difficulty">${(['easy', 'normal', 'hard'] as const).map(d => `<button data-action="difficulty" data-difficulty="${d}" aria-pressed="${options.difficulty === d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div><p class="cpu-opponents">Apex · Vector · Pulse <span class="cpu-tag">CPU</span></p>`
      : `${label('GHOST', 'Race your fastest lap')}<button class="setting-row ghost-toggle" data-action="ghost-toggle" aria-pressed="${ghost}"><span class="setting-name">Best-lap ghost ${ghost ? 'on' : 'off'}</span><span class="switch" aria-hidden="true"><i></i></span></button>`;
  const distance = `${label('RACE DISTANCE', touring ? 'Laps in every round' : 'One drawn line, repeated each lap')}<div class="segmented lap-options" role="group" aria-label="Race laps">${[1, 2, 3, 4, 5, 6].map(n => `<button data-action="lap-count" data-laps="${n}" aria-label="${laps(n)}" aria-pressed="${preferences.laps === n}">${n}</button>`).join('')}</div>`;
  const drivers = `${label(count === 1 ? 'DRIVER & PAINT' : 'DRIVERS & PAINT', 'Six signature finishes')}<div class="driver-grid">${preferences.drivers.slice(0, count).map((driver, index) => {
    const finish = finishFor(driver.paint), name = escapeHtml(cleanDriverName(driver.name, index));
    return `<section class="driver-card" aria-label="Driver ${index + 1}" style="--driver-paint:${finish.color}">
        <div class="driver-card-top"><span class="driver-card-number">${String(index + 1).padStart(2, '0')}</span><input id="driver-${index}-name" class="driver-name-input" data-driver-name="${index}" aria-label="Driver ${index + 1} name" value="${name}" maxlength="18" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done"></div>
        <div class="paint-options" role="group" aria-label="Driver ${index + 1} paint">${paintFinishes.map(paint => `<button class="paint-swatch" data-action="driver-paint" data-driver="${index}" data-paint="${paint.id}" aria-label="${paint.name}" title="${paint.name}" aria-pressed="${driver.paint === paint.id}" style="--swatch:${paint.color}"><span></span></button>`).join('')}</div>
        <div class="paint-caption"><span>${escapeHtml(finish.name)}</span><span>${count === 1 ? 'Solo driver' : corners[index]} · <kbd title="Thrust">${count === 1 ? 'Space' : keys[index]}</kbd> <kbd title="Hop">${count === 1 ? 'H' : hopKeys[index]}</kbd></span></div>
      </section>`;
  }).join('')}</div>`;
  const rounds = tour?.custom ? tour.schedule.length : circuits.length;
  const detail = touring
    ? `${tour!.custom ? 'Custom' : 'Full'} tour · ${rounds} rounds · ${laps(preferences.laps)} per round`
    : options.mode === 'solo-race' ? `Solo race · ${laps(preferences.laps)} · ${options.difficulty[0].toUpperCase() + options.difficulty.slice(1)} rivals`
      : options.mode === 'time-trial' ? `Time trial · ${laps(preferences.laps)} · ghost ${ghost ? 'on' : 'off'}`
        : `${count} drivers · ${laps(preferences.laps)}`;
  const start = touring ? 'Start tournament' : count === 1 ? 'Draw racing line' : 'Plan your lines';
  return `<div class="setup-scroll"><div class="setup-columns"><div class="setup-main">${format}${circuitSection}</div>
      <div class="setup-side"><section class="setup-section">${grid}</section><section class="setup-section">${distance}</section><section class="setup-section">${drivers}</section></div></div></div>
    <div class="setup-footer"><div class="setup-summary"><strong>${escapeHtml(selected.track.name.toUpperCase())}</strong><span>${detail}</span></div><div class="panel-actions"><button class="primary-button" data-action="start-session">${start} ${chevron}</button></div></div>`;
}
