# Hop verification — 2026-10-23

Rules v10; route compiler v9. Track versions remain Coastal 3, Launchsite 2, Golden Gate 3 and Santa Monica 2. No new shortcut geometry, external assets or services are introduced.

## Automated simulation checks

- Type checking and the production build pass.
- 250 unit tests pass across 18 files. This includes 25 new hop tests, six-lap CPU plans at each difficulty on every circuit, shared contacts, tournaments, recovery, route validation and replay recording.
- Manual hops work on all four circuits, including flat courses without explicit support metadata: approximately one second of airtime and 1.224 m peak height. Separate seven-second recharge, simultaneous thrust, rejected unavailable presses and command clearing are covered.
- Nine ramp cases combine 20/30/42 m/s with -20/0/+20° body yaw and sideways momentum. All land with actual supported footprints and no recovery. Slow launch, unsupported landing, landing-edge and thrust-in-flight regressions also pass.
- Manual hops preserve horizontal speed without tire acceleration/braking/drag. Guidance ignores body yaw and does not rescue reverse travel. Hop on a ramp uses its local height without stacking a lip impulse.
- Protected low obstacles still block an apex-height hop. Unauthorized water traversal recovers without retaining distance/checkpoints, while clocks and both recharge deadlines continue. Invalid airborne travel cannot finish a race before recovery.
- Recorded hop/thrust commands produce identical states at 30/60/120 Hz rendering. Replays retain actual height without modifying simulation.
- Core ownership exercises 50 overlapping cycles per player with separate thrust/hop touches and cancellation.
- Simultaneous recoveries at the same safe point admit one car while the other waits; both subsequently resume without overlap or artificial progress, retaining their independent recharge deadlines.
- The three historic frozen-geometry handling fixtures now have explicit v10 snapshots, rounded to microseconds for cross-platform comparison. Reduced sand drag intentionally changes off-road trajectories and resulting contact/lap times; these are not asserted identical to v9. Established grip, response, acceleration, braking, thrust and maximum speed remain checked independently.

## Browser and visual evidence

Phone landscape 844×390, portrait 390×844 and 320×568, and tablet 1024×768 checks confirm 56 px Thrust and 44 px Hop targets. All eight multiplayer controls remain within the existing rails, separate from one another, timing, sound and pause. The usable course rectangle and camera framing are unchanged. Portrait timing becomes compact on the narrowest four-player layout.

Browser touch emulation verifies eight overlapping real touch points, sliding while ownership is retained, holding beyond recharge without repetition, 50 overlapping press/cancel cycles, interruption clearing, pause/resume, focused keyboard activation and retry state. Existing one-pad-per-human selectors remain scoped to Thrust; Hop is a separate companion control.

Measured active four-car effects: **133 draw calls**, including simultaneous thrust/hop vapor; 156 live pooled puffs in the sampled window. The recorded one-car Santa Monica race measured **70 draw calls**, within the 90 target, and finished in **33.882 seconds** with manual Hop plus an automatic ramp jump and **zero recoveries**. Decorative particles reuse the existing bounded vapor mesh, adding no new particle draw call. Real device frame rate is not inferred from these browser checks.

The final integrated browser run passes **17 scenarios**: all four control layouts; eight-touch ownership/50 cycles; keyboard/pause/retry; captured manual/ramp gameplay; Solo Race/rematch; persisted Time Trial replay; a complete four-circuit Solo Full Tour with reload/resume; the existing high-density four-touch interruption check; all four venue rendering budgets; an automatic ramp race with pause/retry; and a four-player mixed-branch race/rematch. Two additional solo phone-layout/pause-Home regression checks also pass.

Production smoke passes under `/RoadsterRace/`, covering all four circuits, Santa Monica's jump branch, portrait/Graphite/rotation/Home Screen metadata, four-player drawing and independent hops, Solo CPU racing with hop/thrust, and tournament save/resume. No required asset requests fail and no browser exceptions are reported; production has no development inspector. One initial parallel cold-development-server navigation timed out before game verification; the setup now waits explicitly for DOM readiness with a bounded cold-start allowance, and the complete production suite passes on rerun. This changes test setup only.

The first hosted Solo job timed out waiting for hop feedback after race entry. The production harness now observes both ability feedback and the existing pause UI, resuming through the normal Resume action for at most three interrupted attempts. It records those observations rather than bypassing the pause safeguard or advancing the game. CPU-only hosted WebGL uses 1× pixel density with unchanged CSS layout/touch coordinates; local browser tests separately cover 2×/3× density. These verification changes do not alter the shipped game's resolution or handling.

## Captures and delivery

Ignored local evidence is in `artifacts/hop/`:

- `phone-controls-844.png`, `phone-controls-390.png`, `phone-controls-320.png`, `phone-controls-1024.png` and matching layout measurements.
- `manual-hop-landscape.png` and `ramp-jump-landscape.png`.
- `hop-and-ramp-gameplay.webm` (complete browser capture) and `hop-and-ramp-gameplay.mp4` (short gameplay excerpt; browser video capture is silent).
- `four-car-effects.json`, `gameplay.json`, unit/build/production logs.

The footage records actual game movement using a development-only compiled route fixture; no race state or finishing result is scripted. Production builds retain no development inspector or practice-line interface.

Physical iPhone/iPad Safari comfort, sustained performance, safe-area behavior, sound balance and hosted cellular/Home Screen testing remain **pending hardware verification**. Automated viewport/touch tests are supplemental evidence.
