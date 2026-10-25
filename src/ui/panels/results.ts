// Pure panel markup. Callers pass already-resolved display data; nothing here touches the DOM or game state.
import type { RaceState } from '../../core/types';
import type { Standing } from '../../core/local-race';
import { formatTime } from '../format';
import { arrow, playerChip } from './common';

/** Time Trial: the fastest lap is the result; `personalBest` is the stored record, if any. */
export interface TimeTrialResultsView { state: RaceState; lapCount: number; driver: string; personalBest?: number }
export function timeTrialResultsPanel({ state: s, lapCount, driver, personalBest }: TimeTrialResultsView) {
  const time = Math.min(...s.lapTimes), newBest = time <= (personalBest ?? Infinity) + 0.0001;
  return `<span class="eyebrow">${driver} / ${lapCount} ${lapCount === 1 ? 'LAP' : 'LAPS'}</span><h2>${newBest ? 'Personal best lap.' : 'Time trial complete.'}</h2><div class="finish-time">${formatTime(time)}</div><div class="result-detail">${s.lapTimes.map((lap, index) => `<span>Lap ${index + 1} <b>${formatTime(lap)}</b></span>`).join('')}</div><div class="result-summary"><span>Total ${formatTime(s.finishTime!)} · ${s.thrustCount} thrust ${s.thrustCount === 1 ? 'burst' : 'bursts'}</span><span>Best lap <b>${formatTime(personalBest??time)}</b></span></div><div class="panel-actions"><button class="primary-button" data-action="retry">Restart ${arrow}</button><button class="text-button" data-action="redraw">Draw new lines</button><button class="secondary-button" data-action="home">Home</button></div>`;
}
export interface RaceResultsView { standings: Standing[]; lapTimes: number[][]; playerName: (player: number) => string; cpuTag: (player: number) => string }
export function raceResultsPanel({ standings, lapTimes, playerName, cpuTag }: RaceResultsView) {
  const winners = standings.filter(s => s.rank === 1);
  return `<span class="eyebrow">THE LINES HAVE SPOKEN</span><h2>${winners.length > 1 ? 'A shared victory.' : `${playerName(winners[0].player)} takes it.`}</h2><table class="standings"><caption class="sr-only">Finishing order and race times</caption><thead><tr><th>Place</th><th>Player</th><th>Time</th></tr></thead><tbody>${standings.map(s => `<tr><td>${s.rank}${standings.some(other => other.player !== s.player && other.rank === s.rank) ? '=' : ''}</td><th scope="row">${playerChip(s.player)} ${playerName(s.player)}${cpuTag(s.player)}</th><td>${formatTime(s.finishTime!)}<small class="standing-laps">${lapTimes[s.player].map((lap, index) => `L${index + 1} ${formatTime(lap)}`).join(' · ')}</small></td></tr>`).join('')}</tbody></table><div class="panel-actions"><button class="primary-button" data-action="retry">Restart ${arrow}</button><button class="text-button" data-action="redraw-all">Draw new lines</button><button class="secondary-button" data-action="home">Home</button></div>`;
}
