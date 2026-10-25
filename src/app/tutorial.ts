import { sampleRoute } from '../core/route';
import { RULES } from '../core/rules';
import type { Ability, CompiledRoute, RaceState } from '../core/types';

/**
 * Guided tutorial: one car, one lap on Coastal Launch. The race freezes twice so the player
 * can try Thrust and then Hop. Pure decisions only; main.ts owns phases, input and rendering.
 */
export const TUTORIAL_CIRCUIT = 'coastal-launch';
export const TUTORIAL_LAPS = 1;

export const TUTORIAL_TIMING = Object.freeze({
  /** Earliest race time (s) for the Thrust prompt. */
  thrustAfter: 1.5,
  /** Gap (s) between using Thrust and the Hop prompt. */
  hopGap: 3,
  /** After waiting this long (s) past the earliest moment, accept gentler bends. */
  relaxAfter: 3,
  /** Prompts wait until the car moves at least this fast (m/s), or 90% of a slower drawn pace. */
  minSpeed: 12,
  minPaceShare: 0.9,
  /** Look-ahead along the line: the larger of this distance (m) and speed × lookAheadSeconds. */
  minLookAhead: 20,
  /** About one hop airtime plus a margin (s). */
  lookAheadSeconds: 1.25,
  /** Share of the in-flight turn-rate limit the line ahead may demand (strict, then relaxed). */
  turnShare: 0.5,
  relaxedTurnShare: 1.5,
});

export interface TutorialProgress {
  /** Race time when the player used each prompted ability; null until then. */
  thrustAt: number | null;
  hopAt: number | null;
  /** Ability the frozen race is waiting for. */
  awaiting: Ability | null;
}
export const freshTutorial = (): TutorialProgress => ({ thrustAt: null, hopAt: null, awaiting: null });

/**
 * True when the line ahead needs little turning: the yaw rate it demands at the current speed
 * (speed × curvature, rad/s) stays within `share` of the in-flight turn limit for the look-ahead.
 * A prompt there leaves room to thrust or hop without running wide.
 */
export function straightAhead(route: CompiledRoute, distance: number, speed: number, share: number = TUTORIAL_TIMING.turnShare) {
  const span = Math.max(TUTORIAL_TIMING.minLookAhead, speed * TUTORIAL_TIMING.lookAheadSeconds);
  const limit = share * RULES.flightTurnRate / Math.max(speed, 1);
  for (let d = 0; d <= span; d += 2) if (sampleRoute(route, distance + d).curvature > limit) return false;
  return true;
}

/** Which ability to prompt now, if any. Prompts wait for a grounded, moving, ready car on a gentle stretch. */
export function duePrompt(progress: TutorialProgress, s: RaceState, route: CompiledRoute): Ability | null {
  if (progress.awaiting || s.finished || s.movement !== 'grounded' || s.time < s.recoveringUntil || s.recoveryWaiting) return null;
  // A slow corner of a fast line is no place for a prompt; a slowly drawn line still gets one.
  if (s.speed < Math.min(TUTORIAL_TIMING.minSpeed, TUTORIAL_TIMING.minPaceShare * sampleRoute(route, s.distance).desiredSpeed)) return null;
  const ability: Ability | null = progress.thrustAt === null ? 'thrust' : progress.hopAt === null ? 'hop' : null;
  if (!ability) return null;
  const earliest = ability === 'thrust' ? TUTORIAL_TIMING.thrustAfter : progress.thrustAt! + TUTORIAL_TIMING.hopGap;
  if (s.time < earliest || s.time < (ability === 'thrust' ? s.thrustReadyAt : s.hopReadyAt)) return null;
  const share = s.time >= earliest + TUTORIAL_TIMING.relaxAfter ? TUTORIAL_TIMING.relaxedTurnShare : TUTORIAL_TIMING.turnShare;
  return straightAhead(route, s.distance, s.speed, share) ? ability : null;
}

/** Records the prompted ability as used. Returns false (and changes nothing) for any other ability. */
export function answerPrompt(progress: TutorialProgress, ability: Ability, time: number) {
  if (progress.awaiting !== ability) return false;
  if (ability === 'thrust') progress.thrustAt = time; else progress.hopAt = time;
  progress.awaiting = null;
  return true;
}
