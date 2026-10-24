import { clamp } from '../core/geometry';
import { RULES } from '../core/simulation';
import type { LocalRace } from '../core/local-race';
import type { GameMode } from '../core/session';
import type { Phase } from '../app/phases';
import { formatTime } from './format';
import { THRUST_KEYS } from '../input/router';

/** Everything the race HUD and ability pads display; read from the session each frame. */
export interface HudView {
  phase: Phase; race: LocalRace | null; mode: GameMode; playerCount: number; lapCount: number; trackLength: number;
  tourLabel: string; personalBest?: number; readyPlayers: boolean[]; driverName: (player: number) => string;
  hud: HTMLElement; controls: HTMLElement; raceProgress: HTMLElement;
}
export function renderHud({ phase, race, mode, playerCount, lapCount, trackLength, tourLabel, personalBest, readyPlayers, driverName, hud, controls, raceProgress }: HudView) {
  const standings = race?.standings() ?? [], first = race?.racers[0].state;
  if (first && race) {
    const ghost = phase === 'racing' && race.ghostStartRemaining > 0;
    const leader = mode==='solo-race'?first:race.racers[standings[0].player].state;
    hud.dataset.round = tourLabel;
    hud.querySelector('#race-time')!.textContent = formatTime(mode==='time-trial'?Math.max(0,first.time-first.lapStartedAt):race.time);
    hud.querySelector('#lap-label')!.textContent = mode!=='multiplayer'?'LAP':'LEADER LAP'; hud.querySelector('#race-lap')!.innerHTML = `${leader.lap} <i>/ ${lapCount}</i>`;
    hud.querySelector('#pace-label')!.textContent = mode==='time-trial'?'BEST LAP':mode==='solo-race'&&!ghost?'POSITION':ghost ? 'GHOST START' : playerCount === 1 ? first.surface === 'sand' ? 'SAND' : first.drifting ? 'DRIFT' : 'PACE' : 'FINISHED';
    hud.querySelector('#race-speed')!.innerHTML = mode==='time-trial'?(personalBest!==undefined?formatTime(personalBest):'—'):mode==='solo-race'&&!ghost?`${standings.find(s=>s.player===0)!.rank} <i>/ 4</i>`:ghost ? `${Math.ceil(race.ghostStartRemaining)} <i>s</i>` : playerCount === 1 ? `${Math.round(first.speed * 3.6)} <i>km/h</i>` : `${standings.filter(s => s.finished).length} <i>/ ${playerCount}</i>`;
    raceProgress.querySelector<HTMLElement>('span')!.style.width = `${standings[0].progress / (trackLength * lapCount) * 100}%`;
  }
  controls.querySelectorAll<HTMLButtonElement>('.ability-control').forEach(pad => {
    const i = Number(pad.dataset.racer), hop = pad.dataset.ability === 'hop';
    const s = race?.racers[i].state, remaining = s ? Math.max(0, (hop ? s.hopReadyAt : s.thrustReadyAt) - s.time) : 0;
    const recovering = !!s && (s.time < s.recoveringUntil || s.recoveryWaiting);
    pad.disabled = phase === 'countdown' || (phase === 'racing' && (!!s?.finished || recovering || hop && s?.movement === 'airborne'));
    pad.style.setProperty('--charge', `${clamp(1 - remaining / (hop ? RULES.hopRecharge : RULES.thrustRecharge), 0, 1) * 360}deg`);
    if (hop) {
      pad.dataset.ready = String(remaining < 0.001 && s?.movement !== 'airborne');
      pad.dataset.firing = String(!!s && s.flightOrigin === 'hop' && s.time - s.flightStartedAt < 0.25);
      pad.querySelector('.hop-status')!.textContent = s?.finished ? 'DONE' : recovering ? 'WAIT' : remaining > 0.001 ? `${remaining.toFixed(1)}s` : s?.movement === 'airborne' ? 'AIR' : 'READY';
      return;
    }
    pad.dataset.ready = String(phase === 'ready' ? readyPlayers[i] : remaining < 0.001); pad.dataset.firing = String(phase === 'racing' && !!s && s.time < s.thrustUntil);
    pad.querySelector('.pod-title')!.textContent = phase === 'ready' ? readyPlayers[i] ? 'READY ✓' : 'TAP READY' : recovering ? 'RECOVERING' : s?.finished ? 'FINISHED' : 'THRUST';
    pad.querySelector('.pod-status')!.textContent = phase === 'ready' ? readyPlayers[i] ? 'WAIT FOR FRIENDS' : driverName(i) : s?.finished ? formatTime(s.finishTime!) : remaining < 0.001 ? 'READY' : `${remaining.toFixed(1)}s`;
    if (playerCount > 1) { pad.querySelector('.pod-rank')!.textContent = s ? `#${standings.find(item => item.player === i)!.rank}` : ''; pad.querySelector('.pod-lap')!.textContent = `${s && !s.finished ? s.surface === 'sand' ? 'SAND · ' : s.drifting ? 'DRIFT · ' : '' : ''}LAP ${s?.lap ?? 1}/${lapCount} · ${THRUST_KEYS[i].slice(3)}`; }
  });
}
