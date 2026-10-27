import { describe, expect, test } from 'vitest';
import { keyCommand } from '../../src/input/router';
import { modeLabel, phaseLayout } from '../../src/app/phases';
import { welcomePanel } from '../../src/ui/panels/welcome';
import { planningPanel } from '../../src/ui/panels/planning';
import { raceResultsPanel, timeTrialResultsPanel } from '../../src/ui/panels/results';
import { tourIntroPanel } from '../../src/ui/panels/tournament';
import { readyPanel } from '../../src/ui/panels/race';
import { formatTime } from '../../src/ui/format';
import { appShellMarkup } from '../../src/app/shell';
import { arrivesHome, nextHero } from '../../src/app/hero';
import { handoffPanel } from '../../src/ui/panels/planning';
import { settingsPanel } from '../../src/ui/panels/settings';
import { pausedPanel } from '../../src/ui/panels/race';
import { raceSetupMarkup } from '../../src/presentation/race-setup';
import { defaultPreferences } from '../../src/presentation/race-settings';
import { UI_SCALE, uiScale } from '../../src/app/ui-scale';
import type { RaceState } from '../../src/core/types';

describe('input routing', () => {
  test('solo uses Space/H; multiplayer uses per-player thrust and hop keys', () => {
    expect(keyCommand('Space', 1)).toEqual({ player: 0, ability: 'thrust' });
    expect(keyCommand('KeyH', 1)).toEqual({ player: 0, ability: 'hop' });
    expect(keyCommand('KeyA', 1).player).toBe(-1);
    expect(['KeyA', 'KeyL', 'KeyQ', 'KeyP'].map(k => keyCommand(k, 4))).toEqual([0, 1, 2, 3].map(player => ({ player, ability: 'thrust' })));
    expect(['KeyZ', 'KeyK', 'KeyW', 'KeyO'].map(k => keyCommand(k, 4))).toEqual([0, 1, 2, 3].map(player => ({ player, ability: 'hop' })));
    expect(keyCommand('Space', 3).player).toBe(-1);
  });
  test('a focused pad takes Space/Enter, and a disabled focused pad consumes nothing', () => {
    expect(keyCommand('Enter', 2, { disabled: false, racer: 1, ability: 'hop' })).toEqual({ player: 1, ability: 'hop' });
    expect(keyCommand('Space', 1, { disabled: true, racer: 0, ability: 'thrust' }).player).toBe(-1);
    expect(keyCommand('KeyA', 2, { disabled: false, racer: 1, ability: 'hop' })).toEqual({ player: 0, ability: 'thrust' });
  });
});

describe('phase layout', () => {
  test('controls, HUD and panel visibility follow the phase', () => {
    const ready = phaseLayout('ready'), racing = phaseLayout('racing'), countdown = phaseLayout('countdown');
    expect(ready.padVisible('thrust')).toBe(true); expect(ready.padVisible('hop')).toBe(false); expect(ready.hudVisible).toBe(false);
    expect(countdown.padsDisabled).toBe(true); expect(countdown.panelVisible).toBe(false); expect(countdown.labelsVisible).toBe(true);
    expect(racing.pauseVisible).toBe(true); expect(racing.labelsVisible).toBe(false); expect(racing.driveAudio).toBe(true);
    expect(phaseLayout('tour-exit').sceneLayout).toBe('results'); expect(phaseLayout('paused').silence).toBe(true);
    expect(phaseLayout('welcome').startGateVisible).toBe(true); expect(phaseLayout('setup').startGateVisible).toBe(false);
  });
  test('mode labels', () => {
    expect([modeLabel('time-trial', 1), modeLabel('solo-race', 4), modeLabel('multiplayer', 3)]).toEqual(['TIME TRIAL', 'SOLO RACE', '3 PLAYER LOCAL RACE']);
  });
});

describe('panel markup', () => {
  test('welcome offers resume only for a saved tour, and explains an incompatible save', () => {
    expect(welcomePanel({ tagline: 'Your line. Your race.', savedTour: null, incompatibleTour: false })).not.toContain('resume-tour');
    const saved = welcomePanel({ tagline: 'Your line. Your race.', savedTour: { completed: 2, total: 4, leader: { name: 'Maya', points: 16 } }, incompatibleTour: false });
    expect(saved).toContain('2/4 RACES · MAYA LEADS ON 16 PTS'); expect(saved).toContain('aria-label="Resume tournament"'); expect(saved).toContain('Your line.<br><em>Your race.</em>');
    expect(welcomePanel({ tagline: 'Find your flow.', savedTour: null, incompatibleTour: true })).toContain('cannot resume');
    // Four mode bars keep their plain names; the short notes are descriptions, not part of the name.
    expect(['Solo Race', 'Multiplayer', 'Time Trial', 'Tutorial'].every(name => saved.includes(`aria-label="${name}"`))).toBe(true);
  });
  test('planning keeps shortcut requirements hidden and escapes validation messages', () => {
    const html = planningPanel({ preview: true, playerCount: 1, turn: 0, playerName: () => 'P', humans: () => 1, inTour: false, message: '<b>x</b>' });
    expect(html).not.toContain('Hop required'); expect(html).toContain('&lt;b&gt;x&lt;/b&gt;'); expect(html).toContain('aria-label="Race this line"');
    expect(planningPanel({ preview: false, playerCount: 2, turn: 1, playerName: () => 'Bea', humans: () => 2, inTour: true })).toContain('data-action="home"');
  });
  test('race results mark shared places and time trial reports the fastest lap', () => {
    const standings = [{ player: 1, rank: 1, progress: 0, finished: true, finishTime: 40.001 }, { player: 0, rank: 1, progress: 0, finished: true, finishTime: 40.004 }, { player: 2, rank: 3, progress: 0, finished: true, finishTime: 41 }];
    const html = raceResultsPanel({ standings, lapTimes: [[20, 20.004], [20, 20.001], [20.5, 20.5]], playerName: i => `D${i}`, cpuTag: () => '', trackName: 'Launchsite', lapCount: 2 });
    expect(html).toContain('LAUNCHSITE · 2 LAPS');
    expect(html).toContain('A shared victory.'); expect((html.match(/<td>1=<\/td>/g) ?? []).length).toBe(2); expect(html).toContain(formatTime(41));
    expect(['retry', 'redraw-all', 'home'].map(action => html.includes(`data-action="${action}"`))).toEqual([true, true, true]);
    expect(html).not.toContain('data-action="configure-race"');
    const state = { lapTimes: [21.5, 20.25], finishTime: 41.75, thrustCount: 1 } as RaceState;
    const tt = timeTrialResultsPanel({ state, lapCount: 2, driver: 'Ann', trackName: 'Newport Island', personalBest: 20.25 });
    expect(['retry', 'redraw', 'home'].map(action => tt.includes(`data-action="${action}"`))).toEqual([true, true, true]);
    expect(tt).toContain('Personal best lap.'); expect(tt).toContain(`<div class="finish-time">${formatTime(20.25)}</div>`); expect(tt).toContain('1 thrust burst');
    expect(timeTrialResultsPanel({ state, lapCount: 2, driver: 'Ann', trackName: 'Newport Island', personalBest: 19 })).toContain('Time trial complete.');
  });
  test('tournament intro lists rounds with progress, ready check counts drivers', () => {
    const intro = tourIntroPanel({ roundIndex: 1, roundNames: ['A', 'B', 'C'], trackName: 'B', tagline: 'Go.', playerCount: 2, lapCount: 1, saveFailed: true });
    expect(intro).toContain('ROUND 2 / 3'); expect(intro).toContain('class="done"><b>01</b><span>A</span>'); expect(intro).toContain('class="current" aria-current="step"><b>02</b><span>B</span>'); expect(intro).toContain('could not be saved');
    const ready = readyPanel({ playerCount: 3, lapCount: 2, readyPlayers: [true, false, true], ghostSeconds: 3, playerName: i => `P${i}` });
    expect(ready).toContain('2 / 3 ready'); expect((ready.match(/data-ready="true"/g) ?? []).length).toBe(2);
  });
});

describe('navigation and sizing', () => {
  test('Home is in the planning rail (Exit stands in for it in tours and the tutorial) and on the ready screen', () => {
    const view = { playerCount: 1, turn: 0, playerName: () => 'P', humans: () => 1, inTour: false };
    expect(planningPanel({ ...view, preview: false })).toContain('data-action="home"');
    expect(planningPanel({ ...view, preview: true })).toContain('data-action="home"');
    expect((planningPanel({ ...view, inTour: true, preview: false }).match(/data-action="home"/g) ?? []).length).toBe(1);
    expect(readyPanel({ playerCount: 2, lapCount: 1, readyPlayers: [false, false], ghostSeconds: 3, playerName: i => `P${i}` })).toContain('data-action="home"');
    expect(appShellMarkup()).toContain('class="quiet-button home-link" data-action="home"');
    // Setup and handoff rely on the header's Home: they carry no second one.
    expect(handoffPanel({ confirmedCount: 1, playerCount: 2, turn: 1, playerName: () => 'Bea' })).not.toContain('data-action="home"');
    expect(raceSetupMarkup(defaultPreferences(), 1, undefined, { mode: 'solo-race', difficulty: 'normal', seed: 1 })).not.toContain('data-action="home"');
    expect((pausedPanel({ soundOn: true, status: '' }).match(/data-action="home"/g) ?? []).length).toBe(1);
  });
  test('Settings holds sound, touch test, graphics and renderer; setup no longer does', () => {
    const html = settingsPanel({ soundOn: false, graphics: { choice: 'auto', level: 'medium', renderer: 'webgpu', activeRenderer: 'webgl2' }, buildId: 'abc<1>' });
    expect(html).toContain('id="sound-button" data-action="sound" aria-pressed="false"'); expect(html).toContain('data-action="diagnostics"');
    expect(html).toContain('aria-label="Graphics quality"'); expect(html).toContain('aria-label="Renderer"');
    expect(html).toContain('WebGPU unavailable here · using WebGL 2'); expect(html).toContain('TEST BUILD abc&lt;1&gt;');
    expect(appShellMarkup()).toContain('<dialog id="settings"'); expect(appShellMarkup()).not.toContain('Touch test');
    const setup = raceSetupMarkup(defaultPreferences(), 2, { enabled: false, custom: false, schedule: [] });
    expect(setup).not.toContain('data-action="graphics"'); expect(setup).not.toContain('data-action="renderer"'); expect(setup).toContain('01 /</span> RACE FORMAT');
  });
  test('Home key art changes on every arrival at Home and never repeats the previous picture', () => {
    const sequence = [0.99, 0, 0.5, 0.2, 0.7, 0.1];
    let previous: number | null = null;
    for (const r of sequence) { const next = nextHero(5, previous, () => r); expect(next).toBeGreaterThanOrEqual(0); expect(next).toBeLessThan(5); if (previous !== null) expect(next).not.toBe(previous); previous = next; }
    expect(nextHero(1, 0)).toBe(0);
    expect(arrivesHome(null, 'welcome')).toBe(true); expect(arrivesHome('results', 'welcome')).toBe(true); expect(arrivesHome('setup', 'welcome')).toBe(true);
    // Settings' touch test and the discard confirmation are part of Home: returning keeps the picture.
    expect(arrivesHome('diagnostics', 'welcome')).toBe(false); expect(arrivesHome('tour-resume', 'welcome')).toBe(false); expect(arrivesHome('welcome', 'setup')).toBe(false);
  });
  test('the preview note about crash stretches is informational, never an alert', () => {
    const html = planningPanel({ preview: true, playerCount: 1, turn: 0, playerName: () => 'P', humans: () => 1, inTour: false, note: 'Your line hits a wall in one place.' });
    expect(html).toContain('role="status"'); expect(html).not.toContain('role="alert"'); expect(html).toContain('aria-label="Race this line"');
  });
  test('controls keep phone sizes on phones and mouse layouts, and grow on large touch screens', () => {
    expect(uiScale(430, 932, true)).toBe(1); expect(uiScale(932, 430, true)).toBe(1); expect(uiScale(390, 844, true)).toBe(1);
    expect(uiScale(1440, 900, false)).toBe(1);
    expect(uiScale(600, 960, true)).toBeCloseTo(600 / 430, 6); expect(uiScale(744, 1133, true)).toBe(UI_SCALE.max); expect(uiScale(820, 1180, true)).toBe(UI_SCALE.max); expect(uiScale(1366, 1024, true)).toBe(UI_SCALE.max);
  });
});
