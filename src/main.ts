import { rampAt, supported, FLIGHT_RULES } from './core/support';
import './style.css';
import { angleDelta, clamp, distance, lerp } from './core/geometry';
import { LocalRace, gridPose } from './core/local-race';
import { compileRoute, createPracticeSamples, sampleRoute, COMPILER_VERSION } from './core/route';
import { createTournament, finalizeRound, championshipStandings } from './core/tournament';
import { loadTournament, storeTournament, discardTournament, type SavedTournament } from './presentation/tournament-storage';
import { tournamentResultsMarkup, type TourSetup } from './presentation/tournament-ui';
import { FixedStepClock, RULES } from './core/simulation';
import { CONTACT_RULES } from './core/vehicle-contact';
import { assetUrl } from './presentation/urls';
import { circuits, findCircuit } from './content/circuits';
import { canStartDrawing } from './core/start-finish';
import type { CompiledRoute, DrawSample, DrawingTrim } from './core/types';
import { PointerOwnership } from './input/ownership';
import { GameAudio } from './presentation/audio';
import { GameScene } from './presentation/scene';
import { applyPlayerColors, applyTheme, themes } from './presentation/themes';
import { cleanDriverName, escapeHtml, finishFor, loadPreferences, savePreferences } from './presentation/race-settings';
import { raceSetupMarkup } from './presentation/race-setup';

type Phase = 'welcome' | 'setup' | 'handoff' | 'drawing' | 'preview' | 'ready' | 'countdown' | 'racing' | 'paused' | 'results' | 'diagnostics' | 'error' | 'tour-intro' | 'tour-resume' | 'tour-exit' | 'tour-replace';
const app = document.querySelector<HTMLDivElement>('#app')!;
let theme = new URLSearchParams(location.search).get('theme') === 'graphite' ? themes.graphite : themes.coastal;
applyTheme(theme);
app.innerHTML = `
  <main class="playground" data-phase="welcome" data-players="1">
    <canvas id="race-canvas" aria-label="Coastal racing circuit. Draw your line with a finger or mouse." tabindex="0"></canvas>
    <div id="course-space" aria-hidden="true"></div>
    <div class="scene-vignette" aria-hidden="true"></div>
    <div id="vehicle-labels" aria-hidden="true">${[0, 1, 2, 3].map(i => `<span class="vehicle-label" data-car="${i}" hidden>${i + 1}</span>`).join('')}</div>
    <header class="topbar">
      <a class="brand" href="${assetUrl('')}" aria-label="Roadster Race home"><img class="brand-mark" alt="" width="38" height="38"><span class="brand-name"></span></a>
      <div class="topbar-center"><span class="live-dot"></span><span id="mode-label">SOLO PLAYGROUND</span></div>
      <div class="header-actions"><button class="icon-button sound-control" id="sound-button" aria-label="Turn sound on" aria-pressed="false" title="Sound"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4V9Z" fill="currentColor"/><path class="sound-waves" d="M16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path class="sound-slash" d="m4 3 17 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span class="sound-label">Sound off</span></button><button class="quiet-button touch-test-link" data-action="diagnostics">Touch test <span aria-hidden="true">↗</span></button></div>
    </header>
    <div class="circuit-caption"><span class="caption-line"></span><div>01 / COASTAL LAUNCH<small>One circuit. Endless possibilities.</small></div></div>
    <section class="race-hud" aria-label="Race timing" hidden><div><small>TIME</small><strong id="race-time">00:00.00</strong></div><span class="hud-divider"></span><div><small id="lap-label">LAP</small><strong id="race-lap">1 <i>/ 2</i></strong></div><span class="hud-divider"></span><div><small id="pace-label">PACE</small><strong id="race-speed">0 <i>km/h</i></strong></div></section>
    <section id="panel" class="panel" aria-live="polite"></section>
    <div class="countdown" hidden><span id="countdown-value">3</span><small id="countdown-label">YOUR LINE. YOUR MOMENT.</small></div>
    <div class="race-notice" role="status"></div><div id="race-controls"></div>
    <button class="pause-button icon-button" data-action="pause" aria-label="Pause race" hidden>Ⅱ</button>
    <div class="race-progress" hidden><span></span></div>
    <div class="rotate-note"><span aria-hidden="true">↻</span> Turn your device sideways for the best line.</div>
    <section id="diagnostics" class="diagnostics" hidden aria-label="Four-player touch test">
      <div class="diagnostics-heading"><span class="eyebrow">FOUR CORNERS. FOUR PLAYERS.</span><h1>Touch is personal.</h1><p>Press together. Slide away. Each touch stays with its own corner.</p><button class="quiet-button" data-action="exit-diagnostics">← Back to the circuit</button><button class="quiet-button" data-action="reset-diagnostics">Reset counts</button></div>
      ${[0, 1, 2, 3].map(i => `<button class="diagnostic-pad pad-${i}" data-player="${i}" aria-label="Player ${i + 1} touch pad"><span class="player-number">0${i + 1}</span><strong>PLAYER ${i + 1}</strong><span class="pad-status">READY</span><small><b class="pad-count">0</b> presses · <b class="pad-cancel">0</b> cancels</small></button>`).join('')}
      <p class="diagnostics-footnote">Touch ownership check · real iPhone/iPad verification pending</p>
    </section>
    <div class="lower-wordmark" aria-hidden="true">DRAW. RACE. REPEAT.</div>
  </main>`;

const playground = app.querySelector<HTMLElement>('.playground')!;
const canvas = document.querySelector<HTMLCanvasElement>('#race-canvas')!;
const panel = document.querySelector<HTMLElement>('#panel')!, hud = document.querySelector<HTMLElement>('.race-hud')!;
const countdownElement = document.querySelector<HTMLElement>('.countdown')!, controls = document.querySelector<HTMLElement>('#race-controls')!;
const pauseButton = document.querySelector<HTMLButtonElement>('.pause-button')!, notice = document.querySelector<HTMLElement>('.race-notice')!;
const diagnosticSection = document.querySelector<HTMLElement>('#diagnostics')!, raceProgress = document.querySelector<HTMLElement>('.race-progress')!;
const labels = [...document.querySelectorAll<HTMLElement>('.vehicle-label')];
const audio = new GameAudio(), raceTouches = new PointerOwnership(), heldKeys = new Set<string>();
let ownership = new PointerOwnership();
let phase: Phase = 'welcome', returnPhase: Phase = 'welcome', route: CompiledRoute | null = null, race: LocalRace | null = null;
let playerCount = 1, setupCount = 2, turn = 0, confirmedRoutes: CompiledRoute[] = [], readyPlayers: boolean[] = [];
const preferences = loadPreferences();
const tourSetup: TourSetup = { enabled: false, custom: false, schedule: circuits.map(c => c.id) };
let savedTour = loadTournament(), activeTour: SavedTournament | null = null, roundIndex = 0;
let exitReturn: Phase = 'welcome', tourSaveFailed = false;
const circuitQuery = new URLSearchParams(location.search);
let activeCircuit = findCircuit(circuitQuery.has('circuit') ? circuitQuery.get('circuit') : preferences.circuitId);
let activeTrack = activeCircuit.track;
preferences.circuitId = activeCircuit.id;
const startPose = () => ({ ...activeTrack.start, heading: Math.atan2(activeTrack.centerline[1].x - activeTrack.start.x, activeTrack.centerline[1].z - activeTrack.start.z) });
let lapCount = preferences.laps;
const bestTimes = new Map<string, number>();
const bestKey = () => `${activeTrack.id}:${activeTrack.version}:${lapCount}:${RULES.version}:${COMPILER_VERSION}`;
let drawingTrim: DrawingTrim | undefined;
let stroke: DrawSample[] = [], drawingPointer: number | null = null;
let countdownRemaining = 0, resuming = false, best: number | null = null, previousPoses: { x: number; z: number; heading: number; y: number }[] = [], noticeUntil = 0, lastFrame = performance.now();
let countdownBeat = 3, rechargeAnnounced: boolean[] = [];
let world: GameScene;
const clock = new FixedStepClock(), keys = ['KeyA', 'KeyL', 'KeyQ', 'KeyP'];
const corners = ['bottom left', 'bottom right', 'top left', 'top right'];
const formatTime = (seconds: number) => { const cs = Math.max(0, Math.round(seconds * 100)), minutes = Math.floor(cs / 6000); return `${String(minutes).padStart(2, '0')}:${((cs % 6000) / 100).toFixed(2).padStart(5, '0')}`; };
const arrow = '<span aria-hidden="true">↗</span>';
const driverName = (i: number) => cleanDriverName(preferences.drivers[i].name, i);
const playerName = (i: number) => escapeHtml(driverName(i));
function applyDriverPresentation() {
  const colors = preferences.drivers.map(driver => finishFor(driver.paint).color);
  applyPlayerColors(colors); world?.setDriverPaints(colors);
  if (phase === 'results' && race) world?.setShowcasePaint(colors[race.standings()[0].player]);
  labels.forEach((label, i) => label.title = driverName(i));
}
function saveSettings() { preferences.laps = lapCount; savePreferences(preferences); }
function refreshSetup(focus?: string) {
  const scroll = panel.querySelector('.setup-scroll')?.scrollTop ?? 0;
  renderPanel(); const content = panel.querySelector('.setup-scroll'); if (content) content.scrollTop = scroll;
  if (focus) panel.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
}
function updateCircuitCaption() {
  document.querySelector('.circuit-caption')!.innerHTML = `<span class="caption-line"></span><div>${activeCircuit.number} / ${escapeHtml(activeTrack.name.toUpperCase())}<small>${escapeHtml(activeCircuit.tagline)}</small></div>`;
  canvas.setAttribute('aria-label', `${activeTrack.name} racing circuit. Draw your line with a finger or mouse.`);
}
function selectCircuit(id: string) {
  const next = findCircuit(id); if (next.id === activeCircuit.id) return;
  cancelStroke(); clearRaceInput();
  route = null; race = null; confirmedRoutes = []; readyPlayers = []; previousPoses = []; stroke = []; turn = 0; playerCount = 1;
  const engine = world.engine; world.dispose(false);
  activeCircuit = next; activeTrack = next.track; preferences.circuitId = next.id;
  world = new GameScene(canvas, activeTrack, theme, activeCircuit.scenery, engine);
  applyDriverPresentation(); renderControls(); notice.textContent = ''; lastFrame = performance.now();
  best = bestTimes.get(bestKey()) ?? null; saveSettings();
  const url = new URL(location.href); url.searchParams.set('circuit', next.id); history.replaceState(null, '', url);
  setPhase('setup'); panel.querySelector<HTMLElement>(`[data-circuit="${next.id}"]`)?.focus({ preventScroll: true });
}
function persistTour() {
  if (!activeTour) return;
  savedTour = structuredClone(activeTour); tourSaveFailed = !storeTournament(savedTour);
}
function startTournament() {
  const ids = tourSetup.custom ? tourSetup.schedule : circuits.map(c => c.id);
  activeTour = { state: createTournament(ids.map(id => ({ circuitId: findCircuit(id).id, trackVersion: findCircuit(id).track.version })), setupCount, lapCount), drivers: preferences.drivers.slice(0, setupCount).map((d, i) => ({ name: cleanDriverName(d.name, i), paint: d.paint })) };
  persistTour(); beginTourRound();
}
function restoreTourDrivers() {
  if (!activeTour) return;
  activeTour.drivers.forEach((d, i) => preferences.drivers[i] = { ...d }); lapCount = activeTour.state.laps; setupCount = activeTour.state.playerCount; saveSettings();
}
function beginTourRound() {
  if (!activeTour) return;
  roundIndex = activeTour.state.results.length; restoreTourDrivers();
  selectCircuit(activeTour.state.rounds[roundIndex].circuitId);
  clearRaceInput(); playerCount = activeTour.state.playerCount; confirmedRoutes = []; race = null; route = null; readyPlayers = []; turn = 0;
  world.setPlayers(playerCount); applyDriverPresentation(); renderControls(); world.drawLine(null); world.showVehicles(-1, playerCount); setPhase('tour-intro');
}
function resumeTournament() {
  if (!savedTour) return;
  activeTour = structuredClone(savedTour); restoreTourDrivers();
  if (activeTour.state.results.length === activeTour.state.rounds.length) { roundIndex = activeTour.state.results.length - 1; selectCircuit(activeTour.state.rounds[roundIndex].circuitId); playerCount = activeTour.state.playerCount; renderControls(); world.showVehicles(-1, playerCount); applyDriverPresentation(); setPhase('results'); }
  else beginTourRound();
}
const playerChip = (i: number) => `<span class="player-chip" style="--identity:var(--player-${i + 1});--identity-ink:var(--player-${i + 1}-ink)">${i + 1}</span>`;
function brand() { document.querySelector<HTMLImageElement>('.brand-mark')!.src = assetUrl(theme.branding.logo); document.querySelector('.brand-name')!.textContent = theme.branding.title; }
brand();
document.querySelector<HTMLImageElement>('.brand-mark')!.addEventListener('error', e => { (e.currentTarget as HTMLImageElement).hidden = true; });

function renderControls() {
  controls.innerHTML = Array.from({ length: playerCount }, (_, i) => `<button ${i === 0 ? 'id="thrust-button"' : ''} class="thrust-control racer-pad racer-${i}" data-racer="${i}" aria-label="${playerCount === 1 ? 'Activate thrust' : `${playerName(i)} thrust`}" hidden style="--identity:var(--player-${i + 1})"><span class="thrust-inner">${playerCount > 1 ? `<span class="pod-identity">P${i + 1} <span class="pod-rank"></span></span><span class="pod-name">${playerName(i)}</span>` : '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m13.5 2-8 12h6L10.5 22l8-12h-6z" fill="currentColor"/></svg>'}<strong class="pod-title">THRUST</strong><small ${i === 0 ? 'id="thrust-status"' : ''} class="pod-status">READY</small><span class="pod-lap">${playerCount > 1 ? `LAP 1/${lapCount} · ${keys[i].slice(3)}` : ''}</span></span></button>`).join('');
}
function clearRaceInput() { race?.clearCommands(); raceTouches.clear(); heldKeys.clear(); clock.reset(); }
function setPhase(next: Phase) {
  phase = next; playground.dataset.phase = phase; playground.dataset.players = String(playerCount); playground.dataset.tournament = String(!!activeTour);
  if (phase !== 'racing') audio.mix({ active: false, speed: 0, slip: 0, sand: 0 });
  if (['paused', 'welcome', 'drawing', 'diagnostics', 'error'].includes(phase)) audio.silence();
  hud.hidden = !['racing', 'countdown', 'paused'].includes(phase);
  controls.querySelectorAll<HTMLButtonElement>('.racer-pad').forEach(pad => { pad.hidden = !['ready', 'racing', 'countdown'].includes(phase); pad.disabled = phase === 'countdown'; });
  pauseButton.hidden = phase !== 'racing'; countdownElement.hidden = phase !== 'countdown'; diagnosticSection.hidden = phase !== 'diagnostics';
  raceProgress.hidden = !['racing', 'paused'].includes(phase); panel.hidden = ['racing', 'countdown', 'diagnostics'].includes(phase);
  labels.forEach(label => { label.hidden = playerCount === 1 || Number(label.dataset.car) >= playerCount || !['ready', 'countdown', 'racing', 'paused'].includes(phase); });
  world?.showStart(['welcome', 'drawing', 'preview'].includes(phase)); world?.setLayout(phase.startsWith('tour-') ? 'results' : phase);
  updateCircuitCaption(); renderPanel(); updateHud();
}
function renderPanel(message?: string) {
  const displayedCount = phase === 'setup' ? setupCount : playerCount;
  document.querySelector('#mode-label')!.textContent = displayedCount === 1 ? 'SOLO RACE' : `${displayedCount} PLAYER LOCAL RACE`;
  if (phase === 'welcome') panel.innerHTML = `<span class="eyebrow">A LITTLE PLANNING. A LOT OF RACING.</span><h1>${theme.branding.tagline.replace('. ', '.<br>')}</h1><p>Draw your racing line. Set the pace with your finger.<br class="desktop-break"> Then find the perfect moment to thrust.</p><div class="steps"><span><b>01</b> Draw a line</span><span><b>02</b> Time your thrust</span><span><b>03</b> Race together</span></div><div class="panel-actions"><button class="primary-button" data-action="play">Let's race ${arrow}</button><button class="text-button" data-action="friends">Race with friends</button></div><span class="welcome-note">SOLO OR 2–4 PLAYERS · ONE DEVICE · 1–6 LAPS</span>`;
  if (phase === 'welcome' && savedTour) panel.innerHTML += `<div class="resume-tour"><span>YOUR TOURNAMENT IS SAVED · ${savedTour.state.results.length}/${savedTour.state.rounds.length} RACES</span><button class="secondary-button" data-action="tour-resume">Resume tournament ↗</button><button class="text-button" data-action="tour-discard">Discard tournament</button></div>`;
  if (phase === 'setup') panel.innerHTML = raceSetupMarkup(preferences, setupCount, tourSetup);
  if (phase === 'tour-intro' && activeTour) panel.innerHTML = `<span class="eyebrow">TOURNAMENT · ROUND ${roundIndex + 1} / ${activeTour.state.rounds.length}</span><h2>${escapeHtml(activeTrack.name)}.</h2><p>${playerCount} drivers · ${lapCount} ${lapCount === 1 ? 'lap' : 'laps'}<br>Fresh lines. Same rivals. Every point counts.</p><div class="tour-route-strip">${activeTour.state.rounds.map((r, i) => `<span class="${i === roundIndex ? 'current' : i < roundIndex ? 'done' : ''}">${i + 1} · ${escapeHtml(findCircuit(r.circuitId).track.name)}</span>`).join('')}</div>${tourSaveFailed ? '<p class="save-status">Progress could not be saved on this browser. Keep this page open.</p>' : ''}<div class="panel-actions"><button class="primary-button" data-action="tour-draw">Draw your lines ↗</button><button class="text-button" data-action="home">Save and exit</button></div>`;
  if (phase === 'tour-exit') panel.innerHTML = `<span class="eyebrow">TOURNAMENT SAVED BETWEEN ROUNDS</span><h2>Take a pit stop?</h2><p>Completed points are kept. This unfinished race will need fresh lines when you return.</p><div class="panel-actions"><button class="primary-button" data-action="tour-continue">Keep playing ↗</button><button class="text-button" data-action="tour-save-exit">Save and exit</button></div>`;
  if (phase === 'tour-replace') panel.innerHTML = `<span class="eyebrow">A TOURNAMENT IS ALREADY SAVED</span><h2>Continue the rivalry?</h2><p>Resume your championship, or replace it with the new setup.</p><div class="panel-actions"><button class="primary-button" data-action="tour-resume">Resume tournament ↗</button><button class="text-button" data-action="tour-replace-confirm">Discard and start new</button><button class="text-button" data-action="tour-back-setup">Back</button></div>`;
  if (phase === 'tour-resume') panel.innerHTML = `<span class="eyebrow">DISCARD SAVED TOURNAMENT</span><h2>Start fresh?</h2><p>This removes the saved championship and its points.</p><div class="panel-actions"><button class="primary-button" data-action="tour-discard-confirm">Discard tournament</button><button class="text-button" data-action="tour-discard-cancel">Keep it</button></div>`;
  if (phase === 'handoff') panel.innerHTML = `<span class="eyebrow">${confirmedRoutes.length} OF ${playerCount} LINES LOCKED IN</span><h2>Pass to ${playerName(turn)}.</h2><p>The previous line is hidden. Draw your own plan, then take your place at the ${corners[turn]}.</p><div class="panel-actions"><button class="primary-button" data-action="take-turn">I'm ${playerName(turn)} ${arrow}</button><button class="text-button" data-action="home">Change mode</button></div>`;
  if (phase === 'drawing' || phase === 'preview') {
    const preview = phase === 'preview';
    const resetIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.4 7M4 4v6h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const setupIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    const flagIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m8 4 3 1v4L8 8zm6 2 3-1v4l-3 1zM8 8l3 1v4l-3-1zm6 2 3-1v4l-3 1z" fill="currentColor"/></svg>';
    panel.innerHTML = `<h2 class="sr-only">${preview ? 'Your line is ready.' : 'Draw your line.'}</h2>${playerCount > 1 ? `<span class="planning-driver" aria-label="${playerName(turn)}, player ${turn + 1} of ${playerCount}" title="${playerName(turn)}">${playerChip(turn)}</span>` : ''}<div class="panel-actions">${preview ? `<button class="planning-button primary-button" data-action="confirm" aria-label="${playerCount > 1 ? 'Lock in my line' : 'Race this line'}">${flagIcon}<span>${playerCount > 1 ? 'Lock in' : 'Race'}</span></button>` : ''}<button class="planning-button secondary-button" data-action="redraw" aria-label="${preview ? 'Redraw' : 'Start again'}">${resetIcon}<span>Redraw</span></button><button class="planning-button secondary-button" data-action="${activeTour ? 'home' : 'configure-race'}" aria-label="${activeTour ? 'Leave tournament' : 'Race setup'}">${setupIcon}<span>${activeTour ? 'Exit' : 'Setup'}</span></button></div>${message ? `<div class="planning-error instruction" role="alert">${escapeHtml(message)}</div>` : ''}`;
  }
  if (phase === 'ready') panel.innerHTML = `<span class="eyebrow">${playerCount} PLAYERS · ${lapCount} ${lapCount === 1 ? 'LAP' : 'LAPS'}</span><h2>Take your corner.</h2><p>Everyone tap their numbered pad to get ready.<br>Cars pass through each other for the first ${CONTACT_RULES.ghostStartSeconds} seconds.<br>Thrust recharges every five seconds. One tap, one burst.</p><div class="ready-summary" aria-live="polite">${readyPlayers.filter(Boolean).length} / ${playerCount} ready</div><div class="ready-actions"><button class="text-button" data-action="redraw-all">Draw new lines</button><button class="text-button" data-action="configure-race">Race setup</button></div>`;
  if (phase === 'paused') panel.innerHTML = `<span class="eyebrow">TAKE A BREATHER</span><h2>Ready when you are.</h2><p>${playerCount > 1 ? 'Everyone is paused together.' : 'Your race is paused.'} Pick up right where you left off.</p><div class="panel-actions"><button class="primary-button" data-action="resume">Resume ${arrow}</button><button class="text-button" data-action="retry">Restart race</button><button class="text-button" data-action="home">Change mode</button></div>`;
  if (phase === 'results' && activeTour) { world.setShowcasePaint(finishFor(activeTour.drivers[championshipStandings(activeTour.state)[0].player].paint).color); panel.innerHTML = tournamentResultsMarkup(activeTour, roundIndex) + (tourSaveFailed ? '<p class="save-status">Progress could not be saved. Keep this page open.</p>' : ''); return; }
  if (phase === 'results' && race) {
    if (playerCount === 1) {
      const s = race.racers[0].state, time = s.finishTime!, newBest = time <= (best ?? Infinity) + 0.0001;
      panel.innerHTML = `<span class="eyebrow">${playerName(0)} / ${lapCount} ${lapCount === 1 ? 'LAP' : 'LAPS'}</span><h2>${newBest ? 'Personal best.' : 'Race complete.'}</h2><div class="finish-time">${formatTime(time)}</div><div class="result-detail">${s.lapTimes.map((lap, index) => `<span>Lap ${index + 1} <b>${formatTime(lap)}</b></span>`).join('')}</div><div class="result-summary"><span>${s.thrustCount} thrust ${s.thrustCount === 1 ? 'burst' : 'bursts'}</span><span>Session best <b>${formatTime(best!)}</b></span></div><div class="panel-actions"><button class="primary-button" data-action="retry">Race again ${arrow}</button><button class="text-button" data-action="redraw">Draw a new line</button></div><button class="text-button" data-action="configure-race">Race setup</button>`;
    } else {
      const standings = race.standings(), winners = standings.filter(s => s.rank === 1);
      panel.innerHTML = `<span class="eyebrow">THE LINES HAVE SPOKEN</span><h2>${winners.length > 1 ? 'A shared victory.' : `${playerName(winners[0].player)} takes it.`}</h2><table class="standings"><caption class="sr-only">Finishing order and race times</caption><thead><tr><th>Place</th><th>Player</th><th>Time</th></tr></thead><tbody>${standings.map(s => `<tr><td>${s.rank}${standings.some(other => other.player !== s.player && other.rank === s.rank) ? '=' : ''}</td><th scope="row">${playerChip(s.player)} ${playerName(s.player)}</th><td>${formatTime(s.finishTime!)}<small class="standing-laps">${race!.racers[s.player].state.lapTimes.map((lap, index) => `L${index + 1} ${formatTime(lap)}`).join(' · ')}</small></td></tr>`).join('')}</tbody></table><div class="panel-actions"><button class="primary-button" data-action="retry">Rematch ${arrow}</button><button class="text-button" data-action="redraw-all">Draw new lines</button><button class="text-button" data-action="configure-race">Race setup</button></div>`;
    }
  }
  if (phase === 'error') panel.innerHTML = `<span class="eyebrow">A QUICK PIT STOP</span><h2>Let's get you racing.</h2><p>${message ?? 'The 3D circuit could not start. Try reloading in a current Safari or Chrome browser.'}</p><button class="primary-button" data-action="reload">Try again ${arrow}</button>`;
}

function newSession(count: number) {
  clearRaceInput(); playerCount = count; turn = 0; confirmedRoutes = []; readyPlayers = []; race = null;
  best = bestTimes.get(bestKey()) ?? null;
  renderControls(); world.setPlayers(count); applyDriverPresentation(); beginDrawing();
}
function beginDrawing() {
  clearRaceInput(); race = null; route = null; drawingTrim = undefined; stroke = []; drawingPointer = null;
  world.setPlanningPlayer(playerCount > 1 ? turn : null); world.showVehicles(-1, playerCount);
  world.vehicles.forEach(vehicle => vehicle.clearEffects());
  world.drawLine(null); world.showError(); world.vehicles[turn].update(startPose()); notice.textContent = ''; setPhase('drawing');
}
function usePractice(jumpBranch = false) {
  if (phase !== 'drawing') return;
  const result = compileRoute(createPracticeSamples(activeTrack, 7, jumpBranch), activeTrack);
  if (result.ok) { route = result.route; drawingTrim = result.drawing; world.drawLine(route, drawingTrim); world.showError(); setPhase('preview'); }
}
function confirmRoute() {
  if (!route) return;
  confirmedRoutes[turn] = route;
  if (playerCount === 1) { startRace(); return; }
  route = null; stroke = []; world.drawLine(null); notice.textContent = '';
  if (turn + 1 < playerCount) { turn++; world.showVehicles(-1, playerCount); setPhase('handoff'); }
  else enterReady();
}
function enterReady() {
  clearRaceInput(); race = null; readyPlayers = Array(playerCount).fill(false); previousPoses = [];
  world.showVehicles(null, playerCount); world.drawRaceLines(confirmedRoutes); setPhase('ready'); updateVehicles(1);
}
function startRace(resume = false) {
  if (confirmedRoutes.length !== playerCount) return;
  if (!resume) { race = new LocalRace(confirmedRoutes, activeTrack, lapCount, activeTour ? roundIndex % playerCount : 0); previousPoses = []; rechargeAnnounced = Array(playerCount).fill(true); world.vehicles.forEach(vehicle => vehicle.clearEffects()); }
  clearRaceInput(); resuming = resume; countdownRemaining = 3; countdownBeat = 3;
  world.showVehicles(null, playerCount); world.drawRaceLines(confirmedRoutes);
  setPhase('countdown'); updateVehicles(1); audio.cue('countdown');
}
function pauseRace() { if (phase !== 'racing' && phase !== 'countdown') return; clearRaceInput(); setPhase('paused'); }
function goHome(force = false) {
  if (activeTour && activeTour.state.results.length < activeTour.state.rounds.length && !force) { exitReturn = phase === 'racing' || phase === 'countdown' ? 'paused' : phase; cancelStroke(); clearRaceInput(); persistTour(); setPhase('tour-exit'); return; }
  if (activeTour && activeTour.state.results.length === activeTour.state.rounds.length) { savedTour = null; discardTournament(); }
  activeTour = null;
  cancelStroke(); clearRaceInput(); playerCount = 1; turn = 0; route = null; race = null; confirmedRoutes = []; readyPlayers = [];
  renderControls(); world.setPlayers(1); applyDriverPresentation(); world.setPlanningPlayer(null); world.drawLine(null); world.showError(); world.vehicle.update(startPose()); notice.textContent = ''; setPhase('welcome');
}
function activate(player: number) {
  if (phase === 'ready') { readyPlayers[player] = true; renderPanel(); updateHud(); if (readyPlayers.every(Boolean)) { if (!audio.muted) audio.unlock(); startRace(); } }
  else if (phase === 'racing') race?.pressThrust(player);
}
function showNotice(message: string, seconds = 1.7) { notice.textContent = message; noticeUntil = performance.now() + seconds * 1000; }
function updateHud() {
  const standings = race?.standings() ?? [], first = race?.racers[0].state;
  if (first && race) {
    const ghost = phase === 'racing' && race.ghostStartRemaining > 0;
    const leader = race.racers[standings[0].player].state;
    hud.dataset.round = activeTour ? `ROUND ${roundIndex + 1}/${activeTour.state.rounds.length} · ${activeTrack.name.toUpperCase()}` : '';
    document.querySelector('#race-time')!.textContent = formatTime(playerCount === 1 ? first.finishTime ?? first.time : race.time);
    document.querySelector('#lap-label')!.textContent = playerCount === 1 ? 'LAP' : 'LEADER LAP'; document.querySelector('#race-lap')!.innerHTML = `${leader.lap} <i>/ ${lapCount}</i>`;
    document.querySelector('#pace-label')!.textContent = ghost ? 'GHOST START' : playerCount === 1 ? first.surface === 'sand' ? 'SAND' : first.drifting ? 'DRIFT' : 'PACE' : 'FINISHED';
    document.querySelector('#race-speed')!.innerHTML = ghost ? `${Math.ceil(race.ghostStartRemaining)} <i>s</i>` : playerCount === 1 ? `${Math.round(first.speed * 3.6)} <i>km/h</i>` : `${standings.filter(s => s.finished).length} <i>/ ${playerCount}</i>`;
    raceProgress.querySelector<HTMLElement>('span')!.style.width = `${standings[0].progress / (activeTrack.length * lapCount) * 100}%`;
  }
  controls.querySelectorAll<HTMLButtonElement>('.racer-pad').forEach((pad, i) => {
    const s = race?.racers[i].state, remaining = s ? Math.max(0, s.thrustReadyAt - s.time) : 0;
    const recovering = !!s && (s.time < s.recoveringUntil || s.recoveryWaiting);
    pad.disabled = phase === 'countdown' || (phase === 'racing' && (!!s?.finished || recovering));
    pad.style.setProperty('--charge', `${clamp(1 - remaining / RULES.thrustRecharge, 0, 1) * 360}deg`);
    pad.dataset.ready = String(phase === 'ready' ? readyPlayers[i] : remaining < 0.001); pad.dataset.firing = String(phase === 'racing' && !!s && s.time < s.thrustUntil);
    pad.querySelector('.pod-title')!.textContent = phase === 'ready' ? readyPlayers[i] ? 'READY ✓' : 'TAP READY' : recovering ? 'RECOVERING' : s?.finished ? 'FINISHED' : 'THRUST';
    pad.querySelector('.pod-status')!.textContent = phase === 'ready' ? readyPlayers[i] ? 'WAIT FOR FRIENDS' : driverName(i) : s?.finished ? formatTime(s.finishTime!) : remaining < 0.001 ? 'READY' : `${remaining.toFixed(1)}s`;
    if (playerCount > 1) { pad.querySelector('.pod-rank')!.textContent = s ? `#${standings.find(item => item.player === i)!.rank}` : ''; pad.querySelector('.pod-lap')!.textContent = `${s && !s.finished ? s.surface === 'sand' ? 'SAND · ' : s.drifting ? 'DRIFT · ' : '' : ''}LAP ${s?.lap ?? 1}/${lapCount} · ${keys[i].slice(3)}`; }
  });
}
function updateVehicles(alpha: number) {
  confirmedRoutes.forEach((line, i) => {
    const s = race?.racers[i].state, previous = previousPoses[i];
    const pose = s ? {
      x: previous && !s.finished ? lerp(previous.x, s.position.x, alpha) : s.position.x,
      z: previous && !s.finished ? lerp(previous.z, s.position.z, alpha) : s.position.z,
      y: previous && !s.finished ? lerp(previous.y, s.elevation, alpha) : s.elevation,
      airborne: s.movement === 'airborne',
      shadowY: supported(s.position, activeTrack) ? 0 : FLIGHT_RULES.waterHeight,
      pitch: s.movement === 'airborne' ? Math.atan2(s.verticalVelocity, Math.max(1, s.speed)) : (() => { const j = rampAt(s.position, activeTrack); return j ? Math.atan(j.lipHeight / j.rampLength) * (Math.sin(s.heading) * j.forward.x + Math.cos(s.heading) * j.forward.z) : 0; })(),
      heading: previous && !s.finished ? previous.heading + angleDelta(previous.heading, s.heading) * alpha : s.heading,
    } : playerCount > 1 ? gridPose(activeTrack, (i + (activeTour ? roundIndex % playerCount : 0)) % playerCount) : sampleRoute(line, 0);
    const absent = !!s && (playerCount > 1 && s.finished || s.time < s.recoveringUntil || s.recoveryWaiting);
    world.vehicles[i].setEnabled(!absent); if (playerCount > 1) labels[i].hidden = absent;
    world.vehicles[i].update(pose, s?.finished ? 0 : s?.speed, !!s && !s.finished && s.time < s.thrustUntil, s?.time, s?.sandAmount, s?.drifting, s?.steeringRate, s?.acceleration);
    if (playerCount > 1) { const point = world.project(pose); labels[i].style.left = `${point.x + (i - (playerCount - 1) / 2) * 13}px`; labels[i].style.top = `${point.y - 17 - i % 2 * 13}px`; }
  });
}

app.addEventListener('click', e => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]'), action = target?.dataset.action;
  if (action === 'play') { setupCount = 1; applyDriverPresentation(); setPhase('setup'); }
  if (action === 'friends') { setupCount = 2; applyDriverPresentation(); setPhase('setup'); }
  if (action === 'circuit' && phase === 'setup') selectCircuit(target!.dataset.circuit!);
  if (action === 'format-single') { tourSetup.enabled = false; refreshSetup(); }
  if (action === 'format-tournament') { tourSetup.enabled = true; refreshSetup(); }
  if (action === 'tour-full' || action === 'tour-custom') { tourSetup.custom = action === 'tour-custom'; refreshSetup(); }
  if (action === 'round-up' || action === 'round-down') {
    const index = Number(target!.dataset.round), to = index + (action === 'round-up' ? -1 : 1);
    if (to >= 0 && to < tourSetup.schedule.length) { [tourSetup.schedule[index], tourSetup.schedule[to]] = [tourSetup.schedule[to], tourSetup.schedule[index]]; refreshSetup(`[data-round="${to}"][data-action="${action}"]`); }
  }
  if (action === 'tour-draw' && activeTour) newSession(activeTour.state.playerCount);
  if (action === 'tour-next' && activeTour && activeTour.state.results.length > roundIndex) beginTourRound();
  if (action === 'tour-resume') resumeTournament();
  if (action === 'tour-again' && activeTour) { activeTour = { ...activeTour, state: createTournament(activeTour.state.rounds, activeTour.state.playerCount, activeTour.state.laps) }; persistTour(); beginTourRound(); }
  if (action === 'tour-discard') setPhase('tour-resume');
  if (action === 'tour-discard-cancel') setPhase('welcome');
  if (action === 'tour-discard-confirm') { savedTour = null; discardTournament(); setPhase('welcome'); }
  if (action === 'tour-save-exit') { persistTour(); goHome(true); }
  if (action === 'tour-continue') setPhase(exitReturn);
  if (action === 'tour-replace-confirm') { discardTournament(); savedTour = null; startTournament(); }
  if (action === 'tour-back-setup') setPhase('setup');
  if (action === 'player-count'  && phase === 'setup') { setupCount = Number(target!.dataset.count); refreshSetup(`[data-count="${setupCount}"]`); }
  if (action === 'lap-count' && phase === 'setup') { lapCount = Number(target!.dataset.laps); saveSettings(); refreshSetup(`[data-laps="${lapCount}"]`); }
  if (action === 'driver-paint' && phase === 'setup') {
    const index = Number(target!.dataset.driver); preferences.drivers[index].paint = finishFor(target!.dataset.paint!).id;
    saveSettings(); applyDriverPresentation(); refreshSetup(`[data-driver="${index}"][data-paint="${preferences.drivers[index].paint}"]`);
    world.setShowcasePaint(finishFor(preferences.drivers[index].paint).color);
  }
  if (action === 'start-session') { preferences.drivers.forEach((driver, i) => driver.name = cleanDriverName(driver.name, i)); saveSettings(); if (setupCount > 1 && tourSetup.enabled) { if (savedTour) setPhase('tour-replace'); else startTournament(); } else newSession(setupCount); }
  if (action === 'take-turn' && phase === 'handoff') beginDrawing();
  if (action === 'home') goHome();
  if (action === 'configure-race') { const count = playerCount; goHome(); setupCount = count; setPhase('setup'); }
  if (action === 'redraw') { if (phase === 'results') newSession(playerCount); else beginDrawing(); }
  if (action === 'redraw-all') newSession(playerCount);
  if (action === 'confirm' && phase === 'preview') { if (!audio.muted) audio.unlock(); confirmRoute(); }
  if (action === 'retry') { if (!audio.muted) audio.unlock(); if (playerCount > 1) enterReady(); else startRace(); }
  if (action === 'pause') pauseRace(); if (action === 'resume') { if (!audio.muted) audio.unlock(); startRace(true); } if (action === 'reload') location.reload();
  if (action === 'diagnostics') { if (phase === 'racing' || phase === 'countdown') pauseRace(); cancelStroke(); clearRaceInput(); returnPhase = phase; ownership.clear(); setPhase('diagnostics'); updateDiagnostics(); }
  if (action === 'exit-diagnostics') { ownership.clear(); setPhase(returnPhase); }
  if (action === 'reset-diagnostics') { ownership.clear(); ownership = new PointerOwnership(); updateDiagnostics(); }
});

panel.addEventListener('input', event => {
  const input = event.target as HTMLInputElement;
  if (phase !== 'setup' || !input.matches('[data-driver-name]')) return;
  preferences.drivers[Number(input.dataset.driverName)].name = input.value;
  saveSettings();
});
panel.addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  if (phase === 'setup' && input.matches('[data-schedule-count]')) { const n = Math.max(2, Math.min(12, Number(input.value))); tourSetup.schedule = Array.from({ length: n }, (_, i) => tourSetup.schedule[i] ?? circuits[i % circuits.length].id); refreshSetup('[data-schedule-count]'); return; }
  if (phase === 'setup' && input.matches('[data-schedule-index]')) { tourSetup.schedule[Number(input.dataset.scheduleIndex)] = findCircuit(input.value).id; return; }
  if (phase !== 'setup' || !input.matches('[data-driver-name]')) return;
  const index = Number(input.dataset.driverName);
  input.value = preferences.drivers[index].name = cleanDriverName(input.value, index); saveSettings();
});
document.querySelector('#sound-button')!.addEventListener('click', () => {
  audio.toggle(); const button = document.querySelector<HTMLButtonElement>('#sound-button')!;
  button.classList.toggle('sound-on', !audio.muted); button.setAttribute('aria-label', `Turn sound ${audio.muted ? 'on' : 'off'}`); button.setAttribute('aria-pressed', String(!audio.muted));
  button.querySelector('.sound-label')!.textContent = audio.muted ? 'Sound off' : 'Sound on';
  if (!audio.muted) audio.cue('ready'); else if (!audio.getStatus().available) showNotice('Sound is unavailable in this browser. You can still race.');
});
function appendSample(event: PointerEvent) {
  const point = world.groundPoint(event.clientX, event.clientY); if (!point) return;
  const sample = { ...point, time: event.timeStamp }; if (!stroke.length || distance(sample, stroke[stroke.length - 1]) > 0.1) stroke.push(sample);
}
canvas.addEventListener('pointerdown', e => {
  if (phase !== 'drawing' || drawingPointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const point = world.groundPoint(e.clientX, e.clientY);
  if (!point || !canStartDrawing(point, activeTrack)) { world.showError(activeTrack.start); renderPanel('Start anywhere across the line or up to 12 metres behind it.'); return; }
  e.preventDefault(); drawingPointer = e.pointerId; stroke = []; world.showError(); canvas.setPointerCapture(e.pointerId); appendSample(e);
});
canvas.addEventListener('pointermove', e => {
  if (phase !== 'drawing' || drawingPointer !== e.pointerId) return;
  e.preventDefault(); const events = e.getCoalescedEvents?.() ?? []; for (const p of events.length ? events : [e]) appendSample(p); world.drawLine(stroke);
});
canvas.addEventListener('pointerup', e => {
  if (drawingPointer !== e.pointerId || phase !== 'drawing') return;
  appendSample(e); drawingPointer = null; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  const result = compileRoute(stroke, activeTrack);
  if (result.ok) { route = result.route; drawingTrim = result.drawing; world.drawLine(route, drawingTrim); world.showError(); setPhase('preview'); } else { world.showError(result.point, result.section); renderPanel(result.message); }
});
function cancelStroke() { if (drawingPointer === null) return; drawingPointer = null; stroke = []; world.drawLine(null); if (phase === 'drawing') renderPanel('That drawing was interrupted. Start a fresh lap at the start line.'); }
canvas.addEventListener('pointercancel', cancelStroke); canvas.addEventListener('lostpointercapture', cancelStroke);
controls.addEventListener('pointerdown', e => {
  const pad = (e.target as HTMLElement).closest<HTMLButtonElement>('.racer-pad');
  if (!pad || !['ready', 'racing'].includes(phase) || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); if (raceTouches.down(e.pointerId, Number(pad.dataset.racer))) { pad.setPointerCapture(e.pointerId); activate(Number(pad.dataset.racer)); }
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) controls.addEventListener(name, e => { raceTouches.up((e as PointerEvent).pointerId, name !== 'pointerup'); });
// Assistive technologies may activate a button without pointer events.
controls.addEventListener('click', e => { const pad = (e.target as HTMLElement).closest<HTMLElement>('.racer-pad'); if (pad && e.detail === 0) activate(Number(pad.dataset.racer)); });
window.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) {
    if (e.code === 'Enter') (e.target as HTMLElement).blur();
    return;
  }
  let player = playerCount === 1 && e.code === 'Space' ? 0 : playerCount > 1 ? keys.indexOf(e.code) : -1;
  if ((e.code === 'Space' || e.code === 'Enter') && document.activeElement?.matches('.racer-pad')) player = Number((document.activeElement as HTMLElement).dataset.racer);
  if (player >= 0 && player < playerCount && ['ready', 'racing', 'countdown'].includes(phase)) { e.preventDefault(); if (!heldKeys.has(e.code) && !e.repeat) activate(player); heldKeys.add(e.code); }
  if (e.code === 'Escape') pauseRace();
  if (import.meta.env.DEV && e.code === 'KeyT' && !e.repeat) {
    theme = theme.id === 'coastal' ? themes.graphite : themes.coastal; applyTheme(theme); brand(); world.setTheme(theme); applyDriverPresentation();
    if (['ready', 'countdown', 'racing', 'paused', 'results'].includes(phase) && confirmedRoutes.length === playerCount) world.drawRaceLines(confirmedRoutes);
    else world.drawLine(route ?? (phase === 'drawing' && stroke.length ? stroke : null), route ? drawingTrim : undefined); renderPanel(); updateHud();
  }
});
window.addEventListener('keyup', e => { heldKeys.delete(e.code); });
function interrupt() {
  audio.silence(); pauseRace(); clearRaceInput(); ownership.clear(); updateDiagnostics(); cancelStroke();
  if (phase === 'ready') { readyPlayers.fill(false); renderPanel(); updateHud(); }
}
window.addEventListener('blur', interrupt); document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
let previousLandscape = innerWidth >= innerHeight;
window.addEventListener('resize', () => { world?.resize(); const landscape = innerWidth >= innerHeight; if (landscape !== previousLandscape) interrupt(); previousLandscape = landscape; });
function updateDiagnostics() {
  document.querySelectorAll<HTMLButtonElement>('.diagnostic-pad').forEach((pad, i) => {
    pad.dataset.active = String(ownership.active(i) > 0); pad.querySelector('.pad-status')!.textContent = ownership.active(i) ? `${ownership.active(i)} TOUCH${ownership.active(i) > 1 ? 'ES' : ''} HELD` : 'READY';
    pad.querySelector('.pad-count')!.textContent = String(ownership.activations[i]); pad.querySelector('.pad-cancel')!.textContent = String(ownership.cancellations[i]);
  });
}
document.querySelectorAll<HTMLButtonElement>('.diagnostic-pad').forEach(pad => {
  pad.addEventListener('pointerdown', e => { e.preventDefault(); if (phase === 'diagnostics' && ownership.down(e.pointerId, Number(pad.dataset.player))) { pad.setPointerCapture(e.pointerId); updateDiagnostics(); } });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(name, e => { ownership.up((e as PointerEvent).pointerId, name !== 'pointerup'); updateDiagnostics(); });
});

try {
  world = new GameScene(canvas, activeTrack, theme, activeCircuit.scenery); applyDriverPresentation(); renderControls(); setPhase('welcome');
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); pauseRace(); showNotice('The graphics were interrupted. Reload if the circuit does not recover.', 10); });
  world.engine.runRenderLoop(() => {
    const now = performance.now(), elapsed = (now - lastFrame) / 1000; lastFrame = now;
    if (phase === 'racing' && elapsed > 0.5) pauseRace();
    if (phase === 'countdown') {
      countdownRemaining -= Math.min(elapsed, 0.1); document.querySelector('#countdown-value')!.textContent = String(Math.max(1, Math.ceil(countdownRemaining)));
      const beat = Math.ceil(countdownRemaining); if (beat > 0 && beat !== countdownBeat) { countdownBeat = beat; audio.cue('countdown'); }
      document.querySelector('#countdown-label')!.textContent = resuming ? 'BACK TO YOUR LINE.' : playerCount > 1 ? 'YOUR LINES. ONE MOMENT.' : 'YOUR LINE. YOUR MOMENT.';
      if (countdownRemaining <= 0) { clock.reset(); setPhase('racing'); audio.cue('start'); }
    }
    if (phase === 'racing' && race) {
      const session = race;
      const alpha = clock.advance(elapsed, () => { previousPoses = session.racers.map(racer => ({ ...racer.state.position, heading: racer.state.heading, y: racer.state.elevation })); session.step(); });
      for (const event of session.drainEvents()) {
        audio.cue(event.type, event.intensity); if (event.type === 'thrust') rechargeAnnounced[event.player] = false; const prefix = playerCount > 1 ? `${driverName(event.player)} · ` : '';
        if ((event.type === 'landing' || event.type === 'splash') && event.point) world.feedback(event.point, event.type === 'splash');
        if (event.type === 'landing') world.vehicles[event.player].impact(event.time);
        if (event.type === 'car-impact') { world.vehicles[event.player].impact(event.time); world.vehicles[event.otherPlayer!].impact(event.time); }
        if (event.type === 'collision') { world.vehicles[event.player].impact(event.time); showNotice(`${prefix}Barrier contact`); }
        if (event.type === 'recovery') { previousPoses[event.player] = { ...session.racers[event.player].state.position, heading: session.racers[event.player].state.heading, y: session.racers[event.player].state.elevation }; showNotice(`${prefix}Recovering`); }
        if (event.type === 'lap') showNotice(`${prefix}${session.racers[event.player].state.lap === lapCount ? 'Final lap' : `Lap ${session.racers[event.player].state.lap} / ${lapCount}`}`);
        if (event.type === 'finish' && playerCount > 1) showNotice(`${driverName(event.player)} finished · ${formatTime(event.time)}`);
      }
      updateVehicles(alpha); updateHud();
      const moving = session.racers.map(racer => racer.state).filter(s => !s.finished);
      audio.mix({ active: true, speed: Math.max(0, ...moving.map(s => s.speed)), slip: Math.max(0, ...moving.map(s => s.drifting ? clamp(Math.abs(s.slipAngle) * 2, 0.1, 1) : 0)), sand: Math.max(0, ...moving.map(s => s.sandAmount)) });
      session.racers.forEach((racer, i) => { if (!rechargeAnnounced[i] && !racer.state.finished && racer.state.time >= racer.state.thrustReadyAt) { rechargeAnnounced[i] = true; audio.cue('ready'); } });
      if (session.finished) { if (activeTour && activeTour.state.results.length === roundIndex) { activeTour.state = finalizeRound(activeTour.state, roundIndex, { circuitId: activeTrack.id, trackVersion: activeTrack.version }, session.standings().map(r => ({ player: r.player, rank: r.rank, finishTime: r.finishTime! }))); persistTour(); } if (playerCount === 1) { best = Math.min(best ?? Infinity, session.racers[0].state.finishTime!); bestTimes.set(bestKey(), best); } world.setShowcasePaint(finishFor(preferences.drivers[session.standings()[0].player].paint).color); notice.textContent = ''; clearRaceInput(); setPhase('results'); }
    } else if (phase === 'ready' || phase === 'countdown' || phase === 'paused') updateVehicles(1);
    if (now > noticeUntil) notice.textContent = ''; world.render(now / 1000);
  });
  if (import.meta.env.DEV) Object.assign(window, { __roadster: {
    // Fixture only: normal play has no practice-line shortcut. A future tutorial can reuse the compiler fixture.
    usePracticeLine: usePractice,
    getState: () => ({ phase, tournament: activeTour ? structuredClone(activeTour.state) : null, roundIndex, contactCount: race?.contactCount ?? 0, circuitId: activeCircuit.id, theme: theme.id, playerCount, lapCount, drivers: preferences.drivers.map((driver, i) => ({ name: driverName(i), paint: driver.paint, color: finishFor(driver.paint).color })), turn, confirmedCount: confirmedRoutes.length, readyPlayers: [...readyPlayers], visibleRouteCount: world.visibleRouteCount, route: route ? { length: route.length, drawingDuration: route.drawingDuration, joined: drawingTrim?.joined ?? false, leadInCount: drawingTrim?.leadIn.length ?? 0, tailCount: drawingTrim?.tail.length ?? 0, cleanup: route.cleanup ? { ...route.cleanup } : null } : null, race: race ? { ...race.racers[0].state } : null, best,
      players: race?.racers.map(racer => ({ ...racer.state })) ?? [], standings: race?.standings() ?? [], ghostStartRemaining: race?.ghostStartRemaining ?? 0,
      renderedPlayers: world.vehicles.slice(0, playerCount).map(vehicle => ({ x: vehicle.root.position.x, y: vehicle.root.position.y, z: vehicle.root.position.z, heading: vehicle.root.rotation.y })),
      raceInputs: { activations: [...raceTouches.activations], cancellations: [...raceTouches.cancellations], active: [0, 1, 2, 3].map(i => raceTouches.active(i)) },
      inputs: { activations: [...ownership.activations], cancellations: [...ownership.cancellations], active: [0, 1, 2, 3].map(i => ownership.active(i)) } }),
    getAudio: () => audio.getStatus(),
    getShowcaseProjection: () => world.showcaseProjection,
    inspectVehicle: (view: 'front' | 'side' | 'rear') => world.inspectVehicle(view),
    getGraphics: () => ({ circuitId: activeCircuit.id, engineScenes: world.engine.scenes.length, ...world.depthFeatures, roadVisible: !!world.scene.getMeshByName('asphalt') && world.scene.getActiveMeshes().contains(world.scene.getMeshByName('asphalt')!), vaporParticles: world.vehicles.map(v => v.vapor.liveCount), meshes: world.scene.meshes.length, activeMeshes: world.scene.getActiveMeshes().length, drawCalls: world.drawCalls, fps: world.engine.getFps(), textures: world.scene.textures.length, hardwareScaling: world.engine.getHardwareScalingLevel() }),
    project: (point: { x: number; z: number }) => world.project(point), getTrack: () => ({ ...activeTrack, centerline: activeTrack.centerline.map(p => ({ ...p })) }),
    getRawStroke: () => structuredClone(stroke),
    getRoute: () => route ? structuredClone(route) : null,
    getProjectionError: () => { const p = world.project(activeTrack.start), ground = world.groundPoint(p.x, p.y); return ground ? distance(ground, activeTrack.start) : Infinity; },
  } });
} catch (error) { console.error(error); canvas.hidden = true; setPhase('error'); renderPanel(error instanceof Error ? error.message : undefined); }
