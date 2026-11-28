import type { DuelClient } from './duels/client';
import { reclaimBeforeGraphics } from './duels/seat';
import { checkRoomCode } from './duels/codes';
import { FramePlayback } from './duels/playback';
import { OwnCarDisplay } from './duels/own-car';
import type { Room } from '@colyseus/sdk';
import { duelVenues, type RaceFrame, type RoomView } from './duels/protocol';
import { rampAt, supported, groundHeight, FLIGHT_RULES } from './core/support';
import { rampWarnings } from './core/ramp-warnings';
import { resolveBallot, type BallotChoice } from './core/rematch-vote';
import { ballotMarkup } from './ui/panels/ballot';
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
import { StrokeCompiler } from './app/stroke-compiler';
import { DrawingSession } from './drawing/session';
import { installPressGuard, pressTracker } from './input/press-guard';
installPressGuard();
import { createTournament, finalizeRound, championshipStandings } from './core/tournament';
import { incompatibleTournament, loadTournament, storeTournament, discardTournament, type SavedTournament } from './presentation/tournament-storage';
import {tourSchedule,type TourSetup} from './presentation/tournament-ui';
import{ProgressionStore}from'./presentation/progression-storage';
import{CUPS,badgeChoices,paintUnlocked,type ProgressEvidence}from'./core/progression';
import{collectionPanel,badgeMarkup}from'./ui/panels/collection';
import { clearedShortcut } from './core/hop-shortcuts';
import { ChallengeLapTracker, findChallenge, frontierChallengeComplete, type ChallengeId } from './core/challenges';
import { ChallengeStore } from './presentation/challenge-storage';
import { challengesPanel, challengeResults } from './ui/panels/challenges';
import { FixedStepClock, RULES } from './core/simulation';
import { testClockActive, testSimRate } from './app/test-clock';
import { CONTACT_RULES } from './core/vehicle-contact';
import { assetUrl } from './presentation/urls';
import { circuits, findCircuit, phoneDrawingSectors } from './content/circuits';
import { upcomingCourse } from './core/drawing-sectors';
import { phoneSizedTouchScreen } from './app/drawing-mode';
import { drawingStartBounds } from './core/start-finish';
import type { Ability, CompiledRoute, DrawSample, DrawingTrim } from './core/types';
import { PointerOwnership } from './input/ownership';
import { InputRouter } from './input/router';
import { appShellMarkup } from './app/shell';
import { modeLabel, phaseLayout, type Phase } from './app/phases';
import { arrivesHome, nextHero } from './app/hero';
import { installDevApi } from './app/dev-api';
import { uiScale } from './app/ui-scale';
import { installZoomGuard } from './app/zoom-guard';
import { newerBuildDeployed, staleBuildRecovery } from './app/stale-build';
import { formatTime } from './ui/format';
import { renderHud } from './ui/hud';
import { abilityControlsMarkup } from './ui/controls';
import { gridLabelPositions, RACE_CHIP_SECONDS, type GridLabelAnchor } from './ui/grid-labels';
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
import { applyPlayerColors, applyTheme, themes, hopEffects, heroImages, heroArtRevision, interfaceMotion, sectorDrawingAppearance, paintFinishes, rewardPaintFinishes } from './presentation/themes';
import { cleanDriverName, escapeHtml, finishFor, loadPreferences, savePreferences } from './presentation/race-settings';
import { raceSetupMarkup } from './presentation/race-setup';
import { isGraphicsChoice, isRendererChoice, loadGraphicsPreference, saveGraphicsPreference, type RendererChoice } from './presentation/graphics';
import { createEngine } from './presentation/engine';

const app = document.querySelector<HTMLDivElement>('#app')!;
let theme = new URLSearchParams(location.search).get('theme') === 'graphite' ? themes.graphite : themes.coastal;
applyTheme(theme);
document.documentElement.style.setProperty('--motion-ms', `${interfaceMotion.durationMs}ms`);
document.documentElement.style.setProperty('--row-stagger-ms', `${interfaceMotion.rowStaggerMs}ms`);
app.innerHTML = appShellMarkup();
// Thumbnail failures leave the complete circuit map usable; no inline handlers.
app.addEventListener('error', event => { const image=event.target;if(image instanceof HTMLImageElement&&image.classList.contains('circuit-art'))image.hidden=true; },true);

const playground = app.querySelector<HTMLElement>('.playground')!;
const coarsePointer = matchMedia('(pointer: coarse)');
/** Larger touch screens get proportionally larger controls; the course rectangle follows via CSS. */
function applyUiScale() { const scale = uiScale(innerWidth, innerHeight, coarsePointer.matches); playground.style.setProperty('--ui-scale', String(scale)); }
applyUiScale(); installZoomGuard();
// A tab left open across a deployment reloads (at a safe moment) when a renamed lazy chunk is missing.
const staleBuild = staleBuildRecovery({ phase: () => phase, reload: () => location.reload(), storage: (() => { try { return sessionStorage; } catch { return undefined; } })() });
let checkingBuild = false;
window.addEventListener('vite:preloadError', () => { if (checkingBuild) return; checkingBuild = true; void newerBuildDeployed().then(stale => { if (stale) staleBuild.failed(); }, () => {}).finally(() => { checkingBuild = false; }); });
const canvas = document.querySelector<HTMLCanvasElement>('#race-canvas')!;
const panel = document.querySelector<HTMLElement>('#panel')!, hud = document.querySelector<HTMLElement>('.race-hud')!;
const countdownElement = document.querySelector<HTMLElement>('.countdown')!, controls = document.querySelector<HTMLElement>('#race-controls')!;
const pauseButton = document.querySelector<HTMLButtonElement>('.pause-button')!, notice = document.querySelector<HTMLElement>('.race-notice')!;
const diagnosticSection = document.querySelector<HTMLElement>('#diagnostics')!, raceProgress = document.querySelector<HTMLElement>('.race-progress')!;
const labels = [...document.querySelectorAll<HTMLElement>('.vehicle-label')];
/** Private Duels: subtle corner brackets that follow your own car for the whole race. */
const ownBracket = Object.assign(document.createElement('div'), { className: 'own-car-bracket', hidden: true });
labels[0]?.parentElement?.append(ownBracket);
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
const collection=new ProgressionStore();
const challenges = new ChallengeStore();
let challengesReturn: Phase = 'welcome', activeChallenge: ChallengeId | null = null, challengeTracker: ChallengeLapTracker | null = null, challengeAttemptComplete = false;
let challengeReturn: { circuitId: string; laps: number; options: SessionOptions; setupCount: number; tour: TourSetup } | null = null;
const preferences = loadPreferences();
for(const d of preferences.drivers){if(!paintUnlocked(d.paint,collection.state))d.paint='glacier';if(d.badge&&!badgeChoices(collection.state).some(b=>b.id===d.badge))delete d.badge;}
let collectionReturn:Phase='welcome',resultAwards:string[]=[];
const practiceTurns=new Set<number>();
function recordProgress(e:ProgressEvidence){resultAwards.push(...collection.record(e));resultAwards=[...new Set(resultAwards)];}
function recordRaceProgress(session:LocalRace){
 for(let i=0;i<session.racers.length;i++)recordProgress({trackId:activeTrack.id,human:controllerFor(sessionOptions.mode,i)==='human',source:sessionOptions.mode==='tutorial'?'tutorial':practiceTurns.size?'practice':'live',mode:sessionOptions.mode,difficulty:sessionOptions.difficulty,finished:true,rank:session.standings().find(r=>r.player===i)?.rank,cupId:activeTour?.cupId,cupComplete:!!activeTour&&activeTour.state.results.length===activeTour.state.rounds.length});
}
const graphicsPreference = loadGraphicsPreference();
let graphicsChoice = graphicsPreference.choice;
/** The backend actually running (WebGPU falls back to WebGL 2 when unavailable). */
let activeRenderer: RendererChoice = 'webgl2';
const sessionOptions:SessionOptions={mode:'solo-race',difficulty:'normal',seed:1};
let duel:DuelClient | undefined, openingDuel=false;
/** Latest authoritative duel frame (HUD, standings) and the buffered frame the cars are drawn from. */
let remote:RaceFrame | undefined, shown:RaceFrame | undefined;
/** Diagnostics: where the 100 ms buffer alone would draw your own car this frame. */
let ownBuffered:{x:number;z:number}|undefined;
/** Where your own car is drawn online (src/duels/own-car.ts); rebuilt for each new line. */
let ownDisplay:OwnCarDisplay|undefined;
const playback = new FramePlayback();
const humans=()=>duel ? 1 : humanCount(sessionOptions.mode,playerCount);
let recorder:LapRecorder|null=null, personalLap:LapRecord|null=null, activeGhost:LapRecord|null=null;
let sessionLapRecord = false;
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
/** The current driver's drawing turn (src/drawing/session.ts); the page keeps pointer capture, projection and rendering. */
let drawing = new DrawingSession(activeTrack, 0, 0);
const strokeCompiler = new StrokeCompiler();
let countdownRemaining = 0, resuming = false, best: number | null = null, previousPoses: { x: number; z: number; heading: number; y: number }[] = [], noticeUntil = 0, lastFrame = performance.now();
let pauseReason='';
/** Preview heads-up about stretches of the line the car cannot drive (it crashes there and is reset). */
let planningNote: string | undefined;
/** Shared-screen vote after a multiplayer race or a finished multiplayer championship, one entry per human seat. */
let ballot: (BallotChoice | null)[] = [];
let countdownBeat = 3, rechargeAnnounced: boolean[] = [];
let world: GameScene;
let previewGrid: { routes: CompiledRoute[]; track: typeof activeTrack; rotation: number; poses: ReturnType<typeof startingGrid> } | null = null;
const simRate = testSimRate(location.search, import.meta.env.DEV), testClock = testClockActive(location.search, import.meta.env.DEV);
// The release smoke check (tools/public-smoke.mjs) waits for the page to report the build it published.
document.documentElement.dataset.build = __BUILD_ID__;
const clock = new FixedStepClock(simRate, testClock);
// Thrust/hop pads and keys. Drawing input stays on the canvas handlers below.
const input = new InputRouter(controls, {
  humans, padsActive: () => ['ready', 'racing', 'coaching'].includes(phase) || !!duel && phase === 'countdown', keysActive: () => !duel?.overlayOpen && ['ready', 'racing', 'countdown', 'coaching'].includes(phase),
  activate, pause: () => pauseRace(),
  extraKey: e => {
    if (import.meta.env.DEV && e.code === 'KeyT' && !e.repeat) {
      theme = theme.id === 'coastal' ? themes.graphite : themes.coastal; applyTheme(theme); brand(); world.setTheme(theme); applyDriverPresentation();
      if (['ready', 'countdown', 'racing', 'paused', 'results'].includes(phase)) showRaceLines();
      else world.drawLine(route ?? (phase === 'drawing' && drawing.samples.length ? drawing.samples : null), route ? drawingTrim : undefined);
      renderPanel(); updateHud();
    }
  },
});
const driverName=(i:number):string=>duel?.view?.drivers[i]?.name ?? localDriverName(i);
const localDriverName=(i:number)=>activeTour?.drivers[i]?activeTour.drivers[i].name:sessionOptions.mode==='solo-race'&&i>0?CPU_DRIVERS[i-1].name:cleanDriverName(preferences.drivers[i].name,i);
const driverPaint=(i:number):string=>duel?.view?.drivers[i]?.paint ?? localDriverPaint(i);
const localDriverPaint=(i:number)=>activeTour?.drivers[i]?activeTour.drivers[i].paint:sessionOptions.mode==='solo-race'&&i>0?CPU_DRIVERS[i-1].paint:preferences.drivers[i].paint;
const cpuTag=(i:number)=>sessionOptions.mode==='solo-race'&&i>0?' <small class="cpu-tag">CPU</small>':phase==='results'?badgeMarkup(activeTour?.drivers[i]?.badge??preferences.drivers[i]?.badge):'';
const playerName = (i: number) => escapeHtml(driverName(i));
function applyDriverPresentation() {
  const colors = preferences.drivers.map((_,i) => finishFor(driverPaint(i)).color);
  applyPlayerColors(colors); world?.setDriverPaints(colors);
  labels.forEach((label,i)=>{label.removeAttribute('title');label.textContent=String(i+1);});
}
function saveSettings() { preferences.laps = challengeReturn?.laps ?? lapCount; savePreferences(preferences); }
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
  loadCircuit(next.id, !activeChallenge); setPhase('setup'); panel.querySelector<HTMLElement>(`[data-circuit="${next.id}"]`)?.focus({ preventScroll: true });
}
/** Swaps the active course and scene. `persist` stores it as the preferred circuit (the tutorial borrows Newport without doing so). */
function loadCircuit(id: string, persist = true) {
  const next = findCircuit(id);
  cancelStroke(); clearRaceInput();
  route = null; race = null; confirmedRoutes = []; readyPlayers = []; previousPoses = []; drawing = new DrawingSession(activeTrack, 0, 0); turn = 0; playerCount = 1;
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
/** Challenges borrow settings, never overwrite the player's ordinary circuit, laps or format. */
function borrowChallenge(id: ChallengeId) {
  challengeReturn = { circuitId: activeCircuit.id, laps: lapCount, options: { ...sessionOptions }, setupCount, tour: structuredClone(tourSetup) };
  activeChallenge = id; challengeAttemptComplete = false; challengeTracker = null;
  const definition = findChallenge(id)!;
  sessionOptions.mode = definition.mode; sessionOptions.difficulty = 'hard'; sessionOptions.seed = 73149;
  lapCount = 1; setupCount = 1;
  tourSetup.enabled = id === 'frontier-champion'; tourSetup.custom = false; tourSetup.preset = id === 'frontier-champion' ? 'frontier' : undefined;
}
function leaveChallenge() {
  const back = challengeReturn;
  activeChallenge = null; challengeReturn = null; challengeTracker = null; challengeAttemptComplete = false;
  if (!back) return;
  Object.assign(sessionOptions, back.options); Object.assign(tourSetup, back.tour); lapCount = back.laps; setupCount = back.setupCount;
  tourSetup.preset = back.tour.preset;
  if (back.circuitId !== activeCircuit.id) loadCircuit(back.circuitId, false);
}
function launchChallenge(id: ChallengeId) {
  if (activeTour && activeTour.state.results.length < activeTour.state.rounds.length) persistTour();
  activeTour = null; exitTutorial(); leaveChallenge(); borrowChallenge(id);
  if (id === 'frontier-champion') { if (savedTour) setPhase('tour-replace'); else startTournament(); }
  else { loadCircuit(findChallenge(id)!.circuitId, false); newSession(1); }
}
function recordCupChallenge() {
  if (activeChallenge !== 'frontier-champion' || !activeTour) return;
  challengeAttemptComplete = activeTour.challengeEligible === true && frontierChallengeComplete(activeTour.state, activeTour.options ?? {}, activeTour.cupId);
  challenges.record({ id: activeChallenge, human: true, source: activeTour.challengeEligible === true ? 'live' : 'practice', completed: challengeAttemptComplete });
}
function startTournament() {
  const ids = tourSchedule(tourSetup);
  activeTour = { state: createTournament(ids.map(id => ({ circuitId: findCircuit(id).id, trackVersion: findCircuit(id).track.version })), racerCount(sessionOptions.mode,setupCount), lapCount), drivers: Array.from({length:racerCount(sessionOptions.mode,setupCount)},(_,i)=>({name:driverName(i),paint:driverPaint(i),...(preferences.drivers[i]?.badge?{badge:preferences.drivers[i].badge}:{}),controller:controllerFor(sessionOptions.mode,i)})), options:{...sessionOptions},...(tourSetup.preset?{cupId:tourSetup.preset,cupVersion:1}: {}) };
  if (activeChallenge === 'frontier-champion') { activeTour.challengeId = activeChallenge; activeTour.challengeEligible = true; }
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
  exitTutorial(); leaveChallenge();
  if (savedTour.challengeId) borrowChallenge(savedTour.challengeId);
  activeTour = structuredClone(savedTour); restoreTourDrivers();
  recordCupChallenge();
  if (activeTour.state.results.length === activeTour.state.rounds.length) { roundIndex = activeTour.state.results.length - 1; selectCircuit(activeTour.state.rounds[roundIndex].circuitId); playerCount = activeTour.state.playerCount; renderControls(); world.showVehicles(-1, playerCount); applyDriverPresentation(); setPhase('results'); }
  else beginTourRound();
}
function brand() { document.querySelector<HTMLImageElement>('.brand-mark')!.src = assetUrl(theme.branding.logo); document.querySelector('.brand-name')!.textContent = theme.branding.title; }
brand();
document.querySelector<HTMLImageElement>('.brand-mark')!.addEventListener('error', e => { (e.currentTarget as HTMLImageElement).hidden = true; });

function renderControls() {
  controls.innerHTML = abilityControlsMarkup({ humans: humans(), playerCount, lapCount, playerName: duel ? ()=>playerName(Math.max(0,duel!.seatIndex)) : playerName });
  if(duel && playerCount>1){const i=Math.max(0,duel.seatIndex);controls.querySelector<HTMLElement>('.ability-cluster')?.style.setProperty('--identity', 'var(--player-'+(i+1)+')');const chip=controls.querySelector('.pod-identity');if(chip?.firstChild)chip.firstChild.textContent='P'+(i+1)+' ';}
}
function clearRaceInput() { race?.clearCommands(); input.clear(); clock.reset(); }
/** Human seats that vote on Results: every human driver of the session or championship. */
function ballotSeats(): { player: number; name: string }[] {
  if (activeTour) return activeTour.drivers.flatMap((d, player) => d.controller === 'computer' ? [] : [{ player, name: d.name }]);
  return Array.from({ length: humans() }, (_, player) => ({ player, name: driverName(player) }));
}
function ballotActive() {
  if (phase !== 'results' || duel || sessionOptions.mode === 'tutorial' || activeChallenge || ballotSeats().length < 2) return false;
  return activeTour ? activeTour.state.results.length === activeTour.state.rounds.length : sessionOptions.mode === 'multiplayer';
}
function ballotView() {
  const tour = !!activeTour;
  return ballotMarkup({ seats: ballotSeats().map(s => ({ ...s, name: escapeHtml(s.name) })), votes: ballot, heading: tour ? 'Play the championship again?' : 'Next race?',
    options: tour ? [{ vote: 'same', label: 'Replay championship' }, { vote: 'home', label: 'Home' }] : [{ vote: 'same', label: 'Race again' }, { vote: 'redraw', label: 'New lines' }, { vote: 'home', label: 'Home' }] });
}
/** Same schedule, drivers, paints and laps; zero points and fresh drawings every round. */
function replayTournament() {
  if (!activeTour) return;
  activeTour = { ...activeTour, state: createTournament(activeTour.state.rounds, activeTour.state.playerCount, activeTour.state.laps), ...(activeTour.challengeId ? { challengeEligible: true } : {}) }; challengeAttemptComplete = false; persistTour(); beginTourRound();
}
function castVote(seat: number, vote: string | undefined) {
  const seats = ballotSeats(), allowed = activeTour ? ['same', 'home'] : ['same', 'redraw', 'home'];
  if (!Number.isInteger(seat) || seat < 0 || seat >= seats.length || !vote || !allowed.includes(vote)) return;
  ballot = seats.map((_, i) => i === seat ? vote as BallotChoice : ballot[i] ?? null);
  const outcome = resolveBallot(ballot);
  if (outcome === 'pending') { renderPanel(); panel.querySelector<HTMLElement>(`[data-action="vote"][data-seat="${seat}"][data-vote="${vote}"]`)?.focus(); return; }
  ballot = [];
  if (outcome === 'home') goHome();
  else if (activeTour) replayTournament();
  else if (outcome === 'same') { if (!audio.muted) audio.unlock(); enterReady(); }
  else newSession(playerCount);
}
/** Your own shortcut Hop lips, shown as a cue while racing: solo play and your own line online only (never other players' hidden lines). */
function hopCuePoint(next: Phase) {
  if (next !== 'racing' || !route || (humans() > 1 && !duel)) return null;
  const id = route.crossings?.find(c => c.activation === 'hop' && activeTrack.hopShortcuts?.some(h => h.crossings?.includes(c.id)))?.id;
  const jump = id ? activeTrack.jumps?.find(j => j.id === id) : undefined;
  return jump ? { x: jump.from.x, z: jump.from.z } : null;
}
function setPhase(next: Phase) {
  // A press that began on the previous screen cannot activate anything on this one (src/input/press-context.ts).
  if (next !== phase) pressTracker.nextScreen();
  world?.showHopCue(hopCuePoint(next));
  if (next === 'results' && phase !== 'results') ballot = [];
  if (next === 'drawing') strokeCompiler.prepare(activeTrack);
  else if (phase === 'drawing') strokeCompiler.close();
  // Coaching is a frozen race: it keeps the racing layout and is marked separately for the coach styles.
  if (arrivesHome(heroIndex === null ? null : phase, next)) showHero();
  if (next !== 'drawing') world?.showContinueHandle(null);
  phase = next; playground.dataset.phase = phase === 'coaching' ? 'racing' : phase; playground.dataset.coaching = String(phase === 'coaching'); playground.dataset.players = String(humans()); playground.dataset.mode=sessionOptions.mode; playground.dataset.tournament = String(!!activeTour);
  staleBuild.phaseChanged();
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
  document.querySelector('#mode-label')!.textContent = duel ? 'PRIVATE DUEL' : modeLabel(sessionOptions.mode, displayedCount);
  const html = panelMarkup(message);
  if (html !== null) panel.innerHTML = html+(phase==='results'&&sessionOptions.mode!=='tutorial'?((activeChallenge ? challengeResults(activeChallenge, challengeAttemptComplete, challengeTracker?.vessels ?? 0, practiceTurns.size > 0 || activeTour?.challengeEligible === false, !!activeTour && activeTour.state.results.length === activeTour.state.rounds.length) : '')+'<div class="collection-results">'+(resultAwards.length?'<p role="status">'+resultAwards.map(escapeHtml).join(' · ')+'</p>':'')+'<button class="text-button" data-action="collection">Collection ↗</button><button class="text-button" data-action="challenges">Challenges ↗</button></div>'):'');
}
function panelMarkup(message?: string): string | null {
  switch (phase) {
    case 'collection':return collectionPanel(collection.state,collection.persistent);
    case 'challenges': return challengesPanel(challenges.state, challenges.persistent);
    case 'tutorial-intro': return tutorialIntroPanel();
    case 'welcome': return welcomePanel({ tagline: theme.branding.tagline, savedTour: savedTourSummary(), incompatibleTour: incompatibleTournament() });
    case 'setup': return raceSetupMarkup(preferences, setupCount, tourSetup, sessionOptions, preferences.ghost !== false,collection.state);
    case 'tour-intro': return activeTour ? tourIntroPanel({ roundIndex, roundNames: activeTour.state.rounds.map(r => findCircuit(r.circuitId).track.name), trackName: activeTrack.name, tagline: activeCircuit.tagline, playerCount, lapCount, saveFailed: tourSaveFailed }) : null;
    case 'tour-exit': return tourExitPanel();
    case 'tour-replace': return tourReplacePanel();
    case 'tour-resume': return tourDiscardPanel();
    case 'handoff': return handoffPanel({ confirmedCount: confirmedRoutes.length, playerCount, turn, playerName });
    case 'drawing': case 'preview': return planningPanel({ preview: phase === 'preview', playerCount, turn, playerName, humans, inTour: !!activeTour, privateDuel: !!duel, tutorial: sessionOptions.mode === 'tutorial', message, note: phase === 'preview' ? planningNote : undefined, sector: drawing.sectorView(phase === 'drawing') });
    case 'ready': return readyPanel({ playerCount, lapCount, readyPlayers, ghostSeconds: CONTACT_RULES.ghostStartSeconds, playerName });
    case 'paused': return pausedPanel({ soundOn: !audio.muted, status: pauseStatus() });
    case 'results':
      if (activeTour) return tournamentResultsMarkup(activeTour, roundIndex, ballotActive() ? ballotView() : undefined) + (tourSaveFailed ? '<p class="save-status">Progress could not be saved. Keep this page open.</p>' : '');
      if (!race) return null;
      if (sessionOptions.mode === 'tutorial') return tutorialCompletePanel(race.racers[0].state.finishTime ?? undefined);
      return playerCount === 1
        ? timeTrialResultsPanel({ state: race.racers[0].state, lapCount, driver: playerName(0), trackName: activeTrack.name, personalBest: personalLap?.duration, newRecord: sessionLapRecord })
        : raceResultsPanel({ standings: race.standings(), lapTimes: race.racers.map(r => r.state.lapTimes), playerName, cpuTag, trackName: activeTrack.name, lapCount, ballot: ballotActive() ? ballotView() : undefined });
    case 'error': return errorPanel(message);
    default: return null;
  }
}

function newSession(count: number) {
  clearRaceInput();practiceTurns.clear();resultAwards=[]; playerCount = racerCount(sessionOptions.mode,count); turn = 0; confirmedRoutes = []; readyPlayers = []; race = null;
  best = bestTimes.get(bestKey()) ?? null;
  renderControls(); world.setPlayers(playerCount); applyDriverPresentation(); beginDrawing();
}
function beginDrawing() {
  practiceTurns.delete(turn);
  clearRaceInput(); race = null; route = null; drawingTrim = undefined; strokeCompiler.cancel();
  const authored = phoneDrawingSectors[activeTrack.id];
  const mode = preferences.drawingMode ?? 'auto';
  const count = mode === 'sectors' ? authored ?? 2 : mode === 'auto' && phoneSizedTouchScreen() ? authored ?? 1 : 1;
  drawing = new DrawingSession(activeTrack, count > 1 && sessionOptions.mode !== 'tutorial' ? count : 1, turn);
  world.showContinueHandle(null); world.setDrawingFocus(null, false);
  world.setPlanningPlayer(playerCount > 1 ? turn : null); world.showVehicles(-1, playerCount);
  world.vehicles.forEach(vehicle => vehicle.clearEffects());
  planningNote = undefined; world.drawLine(null); world.showError(); world.vehicles[turn].update(startPose()); notice.textContent = ''; setPhase('drawing');
}
function usePractice(jumpBranch: boolean | string = false, seconds = 7) {
  if (phase !== 'drawing') return;
  practiceTurns.add(turn);
  if (activeTour?.challengeId) { activeTour.challengeEligible = false; persistTour(); }
  const result = compileRoute(createPracticeSamples(activeTrack, seconds, jumpBranch), activeTrack);
  if (result.ok) showPreview(result.route, result.drawing);
}
/** The accepted line, with any crash stretches marked. Nothing here blocks racing it. */
function showPreview(compiled: CompiledRoute, trim?: DrawingTrim) {
  world.showContinueHandle(null);
  route = compiled; drawingTrim = trim; world.drawLine(route, drawingTrim);
  const hazards = compiled.hazards ?? [], ramps = rampWarnings(compiled, activeTrack);
  const notes: string[] = [];
  if (hazards.length) {
    const first = hazards[0], section = compiled.points.filter(p => p.distance >= first.from && p.distance <= Math.min(first.to, compiled.length));
    world.showError(sampleRoute(compiled, first.from), section.length > 1 ? section : undefined);
    notes.push(`Your line hits a wall or leaves the road in ${hazards.length === 1 ? 'one place' : `${hazards.length} places`}. The car will crash there and restart just past it.`);
  } else world.showError();
  world.showRampWarnings(ramps.map(w => w.point));
  const rampOnly = ramps.filter(w => w.kind === 'ramp'), hops = ramps.filter(w => w.kind === 'hop');
  if (rampOnly.length) notes.push(`${rampOnly.length === 1 ? 'One ramp' : `${rampOnly.length} ramps`} may need more speed: draw faster before the ringed ${rampOnly.length === 1 ? 'ramp' : 'ramps'} or the car can fall short into the water.`);
  if (hops.length) notes.push('The support-ship shortcut needs a faster line: draw faster up to the ringed Hop, then press Hop just before the edge.');
  planningNote = notes.length ? notes.join(' ') : undefined;
  setPhase('preview');
}
function confirmRoute() {
  if (!route) return;
  if(duel){duel.lock(drawing.samples);return;}
  world.showError();
  confirmedRoutes[turn] = route;
  if (humans()===1) { if(sessionOptions.mode==='solo-race'){try{confirmedRoutes=[route,...[0,1,2].map(i=>computerRoute(activeTrack,sessionOptions.difficulty,i,sessionOptions.seed+roundIndex))];}catch(error){renderPanel(error instanceof Error?error.message:'Computer plans could not start.');return;}} startRace(); return; }
  route = null; drawing = new DrawingSession(activeTrack, 0, turn); world.drawLine(null); notice.textContent = '';
  if (turn + 1 < humans()) { turn++; world.showVehicles(-1, playerCount); setPhase('handoff'); }
  else enterReady();
}
function showRaceLines() {
  if (duel || sessionOptions.mode === 'multiplayer') world.drawLine(null);
  else if (confirmedRoutes.length === playerCount) world.drawRaceLines(confirmedRoutes.slice(0, 1));
}
function enterReady() {
  clearRaceInput(); race = null; readyPlayers = Array(humans()).fill(false); previousPoses = [];
  world.showVehicles(null, playerCount); showRaceLines(); setPhase('ready'); updateVehicles(1);
}
function startRace(resume = false) {
  if (confirmedRoutes.length !== playerCount) return;
  if (!resume && sessionOptions.mode === 'tutorial') tutorial = freshTutorial();
  if (!resume) {
    challengeAttemptComplete = false;
    challengeTracker = activeChallenge && activeChallenge !== 'frontier-champion' ? new ChallengeLapTracker(activeChallenge, { trackId: activeTrack.id, mode: sessionOptions.mode, laps: lapCount, human: true, source: practiceTurns.size ? 'practice' : 'live' }, confirmedRoutes[0]) : null;
  }
  if (!resume) { resultAwards=[];sessionLapRecord=false; recorder=sessionOptions.mode==='time-trial'?new LapRecorder(lapRecordKey(activeTrack)):null;activeGhost=personalLap;world.setGhost(null); race = new LocalRace(confirmedRoutes, activeTrack, lapCount, activeTour ? roundIndex % playerCount : 0); recorder?.sample(race.racers[0].state); previousPoses = []; rechargeAnnounced = Array(playerCount).fill(true); world.vehicles.forEach(vehicle => vehicle.clearEffects()); }
  clearRaceInput(); resuming = resume; countdownRemaining = 3; countdownBeat = 3;
  countdownElement.dataset.lights = '0';
  world.showVehicles(null, playerCount); showRaceLines();
  setPhase('countdown'); updateVehicles(1); audio.cue('countdown');
}
function pauseRace(reason='user') { if(duel){if(reason==='user' && phase==='racing')duel.pause();return;} if (phase !== 'racing' && phase !== 'countdown' && phase !== 'coaching') return;pauseReason=reason; clearRaceInput(); setPhase('paused'); }
function goHome(force = false) {
  if(duel){duel.leave();return;}
  if (activeTour && activeTour.state.results.length < activeTour.state.rounds.length && !force) { exitReturn = phase === 'racing' || phase === 'countdown' ? 'paused' : phase; cancelStroke(); clearRaceInput(); persistTour(); setPhase('tour-exit'); return; }
  if (activeTour && activeTour.state.results.length === activeTour.state.rounds.length) { savedTour = null; discardTournament(); }
  activeTour = null; exitTutorial(); leaveChallenge();
  cancelStroke(); clearRaceInput(); playerCount = 1; turn = 0; route = null; race = null; confirmedRoutes = []; readyPlayers = [];
  renderControls(); world.setPlayers(1); applyDriverPresentation(); world.setPlanningPlayer(null); world.drawLine(null); world.showError(); world.vehicle.update(startPose()); notice.textContent = ''; setPhase('welcome');
}
function activate(player: number, ability: Ability = 'thrust') {
  if(player<0||player>=humans())return;
  if(duel){if(phase==='racing'||phase==='countdown')duel.press(ability);return;}
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
  const session=duel && remote ? {racers:remote.cars.map(state=>({state})),standings:()=>remote!.order,time:remote.tick*RULES.dt,ghostStartRemaining:Math.max(0,CONTACT_RULES.ghostStartSeconds-remote.tick*RULES.dt)} : race;
  renderHud({ phase, race:session, ownSeat:duel?Math.max(0,duel.seatIndex):undefined, mode: sessionOptions.mode, playerCount, lapCount, trackLength: activeTrack.length,
    tourLabel: activeTour ? `ROUND ${roundIndex + 1}/${activeTour.state.rounds.length} · ${activeTrack.name.toUpperCase()}` : '',
    personalBest: personalLap?.duration, readyPlayers, driverName, hud, controls, raceProgress });
}
/** Corner brackets around your own car in a Private Duel, sized from its projected length, kept inside the course area. */
function placeOwnBracket(own: RaceFrame['cars'][number] | undefined) {
  const seat = duel?.seatIndex ?? -1, visible = !!own && seat >= 0 && ['countdown', 'racing'].includes(phase) && !own.finished && own.time >= own.recoveringUntil && !own.recoveryWaiting;
  ownBracket.hidden = !visible;
  if (!visible) return;
  const pose = world.vehicles[seat]?.root.position, heading = own!.heading, half = activeTrack.carLength / 2;
  const centre = pose ? { x: pose.x, y: pose.y, z: pose.z } : { x: own!.position.x, y: own!.elevation, z: own!.position.z };
  const nose = world.project({ x: centre.x + Math.sin(heading) * half, y: centre.y, z: centre.z + Math.cos(heading) * half });
  const tail = world.project({ x: centre.x - Math.sin(heading) * half, y: centre.y, z: centre.z - Math.cos(heading) * half });
  const middle = world.project(centre), size = clamp(Math.hypot(nose.x - tail.x, nose.y - tail.y) * 1.5, 30, 90);
  const safe = document.querySelector('#course-space')!.getBoundingClientRect();
  ownBracket.style.setProperty('--size', `${size}px`);
  ownBracket.style.left = `${clamp(middle.x, safe.left + size / 2, safe.right - size / 2)}px`; ownBracket.style.top = `${clamp(middle.y, safe.top + size / 2, safe.bottom - size / 2)}px`;
}
function updateVehicles(alpha: number) {
  const rotation = activeTour ? roundIndex % playerCount : 0;
  if (!remote && playerCount > 1 && !race && (!previewGrid || previewGrid.routes !== confirmedRoutes || previewGrid.poses.length !== confirmedRoutes.length || previewGrid.track !== activeTrack || previewGrid.rotation !== rotation)) {
    previewGrid = { routes: confirmedRoutes, track: activeTrack, rotation, poses: startingGrid(activeTrack, confirmedRoutes, rotation) };
  }
  const grid = !remote && playerCount > 1 && !race ? previewGrid!.poses : null;
  const chipAnchors: { car: number; anchor: GridLabelAnchor }[] = [];
  const drawn=shown??remote, carCount=drawn?.cars.length??confirmedRoutes.length;
  for(let i=0;i<carCount;i++) {
    const line=confirmedRoutes[i];
    const s = drawn?.cars[i] ?? race?.racers[i].state, previous = previousPoses[i];
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
    world.vehicles[i].setEnabled(!absent); if (playerCount > 1) labels[i].hidden = absent || !(['ready', 'countdown'].includes(phase) || phase === 'racing' && (humans() > 1 || !!duel) && (s?.time ?? 0) < RACE_CHIP_SECONDS);
    world.vehicles[i].update(pose, s?.finished ? 0 : s?.speed, !!s && !s.finished && s.time < s.thrustUntil, s?.time, s&&activeTrack.surface?Math.max(.12,s.sandAmount):s?.sandAmount, s?.drifting, s?.steeringRate, s?.acceleration);
    if (playerCount > 1 && !labels[i].hidden) {
      const back = activeTrack.carLength / 2, tail = { x: pose.x - Math.sin(pose.heading) * back, z: pose.z - Math.cos(pose.heading) * back, y: 'y' in pose ? pose.y : undefined };
      chipAnchors.push({ car: i, anchor: { car: world.project(pose), tail: world.project(tail) } });
    }
  }
  placeOwnBracket(drawn && duel ? drawn.cars[duel.seatIndex] : undefined);
  if (chipAnchors.length) {
    const safe = document.querySelector('#course-space')!.getBoundingClientRect();
    gridLabelPositions(chipAnchors.map(c => c.anchor)).forEach((p, k) => {
      const label = labels[chipAnchors[k].car];
      label.style.left = `${clamp(p.x, safe.left + 8, safe.right - 8)}px`; label.style.top = `${clamp(p.y, safe.top + 8, safe.bottom - 8)}px`;
    });
  }
}

app.addEventListener('click', e => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]'), action = target?.dataset.action;
  if(action==='private-duel'){void openDuel();return;}
  if (action === 'tutorial') startTutorial();
  if (action === 'tutorial-draw' && phase === 'tutorial-intro') newSession(1);
  if (action === 'tutorial-example') usePractice(false);
  if (action === 'play') exitTutorial();
  if (action === 'play' || action === 'time-trial') { sessionOptions.mode=action==='play'?'solo-race':'time-trial';sessionOptions.seed=Math.floor(Math.random()*0x7fffffff);setupCount = 1;refreshLap(); applyDriverPresentation(); setPhase('setup'); }
  if (action === 'friends') { sessionOptions.mode='multiplayer';setupCount = 2; applyDriverPresentation(); setPhase('setup'); }
  if (action === 'circuit' && phase === 'setup') selectCircuit(target!.dataset.circuit!);
  if(action==='difficulty'&&phase==='setup'){sessionOptions.difficulty=target!.dataset.difficulty as SessionOptions['difficulty'];refreshSetup();}
  if (action === 'drawing-mode' && phase === 'setup') {
    const mode = target?.dataset.mode;
    if (mode === 'auto' || mode === 'sectors' || mode === 'whole') {
      preferences.drawingMode = mode;
      saveSettings();
      refreshSetup(`[data-mode="${mode}"]`);
    }
  }
  if(action==='ghost-toggle'&&phase==='setup'){preferences.ghost=preferences.ghost===false;saveSettings();refreshSetup();}
  if (action === 'settings' && ['welcome', 'setup'].includes(phase)) openSettings();
  if (action === 'close-settings') closeSettings();
  if (action === 'sound') toggleSound();
  if (action === 'graphics' && settingsDialog.open && isGraphicsChoice(target!.dataset.graphics)) { graphicsChoice = target!.dataset.graphics; graphicsPreference.choice = graphicsChoice; saveGraphicsPreference(graphicsPreference); world.setGraphics(graphicsChoice); refreshSettings(`[data-graphics="${graphicsChoice}"]`); }
  // A different backend needs a new engine: save and reload. Settings opens only on Home and race setup, so no race is lost.
  if (action === 'renderer' && settingsDialog.open && isRendererChoice(target!.dataset.renderer) && target!.dataset.renderer !== graphicsPreference.renderer) { graphicsPreference.renderer = target!.dataset.renderer; saveGraphicsPreference(graphicsPreference); const url = new URL(location.href); url.searchParams.delete('renderer'); location.replace(url); }
  if(action==='collection'&&['welcome','setup','results'].includes(phase)){collectionReturn=phase;clearRaceInput();setPhase('collection');}
  if(action==='collection-back'&&phase==='collection')setPhase(collectionReturn);
  if (action === 'challenges' && ['welcome', 'collection', 'results'].includes(phase)) { challengesReturn = phase; clearRaceInput(); setPhase('challenges'); }
  if (action === 'challenges-back' && phase === 'challenges') setPhase(challengesReturn);
  if (action === 'challenge-start' && phase === 'challenges') { const challenge = findChallenge(target!.dataset.challenge); if (challenge) launchChallenge(challenge.id); }
  if(action==='tour-cup'||action==='collection-cup'){
   const cup=CUPS.find(c=>c.id===target!.dataset.cup);if(cup&&cup.rounds.every(id=>circuits.some(v=>v.id===id))){if(activeChallenge){activeTour=null;leaveChallenge();}tourSetup.enabled=true;tourSetup.custom=false;tourSetup.preset=cup.id;if(phase==='collection'){activeTour=null;if(sessionOptions.mode!=='multiplayer'){sessionOptions.mode='solo-race';setupCount=1;}setPhase('setup');}else refreshSetup();}
  }
  if (action === 'format-single') { tourSetup.enabled = false; refreshSetup(); }
  if (action === 'format-tournament') { tourSetup.enabled = true; refreshSetup(); }
  if (action === 'tour-full' || action === 'tour-custom') { tourSetup.preset=undefined;tourSetup.custom = action === 'tour-custom'; refreshSetup(); }
  if (action === 'round-up' || action === 'round-down') {
    const index = Number(target!.dataset.round), to = index + (action === 'round-up' ? -1 : 1);
    if (to >= 0 && to < tourSetup.schedule.length) { [tourSetup.schedule[index], tourSetup.schedule[to]] = [tourSetup.schedule[to], tourSetup.schedule[index]]; refreshSetup(`[data-round="${to}"][data-action="${action}"]`); }
  }
  if (action === 'tour-draw' && activeTour) newSession(activeTour.state.playerCount);
  if (action === 'tour-next' && activeTour && activeTour.state.results.length > roundIndex) beginTourRound();
  if (action === 'tour-resume') resumeTournament();
  if (action === 'tour-again' && activeTour) replayTournament();
  if (action === 'vote' && ballotActive()) castVote(Number(target!.dataset.seat), target!.dataset.vote);
  if (action === 'tour-discard') setPhase('tour-resume');
  if (action === 'tour-discard-cancel') setPhase('welcome');
  if (action === 'tour-discard-confirm') { savedTour = null; discardTournament(); setPhase('welcome'); }
  if (action === 'tour-save-exit') { persistTour(); goHome(true); }
  if (action === 'tour-continue') setPhase(exitReturn);
  if (action === 'tour-replace-confirm') { discardTournament(); savedTour = null; startTournament(); }
  if (action === 'tour-back-setup') { if (activeChallenge) { leaveChallenge(); setPhase('challenges'); } else setPhase('setup'); }
  if (action === 'player-count'  && phase === 'setup') { setupCount = Number(target!.dataset.count); refreshSetup(`[data-count="${setupCount}"]`); }
  if (action === 'lap-count' && phase === 'setup') { lapCount = Number(target!.dataset.laps); saveSettings(); refreshSetup(`[data-laps="${lapCount}"]`); }
  if (action === 'driver-paint' && phase === 'setup') {
    const index = Number(target!.dataset.driver);if(!paintUnlocked(target!.dataset.paint!,collection.state))return; preferences.drivers[index].paint = finishFor(target!.dataset.paint!).id;
    saveSettings(); applyDriverPresentation(); refreshSetup(`[data-driver="${index}"][data-paint="${preferences.drivers[index].paint}"]`);
  }
  if (action === 'start-session') { preferences.drivers.forEach((driver, i) => driver.name = cleanDriverName(driver.name, i)); saveSettings(); if (sessionOptions.mode!=='time-trial' && tourSetup.enabled) { if (savedTour) setPhase('tour-replace'); else startTournament(); } else newSession(setupCount); }
  if (action === 'take-turn' && phase === 'handoff') beginDrawing();
  if (action === 'home') goHome();
  if (action === 'configure-race') { const count = challengeReturn?.setupCount ?? humans(); goHome(); setupCount = count; setPhase('setup'); }
  if (action === 'redraw') { if (phase === 'results') newSession(playerCount); else beginDrawing(); }
  if (action === 'draw-whole' && drawing.overview && phase === 'drawing') {
    drawing.chooseWhole();
    renderPanel();
  }
  if (action === 'start-sector' && drawing.overview && phase === 'drawing') restartSector(0);
  if ((action === 'retry-sector' || action === 'previous-sector') && (phase === 'drawing' || phase === 'preview')) {
    restartSector(action === 'previous-sector' ? drawing.sectorIndex - 1 : drawing.sectorIndex);
  }
  if (action === 'undo-sector' && phase === 'drawing') undoSector();
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
  if(phase==='setup'&&input.matches('[data-driver-badge]')){const i=Number(input.dataset.driverBadge);if(badgeChoices(collection.state).some(b=>b.id===input.value)){preferences.drivers[i].badge=input.value;saveSettings();refreshSetup();}}
  if (phase === 'setup' && input.matches('[data-schedule-count]')) { const n = Math.max(2, Math.min(12, Number(input.value))); tourSetup.schedule = Array.from({ length: n }, (_, i) => tourSetup.schedule[i] ?? circuits[i % circuits.length].id); refreshSetup('[data-schedule-count]'); return; }
  if (phase === 'setup' && input.matches('[data-schedule-index]')) { tourSetup.schedule[Number(input.dataset.scheduleIndex)] = findCircuit(input.value).id; return; }
  if (phase !== 'setup' || !input.matches('[data-driver-name]')) return;
  const index = Number(input.dataset.driverName);
  input.value = preferences.drivers[index].name = cleanDriverName(input.value, index); saveSettings();
});
/** Projects one pointer event into the drawing session (its own timestamp, coalesced events included). */
function appendSample(event: PointerEvent) {
  const point = world.groundPoint(event.clientX, event.clientY, drawing.last); if (point) drawing.add(point, event.timeStamp);
}
canvas.addEventListener('pointerdown', e => {
  if (phase !== 'drawing' || drawing.overview || drawing.drawing || (e.pointerType === 'mouse' && e.button !== 0)) return;
  if (world.cameraMoving && !drawing.samples.length) { e.preventDefault(); return; }
  if (drawing.sectorMode && drawing.samples.length) {
    e.preventDefault();
    if (!continueStroke(e)) return;
    world.holdDrawingView();
    strokeCompiler.cancel();
    world.showError(); world.showContinueHandle(null);
    canvas.setPointerCapture(e.pointerId);
    return;
  }
  const point = world.groundPoint(e.clientX, e.clientY);
  if (!point || !drawing.begin(e.pointerId, point, e.timeStamp)) { world.showError(activeTrack.start); renderPanel('Start inside the outlined box by the finish line.'); return; }
  e.preventDefault(); strokeCompiler.cancel(); world.showError(); canvas.setPointerCapture(e.pointerId);
});
/**
 * Phone sectors: a new touch continues the line only at its glowing end, or a little behind it to retake the
 * last metres. The session picks up from the nearest sample on screen (src/drawing/session.ts).
 */
function continueStroke(e: PointerEvent) {
  let best = -1, bestPx = Infinity;
  for (const i of drawing.continueCandidates()) {
    const p = world.project(drawing.samples[i]), px = Math.hypot(p.x - e.clientX, p.y - e.clientY);
    if (px < bestPx - 0.5) { bestPx = px; best = i; }
  }
  if (best < 0 || bestPx > sectorDrawingAppearance.continueRadiusPx) { renderPanel('Touch the glowing end of your line to continue.'); return false; }
  const point = world.groundPoint(e.clientX, e.clientY, drawing.samples[best]);
  drawing.continueFrom(best, e.pointerId, e.timeStamp, point);
  return true;
}
canvas.addEventListener('pointermove', e => {
  if (phase !== 'drawing' || drawing.pointer !== e.pointerId) return;
  e.preventDefault(); const events = e.getCoalescedEvents?.() ?? []; for (const p of events) appendSample(p); appendSample(e);
});
canvas.addEventListener('pointerup', e => {
  if (drawing.pointer !== e.pointerId || phase !== 'drawing') return;
  const end = drawing.end(e.pointerId, world.groundPoint(e.clientX, e.clientY, drawing.last), e.timeStamp); if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (!end) return;
  if (end.kind === 'sector') { showSector(true, undefined, end.progress); return; }
  strokeCompiler.compile(end.request.samples, activeTrack, result => {
    const outcome = drawing.accept(end.request, result, end.progress);
    if (outcome.kind === 'stale') return;
    if (outcome.kind === 'preview') { showPreview(outcome.route, outcome.trim); return; }
    if (outcome.kind === 'sector') { showSector(true, undefined, outcome.progress); return; }
    world.showError(outcome.point, outcome.section);
    if (outcome.sector) showSector(false, outcome.message, outcome.progress); else renderPanel(outcome.message);
  });
});

function restartSector(index: number) {
  if (!drawing.restartSector(index)) return;
  strokeCompiler.cancel();
  route = null; drawingTrim = undefined; planningNote = undefined;
  if (phase === 'preview') setPhase('drawing');
  world.showError();
  if (drawing.samples.length) showSector(true, undefined, drawing.sectors[index].from);
  else {
    world.showContinueHandle(null);
    world.setDrawingFocus({ course: upcomingCourse(activeTrack, -12, Math.min(drawing.sectors[0].to + 22, sectorDrawingAppearance.courseAhead)), anchors: drawingStartBounds(activeTrack).corners, zoom: drawing.zoom }, true);
    renderPanel();
  }
}

/** Moves the zoomed camera on to the course ahead of the line's end and lights the continue handle. */
function showSector(move = true, message?: string, progress = drawing.measure()) {
  const end = drawing.last; if (!end) return;
  const index = drawing.sectorFor(progress);
  if (move) {
    const ahead = Math.min(sectorDrawingAppearance.courseAhead, Math.max(24, drawing.sectors[index].to - progress + 20));
    world.setDrawingFocus({ course: upcomingCourse(activeTrack, progress - 6, ahead), anchors: [end], zoom: drawing.zoom }, true);
  }
  world.showContinueHandle(end);
  drawing.dirty = true; renderPanel(message);
}
function undoSector() {
  if (!drawing.sectorMode || drawing.drawing) return;
  strokeCompiler.cancel();
  const undone = drawing.undo();
  if (undone === 'restart') { restartSector(0); return; }
  if (undone === 'continue') { world.showError(); showSector(); }
}
function cancelStroke() {
  const result = drawing.cancel();
  if (result === 'restored') { if (phase === 'drawing') showSector(false); return; }
  if (result === 'cleared') { world.drawLine(null); if (phase === 'drawing') renderPanel('That drawing was interrupted. Start a fresh lap at the start line.'); }
}
canvas.addEventListener('pointercancel', cancelStroke); canvas.addEventListener('lostpointercapture', cancelStroke);
function interrupt() {
  const awaitingPreview = strokeCompiler.cancel();
  audio.silence(); pauseRace('app-interruption'); clearRaceInput(); ownership.clear(); pressTracker.clear(); updateDiagnostics(); cancelStroke();
  if (awaitingPreview && phase === 'drawing' && drawing.sectorMode) showSector(false);
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

async function openDuel(code='', reclaimed?:Room, returnCircuit=activeCircuit.id){
  if(duel||openingDuel)return;
  openingDuel=true;
  const previous={circuit:returnCircuit,laps:lapCount,mode:sessionOptions.mode};
  try {
    const { DuelClient }=await import('./duels/client');
    sessionOptions.mode='multiplayer';
    duel=new DuelClient({
      driver:{...preferences.drivers[0],name:cleanDriverName(preferences.drivers[0].name,0)},
      finishes:[...paintFinishes,...rewardPaintFinishes].filter(p=>paintUnlocked(p.id,collection.state)),
      saveDriver(driver){Object.assign(preferences.drivers[0],driver);saveSettings();},
      versions:Object.fromEntries(circuits.map(c=>[c.id,c.track.version])),
      draw(view){remote=undefined;shown=undefined;playback.reset();ownDisplay=undefined;loadDuelVenue(view);turn=Math.max(0,duel!.seatIndex);beginDrawing();},
      ownLine(samples){if(duel?.view && activeCircuit.id!==duel.view.circuit)loadDuelVenue(duel.view);const result=compileRoute(samples,activeTrack);if(result.ok){route=result.route;if(remote)world.drawLine(null);else world.drawLine(route,result.drawing);}},
      frame:receiveDuelFrame,
      ownShown(){const v=world.vehicles[duel?.seatIndex??0]?.root.position;return v?{x:v.x,z:v.z,buffered:ownBuffered}:undefined;},
      home(){duel=undefined;remote=undefined;shown=undefined;playback.reset();lapCount=previous.laps;sessionOptions.mode=previous.mode;if(activeCircuit.id!==previous.circuit)loadCircuit(previous.circuit,false);goHome();},
    });
    duel.open(code,reclaimed);
  } catch {showNotice('Could not load Private Duels. Please refresh.',5);}
  finally{openingDuel=false;}
}
function loadDuelVenue(view:RoomView){
  if(activeCircuit.id!==view.circuit)loadCircuit(view.circuit,false);
  playerCount=view.drivers.length;lapCount=view.laps;world.setPlayers(playerCount);
  applyDriverPresentation();renderControls();
}
function receiveDuelFrame(frame:RaceFrame,view:RoomView){
  const first=!remote || remote.round!==frame.round;
  if(first){
    loadDuelVenue(view);world.setDrawingFocus(null,false);world.showContinueHandle(null);world.showError();world.setPlanningPlayer(null);
    world.showVehicles(null,playerCount);world.drawLine(null);world.vehicles.forEach(v=>v.clearEffects());
  }
  if(first){playback.reset();ownDisplay=undefined;}
  playback.push(frame,performance.now());
  remote=frame;
  const next=frame.countdown?'countdown':view.phase==='results'?'results':'racing';
  if(phase!==next){setPhase(next);if(next==='racing')audio.cue('start');}
  if(frame.countdown){const beat=Math.ceil(frame.countdown/60);countdownElement.dataset.lights=String(4-beat);document.querySelector('#countdown-value')!.textContent=String(beat);if(first||beat!==countdownBeat)audio.cue('countdown');countdownBeat=beat;}
  if(!document.hidden){for(const e of frame.events){audio.cue(e.type,e.intensity);if(e.type==='landing'||e.type==='collision'||e.type==='car-impact')world.vehicles[e.player].impact(e.time,e.type==='landing');if(e.point&&(e.type==='landing'||e.type==='splash'))world.feedback(e.point,e.type==='splash');}
    const s=frame.cars[duel!.seatIndex];if(s)audio.mix({active:next==='racing'&&!s.finished,speed:s.speed,slip:s.drifting?Math.abs(s.slipAngle):0,sand:s.sandAmount});}
  updateHud();
}

async function start() {
let reclaimed:Room|undefined;
try {
  const invitation=new URL(location.href).searchParams.get('duel')?.toUpperCase();
  const inviteCheck=invitation ? checkRoomCode(invitation) : undefined, validInvite=inviteCheck?.ok ? inviteCheck.code : undefined;
  const returnCircuit=activeCircuit.id;
  if(validInvite)reclaimed=await reclaimBeforeGraphics(validInvite);
  // Use the room's invite hint to build its course once on a cold start.
  // Room messages still decide which venue to race and which rules to use.
  const venueHint=circuitQuery.get('duelCircuit');
  if(validInvite && venueHint && Object.prototype.hasOwnProperty.call(duelVenues,venueHint)) {
    activeCircuit=findCircuit(venueHint);activeTrack=activeCircuit.track;audio.setVenue(activeCircuit.scenery);
  }
  const created = await createEngine(canvas, graphicsPreference.renderer); activeRenderer = created.renderer;
  world = new GameScene(canvas, activeTrack, theme, activeCircuit.scenery, created.engine, graphicsChoice); world.onGraphicsChange = onGraphicsChange; applyDriverPresentation(); renderControls(); refreshLap(); refreshSettings(); setPhase('welcome');
  // An old or broken invite still opens the duel dialog, which explains what to do.
  if(validInvite || inviteCheck)void openDuel(validInvite ?? invitation!,reclaimed,returnCircuit);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); pauseRace(); showNotice('The graphics were interrupted. Reload if the circuit does not recover.', 10); });
  world.engine.runRenderLoop(() => {
    const now = performance.now(), elapsed = (now - lastFrame) / 1000; lastFrame = now;
    // Capture every timestamp, but rebuild the live line at most once per rendered frame.
    if (phase === 'drawing' && drawing.dirty) { drawing.dirty = false; world.drawLine(drawing.samples); }
    if(duel && remote){
      // Draw the cars 100 ms behind the server from buffered frames, never blending across a recovery.
      const sample=playback.sample(now);
      if(sample){shown=sample.to;previousPoses=sample.to.cars.map((car,i)=>{const a=sample.from.cars[i]??car,src=a.recoveryCount===car.recoveryCount?a:car;return{...src.position,y:src.elevation,heading:src.heading};});}
      // Your own car: where it will be when a press sent now reaches the room (other cars stay 100 ms behind).
      const latest=playback.latest,own=duel.seatIndex,ownCar=latest?.cars[own];
      const f=sample?.from.cars[own],t=sample?.to.cars[own],a=sample?.alpha??1;
      const buffered=f&&t?{x:f.position.x+(t.position.x-f.position.x)*a,z:f.position.z+(t.position.z-f.position.z)*a,y:f.elevation+(t.elevation-f.elevation)*a,heading:t.heading}:undefined;
      ownBuffered=buffered&&{x:buffered.x,z:buffered.z};
      if(sample&&ownCar&&route){
        if(ownDisplay?.route!==route)ownDisplay=new OwnCarDisplay(route,activeTrack);
        const pose=ownDisplay.update(now,ownCar,latest?playback.aheadOf(latest,now,duel.oneWayMs):0,buffered,activeTrack.decks?p=>supported(p,activeTrack)?groundHeight(p,activeTrack):undefined:undefined);
        shown={...sample.to,cars:sample.to.cars.map((car,i)=>i===own?{...ownCar,position:{x:pose.x,z:pose.z},elevation:pose.y,heading:pose.heading}:car)};previousPoses[own]={...pose};
      }
      updateVehicles(sample?.alpha??1);
      world.render(now/1000,false);return;
    }
    if (phase === 'racing' && elapsed > 0.5 && !testClock) pauseRace('render-delay');
    // A resumed tutorial race returns to its unanswered prompt before any further step.
    if (phase === 'racing' && tutorial?.awaiting) setPhase('coaching');
    if (phase === 'countdown') {
      countdownRemaining -= Math.min(elapsed, 0.1) * simRate; document.querySelector('#countdown-value')!.textContent = String(Math.max(1, Math.ceil(countdownRemaining)));
      countdownElement.dataset.lights = String(Math.max(1, 4 - Math.ceil(countdownRemaining)));
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
        if(record){if(!personalLap||record.duration<personalLap.duration){personalLap=record;sessionLapRecord=true;void saveLap(record);}activeGhost=personalLap;}
 });
      for (const event of session.drainEvents()) {
        if (event.player === 0 && challengeTracker?.observe(event) && activeChallenge) {
          challengeAttemptComplete = true;
          challenges.record({ id: activeChallenge, human: true, source: practiceTurns.size ? 'practice' : 'live', completed: true });
        }
        if(event.lapSummary)recordProgress({trackId:activeTrack.id,human:controllerFor(sessionOptions.mode,event.player)==='human',source:sessionOptions.mode==='tutorial'?'tutorial':practiceTurns.size?'practice':'live',mode:sessionOptions.mode,lap:event.lapSummary});
        audio.cue(event.type, event.intensity); if (event.type === 'thrust') rechargeAnnounced[event.player] = false; const prefix = playerCount > 1 ? `${driverName(event.player)} · ` : '';
        if ((event.type === 'landing' || event.type === 'splash') && event.point) world.feedback(event.point, event.type === 'splash');
        if (event.type === 'landing') world.vehicles[event.player].impact(event.time, true);
        // Reward only after the fact: hidden trails stay unmarked until a driver has cleared one.
        if (event.type === 'landing' && event.flightOrigin === 'hop' && event.point && controllerFor(sessionOptions.mode, event.player) === 'human') { const cleared = clearedShortcut(event.point, session.racers[event.player].route, activeTrack); if (cleared) showNotice(`${prefix}Shortcut cleared · ${Math.round(cleared.saved)} m saved`, 2.2); }
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
      if (session.finished) { if (activeTour && activeTour.state.results.length === roundIndex) { activeTour.state = finalizeRound(activeTour.state, roundIndex, { circuitId: activeTrack.id, trackVersion: activeTrack.version }, session.standings().map(r => ({ player: r.player, rank: r.rank, finishTime: r.finishTime! }))); persistTour(); } recordRaceProgress(session); recordCupChallenge(); if (playerCount === 1 && sessionOptions.mode !== 'tutorial') { best = Math.min(best ?? Infinity, session.racers[0].state.finishTime!); bestTimes.set(bestKey(), best); } notice.textContent = ''; clearRaceInput(); setPhase('results'); }
      else if (tutorial && phase === 'racing') {
        const due = duePrompt(tutorial, session.racers[0].state, confirmedRoutes[0]);
        if (due) { tutorial.awaiting = due; clearRaceInput(); audio.cue('ready'); setPhase('coaching'); }
      }
    } else if (phase === 'ready' || phase === 'countdown' || phase === 'paused' || phase === 'coaching') updateVehicles(1);
    if (now > noticeUntil && notice.textContent) notice.textContent = '';
    world.render(now / 1000, phase === 'welcome' || phase === 'tour-resume');
  });
  if (import.meta.env.DEV) installDevApi(() => ({ phase, pauseReason, sessionOptions, humans, playerCount, personalLap, preferences, activeTour, roundIndex, race, activeCircuit, theme, lapCount, turn, confirmedRoutes, readyPlayers, world, route, drawingTrim, best, stroke: drawing.samples, activeTrack, raceTouches: input.touches, ownership, audio, usePractice, driverName, driverPaint, tutorial, activeChallenge }));
} catch (error) { if(reclaimed)void reclaimed.leave().catch(()=>{}); console.error(error); canvas.hidden = true; setPhase('error'); renderPanel(error instanceof Error ? error.message : undefined); }
}
void start();
