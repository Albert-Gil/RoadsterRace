import { describe, expect, test } from 'vitest';
import { keyCommand } from '../../src/input/router';
import { modeLabel, phaseLayout } from '../../src/app/phases';
import { welcomePanel } from '../../src/ui/panels/welcome';
import { planningPanel } from '../../src/ui/panels/planning';
import { raceResultsPanel, timeTrialResultsPanel } from '../../src/ui/panels/results';
import { tourIntroPanel } from '../../src/ui/panels/tournament';
import { readyPanel } from '../../src/ui/panels/race';
import { formatTime } from '../../src/ui/format';
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
    const saved = welcomePanel({ tagline: 'Your line. Your race.', savedTour: { completed: 2, total: 4 }, incompatibleTour: true });
    expect(saved).toContain('2/4 RACES'); expect(saved).toContain('cannot resume'); expect(saved).toContain('Your line.<br>Your race.');
  });
  test('planning keeps shortcut requirements hidden and escapes validation messages', () => {
    const html = planningPanel({ preview: true, playerCount: 1, turn: 0, playerName: () => 'P', humans: () => 1, inTour: false, message: '<b>x</b>' });
    expect(html).not.toContain('Hop required'); expect(html).toContain('&lt;b&gt;x&lt;/b&gt;'); expect(html).toContain('aria-label="Race this line"');
    expect(planningPanel({ preview: false, playerCount: 2, turn: 1, playerName: () => 'Bea', humans: () => 2, inTour: true })).toContain('data-action="home"');
  });
  test('race results mark shared places and time trial reports the fastest lap', () => {
    const standings = [{ player: 1, rank: 1, progress: 0, finished: true, finishTime: 40.001 }, { player: 0, rank: 1, progress: 0, finished: true, finishTime: 40.004 }, { player: 2, rank: 3, progress: 0, finished: true, finishTime: 41 }];
    const html = raceResultsPanel({ standings, lapTimes: [[20, 20.004], [20, 20.001], [20.5, 20.5]], playerName: i => `D${i}`, cpuTag: () => '' });
    expect(html).toContain('A shared victory.'); expect((html.match(/<td>1=<\/td>/g) ?? []).length).toBe(2); expect(html).toContain(formatTime(41));
    const state = { lapTimes: [21.5, 20.25], finishTime: 41.75, thrustCount: 1 } as RaceState;
    const tt = timeTrialResultsPanel({ state, lapCount: 2, driver: 'Ann', personalBest: 20.25 });
    expect(tt).toContain('Personal best lap.'); expect(tt).toContain(`<div class="finish-time">${formatTime(20.25)}</div>`); expect(tt).toContain('1 thrust burst');
    expect(timeTrialResultsPanel({ state, lapCount: 2, driver: 'Ann', personalBest: 19 })).toContain('Time trial complete.');
  });
  test('tournament intro lists rounds with progress, ready check counts drivers', () => {
    const intro = tourIntroPanel({ roundIndex: 1, roundNames: ['A', 'B', 'C'], trackName: 'B', playerCount: 2, lapCount: 1, saveFailed: true });
    expect(intro).toContain('ROUND 2 / 3'); expect(intro).toContain('class="done">1 · A'); expect(intro).toContain('class="current">2 · B'); expect(intro).toContain('could not be saved');
    expect(readyPanel({ playerCount: 3, lapCount: 2, readyPlayers: [true, false, true], ghostSeconds: 3 })).toContain('2 / 3 ready');
  });
});
