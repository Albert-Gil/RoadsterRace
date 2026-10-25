import type { Ability } from '../core/types';
import type { GameMode } from '../core/session';

/** Every interface phase of a session. Transitions are coordinated by main.ts. */
export type Phase = 'welcome' | 'setup' | 'handoff' | 'drawing' | 'preview' | 'ready' | 'countdown' | 'racing' | 'paused' | 'results' | 'diagnostics' | 'error' | 'tour-intro' | 'tour-resume' | 'tour-exit' | 'tour-replace' | 'tutorial-intro' | 'coaching';

/** `coaching` freezes a tutorial race until the player tries the prompted ability. */

const among = (phase: Phase, list: readonly Phase[]) => list.includes(phase);

/** Pure presentation rules per phase: which overlays show, and what the scene and audio do. */
export function phaseLayout(phase: Phase) {
  return {
    hudVisible: among(phase, ['racing', 'countdown', 'paused', 'coaching']),
    padVisible: (ability: Ability) => among(phase, ['ready', 'racing', 'countdown', 'coaching']) && !(phase === 'ready' && ability === 'hop'),
    padsDisabled: phase === 'countdown',
    pauseVisible: among(phase, ['racing', 'coaching']),
    countdownVisible: phase === 'countdown',
    diagnosticsVisible: phase === 'diagnostics',
    progressVisible: among(phase, ['racing', 'paused', 'coaching']),
    panelVisible: !among(phase, ['racing', 'countdown', 'diagnostics', 'coaching']),
    /** Numbered pre-start labels; floating tags stay hidden while racing. */
    labelsVisible: among(phase, ['ready', 'countdown']),
    startGateVisible: among(phase, ['welcome', 'tutorial-intro', 'drawing', 'preview']),
    sceneLayout: phase.startsWith('tour-') ? 'results' : phase === 'tutorial-intro' ? 'welcome' : phase === 'coaching' ? 'racing' : phase,
    ghostAllowed: among(phase, ['racing', 'paused', 'countdown', 'coaching']),
    driveAudio: phase === 'racing',
    menuMusic: among(phase, ['welcome', 'tutorial-intro', 'setup', 'results', 'tour-intro', 'tour-resume', 'tour-exit', 'tour-replace']),
    silence: among(phase, ['paused', 'welcome', 'drawing', 'diagnostics', 'error']),
  };
}

export const modeLabel = (mode: GameMode, count: number) => mode === 'tutorial' ? 'TUTORIAL' : mode === 'time-trial' ? 'TIME TRIAL' : mode === 'solo-race' ? 'SOLO RACE' : `${count} PLAYER LOCAL RACE`;
