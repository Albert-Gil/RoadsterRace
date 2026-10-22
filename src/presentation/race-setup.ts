import { tournamentSetupMarkup, type TourSetup } from './tournament-ui';
import type { RacePreferences } from './race-settings';
import { cleanDriverName, escapeHtml, finishFor, paintFinishes } from './race-settings';
import { circuits, circuitMapPath, findCircuit } from '../content/circuits';

const corners = ['Bottom left', 'Bottom right', 'Top left', 'Top right'];
const keys = ['A', 'L', 'Q', 'P'];

export function raceSetupMarkup(preferences: RacePreferences, count: number, tour?: TourSetup) {
  const selected = findCircuit(preferences.circuitId);
  return `<div class="setup-scroll"><div class="setup-heading"><span class="eyebrow">${escapeHtml(selected.track.name.toUpperCase())} / RACE CONFIGURATION</span><h2>Make it your race.</h2></div>
    <div class="setup-section-label"><span>01 / CIRCUIT</span><span>Choose your venue</span></div>
    <div class="circuit-options" role="group" aria-label="Circuit">${circuits.map(circuit => `<button class="circuit-card" data-action="circuit" data-circuit="${circuit.id}" aria-label="${escapeHtml(circuit.track.name)} circuit" aria-pressed="${selected.id === circuit.id}">
      <span class="circuit-card-meta">${circuit.number} / ${circuit.difficulty}</span><svg viewBox="0 0 180 92" aria-hidden="true"><path class="circuit-map-edge" d="${circuitMapPath(circuit.track)}"/><path class="circuit-map-line" d="${circuitMapPath(circuit.track)}"/></svg><strong>${escapeHtml(circuit.track.name)}</strong><small>${escapeHtml(circuit.features.slice(0, 2).join(' · '))}</small><span class="circuit-length">${Math.round(circuit.track.length)} m</span>
    </button>`).join('')}</div><p class="circuit-description">${escapeHtml(selected.description)}</p>
    <div class="setup-section-label"><span>02 / GRID</span><span>One device · up to four drivers</span></div>
    <div class="player-options" role="group" aria-label="Number of players">${[1, 2, 3, 4].map(n => `<button class="secondary-button" data-action="player-count" data-count="${n}" aria-pressed="${count === n}">${n === 1 ? 'Solo' : `${n} players`}</button>`).join('')}</div>
    ${tour ? tournamentSetupMarkup(tour, count) : ''}
    <div class="setup-section-label"><span>03 / RACE DISTANCE</span><span>One drawn line, repeated each lap</span></div>
    <div class="lap-options" role="group" aria-label="Race laps">${[1, 2, 3, 4, 5, 6].map(laps => `<button data-action="lap-count" data-laps="${laps}" aria-label="${laps} ${laps === 1 ? 'lap' : 'laps'}" aria-pressed="${preferences.laps === laps}">${laps}<small>${laps === 1 ? 'LAP' : 'LAPS'}</small></button>`).join('')}</div>
    <div class="setup-section-label"><span>04 / DRIVERS & PAINT</span><span>Six signature finishes</span></div>
    <div class="driver-grid">${preferences.drivers.slice(0, count).map((driver, index) => {
      const finish = finishFor(driver.paint), name = escapeHtml(cleanDriverName(driver.name, index));
      return `<section class="driver-card" aria-label="Driver ${index + 1}" style="--driver-paint:${finish.color}">
        <div class="driver-card-top"><span class="driver-card-number">${String(index + 1).padStart(2, '0')}</span><span>${count === 1 ? 'Solo driver' : corners[index]} <kbd>${count === 1 ? 'Space' : keys[index]}</kbd></span></div>
        <label class="driver-name-label" for="driver-${index}-name">Driver name</label><input id="driver-${index}-name" class="driver-name-input" data-driver-name="${index}" aria-label="Driver ${index + 1} name" value="${name}" maxlength="36" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done">
        <div class="paint-options" role="group" aria-label="Driver ${index + 1} paint">${paintFinishes.map(paint => `<button class="paint-swatch" data-action="driver-paint" data-driver="${index}" data-paint="${paint.id}" aria-label="${paint.name}" title="${paint.name}" aria-pressed="${driver.paint === paint.id}" style="--swatch:${paint.color}"><span></span></button>`).join('')}</div>
        <div class="paint-caption"><span>${escapeHtml(finish.name)}</span><span>ROADSTER</span></div>
      </section>`;
    }).join('')}</div></div>
    <div class="setup-footer"><span>${count === 1 ? 'SOLO' : `${count} DRIVERS`} <b> / </b> ${preferences.laps} ${preferences.laps === 1 ? 'LAP' : 'LAPS'}</span><div class="panel-actions"><button class="text-button" data-action="home">Back</button><button class="primary-button" data-action="start-session">${count > 1 && tour?.enabled ? 'Start tournament' : count === 1 ? 'Draw racing line' : 'Plan your lines'} <span aria-hidden="true">↗</span></button></div></div>`;
}
