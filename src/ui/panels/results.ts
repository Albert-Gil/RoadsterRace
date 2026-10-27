// Pure panel markup. Callers pass already-resolved display data; nothing here touches the DOM or game state.
import type { RaceState } from '../../core/types';
import type { Standing } from '../../core/local-race';
import { escapeHtml } from '../../presentation/race-settings';
import { formatTime } from '../format';
import { chevronIcon, playerChip, tags } from './common';

const laps = (count: number) => `${count} ${count === 1 ? 'LAP' : 'LAPS'}`;
/** Single-race result actions: Restart (same lines), Draw new lines and Home, all direct. */
const resultActions = (redraw: 'redraw' | 'redraw-all') => `<div class="panel-actions result-actions"><button class="primary-button" data-action="retry">Restart ${chevronIcon}</button><button class="secondary-button" data-action="${redraw}">Draw new lines</button><button class="secondary-button" data-action="home">Home</button></div>`;

/** Time Trial: the fastest lap is the result; `personalBest` is the stored record, if any. */
export interface TimeTrialResultsView { state: RaceState; lapCount: number; driver: string; trackName: string; personalBest?: number }
export function timeTrialResultsPanel({ state: s, lapCount, driver, trackName, personalBest }: TimeTrialResultsView) {
  const time = Math.min(...s.lapTimes), newBest = time <= (personalBest ?? Infinity) + 0.0001;
  return `${tags('TIME TRIAL', `${escapeHtml(trackName.toUpperCase())} · ${laps(lapCount)}`)}<h2>${newBest ? 'Personal best lap.' : 'Time trial complete.'}</h2><span class="result-driver">${driver} · fastest lap</span><div class="finish-time">${formatTime(time)}</div><div class="result-detail">${s.lapTimes.map((lap, index) => `<span>Lap ${index + 1} <b>${formatTime(lap)}</b></span>`).join('')}</div><div class="result-summary"><span>Total ${formatTime(s.finishTime!)} · ${s.thrustCount} thrust ${s.thrustCount === 1 ? 'burst' : 'bursts'}</span><span>Best lap <b>${formatTime(personalBest ?? time)}</b></span></div>${resultActions('redraw')}`;
}

/** Classification for Solo Race and Multiplayer: one row per car in finishing order, with lap splits. */
export interface RaceResultsView { standings: Standing[]; lapTimes: number[][]; playerName: (player: number) => string; cpuTag: (player: number) => string; trackName: string; lapCount: number }
export function raceResultsPanel({ standings, lapTimes, playerName, cpuTag, trackName, lapCount }: RaceResultsView) {
  const winners = standings.filter(s => s.rank === 1);
  return `${tags('CLASSIFICATION', `${escapeHtml(trackName.toUpperCase())} · ${laps(lapCount)}`)}<h2>${winners.length > 1 ? 'A shared victory.' : `${playerName(winners[0].player)} takes it.`}</h2><div class="results-scroll"><table class="standings"><caption class="sr-only">Finishing order and race times</caption><thead><tr><th>Place</th><th>Player</th><th>Time</th></tr></thead><tbody>${standings.map(s => `<tr><td>${s.rank}${standings.some(other => other.player !== s.player && other.rank === s.rank) ? '=' : ''}</td><th scope="row">${playerChip(s.player)} ${playerName(s.player)}${cpuTag(s.player)}</th><td>${formatTime(s.finishTime!)}<small class="standing-laps">${lapTimes[s.player].map((lap, index) => `L${index + 1} ${formatTime(lap)}`).join(' · ')}</small></td></tr>`).join('')}</tbody></table></div>${resultActions('redraw-all')}`;
}
