import type { SessionOptions } from '../core/session';
import { tournamentSetupMarkup, type TourSetup } from './tournament-ui';
import type { RacePreferences } from './race-settings';
import { cleanDriverName, escapeHtml, finishFor, paintFinishes } from './race-settings';
import { circuits, circuitMapPath, findCircuit } from '../content/circuits';
import { graphicsChoices, type GraphicsChoice, type RendererChoice } from './graphics';
import { graphicsTiers, type GraphicsLevel } from './themes';

export interface GraphicsView { choice: GraphicsChoice; level: GraphicsLevel; renderer?: RendererChoice; activeRenderer?: RendererChoice }
const graphicsName = (choice: GraphicsChoice) => choice === 'auto' ? 'Auto' : graphicsTiers[choice].label;
const rendererNote = (renderer: RendererChoice, active: RendererChoice) => renderer === 'webgpu' && active !== 'webgpu' ? 'WebGPU unavailable here · using WebGL 2' : renderer === 'webgpu' ? 'Experimental · reloads the game' : 'Default · reloads the game';
export function graphicsSetupMarkup({ choice, level, renderer = 'webgl2', activeRenderer = 'webgl2' }: GraphicsView, label = 'GRAPHICS') {
  return `<div class="setup-section-label"><span>${label}</span><span>${choice === 'auto' ? `Auto · ${graphicsTiers[level].label} on this device` : 'Fixed for this device'}</span></div>
    <div class="graphics-options" role="group" aria-label="Graphics quality">${graphicsChoices.map(option => `<button class="secondary-button" data-action="graphics" data-graphics="${option}" aria-pressed="${choice === option}">${graphicsName(option)}</button>`).join('')}</div>
    <div class="setup-section-label renderer-label"><span>RENDERER</span><span>${rendererNote(renderer, activeRenderer)}</span></div>
    <div class="renderer-options" role="group" aria-label="Renderer">${(['webgl2', 'webgpu'] as const).map(option => `<button class="secondary-button" data-action="renderer" data-renderer="${option}" aria-pressed="${renderer === option}">${option === 'webgl2' ? 'WebGL 2' : 'WebGPU (beta)'}</button>`).join('')}</div>`;
}

const corners = ['Bottom left', 'Bottom right', 'Top left', 'Top right'];
const keys = ['A', 'L', 'Q', 'P'], hopKeys = ['Z', 'K', 'W', 'O'];

export function raceSetupMarkup(preferences: RacePreferences, count: number, tour?: TourSetup, options: SessionOptions = {mode: 'multiplayer', difficulty: 'normal', seed: 1}, ghost = true, graphics?: GraphicsView) {
  const selected = findCircuit(preferences.circuitId);
  // Sections are numbered in screen order; Solo Race and Multiplayer open with the race format.
  let section = 0; const label = (name: string) => `${String(++section).padStart(2, '0')} / ${name}`;
  const racers = options.mode === 'solo-race' ? 4 : count, format = tour && options.mode !== 'time-trial' && racers > 1 ? tournamentSetupMarkup(tour, racers, label('RACE FORMAT')) : '';
  return `<div class="setup-scroll"><div class="setup-heading"><span class="eyebrow">${escapeHtml(selected.track.name.toUpperCase())} / RACE CONFIGURATION</span><h2>Make it your race.</h2></div>
    ${format}
    <div class="setup-section-label"><span>${label('CIRCUIT')}</span><span>Choose your venue</span></div>
    <div class="circuit-options" role="group" aria-label="Circuit">${circuits.map(circuit => `<button class="circuit-card" data-action="circuit" data-circuit="${circuit.id}" aria-label="${escapeHtml(circuit.track.name)} circuit" aria-pressed="${selected.id === circuit.id}">
      <span class="circuit-card-meta">${circuit.number} / ${circuit.difficulty}</span><svg viewBox="0 0 180 92" aria-hidden="true"><path class="circuit-map-edge" d="${circuitMapPath(circuit.track)}"/><path class="circuit-map-line" d="${circuitMapPath(circuit.track)}"/></svg><strong>${escapeHtml(circuit.track.name)}</strong><span class="circuit-length">${Math.round(circuit.track.length)} m</span>
    </button>`).join('')}</div>
    <div class="setup-section-label"><span>${label('GRID')}</span><span>One device · up to four drivers</span></div>
    ${options.mode==='multiplayer'?`<div class="player-options" role="group" aria-label="Number of players">${[2,3,4].map(n=>`<button class="secondary-button" data-action="player-count" data-count="${n}" aria-pressed="${count===n}">${n} players</button>`).join('')}</div>`:options.mode==='solo-race'?`<div class="format-options" role="group" aria-label="Computer difficulty">${(['easy','normal','hard'] as const).map(d=>`<button class="secondary-button" data-action="difficulty" data-difficulty="${d}" aria-pressed="${options.difficulty===d}">${d[0].toUpperCase()+d.slice(1)}</button>`).join('')}</div><p class="cpu-opponents">Apex · Vector · Pulse <span class="cpu-tag">CPU</span></p>`:`<button class="secondary-button" data-action="ghost-toggle" aria-pressed="${ghost}">Best-lap ghost ${ghost?'on':'off'}</button>`}
    <div class="setup-section-label"><span>${label('RACE DISTANCE')}</span><span>One drawn line, repeated each lap</span></div>
    <div class="lap-options" role="group" aria-label="Race laps">${[1, 2, 3, 4, 5, 6].map(laps => `<button data-action="lap-count" data-laps="${laps}" aria-label="${laps} ${laps === 1 ? 'lap' : 'laps'}" aria-pressed="${preferences.laps === laps}">${laps}<small>${laps === 1 ? 'LAP' : 'LAPS'}</small></button>`).join('')}</div>
    <div class="setup-section-label"><span>${label('DRIVERS & PAINT')}</span><span>Six signature finishes</span></div>
    <div class="driver-grid">${preferences.drivers.slice(0, count).map((driver, index) => {
      const finish = finishFor(driver.paint), name = escapeHtml(cleanDriverName(driver.name, index));
      return `<section class="driver-card" aria-label="Driver ${index + 1}" style="--driver-paint:${finish.color}">
        <div class="driver-card-top"><span class="driver-card-number">${String(index + 1).padStart(2, '0')}</span><span>${count === 1 ? 'Solo driver' : corners[index]} <kbd title="Thrust">${count === 1 ? 'Space' : keys[index]}</kbd> <kbd title="Hop">${count === 1 ? 'H' : hopKeys[index]}</kbd></span></div>
        <label class="driver-name-label" for="driver-${index}-name">Driver name</label><input id="driver-${index}-name" class="driver-name-input" data-driver-name="${index}" aria-label="Driver ${index + 1} name" value="${name}" maxlength="18" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done">
        <div class="paint-options" role="group" aria-label="Driver ${index + 1} paint">${paintFinishes.map(paint => `<button class="paint-swatch" data-action="driver-paint" data-driver="${index}" data-paint="${paint.id}" aria-label="${paint.name}" title="${paint.name}" aria-pressed="${driver.paint === paint.id}" style="--swatch:${paint.color}"><span></span></button>`).join('')}</div>
        <div class="paint-caption"><span>${escapeHtml(finish.name)}</span><span>ROADSTER</span></div>
      </section>`;
    }).join('')}</div>${graphics ? graphicsSetupMarkup(graphics, label('GRAPHICS')) : ''}</div>
    <div class="setup-footer"><span>${count === 1 ? 'SOLO' : `${count} DRIVERS`} <b> / </b> ${preferences.laps} ${preferences.laps === 1 ? 'LAP' : 'LAPS'}<small class="build-id">TEST BUILD ${escapeHtml(__BUILD_ID__)}</small></span><div class="panel-actions"><button class="text-button" data-action="home">Back</button><button class="primary-button" data-action="start-session">${options.mode!=='time-trial' && tour?.enabled ? 'Start tournament' : count === 1 ? 'Draw racing line' : 'Plan your lines'} <span aria-hidden="true">↗</span></button></div></div>`;
}
