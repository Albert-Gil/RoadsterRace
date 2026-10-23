# Hop and forgiving flight

Manual Hop is available in Solo Race, Multiplayer and Time Trial. Tap the upward-arrow button for an immediate lift. It recharges independently in seven seconds; Thrust still recharges in five. Both can activate together. A held button never repeats, and unavailable presses are discarded.

## Tuning and interaction

`src/core/simulation.ts` owns rules v10: upward impulse 4.9 m/s, gravity 9.81 m/s², about 0.999 s airtime and 1.224 m peak height on level ground. Hop uses the current ramp height when activated on a ramp. A car already airborne receives no additional lip impulse. Hop requires ground support and cannot activate during countdown, flight, recovery or after finishing. Pause freezes the clock; retry/rematch/new rounds start with fresh abilities. Recovery preserves recharge deadlines.

Flight preserves horizontal momentum and has no tire acceleration, braking, grip or sand drag. Thrust remains available, with the existing 42 m/s speed cap. Gentle assistance rotates actual momentum toward the nearby drawn line for a hop, or the authored landing corridor for a ramp: at most 20° at launch and 30°/s in flight. Speed is preserved by correction. Reverse travel is never turned into a successful forward launch. The visible body follows flight direction smoothly; momentary body yaw does not determine the launch.

Grounded sand drag changes from 1.10 to 0.95 (13.6% lower). Grip, steering recovery, acceleration, braking and thrust remain unchanged. Different off-road trajectories can change impacts and final times; historic v9 timing fixtures are therefore superseded by an explicit v10 baseline on the same frozen geometry.

## Course protection and contacts

No new shortcuts or jumpable obstacles are authored. Existing above-road infield barriers and rails remain protected columns during flight; submerged landing faces retain their actual heights. Santa Monica water traversal still requires a compiled, approved jump route and its forward ramp corridor. A manual hop may enter that ramp corridor through its authored entrance; it does not authorize crossing water elsewhere. Landings require actual footprint support, without snapping to a distant deck. Invalid flight recovers to the last safe grounded position, with no retained progress/checkpoints from the failed branch. Time and recharge continue.

Car contacts use vertical envelopes. Cars can pass over one another only with sufficient height separation; landing contacts resolve normally. The three-second multi-car starting ghost period is unchanged.

## Controls and presentation

The 56 CSS px Thrust button pairs with a separate 44 px Hop button. Landscape pairs stack in the existing side rails; portrait pairs sit horizontally in the existing top/bottom strips. Neither changes the fixed course camera rectangle. Each button has its own recharge ring. Player identity remains in controls; racing name tags stay hidden.

Solo keys: Space (Thrust), H (Hop). Multiplayer pairs by player: A/Z, L/K, Q/W, P/O (Thrust/Hop). Focused buttons accept Space/Enter. Pointer ownership includes player and ability until release/cancellation, so simultaneous inputs do not transfer when fingers slide away.

CPU drivers use the same commands and rules. After starting ghosting, they consider a hop only when closing by at least 2 m/s on a slower car within 10 m ahead, with a straight, supported, barrier-clear path and clear predicted landing. They do not hop simply because recharge completes.

`src/presentation/themes.ts` owns bounded hop puff/pitch appearance. Downward puffs reuse the existing vapor pool and draw call. Tire marks and sand dust stay disabled in flight; shadows reflect height, and landings compress the suspension. The new `hop` sound role has a synthesized fallback in the replaceable audio system; future local ElevenLabs recordings can replace it. Existing replay frames already store actual elevation, so ghosts need no physics, sounds or extra effects.

## Compatibility and verification

Physics version increases to 10; compiler remains 9 and all track versions are unchanged. Records are isolated by rules version. Incompatible championship resumes are rejected with existing setup feedback, while names, paints and lap preferences are preserved. No automatic migration of v9 results is allowed.

See `HOP_VERIFICATION.md` for measured results and captures. Physical iPhone/iPad Safari performance and comfort remain pending hardware testing; browser touch emulation is supplemental evidence.
