// Pure panel markup. Callers pass already-resolved display data; nothing here touches the DOM or game state.
import { arrow } from './common';

export interface WelcomeView { tagline: string; savedTour: { completed: number; total: number } | null; incompatibleTour: boolean }
export function welcomePanel({ tagline, savedTour, incompatibleTour }: WelcomeView) {
  let html = `<span class="eyebrow">A LITTLE PLANNING. A LOT OF RACING.</span><h1>${tagline.replace('. ', '.<br>')}</h1><p>Draw your racing line. Set the pace with your finger.<br class="desktop-break"> Then find the perfect moment to thrust.</p><div class="steps"><span><b>01</b> Draw a line</span><span><b>02</b> Time your thrust</span><span><b>03</b> Race together</span></div><div class="panel-actions"><button class="primary-button" data-action="play">Solo Race ${arrow}</button><button class="text-button" data-action="friends">Multiplayer</button><button class="text-button" data-action="time-trial">Time Trial</button></div><span class="welcome-note">SOLO OR 2–4 PLAYERS · ONE DEVICE · 1–6 LAPS</span>`;
  if (savedTour) html += `<div class="resume-tour"><span>YOUR TOURNAMENT IS SAVED · ${savedTour.completed}/${savedTour.total} RACES</span><button class="secondary-button" data-action="tour-resume">Resume tournament ↗</button><button class="text-button" data-action="tour-discard">Discard tournament</button></div>`;
  if (incompatibleTour) html += '<p class="save-status">The circuits have changed. Your previous tournament cannot resume; start a new tour.</p>';
  return html;
}
