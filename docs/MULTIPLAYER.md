# Local multiplayer milestone

The user authorized extending the playable prototype to two to four local players. Solo play remains available. This milestone adds no networking, public deployment, hop or challenge mode.

## Player flow

Welcome → player count, lap count, driver names and paint → Player 1 drawing/preview/lock → handoff → subsequent drawing turns → all-player ready check → shared countdown → selected 1–6-lap race → finishing order → rematch or redraw.

Earlier routes disappear on handoff and remain absent during later turns. Once every player has confirmed, routes are revealed together. The privacy here is a fair-play interface on a shared device, not an authentication or secrecy mechanism.

The same pace mapping and physics apply to all players. Cars pass through one another for the first three seconds of race time, then physical car-to-car contact activates; authored solid barriers remain physical throughout. Each receives a separate 0.7-second thrust burst with a five-second recharge; a press during recharge is discarded, not queued. Holding a pad or key never repeats. Readiness inputs do not carry into the race.

Each drawing turn also uses the same backward-section/loop cleanup and expanded sand corridor. The current player sees their cleaned route before locking it in; it remains hidden from subsequent turns until everyone has confirmed. Accepting a sand route does not change that player's traction or drag rules.

## Implementation decisions

- `src/core/local-race.ts` owns the shared tick and one `RaceSimulation` per player. A finished simulation stops advancing while unfinished cars continue. The session completes only when all cars finish.
- Finish order uses interpolated finish times, grouped to displayed hundredths so visually equal times receive shared places. Live order uses distance projected onto the common circuit, rather than comparing metres along differently sized routes. Live positions within 0.01 track units share a rank.
- Turns, confirmation and readiness live in the session coordinator in `src/main.ts`. Redrawing before confirmation affects only the current turn; redrawing after a race clears every plan. Rematch starts fresh simulations and a new ready check.
- The race has its own pointer-ownership map, separate from the diagnostic. Ownership persists until release/cancel even if a finger crosses another corner. All mapped keys have one-shot guards. Pause, blur, hidden-page interruption and orientation change clear pending commands and held input.
- At most four `VehicleView` objects are created and then reused. Player color comes from the presentation theme. Number labels supplement color, including coincident cars.
- Vehicle positions and headings come from the physical simulation, including sideways drift and sand recovery. Multiplayer starts on an authored physical grid; numbered labels distinguish overlapping cars during the ghost start. Drawing/preview keep only the current driver's numbered chip and compact controls, with no earlier plans or practice-line shortcut exposed.
- Route progress follows actual movement and ordered proximity gates. A car far from its route cannot finish laps just because time passes. All players use the same asphalt/sand rules and bounded steering response; see `docs/HANDLING.md`.
- Drawing and racing use the same camera projection. Projection matrices refresh immediately on layout changes so picking and preview markers agree before another rendered frame.
- The bottom-left/bottom-right corners belong to Players 1/2. Players 3/4 use top-left/top-right controls facing the opposite seats. Solo retains its existing bottom-right control. Desktop alternatives are A/L/Q/P, and Space in solo mode.
- Theme changes preserve routes, readiness, physics and timing. Imported models keep their authored materials until a paint adapter exists; player labels remain independent of the model.

## Evidence and limits

See `docs/VERIFICATION.md` for the current commands and results. Unit coverage includes full races for two, three and four players, simultaneous independent commands, cooldowns, deterministic timing, ties, common-course ranking, fresh rematches and continuing after the first finish. Browser checks cover handoffs, readiness, input ownership, held input, canceled touches, interruption, pause/resume and results.

Desktop Chrome touch emulation cannot establish iPad ergonomics, iOS gesture behavior, heat or physical Safari frame rate. Four-player racing on an actual iPad is the next validation gate. Identical practice plans naturally produce overlapping ghost cars and ties if players use identical commands; this is expected. Make different plans or time thrust differently to compete.

## Next steps

1. Test a real iPad and iPhone on the same Wi-Fi. Record model, OS, Safari version, input issues and sustained-play behavior.
2. Have new players complete the handoff/draw/ready flow without coaching. Record misunderstood instructions, pace sensitivity and accidentally touched controls.
3. Tune drawing pace, grip feedback and pad size from that evidence. Check both themes again.
4. Improve the single circuit's scenery, vehicle model and effects through the existing presentation interfaces.
5. Add hop only after the route/thrust loop and four-person layout feel comfortable. Public hosting and launch preparation remain separate milestones.
