// Pure tutorial markup and copy. The tutorial explains drawing, Thrust and Hop only; it deliberately
// says nothing about where else a line or a Hop can go. Players discover that through play.
import { RULES } from '../../core/rules';
import { flightGravity } from '../../core/support';
import { formatTime } from '../format';
import { arrow } from './common';

const seconds = (value: number) => Number(value.toFixed(1)).toString();
const hopAirtime = 2 * RULES.hopLaunchSpeed / flightGravity('hop');

export type CoachStep = 'draw' | 'preview' | 'countdown' | 'thrust' | 'hop';

/** Every player-facing tutorial sentence, kept together so tests can review the wording. */
export const TUTORIAL_COPY = {
  intro: {
    eyebrow: 'TUTORIAL · NEWPORT · 1 LAP',
    title: 'Learn to race in one lap.',
    body: 'Draw a racing line, then watch your car drive it. Along the way you will try your two abilities, Thrust and Hop. No rivals and no clock to beat.',
  },
  coach: {
    draw: { title: 'Draw one lap.', body: 'Start on the highlighted start line and follow the arrows all the way around. How fast you draw sets the car’s pace: slow into corners, quick on straights. Lift after you cross the finish. Not sure? Tap Example.' },
    preview: { title: 'Your line is ready.', body: 'The car will follow this line at the pace you drew. Tap Race to drive it, or Redraw to try again.' },
    countdown: { title: 'Hands off the wheel.', body: 'Your car steers and keeps your pace by itself. Your job is to use Thrust and Hop at the right moments.' },
    thrust: { eyebrow: 'ABILITY 1 OF 2', title: 'Thrust', body: `A ${seconds(RULES.thrustDuration)}-second burst of speed. It recharges in ${seconds(RULES.thrustRecharge)} seconds, so save it for a straight.`, action: 'Tap THRUST now (keyboard: Space).' },
    hop: { eyebrow: 'ABILITY 2 OF 2', title: 'Hop', body: `The car lifts off for about ${seconds(hopAirtime)} second and recharges in ${seconds(RULES.hopRecharge)} seconds. It can barely steer in the air, so hop where your line runs straight. Thrust still works in the air. Use Hop to leap over a rival in your way.`, action: 'Tap HOP now (keyboard: H).' },
  },
  afterThrust: `Thrust used. Watch the ring refill: ready again in ${seconds(RULES.thrustRecharge)} s.`,
  afterHop: 'Nice hop. Now finish the lap.',
  complete: {
    eyebrow: 'TUTORIAL COMPLETE',
    title: 'You’re ready to race.',
    body: 'Draw your line, set the pace with your finger, then time Thrust and Hop. Sharpen your laps in Time Trial, or take on three computer drivers in Solo Race.',
  },
} as const;

export function tutorialIntroPanel() {
  const c = TUTORIAL_COPY.intro;
  return `<span class="eyebrow">${c.eyebrow}</span><h2>${c.title}</h2><p>${c.body}</p><div class="steps"><span><b>01</b> Draw a line</span><span><b>02</b> Thrust</span><span><b>03</b> Hop</span></div><div class="panel-actions"><button class="primary-button" data-action="tutorial-draw">Start tutorial ${arrow}</button><button class="text-button" data-action="home">Home</button></div>`;
}

/** The floating coach card for a step; empty string hides it. */
export function tutorialCoach(step: CoachStep | null) {
  if (!step) return '';
  const c = TUTORIAL_COPY.coach[step];
  const prompt = 'action' in c;
  return `${prompt ? `<span class="coach-eyebrow">${c.eyebrow}</span>` : ''}<strong class="coach-title">${c.title}</strong><span class="coach-body">${c.body}</span>${prompt ? `<span class="coach-action">${c.action}</span>` : ''}`;
}

export function tutorialCompletePanel(lapTime: number | undefined) {
  const c = TUTORIAL_COPY.complete;
  return `<span class="eyebrow">${c.eyebrow}</span><h2>${c.title}</h2>${lapTime === undefined ? '' : `<div class="finish-time">${formatTime(lapTime)}</div>`}<p>${c.body}</p><div class="panel-actions"><button class="primary-button" data-action="play">Solo Race ${arrow}</button><button class="text-button" data-action="tutorial">Try the tutorial again</button><button class="secondary-button" data-action="home">Home</button></div>`;
}
