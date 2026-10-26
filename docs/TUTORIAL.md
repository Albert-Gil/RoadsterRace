# Tutorial

The **Tutorial** button on the home screen starts one guided lap on Newport Island with a single car and no rivals. It teaches the basic loop and the two abilities. Advanced techniques are deliberately left for players to discover through play.

## Flow

1. **Introduction** (`tutorial-intro`): what the lap covers. *Start tutorial* or *Home*.
2. **Drawing**: a coach card explains starting on the line, following the arrows, setting pace by drawing speed, and lifting after the finish. The rail adds an **Example** button that loads the standard practice line. *Exit* returns home.
3. **Preview** and **countdown**: short coach cards explain that the car follows the line at the drawn pace and that the player's job is to time the abilities.
4. **Thrust prompt** (`coaching`): the race freezes once the car is grounded, moving and on a gentle stretch. The coach card explains the burst and recharge, and the Thrust pad pulses. Only Thrust (pad or Space) resumes the race; Hop is ignored.
5. **Hop prompt**: at least 3 s later, the same freeze for Hop (pad or H): airtime, recharge, limited steering in the air, thrust still working in the air, and hopping over a rival.
6. **Results**: the lap time with *Solo Race*, *Try the tutorial again* and *Home*.

Pause, Restart race and Draw new lines behave as in other modes. A paused prompt returns as soon as the race resumes.

## Prompt timing

`src/app/tutorial.ts` holds the pure rules (`TUTORIAL_TIMING`):

- Thrust no earlier than 1.5 s; Hop no earlier than 3 s after Thrust.
- The car must be grounded, not recovering, and at least min(12 m/s, 90% of the drawn pace at that point).
- The line ahead, over max(20 m, 1.25 s × speed), may not demand a yaw rate above half the in-flight turn limit (`RULES.flightTurnRate`). After 3 s of waiting, up to 1.5 times that limit is accepted.

Unit tests run the lap headlessly for drawings of 3, 7, 12 and 30 s. Each one prompts Thrust then Hop and finishes with no recovery.

## Copy rules

The wording lives in `TUTORIAL_COPY` (`src/ui/panels/tutorial.ts`) and takes its numbers from `RULES`. It must not mention shortcuts, cutting corners, off-road or sand lines, alternate lanes or trails, or hopping over barriers or scenery. A unit test rejects these terms.

## Isolation

- The tutorial borrows Newport Island and a 1-lap distance without saving them. Leaving through *Home* or *Solo Race* restores the previous circuit and lap count.
- It creates no lap records, ghosts, session bests or tournaments.
- Race physics and route compilation are unchanged; prompts only freeze the fixed-step clock and issue the normal ability command.

## Verification

- Covered by `tests/unit/tutorial.test.ts` and `tests/browser/tutorial.spec.ts`.
- Physical iPhone/iPad Safari checks are pending.
