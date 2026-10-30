import { rampAt, supported, groundHeight, FLIGHT_RULES } from './core/support';
import{snowSurfaceHeight}from'./presentation/surface-height';
import { CPU_DRIVERS, humanCount, racerCount, controllerFor, type SessionOptions } from './core/session';
import { computerRoute, stepComputers } from './core/computer';
import { LapRecorder, lapRecordKey, replayPose, type LapRecord } from './core/lap-replay';
import { loadLap, saveLap } from './presentation/lap-storage';
import './style.css';
import { roadGrade, supportBelow } from './core/elevation';
import { angleDelta, clamp, distance, lerp } from './core/geometry';
import { LocalRace, startingGrid } from './core/local-race';
import { compileRoute, createPracticeSamples, sampleRoute, COMPILER_VERSION } from './core/route';
import { createTournament, finalizeRound, championshipStandings } from './core/tournament';
import { incompatibleTournament, loadTournament, storeTournament, discardTournament, type SavedTournament } from './presentation/tournament-storage';
import type { TourSetup } from './presentation/tournament-ui';
import { FixedStepClock, RULES } from './core/simulation';
import { CONTACT_RULES } from './core/vehicle-contact';
import { assetUrl } from './presentation/urls';
import { circuits, findCircuit } from './content/circuits';
import { canStartDrawing } from './core/start-finish';
import type { Ability, CompiledRoute, DrawSample, DrawingTrim } from './core/types';
import { PointerOwnership } from './input/ownership';
import { InputRouter } from './input/router';
import { appShellMarkup } from './app/shell';
import { modeLabel, phaseLayout, type Phase } from './app/phases';
import { arrivesHome, nextHero } from './app/hero';
import { installDevApi } from './app/dev-api';
import { uiScale } from './app/ui-scale';
import { installZoomGuard } from './app/zoom-guard';
import { formatTime } from './ui/format';
import { renderHud } from './ui/hud';
import { abilityControlsMarkup } from './ui/controls';
import { welcomePanel } from './ui/panels/welcome';
import { tourDiscardPanel, tourExitPanel, tourIntroPanel, tourReplacePanel, tournamentResultsMarkup } from './ui/panels/tournament';
import { settingsPanel } from './ui/panels/settings';
import { handoffPanel, planningPanel } from './ui/panels/planning';
import { errorPanel, pausedPanel, readyPanel } from './ui/panels/race';
import { raceResultsPanel, timeTrialResultsPanel } from './ui/panels/results';
import { TUTORIAL_COPY, tutorialCoach, tutorialCompletePanel, tutorialIntroPanel, type CoachStep } from './ui/panels/tutorial';
import { TUTORIAL_CIRCUIT, TUTORIAL_LAPS, answerPrompt, duePrompt, freshTutorial, type TutorialProgress } from './app/tutorial';
import { GameAudio } from './presentation/audio';
import { GameScene } from './presentation/scene';
import { applyPlayerColors, applyTheme, themes, hopEffects, heroImages, heroArtRevision } from './presentation/themes';
import { cleanDriverName, escapeHtml, finishFor, loadPreferences, savePreferences } from './presentation/race-settings';
import { raceSetupMarkup } from './presentation/race-setup';
import { isGraphicsChoice, isRendererChoice, loadGraphicsPreference, saveGraphicsPreference, type RendererChoice } from './presentation/graphics';
import { createEngine } from './presentation/engine';

const app = document.querySelector<HTMLDivElement>('#app')!;
let theme = new URLSearchParams(location.search).get('theme') === 'graphite' ? themes.graphite : themes.coastal;
applyTheme(theme);
app.innerHTML = appShellMarkup();

const playground = app.querySelector<HTMLElement>('.playground')!;
const coarsePointer = matchMedia('(pointer: coarse)');
/** Larger touch screens get proportionally larger controls; the course rectangle follows via CSS. */
function applyUiScale() { const scale = uiScale(innerWidth, innerHeight, coarsePointer.matches); playground.style.setProperty('--ui-scale', String(scale)); }
applyUiScale(); installZoomGuard();
const canvas = document.querySelector<HTMLCanvasElement>('#race-canvas')!;
const panel = document.querySelector<HTMLElement>('#panel')!, hud = document.querySelector<HTMLElement>('.race-hud')!;
const countdownElement = document.querySelector<HTMLElement>('.countdown')!, controls = document.querySelector<HTMLElement>('#race-controls')!;
const pauseButton = document.querySelector<HTMLButtonElement>('.pause-button')!, notice = document.querySelector<HTMLElement>('.race-notice')!;
const diagnosticSection = document.querySelector<HTMLElement>('#diagnostics')!, raceProgress = document.querySelector<HTMLElement>('.race-progress')!;
const labels = [...document.querySelectorAll<HTMLElement>('.vehicle-label')];
const coach = document.querySelector<HTMLElement>('.tutorial-coach')!;
const settingsDialog = document.querySelector<HTMLDialogElement>('#settings')!;
const heroPicture = document.querySelector<HTMLElement>('.home-hero')!, heroImage = heroPicture.querySelector('img')!, heroSource = heroPicture.querySelector('source')!;
const audio = new GameAudio();
// Browser autoplay unlock must happen synchronously in a real user gesture.
for (const event of ['pointerdown', 'keydown'] as const) {
  document.addEventListener(event, () => { if (!audio.muted) { audio.setMenuMusic(phaseLayout(phase).menuMusic); audio.unlock(); } }, { capture: true });
}
let ownership = new PointerOwnership();
let phase: Phase = 'welcome', returnPhase: Phase = 'welcome', route: CompiledRoute | null = null, race: LocalRace | null = null;
let playerCount = 1, setupCount = 2, turn = 0, confirmedRoutes: CompiledRoute[] = [], readyPlayers: boolean[] = [];
const preferences = loadPreferences();
const graphicsPreference = loadGraphicsPreference();
let graphicsChoice = graphicsPreference.choice;
/** The backend actually running (WebGPU falls back to WebGL 2 when unavailable). */
let activeRenderer: RendererChoice = 'webgl2';
const sessionOptions:SessionOptions={mode:'solo-race',difficulty:'normal',seed:1};
const humans=()=>humanCount(sessionOptions.mode,playerCount);
let recorder:LapRecorder|null=null, personalLap:LapRecord|null=null, activeGhost:LapRecord|null=null;
let lapLoad=0;
/** Guided tutorial progress, and the circuit/laps to restore when it ends. Null outside the tutorial. */
let tutorial: TutorialProgress | null = null, tutorialReturn: { circuitId: string; laps: number } | null = null;
function refreshLap(){const id=++lapLoad,key=lapRecordKey(activeTrack);personalLap=null;activeGhost=null;world?.setGhost(null);void loadLap(key).then(record=>{if(id===lapLoad){personalLap=record;if(phase==='setup')refreshSetup();}});}
const tourSetup: TourSetup = { enabled: false, custom: false, schedule: circuits.map(c => c.id) };
let savedTour = loadTournament(), activeTour: SavedTournament | null = null, roundIndex = 0;
let exitReturn: Phase = 'welcome', tourSaveFailed = false;
const circuitQuery = new URLSearchParams(location.search);
let activeCircuit = findCircuit(circuitQuery.has('circuit') ? circuitQuery.get('circuit') : preferences.circuitId);
let activeTrack = activeCircuit.track;
audio.setVenue(activeCircuit.scenery);
preferences.circuitId = activeCircuit.id;
const startPose = () => ({ ...activeTrack.start, heading: Math.atan2(activeTrack.centerline[1].x - activeTrack.start.x, activeTrack.centerline[1].z - activeTrack.start.z) });
let lapCount = preferences.laps;
const bestTimes = new Map<string, number>();
const bestKey = () => `${activeTrack.id}:${activeTrack.version}:${lapCount}:${RULES.version}:${COMPILER_VERSION}`;
let drawingTrim: DrawingTrim | undefined;
let stroke: DrawSample[] = [], drawingPointer: number | null = null;
let drawingDirty = false;
let countdownRemaining = 0, resuming = false, best: number | null = null, previousPoses: { x: number; z: number; heading: number; y: number }[] = [], noticeUntil = 0, lastFrame = performance.now();
let pauseReason='';
/** Preview heads-up about stretches of the line the car cannot drive (it crashes there and is reset). */
let planningNote: string | undefined;
let countdownBeat = 3, rechargeAnnounced: boolean[] = [];
let world: GameScene;
let previewGrid: { routes: CompiledRoute[]; track: typeof activeTrack; rotation: number; poses: ReturnType<typeof startingGrid> } | null = null;
const clock = new FixedStepClock();
// Thrust/hop pads and keys. Drawing input stays on the canvas handlers below.
const input = new InputRouter(controls, {
  humans, padsActive: () => ['ready', 'racing', 'coaching'].includes(phase), keysActive: () => ['ready', 'racing', 'countdown', 'coaching'].includes(phase),
  activate, pause: () => pauseRace(),
  extraKey: e => {
    if (import.meta.env.DEV && e.code === 'KeyT' && !e.repeat) {
      theme = theme.id === 'coastal' ? themes.graphite : themes.coastal; applyTheme(theme); brand(); world.setTheme(theme); applyDriverPresentation();
      if (['ready', 'countdown', 'racing', 'paused', 'results'].includes(phase) && confirmedRoutes.length === playerCount) world.drawRaceLines(sessionOptions.mode==='solo-race'?confirmedRoutes.slice(0,1):confirmedRoutes);
      else world.drawLine(route ?? (phase === 'drawing' && stroke.length ? stroke : null), route ? drawingTrim : undefined); renderPanel(); updateHud();
    }
  },
});
const driverName=(i:number)=>activeTour?.drivers[i]?activeTour.drivers[i].name:sessionOptions.mode==='solo-race'&&i>0?CPU_DRIVERS[i-1].name:cleanDriverName(preferences.drivers[i].name,i);
const driverPaint=(i:number)=>activeTour?.drivers[i]?activeTour.drivers[i].paint:sessionOptions.mode==='solo-race'&&i>0?CPU_DRIVERS[i-1].paint:preferences.drivers[i].paint;
const cpuTag=(i:number)=>sessionOptions.mode==='solo-race'&&i>0?' <small class="cpu-tag">CPU</small>':'';
const playerName = (i: number) => escapeHtml(driverName(i));
function applyDriverPresentation() {
  const colors = preferences.drivers.map((_,i) => finishFor(driverPaint(i)).color);
  applyPlayerColors(colors); world?.setDriverPaints(colors);
  labels.forEach((label,i)=>{label.removeAttribute('title');label.textContent=String(i+1);});
}
function saveSettings() { preferences.laps = lapCount; savePreferences(preferences); }
/** The automatic tier stepped down after slow frames: keep the Settings sheet truthful. */
function onGraphicsChange() { refreshSettings(); }
function refreshSetup(focus?: string) {
  const scroll = panel.querySelector('.setup-scroll')?.scrollTop ?? 0;
  renderPanel(); const content = panel.querySelector('.setup-scroll'); if (content) content.scrollTop = scroll;
  if (focus) panel.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
}
function updateCanvasLabel() { canvas.setAttribute('aria-label', `${activeTrack.name} racing circuit. Draw your line with a finger or mouse.`); }
/** Home key art: a new picture each time the player arrives on Home (never the previous one), fixed while they stay. */
let heroIndex: number | null = null;
function showHero() {
  heroIndex = nextHero(heroImages.length, heroIndex);
  const hero = heroImages[heroIndex];
  heroPicture.classList.remove('loaded'); heroPicture.style.setProperty('--hero-wide', hero.wide); heroPicture.style.setProperty('--hero-tall', hero.tall);
  heroSource.srcset = assetUrl(`assets/hero/${hero.id}-tall.webp?v=${heroArtRevision}`); heroImage.src = assetUrl(`assets/hero/${hero.id}-wide.webp?v=${heroArtRevision}`);
}
heroImage.addEventListener('load', () => heroPicture.classList.add('loaded'));
heroImage.addEventListener('error', () => heroPicture.classList.remove('loaded'));
/** Settings sheet (a modal dialog): sound, touch test, graphics and renderer. Rendered at start so it is always current. */
const settingsView = () => ({ soundOn: !audio.muted, graphics: { choice: graphicsChoice, level: world?.graphicsLevel ?? 'low', renderer: graphicsPreference.renderer, activeRenderer }, buildId: __BUILD_ID__ });
function refreshSettings(focus?: string) {
  const active = document.activeElement instanceof HTMLElement && settingsDialog.contains(document.activeElement) ? document.activeElement : null;
  settingsDialog.innerHTML = settingsPanel(settingsView());
  const keep = focus ?? (active ? ['action', 'graphics', 'renderer'].filter(key => active.dataset[key]).map(key => `[data-${key}="${active.dataset[key]}"]`).join('') : '');
  if (keep && settingsDialog.open) settingsDialog.querySelector<HTMLElement>(keep)?.focus();
}
function openSettings() { refreshSettings(); if (!settingsDialog.open) settingsDialog.showModal(); }
function closeSettings() { if (settingsDialog.open) settingsDialog.close(); }
// A tap on the dimmed backdrop (the dialog element itself, outside its content) closes the sheet.
settingsDialog.addEventListener('click', e => { if (e.target === settingsDialog) closeSettings(); });
function toggleSound() {
  audio.toggle();
  document.querySelectorAll<HTMLButtonElement>('.sound-toggle').forEach(button => button.setAttribute('aria-pressed', String(!audio.muted)));
  if (!audio.muted) audio.cue('ready'); else if (!audio.getStatus().available) showNotice('Sound is unavailable in this browser. You can still race.');
}
function savedTourSummary() {
  if (!savedTour) return null;
  const completed = savedTour.state.results.length, leaders = championshipStandings(savedTour.state).filter(row => row.rank === 1);
  return { completed, total: savedTour.state.rounds.length, leader: completed && leaders.length === 1 ? { name: savedTour.drivers[leaders[0].player].name, points: leaders[0].points } : undefined };
}
/** Pause sheet status: the lap (the leader's in Multiplayer) and the race clock. */
function pauseStatus() {
  if (!race) return '';
  const s = race.racers[sessionOptions.mode === 'multiplayer' ? race.standings()[0].player : 0].state;
  return `LAP ${Math.min(s.lap, lapCount)} / ${lapCount} · ${formatTime(race.time)}`;
}
function selectCircuit(id: string) {
  const next = findCircuit(id); if (next.id === activeCircuit.id) return;
  loadCircuit(next.id); setPhase('setup'); panel.querySelector<HTMLElement>(`[data-circuit="${next.id}"]`)?.focus({ preventScroll: true });
}
/** Swaps the active course and scene. `persist` stores it as the preferred circuit (the tutorial borrows Newport without doing so). */
function loadCircuit(id: string, persist = true) {
  const next = findCircuit(id);
  cancelStroke(); clearRaceInput();
  route = null; race = null; confirmedRoutes = []; readyPlayers = []; previousPoses = []; stroke = []; turn = 0; playerCount = 1;
  const engine = world.engine; world.dispose(false);
  activeCircuit = next; activeTrack = next.track;
  audio.setVenue(next.scenery);
  world = new GameScene(canvas, activeTrack, theme, activeCircuit.scenery, engine, graphicsChoice); world.onGraphicsChange = onGraphicsChange;
  applyDriverPresentation(); renderControls(); notice.textContent = ''; lastFrame = performance.now();
  best = bestTimes.get(bestKey()) ?? null;
  if (persist) {
    preferences.circuitId = next.id; saveSettings();
    const url = new URL(location.href); url.searchParams.set('circuit', next.id); history.replaceState(null, '', url);
  }
  refreshLap();
}
function startTutorial() {
  cancelStroke(); clearRaceInput();
  if (sessionOptions.mode !== 'tutorial') tutorialReturn = { circuitId: activeCircuit.id, laps: lapCount };
  sessionOptions.mode = 'tutorial'; tutorial = freshTutorial(); setupCount = 1;
  if (activeCircuit.id !== TUTORIAL_CIRCUIT) loadCircuit(TUTORIAL_CIRCUIT, false);
  lapCount = TUTORIAL_LAPS; playerCount = 1; turn = 0; route = null; race = null; confirmedRoutes = []; readyPlayers = [];
  renderControls(); world.setPlayers(1); applyDriverPresentation(); world.setPlanningPlayer(null); world.drawLine(null); world.showError(); world.vehicle.update(startPose()); notice.textContent = '';
  setPhase('tutorial-intro');
}
/** Leaves the tutorial, restoring the circuit and lap count chosen before it. */
function exitTutorial() {
  if (sessionOptions.mode !== 'tutorial') return;
  sessionOptions.mode = 'solo-race'; tutorial = null;
  const back = tutorialReturn; tutorialReturn = null;
  if (back) { lapCount = back.laps; if (back.circuitId !== activeCircuit.id) loadCircuit(back.circuitId, false); }
  renderCoach();
}
function coachStep(): CoachStep | null {
  if (sessionOptions.mode !== 'tutorial') return null;
  if (phase === 'drawing') return 'draw';
  if (phase === 'preview') return 'preview';
  if (phase === 'countdown' && !resuming && race?.racers[0].state.time === 0) return 'countdown';
  if (phase === 'coaching') return tutorial?.awaiting ?? null;
  return null;
}
/** Tutorial coach card and the highlighted pad. Hidden in every other mode. */
function renderCoach() {
  const step = coachStep();
  coach.innerHTML = tutorialCoach(step); coach.hidden = !step; coach.dataset.step = step ?? '';
  controls.querySelectorAll<HTMLElement>('.ability-control').forEach(pad => { pad.dataset.coach = String(phase === 'coaching' && pad.dataset.ability === tutorial?.awaiting); });
}
function persistTour() {
  if (!activeTour) return;
  savedTour = structuredClone(activeTour); tourSaveFailed = !storeTournament(savedTour);
}
function startTournament() {
  const ids = tourSetup.custom ? tourSetup.schedule : circuits.map(c => c.id);
  activeTour = { state: createTournament(ids.map(id => ({ circuitId: findCircuit(id).id, trackVersion: findCircuit(id).track.version })), racerCount(sessionOptions.mode,setupCount), lapCount), drivers: Array.from({length:racerCount(sessionOptions.mode,setupCount)},(_,i)=>({name:driverName(i),paint:driverPaint(i),controller:controllerFor(sessionOptions.mode,i)})), options:{...sessionOptions} };
  persistTour(); beginTourRound();
}
function restoreTourDrivers() {
  if (!activeTour) return;
  Object.assign(sessionOptions,activeTour.options??{mode:'multiplayer',difficulty:'normal',seed:1});
  activeTour.drivers.forEach((d,i)=>{if(sessionOptions.mode==='multiplayer'||i===0)preferences.drivers[i]={...d};});lapCount=activeTour.state.laps;setupCount=humanCount(sessionOptions.mode,activeTour.state.playerCount);saveSettings();
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
function brand() { document.querySelector<HTMLImageElement>('.brand-mark')!.src = assetUrl(theme.branding.logo); document.querySelector('.brand-name')!.textContent = theme.branding.title; }
brand();
document.querySelector<HTMLImageElement>('.brand-mark')!.addEventListener('error', e => { (e.currentTarget as HTMLImageElement).hidden = true; });

function renderControls() {
  controls.innerHTML = abilityControlsMarkup({ humans: humans(), playerCount, lapCount, playerName });
}
function clearRaceInput() { race?.clearCommands(); input.clear(); clock.reset(); }
function setPhase(next: Phase) {
  // Coaching is a frozen race: it keeps the racing layout and is marked separately for the coach styles.
  if (arrivesHome(heroIndex === null ? null : phase, next)) showHero();
  phase = next; playground.dataset.phase = phase === 'coaching' ? 'racing' : phase; playground.dataset.coaching = String(phase === 'coaching'); playground.dataset.players = String(humans()); playground.dataset.mode=sessionOptions.mode; playground.dataset.tournament = String(!!activeTour);
  const layout = phaseLayout(phase);
  if (!layout.ghostAllowed) world?.setGhost(null);
  if (!layout.driveAudio) audio.mix({ active: false, speed: 0, slip: 0, sand: 0 });
  if (layout.silence) audio.silence();
  audio.setMenuMusic(layout.menuMusic);
  hud.hidden = !layout.hudVisible;
  controls.querySelectorAll<HTMLButtonElement>('.ability-control').forEach(pad => { pad.hidden = !layout.padVisible(pad.dataset.ability as Ability); pad.disabled = layout.padsDisabled; });
  pauseButton.hidden = !layout.pauseVisible; countdownElement.hidden = !layout.countdownVisible; diagnosticSection.hidden = !layout.diagnosticsVisible;
  raceProgress.hidden = !layout.progressVisible; panel.hidden = !layout.panelVisible;
  labels.forEach(label => { label.hidden = playerCount === 1 || Number(label.dataset.car) >= playerCount || !layout.labelsVisible; });
  world?.showStart(layout.startGateVisible); world?.setLayout(layout.sceneLayout);
  updateCanvasLabel(); renderPanel(); updateHud(); renderCoach();
}
/** Writes the phase panel. Phases without a panel of their own keep the previous content (hidden). */
function renderPanel(message?: string) {
  const displayedCount = phase === 'setup' ? setupCount : playerCount;
  document.querySelector('#mode-label')!.textContent = modeLabel(sessionOptions.mode, displayedCount);
  const html = panelMarkup(message);
  if (html !== null) panel.innerHTML = html;
}
function panelMarkup(message?: string): string | null {
  switch (phase) {
    case 'tutorial-intro': return tutorialIntroPanel();
    case 'welcome': return welcomePanel({ tagline: theme.branding.tagline, savedTour: savedTourSummary(), incompatibleTour: incompatibleTournament() });
    case 'setup': return raceSetupMarkup(preferences, setupCount, tourSetup, sessionOptions, preferences.ghost !== false);
    case 'tour-intro': return activeTour ? tourIntroPanel({ roundIndex, roundNames: activeTour.state.rounds.map(r => findCircuit(r.circuitId).track.name), trackName: activeTrack.name, tagline: activeCircuit.tagline, playerCount, lapCount, saveFailed: tourSaveFailed }) : null;
    case 'tour-exit': return tourExitPanel();
    case 'tour-replace': return tourReplacePanel();
    case 'tour-resume': return tourDiscardPanel();
    case 'handoff': return handoffPanel({ confirmedCount: confirmedRoutes.length, playerCount, turn, playerName });
    case 'drawing': case 'preview': return planningPanel({ preview: phase === 'preview', playerCount, turn, playerName, humans, inTour: !!activeTour, tutorial: sessionOptions.mode === 'tutorial', message, note: phase === 'preview' ? planningNote : undefined });
    case 'ready': return readyPanel({ playerCount, lapCount, readyPlayers, ghostSeconds: CONTACT_RULES.ghostStartSeconds, playerName });
    case 'paused': return pausedPanel({ soundOn: !audio.muted, status: pauseStatus() });
    case 'results':
      if (activeTour) return tournamentResultsMarkup(activeTour, roundIndex) + (tourSaveFailed ? '<p class="save-status">Progress could not be saved. Keep this page open.</p>' : '');
      if (!race) return null;
      if (sessionOptions.mode === 'tutorial') return tutorialCompletePanel(race.racers[0].state.finishTime ?? undefined);
      return playerCount === 1
        ? timeTrialResultsPanel({ state: race.racers[0].state, lapCount, driver: playerName(0), trackName: activeTrack.name, personalBest: personalLap?.duration })
        : raceResultsPanel({ standings: race.standings(), lapTimes: race.racers.map(r => r.state.lapTimes), playerName, cpuTag, trackName: activeTrack.name, lapCount });
    case 'error': return errorPanel(message);
    default: return null;
  }
}

function newSession(count: number) {
  clearRaceInput(); playerCount = racerCount(sessionOptions.mode,count); turn = 0; confirmedRoutes = []; readyPlayers = []; race = null;
  best = bestTimes.get(bestKey()) ?? null;
  renderControls(); world.setPlayers(playerCount); applyDriverPresentation(); beginDrawing();
}
function beginDrawing() {
  clearRaceInput(); race = null; route = null; drawingTrim = undefined; stroke = []; drawingPointer = null;
  world.setPlanningPlayer(playerCount > 1 ? turn : null); world.showVehicles(-1, playerCount);
  world.vehicles.forEach(vehicle => vehicle.clearEffects());
  planningNote = undefined; world.drawLine(null); world.showError(); world.vehicles[turn].update(startPose()); notice.textContent = ''; setPhase('drawing');
}
function usePractice(jumpBranch: boolean | string = false) {
  if (phase !== 'drawing') return;
  const result = compileRoute(createPracticeSamples(activeTrack, 7, jumpBranch), activeTrack);
  if (result.ok) showPreview(result.route, result.drawing);
}
/** The accepted line, with any crash stretches marked. Nothing here blocks racing it. */
function showPreview(compiled: CompiledRoute, trim?: DrawingTrim) {
  route = compiled; drawingTrim = trim; world.drawLine(route, drawingTrim);
  const hazards = compiled.hazards ?? [];
  if (hazards.length) {
    const first = hazards[0], section = compiled.points.filter(p => p.distance >= first.from && p.distance <= Math.min(first.to, compiled.length));
    world.showError(sampleRoute(compiled, first.from), section.length > 1 ? section : undefined);
    planningNote = `Your line hits a wall or leaves the road in ${hazards.length === 1 ? 'one place' : `${hazards.length} places`}. The car will crash there and restart just past it.`;
  } else { world.showError(); planningNote = undefined; }
  setPhase('preview');
}
function confirmRoute() {
  if (!route) return;
  world.showError();
  confirmedRoutes[turn] = route;
  if (humans()===1) { if(sessionOptions.mode==='solo-race'){try{confirmedRoutes=[route,...[0,1,2].map(i=>computerRoute(activeTrack,sessionOptions.difficulty,i,sessionOptions.seed+roundIndex))];}catch(error){renderPanel(error instanceof Error?error.message:'Computer plans could not start.');return;}} startRace(); return; }
  route = null; stroke = []; world.drawLine(null); notice.textContent = '';
  if (turn + 1 < humans()) { turn++; world.showVehicles(-1, playerCount); setPhase('handoff'); }
  else enterReady();
}
function enterReady() {
  clearRaceInput(); race = null; readyPlayers = Array(humans()).fill(false); previousPoses = [];
  world.showVehicles(null, playerCount); world.drawRaceLines(sessionOptions.mode==='solo-race'?confirmedRoutes.slice(0,1):confirmedRoutes); setPhase('ready'); updateVehicles(1);
}
function startRace(resume = false) {
  if (confirmedRoutes.length !== playerCount) return;
  if (!resume && sessionOptions.mode === 'tutorial') tutorial = freshTutorial();
  if (!resume) { recorder=sessionOptions.mode==='time-trial'?new LapRecorder(lapRecordKey(activeTrack)):null;activeGhost=personalLap;world.setGhost(null); race = new LocalRace(confirmedRoutes, activeTrack, lapCount, activeTour ? roundIndex % playerCount : 0); recorder?.sample(race.racers[0].state); previousPoses = []; rechargeAnnounced = Array(playerCount).fill(true); world.vehicles.forEach(vehicle => vehicle.clearEffects()); }
  clearRaceInput(); resuming = resume; countdownRemaining = 3; countdownBeat = 3;
  world.showVehicles(null, playerCount); world.drawRaceLines(sessionOptions.mode==='solo-race'?confirmedRoutes.slice(0,1):confirmedRoutes);
  setPhase('countdown'); updateVehicles(1); audio.cue('countdown');
}
function pauseRace(reason='user') { if (phase !== 'racing' && phase !== 'countdown' && phase !== 'coaching') return;pauseReason=reason; clearRaceInput(); setPhase('paused'); }
function goHome(force = false) {
  if (activeTour && activeTour.state.results.length < activeTour.state.rounds.length && !force) { exitReturn = phase === 'racing' || phase === 'countdown' ? 'paused' : phase; cancelStroke(); clearRaceInput(); persistTour(); setPhase('tour-exit'); return; }
  if (activeTour && activeTour.state.results.length === activeTour.state.rounds.length) { savedTour = null; discardTournament(); }
  activeTour = null; exitTutorial();
  cancelStroke(); clearRaceInput(); playerCount = 1; turn = 0; route = null; race = null; confirmedRoutes = []; readyPlayers = [];
  renderControls(); world.setPlayers(1); applyDriverPresentation(); world.setPlanningPlayer(null); world.drawLine(null); world.showError(); world.vehicle.update(startPose()); notice.textContent = ''; setPhase('welcome');
}
function activate(player: number, ability: Ability = 'thrust') {
  if(player<0||player>=humans())return;
  if (phase === 'ready' && ability === 'thrust') { readyPlayers[player] = true; renderPanel(); updateHud(); if (readyPlayers.every(Boolean)) { if (!audio.muted) audio.unlock(); startRace(); } }
  else if (phase === 'coaching' && race && tutorial && answerPrompt(tutorial, ability, race.racers[player].state.time)) {
    // The frozen race resumes with the requested ability; the other pad is ignored until then.
    // One fixed step runs now so the command fires even if the next frame is interrupted.
    clock.reset(); setPhase('racing');
    if (ability === 'hop') race.pressHop(player); else race.pressThrust(player);
    previousPoses = race.racers.map(racer => ({ ...racer.state.position, heading: racer.state.heading, y: racer.state.elevation })); race.step();
    showNotice(ability === 'thrust' ? TUTORIAL_COPY.afterThrust : TUTORIAL_COPY.afterHop, 3);
  }
  else if (phase === 'racing') { if (ability === 'hop') race?.pressHop(player); else race?.pressThrust(player); }
}
function showNotice(message: string, seconds = 1.7) { notice.textContent = message; noticeUntil = performance.now() + seconds * 1000; }
function updateHud() {
  renderHud({ phase, race, mode: sessionOptions.mode, playerCount, lapCount, trackLength: activeTrack.length,
    tourLabel: activeTour ? `ROUND ${roundIndex + 1}/${activeTour.state.rounds.length} · ${activeTrack.name.toUpperCase()}` : '',
    personalBest: personalLap?.duration, readyPlayers, driverName, hud, controls, raceProgress });
}
function updateVehicles(alpha: number) {
  const rotation = activeTour ? roundIndex % playerCount : 0;
  if (playerCount > 1 && !race && (!previewGrid || previewGrid.routes !== confirmedRoutes || previewGrid.poses.length !== confirmedRoutes.length || previewGrid.track !== activeTrack || previewGrid.rotation !== rotation)) {
    previewGrid = { routes: confirmedRoutes, track: activeTrack, rotation, poses: startingGrid(activeTrack, confirmedRoutes, rotation) };
  }
  const grid = playerCount > 1 && !race ? previewGrid!.poses : null;
  confirmedRoutes.forEach((line, i) => {
    const s = race?.racers[i].state, previous = previousPoses[i];
    const pose = s ? {
      x: previous && !s.finished ? lerp(previous.x, s.position.x, alpha) : s.position.x,
      z: previous && !s.finished ? lerp(previous.z, s.position.z, alpha) : s.position.z,
      y: previous && !s.finished ? lerp(previous.y, s.elevation, alpha) : s.elevation,
      airborne: s.movement === 'airborne',
      alignToSurface:!!(activeTrack.terrain||activeTrack.sections),
      tyreSurfaceAt:activeTrack.terrain?(x:number,z:number)=>supported({x,z},activeTrack)?world.groundSurface?.height(x,z)??snowSurfaceHeight({x,z},activeTrack):undefined:undefined,
      renderedSurface:activeTrack.terrain?world.groundSurface:undefined,
      hopAge: s.flightOrigin === 'hop' ? s.time - s.flightStartedAt : undefined,
      supportY: supported(s.position, activeTrack) ? groundHeight(s.position, activeTrack) : undefined,
      surfaceAt: (x: number, z: number) => supported({...s.position,x,z}, activeTrack) ? groundHeight({...s.position,x,z}, activeTrack) : undefined,
      shadowY: activeTrack.sections||activeTrack.terrain ? supportBelow(s.position,s.elevation,activeTrack)??-2.6 : supported(s.position, activeTrack) ? groundHeight(s.position,activeTrack) : FLIGHT_RULES.waterHeight,
      pitch: s.movement === 'airborne' ? clamp(Math.atan2(s.verticalVelocity, Math.max(12, s.speed)), -(s.flightOrigin === 'hop' ? hopEffects.maxBodyPitch : 0.25), s.flightOrigin === 'hop' ? hopEffects.maxBodyPitch : 0.25) : (() => { if(activeTrack.terrain){const dx=Math.sin(s.heading),dz=Math.cos(s.heading);return Math.atan((groundHeight({x:s.position.x+dx,z:s.position.z+dz},activeTrack)-groundHeight({x:s.position.x-dx,z:s.position.z-dz},activeTrack))/2);}if(activeTrack.sections)return Math.atan(roadGrade(activeTrack,s.position.courseProgress??0));const j = rampAt(s.position, activeTrack); return j ? Math.atan(j.lipHeight / j.rampLength) * (Math.sin(s.heading) * j.forward.x + Math.cos(s.heading) * j.forward.z) : 0; })(),
      heading: previous && !s.finished ? previous.heading + angleDelta(previous.heading, s.heading) * alpha : s.heading,
    } : grid ? grid[i] : sampleRoute(line, 0);
    const absent = !!s && (playerCount > 1 && s.finished || s.time < s.recoveringUntil || s.recoveryWaiting);
    world.vehicles[i].setEnabled(!absent); if (playerCount > 1) labels[i].hidden = absent || !['ready', 'countdown'].includes(phase);
    world.vehicles[i].update(pose, s?.finished ? 0 : s?.speed, !!s && !s.finished && s.time < s.thrustUntil, s?.time, s&&activeTrack.surface?Math.max(.12,s.sandAmount):s?.sandAmount, s?.drifting, s?.steeringRate, s?.acceleration);
    if (playerCount > 1) { const point=world.project(pose),safe=document.querySelector('#course-space')!.getBoundingClientRect();labels[i].style.left=`${clamp(point.x+(i-(playerCount-1)/2)*13,safe.left+8,safe.right-8)}px`;labels[i].style.top=`${clamp(point.y-17-i%2*13,safe.top+8,safe.bottom-8)}px`; }

  });
}

app.addEventListener('click', e => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]'), action = target?.dataset.action;
  if (action === 'tutorial') startTutorial();
  if (action === 'tutorial-draw' && phase === 'tutorial-intro') newSession(1);
  if (action === 'tutorial-example') usePractice(false);
  if (action === 'play') exitTutorial();
  if (action === 'play' || action === 'time-trial') { sessionOptions.mode=action==='play'?'solo-race':'time-trial';sessionOptions.seed=Math.floor(Math.random()*0x7fffffff);setupCount = 1;refreshLap(); applyDriverPresentation(); setPhase('setup'); }
  if (action === 'friends') { sessionOptions.mode='multiplayer';setupCount = 2; applyDriverPresentation(); setPhase('setup'); }
  if (action === 'circuit' && phase === 'setup') selectCircuit(target!.dataset.circuit!);
  if(action==='difficulty'&&phase==='setup'){sessionOptions.difficulty=target!.dataset.difficulty as SessionOptions['difficulty'];refreshSetup();}
  if(action==='ghost-toggle'&&phase==='setup'){preferences.ghost=preferences.ghost===false;saveSettings();refreshSetup();}
  if (action === 'settings' && ['welcome', 'setup'].includes(phase)) openSettings();
  if (action === 'close-settings') closeSettings();
  if (action === 'sound') toggleSound();
  if (action === 'graphics' && settingsDialog.open && isGraphicsChoice(target!.dataset.graphics)) { graphicsChoice = target!.dataset.graphics; graphicsPreference.choice = graphicsChoice; saveGraphicsPreference(graphicsPreference); world.setGraphics(graphicsChoice); refreshSettings(`[data-graphics="${graphicsChoice}"]`); }
  // A different backend needs a new engine: save and reload. Settings opens only on Home and race setup, so no race is lost.
  if (action === 'renderer' && settingsDialog.open && isRendererChoice(target!.dataset.renderer) && target!.dataset.renderer !== graphicsPreference.renderer) { graphicsPreference.renderer = target!.dataset.renderer; saveGraphicsPreference(graphicsPreference); const url = new URL(location.href); url.searchParams.delete('renderer'); location.replace(url); }
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
  }
  if (action === 'start-session') { preferences.drivers.forEach((driver, i) => driver.name = cleanDriverName(driver.name, i)); saveSettings(); if (sessionOptions.mode!=='time-trial' && tourSetup.enabled) { if (savedTour) setPhase('tour-replace'); else startTournament(); } else newSession(setupCount); }
  if (action === 'take-turn' && phase === 'handoff') beginDrawing();
  if (action === 'home') goHome();
  if (action === 'configure-race') { const count = humans(); goHome(); setupCount = count; setPhase('setup'); }
  if (action === 'redraw') { if (phase === 'results') newSession(playerCount); else beginDrawing(); }
  if (action === 'redraw-all') newSession(playerCount);
  if (action === 'confirm' && phase === 'preview') { if (!audio.muted) audio.unlock(); confirmRoute(); }
  if (action === 'retry') { if (!audio.muted) audio.unlock(); if (humans() > 1) enterReady(); else startRace(); }
  if (action === 'pause') pauseRace(); if (action === 'resume') { if (!audio.muted) audio.unlock(); startRace(true); } if (action === 'reload') location.reload();
  if (action === 'diagnostics') { closeSettings(); if (phase === 'racing' || phase === 'countdown') pauseRace(); cancelStroke(); clearRaceInput(); returnPhase = phase; ownership.clear(); setPhase('diagnostics'); updateDiagnostics(); }
  if (action === 'exit-diagnostics') { ownership.clear(); setPhase(returnPhase); }
  if (action === 'reset-diagnostics') { ownership.clear(); ownership = new PointerOwnership(); updateDiagnostics(); }
  if (action && !['pause', 'resume', 'confirm', 'sound'].includes(action)) {
    const back = ['home', 'redraw', 'redraw-all', 'configure-race', 'exit-diagnostics', 'tour-save-exit', 'tour-back-setup'].includes(action);
    audio.cue(back ? 'ui-back' : ['start-session', 'retry', 'tour-draw', 'tour-next', 'tour-resume', 'take-turn', 'tutorial-draw'].includes(action) ? 'ui-confirm' : 'ui-select');
  }
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
function appendSample(event: PointerEvent) {
  const point = world.groundPoint(event.clientX, event.clientY, stroke.at(-1)); if (!point) return;
  // Preserve pauses and sub-metre motion; metre-based filtering belongs in the compiler.
  const sample = { ...point, time: event.timeStamp }, last = stroke.at(-1);
  if (last && sample.time < last.time) return;
  if (!last || sample.time > last.time || distance(sample, last) > 0.001) { stroke.push(sample); drawingDirty = true; }
}
canvas.addEventListener('pointerdown', e => {
  if (phase !== 'drawing' || drawingPointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const point = world.groundPoint(e.clientX, e.clientY);
  if (!point || !canStartDrawing(point, activeTrack)) { world.showError(activeTrack.start); renderPanel('Start anywhere across the line or up to 12 metres behind it.'); return; }
  e.preventDefault(); drawingPointer = e.pointerId; stroke = []; world.showError(); canvas.setPointerCapture(e.pointerId); appendSample(e);
});
canvas.addEventListener('pointermove', e => {
  if (phase !== 'drawing' || drawingPointer !== e.pointerId) return;
  e.preventDefault(); const events = e.getCoalescedEvents?.() ?? []; for (const p of events) appendSample(p); appendSample(e);
});
canvas.addEventListener('pointerup', e => {
  if (drawingPointer !== e.pointerId || phase !== 'drawing') return;
  appendSample(e); drawingPointer = null; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  const result = compileRoute(stroke, activeTrack);
  if (result.ok) showPreview(result.route, result.drawing); else { world.showError(result.point, result.section); renderPanel(result.message); }
});
function cancelStroke() { if (drawingPointer === null) return; drawingPointer = null; drawingDirty = false; stroke = []; world.drawLine(null); if (phase === 'drawing') renderPanel('That drawing was interrupted. Start a fresh lap at the start line.'); }
canvas.addEventListener('pointercancel', cancelStroke); canvas.addEventListener('lostpointercapture', cancelStroke);
function interrupt() {
  audio.silence(); pauseRace('app-interruption'); clearRaceInput(); ownership.clear(); updateDiagnostics(); cancelStroke();
  if (phase === 'ready') { readyPlayers.fill(false); renderPanel(); updateHud(); }
}
window.addEventListener('blur', interrupt); document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
let previousLandscape = innerWidth >= innerHeight;
window.addEventListener('resize', () => { const landscape=innerWidth>=innerHeight;if(landscape!==previousLandscape)interrupt();previousLandscape=landscape;applyUiScale();world?.resize(); });
coarsePointer.addEventListener?.('change', () => { applyUiScale(); world?.resize(); });
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

async function start() {
try {
  const created = await createEngine(canvas, graphicsPreference.renderer); activeRenderer = created.renderer;
  world = new GameScene(canvas, activeTrack, theme, activeCircuit.scenery, created.engine, graphicsChoice); world.onGraphicsChange = onGraphicsChange; applyDriverPresentation(); renderControls(); refreshLap(); refreshSettings(); setPhase('welcome');
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); pauseRace(); showNotice('The graphics were interrupted. Reload if the circuit does not recover.', 10); });
  world.engine.runRenderLoop(() => {
    const now = performance.now(), elapsed = (now - lastFrame) / 1000; lastFrame = now;
    // Capture every timestamp, but rebuild the live line at most once per rendered frame.
    if (phase === 'drawing' && drawingDirty) { drawingDirty = false; world.drawLine(stroke); }
    if (phase === 'racing' && elapsed > 0.5) pauseRace('render-delay');
    // A resumed tutorial race returns to its unanswered prompt before any further step.
    if (phase === 'racing' && tutorial?.awaiting) setPhase('coaching');
    if (phase === 'countdown') {
      countdownRemaining -= Math.min(elapsed, 0.1); document.querySelector('#countdown-value')!.textContent = String(Math.max(1, Math.ceil(countdownRemaining)));
      const beat = Math.ceil(countdownRemaining); if (beat > 0 && beat !== countdownBeat) { countdownBeat = beat; audio.cue('countdown'); }
      document.querySelector('#countdown-label')!.textContent = resuming ? 'BACK TO YOUR LINE.' : playerCount > 1 ? 'YOUR LINES. ONE MOMENT.' : 'YOUR LINE. YOUR MOMENT.';
      if (countdownRemaining <= 0) { clock.reset(); setPhase('racing'); audio.cue('start'); }
    }
    if (phase === 'racing' && race) {
      const session = race;
      const alpha = clock.advance(elapsed, () => { previousPoses = session.racers.map(racer => ({ ...racer.state.position, heading: racer.state.heading, y: racer.state.elevation }));
        if(sessionOptions.mode==='solo-race')stepComputers(session,sessionOptions.difficulty);
        session.step();
        const record=recorder?.sample(session.racers[0].state);
        if(record){if(!personalLap||record.duration<personalLap.duration){personalLap=record;void saveLap(record);}activeGhost=personalLap;}
 });
      for (const event of session.drainEvents()) {
        audio.cue(event.type, event.intensity); if (event.type === 'thrust') rechargeAnnounced[event.player] = false; const prefix = playerCount > 1 ? `${driverName(event.player)} · ` : '';
        if ((event.type === 'landing' || event.type === 'splash') && event.point) world.feedback(event.point, event.type === 'splash');
        if (event.type === 'landing') world.vehicles[event.player].impact(event.time, true);
        if (event.type === 'car-impact') { world.vehicles[event.player].impact(event.time); world.vehicles[event.otherPlayer!].impact(event.time); }
        if (event.type === 'collision') { world.vehicles[event.player].impact(event.time); showNotice(`${prefix}Barrier contact`); }
        if (event.type === 'recovery') { previousPoses[event.player] = { ...session.racers[event.player].state.position, heading: session.racers[event.player].state.heading, y: session.racers[event.player].state.elevation }; showNotice(event.penalty ? `${prefix}Crashed · +${event.penalty.toFixed(1)} s` : `${prefix}Recovering`); }
        if (event.type === 'lap') showNotice(`${prefix}${session.racers[event.player].state.lap === lapCount ? 'Final lap' : `Lap ${session.racers[event.player].state.lap} / ${lapCount}`}`);
        if (event.type === 'finish' && playerCount > 1) showNotice(`${driverName(event.player)} finished · ${formatTime(event.time)}`);
      }
      updateVehicles(alpha); updateHud();
      const human=session.racers[0].state;world.setGhost(sessionOptions.mode==='time-trial'&&preferences.ghost!==false&&activeGhost?replayPose(activeGhost,Math.max(0,human.time-human.lapStartedAt)):null);
      const moving = session.racers.map(racer => racer.state).filter(s => !s.finished);
      audio.mix({ active: true, speed: Math.max(0, ...moving.map(s => s.speed)), dirt:!!activeTrack.surface, snow:activeTrack.surface==='packed-snow', slip: Math.max(0, ...moving.map(s => s.drifting ? clamp(Math.abs(s.slipAngle) * 2, 0.1, 1) : 0)), sand: Math.max(0, ...moving.map(s => s.sandAmount)) });
      session.racers.forEach((racer, i) => { if (!rechargeAnnounced[i] && !racer.state.finished && racer.state.time >= racer.state.thrustReadyAt) { rechargeAnnounced[i] = true; audio.cue('ready'); } });
      if (session.finished) { if (activeTour && activeTour.state.results.length === roundIndex) { activeTour.state = finalizeRound(activeTour.state, roundIndex, { circuitId: activeTrack.id, trackVersion: activeTrack.version }, session.standings().map(r => ({ player: r.player, rank: r.rank, finishTime: r.finishTime! }))); persistTour(); } if (playerCount === 1 && sessionOptions.mode !== 'tutorial') { best = Math.min(best ?? Infinity, session.racers[0].state.finishTime!); bestTimes.set(bestKey(), best); } notice.textContent = ''; clearRaceInput(); setPhase('results'); }
      else if (tutorial && phase === 'racing') {
        const due = duePrompt(tutorial, session.racers[0].state, confirmedRoutes[0]);
        if (due) { tutorial.awaiting = due; clearRaceInput(); audio.cue('ready'); setPhase('coaching'); }
      }
    } else if (phase === 'ready' || phase === 'countdown' || phase === 'paused' || phase === 'coaching') updateVehicles(1);
    if (now > noticeUntil) notice.textContent = ''; world.render(now / 1000);
  });
  if (import.meta.env.DEV) installDevApi(() => ({ phase, pauseReason, sessionOptions, humans, playerCount, personalLap, preferences, activeTour, roundIndex, race, activeCircuit, theme, lapCount, turn, confirmedRoutes, readyPlayers, world, route, drawingTrim, best, stroke, activeTrack, raceTouches: input.touches, ownership, audio, usePractice, driverName, driverPaint, tutorial }));
} catch (error) { console.error(error); canvas.hidden = true; setPhase('error'); renderPanel(error instanceof Error ? error.message : undefined); }
}
void start();
