import { circuits, findCircuit } from '../content/circuits';
import { escapeHtml } from './race-settings';

export interface TourSetup { enabled: boolean; custom: boolean; schedule: string[] }
/** Single race or tournament (with its schedule); `label` is the numbered section heading in the setup screen. */
export function tournamentSetupMarkup(setup: TourSetup, count: number, label: string) {
  if (count === 1) return '';
  return `<section class="setup-section">${label}
    <div class="segmented format-options" role="group" aria-label="Race format"><button data-action="format-single" aria-pressed="${!setup.enabled}">Single race</button><button data-action="format-tournament" aria-pressed="${setup.enabled}">Tournament</button></div>
    ${!setup.enabled ? '' : `<div class="tour-editor"><div class="segmented format-options" role="group" aria-label="Tournament schedule"><button data-action="tour-full" aria-pressed="${!setup.custom}">Full Tour</button><button data-action="tour-custom" aria-pressed="${setup.custom}">Custom Tour</button></div>
    <p class="tour-scoring">1st <b>10</b> · 2nd <b>6</b> · 3rd <b>4</b> · 4th <b>0</b> points. Shared places share points; fresh lines every round.</p>
    ${setup.custom ? `<label class="schedule-count">Number of races<select aria-label="Number of tournament races" data-schedule-count>${Array.from({ length: 11 }, (_, i) => i + 2).map(n => `<option value="${n}" ${setup.schedule.length === n ? 'selected' : ''}>${n} races</option>`).join('')}</select></label>` : ''}
    <ol class="tour-itinerary">${(setup.custom ? setup.schedule : circuits.map(c => c.id)).map((id, i, list) => `<li><span class="round-number">${String(i + 1).padStart(2, '0')}</span>${setup.custom ? `<select aria-label="Round ${i + 1} circuit" data-schedule-index="${i}">${circuits.map(c => `<option value="${c.id}" ${c.id === id ? 'selected' : ''}>${escapeHtml(c.track.name)}</option>`).join('')}</select><button class="schedule-move" data-action="round-up" data-round="${i}" aria-label="Move round ${i + 1} up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="schedule-move" data-action="round-down" data-round="${i}" aria-label="Move round ${i + 1} down" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>` : `<strong>${escapeHtml(findCircuit(id).track.name)}</strong><span class="itinerary-tag">${i === 0 ? 'OPENING RACE' : i === list.length - 1 ? 'FINALE' : `ROUND ${i + 1}`}</span>`}</li>`).join('')}</ol></div>`}
  </section>`;
}
