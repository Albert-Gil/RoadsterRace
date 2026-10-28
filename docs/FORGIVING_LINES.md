# Forgiving lines, Home everywhere and touch scaling

Compiler v15 and vehicle rules v14 (compiler v15 relaxed Hop-lane approval; see below).

## What a player sees

- Any lap drawn from the start line in the arrows' direction is accepted. This holds however wide, off-road or close to barriers the lap runs.
- The car drives the line exactly as drawn:
  - Off the road it loses grip and drags through sand or dirt.
  - Where the line runs through a wall, a building, the edge of a deck or cliff, or open water, the car crashes or falls. It is then reset just past that spot.
- The preview marks the first such place and says how many there are. It never blocks racing.
- A drawing is still asked to be redrawn only when it:
  - starts away from the line;
  - runs the wrong way;
  - skips more than about a quarter of the circuit;
  - loses touch contact (two samples more than two road widths apart).
- Jumps still have to be taken properly to pass their gap. A Hop lane's obstacle can be hopped whenever the line crosses it with the car inside the lane, moving forward; otherwise the car crashes there like anywhere else.

## Rules

All values are generated in `docs/CURRENT_RULES.md`.

### Start and finish (`GATE_RULES`)

- **Start:** up to 30 m before the line, 8 m past it, or 8 m beyond either end of the gate. The dashed 38 by 32 m touchdown rectangle matches this area, about 3.17 times the previous accepted area on a 16 m road; all its corners remain in the fixed interactive camera fit. The counted gate stays 16 m wide.
- **Finish:** a crossing counts up to 24 m beside the gate.
- **Early lift:** lifting up to 40 m before the line closes the lap onto the gate at the recent drawing pace.

### Pauses

A resting finger (under 1 m of movement) counts as at most 0.4 s (`DRAWING_RULES.longestPause`). Hesitation does not slow the pace.

### Lap coverage

- At least 72% of 40 centerline stations must have the line within 0.75 road widths of the asphalt, or lie on an authored branch the line takes.
- The 25% wrong-way allowance only absorbs projection noise. A reversed lap fails the forward-finish and coverage checks.

### Hazards (`src/core/hazards.ts`)

- On the final route points, a point is a hazard when either:
  - the 2.2 × 5.2 m vehicle capsule meets a barrier (authorized Hop obstacles and the approved crest's cliff faces excepted); or
  - the car is off support outside an approved jump corridor.
- Neighbouring problems closer than 8 m plus a car length merge into one span.
- Each span stores `from`, a clear reset point `to` (3 m past it) and the circuit distance it skips, `course`.

### Crash and reset (`RaceSimulation.recover`)

- A recovery at, or within 12 m before, a hazard puts the car at its reset point. The car is held for 1 s plus `course / 20 m/s`.
- A second recovery within 15 m of the previous one moves the car forward to the next clear, supported route point. The penalty is the skipped distance / 20 m/s.
- Any other recovery returns to the last safe position, as before.
- A reset that passes the lap line counts the lap when the car drives on.

### Jump approval

- **Ramps and crests:** the line must enter the corridor and leave beyond the landing inside it, moving forward. Wobble over the gap is ignored, since the car flies ballistically there.
- **Hop lanes (compiler v15):** a line whose car footprint meets the lane's named obstacle heading forward along the lane (within 60°), with the whole car inside the lane (0.15 m clearance) for one car length either side of the obstacle, is approved. The approved stretch is the part of the line around that crossing whose centre stays in the lane, so the line may join or leave the lane anywhere, wander and cut its corners. A complete gate-to-gate pass is still recorded exactly as before. Reversed crossings and crossings half over a protected end wing are not approved. In the race the obstacle is passable only during a manual Hop with the whole car inside the lane; the end wings and every other wall stay solid.
  - Compiler v14 required the complete gate-to-gate pass with the whole car inside the lane throughout. Simulated hand-drawn lines with 4–6 m of wander failed it on all three Hop circuits, so their obstacle stayed solid at any height (`tests/unit/hop-lane-commit.test.ts` fails 12 of 15 cases against v14 and passes all under v15).

### Off-road excursions

Loop and backward-hook cleanup ignores points more than one road width from the course. An excursion far from the circuit is therefore kept.

## Navigation

Home appears exactly once on every screen:

- the header on setup, handoff and tour intro;
- the planning rail while drawing (Exit plays that role in tours and the tutorial);
- the ready, results and tutorial-intro panels;
- the Pause menu during a race.

Tournament exits keep their save prompt.

## Touch scaling

`src/app/ui-scale.ts` scales the race and planning controls on coarse-pointer screens.

- **Scale:** `short side / 430`, clamped to 1–1.6.
  - iPhone 16 Pro Max: 1.0, sizes unchanged.
  - iPads: 1.6. Thrust becomes about 102 px, Hop 70 px, and the rail buttons 77 px.
- **Mouse layouts:** stay at 1.
- **What scales:**
  - the thrust and hop pads;
  - the planning rail and its buttons;
  - pause and sound during a race;
  - the race HUD;
  - the coach card and race notices.
- **Course area:** the course rectangle shrinks with the wider rails.

## Verification

- **Acceptance:** `tests/unit/forgiving-lines.test.ts` draws simulated tidy, loose, wild and corner-cutting strokes on every circuit; each one must compile and finish a lap.
  - A survey of 720 such strokes (30 per style per circuit) accepted all 720. Under compiler v13 most loose, wild and corner-cutting strokes on most circuits were rejected.
  - 192 of the accepted strokes were raced for one lap, and all finished.
- **Repeat-crash rule:** the same test file covers it.
- **Unit coverage:** tests in barriers, start-finish, Santa Monica, Grand Canyon, LA nights and Launchsite cover crash-and-reset and the accepted lines.
- **Unchanged races:** lines that were valid before (every practice line included) have no hazards and race identically until a car crashes twice at the same spot.
  - Against `main`, 12 of the 18 `pnpm test:legacy` fixtures match exactly.
  - The 6 that differ (Golden Gate and Santa Monica) are cars whose fixed-interval hops make them crash twice at the same place. They used to be sent back each time; the repeat-crash rule now moves them forward on the second crash, so later hop timings shift.
  - This is the intended rules-v14 change, so `pnpm test:legacy` against `main` is expected to report it.
- **Browser checks** (in a scripted browser):
  - **Sizes:** iPhone 16 Pro Max portrait and landscape keep 64/44 px pads; iPad portrait and landscape get 102/70 px pads and 77 px rail buttons; desktop is unchanged.
  - **Home placement:** Home appears once per screen.
  - **Crash run:** a line drawn off the Golden Gate bridge showed the crash note, then raced with "Barrier contact" and "Crashed · +0.8 s" notices and finished.
  - **Unrun specs:** the updated Playwright specs could not complete in this sandbox's software rendering, so they still need a run locally or in the pull-request checks.
- **Real devices:** Safari on a real iPhone or iPad is pending.
