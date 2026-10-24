import type { Ability } from '../core/types';
import type { GameMode } from '../core/session';

/** Every interface phase of a session. Transitions are coordinated by main.ts. */
export type Phase = 'welcome' | 'setup' | 'handoff' | 'drawing' | 'preview' | 'ready' | 'countdown' | 'racing' | 'paused' | 'results' | 'diagnostics' | 'error' | 'tour-intro' | 'tour-resume' | 'tour-exit' | 'tour-replace';

const among = (phase: Phase, list: readonly Phase[]) => list.includes(phase);

/** Pure presentation rules per phase: which overlays show, and what the scene and audio do. */
export function phaseLayout(phase: Phase) {
  return {
    hudVisible: among(phase, ['racing', 'countdown', 'paused']),
    padVisible: (ability: Ability) => among(phase, ['ready', 'racing', 'countdown']) && !(phase === 'ready' && ability === 'hop'),
    padsDisabled: phase === 'countdown',
    pauseVisible: phase === 'racing',
    countdownVisible: phase === 'countdown',
    diagnosticsVisible: phase === 'diagnostics',
    progressVisible: among(phase, ['racing', 'paused']),
    panelVisible: !among(phase, ['racing', 'countdown', 'diagnostics']),
    /** Numbered pre-start labels; floating tags stay hidden while racing. */
    labelsVisible: among(phase, ['ready', 'countdown']),
    startGateVisible: among(phase, ['welcome', 'drawing', 'preview']),
    sceneLayout: phase.startsWith('tour-') ? 'results' : phase,
    ghostAllowed: among(phase, ['racing', 'paused', 'countdown']),
    driveAudio: phase === 'racing',
    silence: among(phase, ['paused', 'welcome', 'drawing', 'diagnostics', 'error']),
  };
}

export const modeLabel = (mode: GameMode, count: number) => mode === 'time-trial' ? 'TIME TRIAL' : mode === 'solo-race' ? 'SOLO RACE' : `${count} PLAYER LOCAL RACE`;
