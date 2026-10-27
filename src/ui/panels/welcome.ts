// Pure panel markup. Callers pass already-resolved display data; nothing here touches the DOM or game state.
import { escapeHtml } from '../../presentation/race-settings';
import { chevronIcon } from './common';

export interface SavedTourSummary { completed: number; total: number; leader?: { name: string; points: number } }
export interface WelcomeView { tagline: string; savedTour: SavedTourSummary | null; incompatibleTour: boolean }

const modes = [
  { action: 'play', name: 'Solo Race', note: 'vs 3 CPU' },
  { action: 'friends', name: 'Multiplayer', note: '2–4 players' },
  { action: 'time-trial', name: 'Time Trial', note: 'Best lap' },
  { action: 'tutorial', name: 'Tutorial', note: '1 guided lap' },
] as const;

/** Home: the tagline over the key art, four stacked mode bars, and a ticker for a saved tournament. */
export function welcomePanel({ tagline, savedTour, incompatibleTour }: WelcomeView) {
  const title = tagline.replace(/\. (.+)$/, '.<br><em>$1</em>');
  let html = `<span class="eyebrow">A LITTLE PLANNING. A LOT OF RACING.</span><h1>${title}</h1>
    <nav class="mode-menu" aria-label="Game modes">${modes.map((mode, i) => `<button class="mode-bar${i === 0 ? ' primary' : ''}" data-action="${mode.action}" aria-label="${mode.name}" aria-describedby="mode-note-${mode.action}">${mode.name}<small id="mode-note-${mode.action}">${mode.note}</small>${chevronIcon}</button>`).join('')}</nav>
    <p class="rotate-hint"><span aria-hidden="true">↻</span> Turn your phone sideways for the best line.</p>`;
  if (savedTour) {
    const lead = savedTour.leader ? ` · ${escapeHtml(savedTour.leader.name.toUpperCase())} LEADS ON ${savedTour.leader.points} PTS` : '';
    html += `<div class="resume-tour" role="group" aria-label="Saved tournament"><span class="tag">Saved</span><span class="resume-text">TOURNAMENT · ${savedTour.completed}/${savedTour.total} RACES${lead}</span><button class="text-button" data-action="tour-discard" aria-label="Discard tournament">Discard</button><button class="resume-button" data-action="tour-resume" aria-label="Resume tournament">Resume${chevronIcon}</button></div>`;
  } else if (incompatibleTour) html += '<p class="resume-tour save-status">The circuits have changed. Your previous tournament cannot resume; start a new tour.</p>';
  return html;
}
