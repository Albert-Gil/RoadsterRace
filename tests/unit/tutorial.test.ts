import { describe, expect, test } from 'vitest';
import { findCircuit } from '../../src/content/circuits';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { LocalRace } from '../../src/core/local-race';
import { RULES } from '../../src/core/rules';
import { humanCount, racerCount, controllerFor } from '../../src/core/session';
import { TUTORIAL_CIRCUIT, TUTORIAL_LAPS, TUTORIAL_TIMING, answerPrompt, duePrompt, freshTutorial, straightAhead } from '../../src/app/tutorial';
import { modeLabel, phaseLayout } from '../../src/app/phases';
import { TUTORIAL_COPY, tutorialCoach, tutorialCompletePanel, tutorialIntroPanel } from '../../src/ui/panels/tutorial';
import { planningPanel } from '../../src/ui/panels/planning';
import { welcomePanel } from '../../src/ui/panels/welcome';
import type { Ability, RaceState } from '../../src/core/types';

const track = findCircuit(TUTORIAL_CIRCUIT).track;
function practiceRoute(seconds = 7) { const r = compileRoute(createPracticeSamples(track, seconds), track); if (!r.ok) throw Error(r.message); return r.route; }

/** Runs the tutorial lap headlessly, answering each prompt as soon as it appears. */
function guidedLap(seconds = 7) {
  const route = practiceRoute(seconds), race = new LocalRace([route], track, TUTORIAL_LAPS), progress = freshTutorial();
  const prompts: { ability: Ability; time: number; straight: boolean; speed: number }[] = [];
  for (let tick = 0; tick < 6000 && !race.finished; tick++) {
    const s = race.racers[0].state, due = duePrompt(progress, s, route);
    if (due) {
      progress.awaiting = due;
      prompts.push({ ability: due, time: s.time, straight: straightAhead(route, s.distance, s.speed, TUTORIAL_TIMING.relaxedTurnShare), speed: s.speed });
      expect(answerPrompt(progress, due === 'thrust' ? 'hop' : 'thrust', s.time)).toBe(false);
      expect(answerPrompt(progress, due, s.time)).toBe(true);
      if (due === 'hop') race.pressHop(0); else race.pressThrust(0);
    }
    race.step();
  }
  return { race, progress, prompts };
}

describe('tutorial session', () => {
  test('is a single human car on Newport for one lap', () => {
    expect(TUTORIAL_CIRCUIT).toBe('coastal-launch'); expect(TUTORIAL_LAPS).toBe(1);
    expect([humanCount('tutorial', 1), racerCount('tutorial', 1), controllerFor('tutorial', 0)]).toEqual([1, 1, 'human']);
    expect(modeLabel('tutorial', 1)).toBe('TUTORIAL');
  });

  test.each([3, 7, 12, 30])('prompts Thrust, then Hop on a gentle stretch, and a %s s drawing still finishes cleanly', seconds => {
    const { race, progress, prompts } = guidedLap(seconds);
    expect(prompts.map(p => p.ability)).toEqual(['thrust', 'hop']);
    expect(prompts.every(p => p.straight && p.speed >= 8)).toBe(true);
    expect(prompts[0].time).toBeGreaterThanOrEqual(TUTORIAL_TIMING.thrustAfter);
    expect(prompts[1].time - prompts[0].time).toBeGreaterThanOrEqual(TUTORIAL_TIMING.hopGap);
    const s = race.racers[0].state;
    expect(race.finished).toBe(true); expect(s.lapTimes).toHaveLength(1);
    expect([s.thrustCount, s.hopCount, s.recoveryCount]).toEqual([1, 1, 0]);
    expect(progress.awaiting).toBeNull();
    expect(duePrompt(progress, s, practiceRoute(seconds))).toBeNull();
  });

  test('never prompts while airborne, recovering, finished or already waiting', () => {
    const route = practiceRoute(), base = { time: 3, movement: 'grounded', recoveringUntil: 0, recoveryWaiting: false, finished: false, thrustReadyAt: 0, hopReadyAt: 0, distance: 0, speed: 20 } as unknown as RaceState;
    const at = (patch: Partial<RaceState>) => duePrompt(freshTutorial(), { ...base, ...patch }, route);
    expect(at({ time: TUTORIAL_TIMING.thrustAfter + TUTORIAL_TIMING.relaxAfter })).toBe('thrust');
    expect(at({ time: 30, speed: TUTORIAL_TIMING.minSpeed - 1 })).toBeNull();
    expect(at({ time: TUTORIAL_TIMING.thrustAfter - 0.1 })).toBeNull();
    expect(at({ movement: 'airborne', time: 30 })).toBeNull();
    expect(at({ recoveryWaiting: true, time: 30 })).toBeNull();
    expect(at({ finished: true, time: 30 })).toBeNull();
    expect(duePrompt({ ...freshTutorial(), awaiting: 'thrust' }, { ...base, time: 30 }, route)).toBeNull();
    const afterThrust = { thrustAt: 2, hopAt: null, awaiting: null };
    expect(duePrompt(afterThrust, { ...base, time: 2 + TUTORIAL_TIMING.hopGap - 0.1 }, route)).toBeNull();
    expect(duePrompt(afterThrust, { ...base, time: 30, hopReadyAt: 31 }, route)).toBeNull();
    expect(duePrompt(afterThrust, { ...base, time: 30 }, route)).toBe('hop');
  });
});

describe('tutorial copy and layout', () => {
  // Player-visible text only: markup attributes such as aria-hidden are not wording.
  const visible = (html: string) => html.replace(/<[^>]*>/g, ' ');
  const everything = JSON.stringify(TUTORIAL_COPY) + visible(tutorialIntroPanel() + tutorialCompletePanel(30) + (['draw', 'preview', 'countdown', 'thrust', 'hop'] as const).map(tutorialCoach).join(''));

  test('explains Thrust and Hop with the real tuning values', () => {
    expect(TUTORIAL_COPY.coach.thrust.body).toContain(`${RULES.thrustDuration}-second`);
    expect(TUTORIAL_COPY.coach.thrust.body).toContain(`${RULES.thrustRecharge} seconds`);
    expect(TUTORIAL_COPY.coach.hop.body).toContain(`${RULES.hopRecharge} seconds`);
    expect(tutorialCoach('thrust')).toContain('Tap THRUST now'); expect(tutorialCoach('hop')).toContain('Tap HOP now');
    expect(tutorialCoach(null)).toBe('');
  });

  test('keeps advanced techniques for players to discover', () => {
    // No hint that a line or a Hop can leave the course, cut a bend or clear scenery.
    expect(everything).not.toMatch(/short ?cut|cut|skip|bypass|alternat|secret|hidden|lane|alley|trail|off[- ]road|outside the road|sand|infield|barrier|wall|obstacle|rock|jump over|over the/i);
  });

  test('coaching freezes the race with both pads live and pause available', () => {
    const coaching = phaseLayout('coaching');
    expect([coaching.padVisible('thrust'), coaching.padVisible('hop'), coaching.padsDisabled]).toEqual([true, true, false]);
    expect([coaching.panelVisible, coaching.hudVisible, coaching.pauseVisible, coaching.driveAudio]).toEqual([false, true, true, false]);
    expect(coaching.sceneLayout).toBe('racing');
    expect(phaseLayout('tutorial-intro').sceneLayout).toBe('welcome');
    expect(phaseLayout('tutorial-intro').menuMusic).toBe(true);
  });

  test('entry points: welcome button, Example while drawing, Exit home, and next steps at the end', () => {
    expect(welcomePanel({ tagline: 'A. B', savedTour: null, incompatibleTour: false })).toContain('data-action="tutorial"');
    const view = { playerCount: 1, turn: 0, playerName: () => 'P', humans: () => 1, inTour: false, tutorial: true };
    const drawing = planningPanel({ ...view, preview: false }), preview = planningPanel({ ...view, preview: true });
    expect(drawing).toContain('data-action="tutorial-example"'); expect(preview).not.toContain('tutorial-example');
    expect(drawing).toContain('aria-label="Leave tutorial"'); expect(drawing).not.toContain('configure-race');
    expect(planningPanel({ ...view, tutorial: false, preview: false })).not.toContain('tutorial-example');
    expect(tutorialIntroPanel()).toContain('data-action="tutorial-draw"');
    const done = tutorialCompletePanel(25.5);
    expect(['play', 'tutorial', 'home'].every(a => done.includes(`data-action="${a}"`))).toBe(true);
  });
});
