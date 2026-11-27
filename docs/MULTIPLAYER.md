# Local multiplayer

Two to four players share one device; solo play, Time Trial and the tournament remain available. For online rooms (one device per player) see `docs/PRIVATE_DUELS.md`. Ability and timing values are not repeated here: they live in the generated rules, `docs/CURRENT_RULES.md` (regenerate with `pnpm docs:rules`).

## How a local race works

1. **Set up.** Choose the player count, laps, driver names and paints.
2. **Draw in private.** Each player draws and previews their own line, then locks it in and passes the device. A locked line is hidden from everyone who draws after it: the next player sees only the circuit and their own stroke. This is fair play on a shared screen, not secrecy.
3. **Race with hidden lines.** After a ready check (each player presses their own pad) and the countdown, the cars race their locked lines. Nobody's line is drawn on the circuit during the race; each car's numbered chip is shown at the start, then fades.
4. **Contact ghost period.** For the first five seconds of race time the cars pass through one another (`CONTACT_RULES.ghostStartSeconds`), so a crowded grid cannot decide the race; after that, car-to-car contact is physical. Authored barriers are solid throughout.
5. **Abilities.** Each player has their own Thrust and Hop pads (keys A/L/Q/P for Thrust and Z/K/W/O for Hop; Space and H in solo). One press is one command; holding never repeats, and a press while recharging is discarded, not queued. Durations and recharge times: `RULES` in `docs/CURRENT_RULES.md`.
6. **Results and rematch vote.** Results show the finishing order. Every player votes **Race again** (same lines) or **New lines**, or **Home**: once everyone has voted, any Home vote goes home, otherwise any New lines vote starts a fresh drawing round, otherwise the same lines race again (`src/core/rematch-vote.ts`, shared with online rooms). Votes can change until the last one is cast.

Each drawing turn uses the same cleanup of backward sections and loops, the same off-road corridor and the same pace mapping. Accepting a sand line does not change that player's traction or drag.

## Implementation decisions

- `src/core/local-race.ts` owns the shared tick and one `RaceSimulation` per player. A finished simulation stops advancing while unfinished cars continue. The session completes only when all cars finish.
- Finish order uses interpolated finish times, grouped to displayed hundredths so visually equal times receive shared places. Live order uses distance projected onto the common circuit, rather than comparing metres along differently sized routes. Live positions within 0.01 track units share a rank.
- Turns, confirmation and readiness live in the session coordinator in `src/main.ts`. Redrawing before confirmation affects only the current turn; redrawing after a race clears every plan. Rematch starts fresh simulations and a new ready check.
- Input ownership: a press belongs to the screen and seat where it began, and persists until release or cancel even if a finger crosses another corner. All mapped keys have one-shot guards. Pause, blur, hidden-page interruption and orientation change clear pending commands and held input, and a finger or key held across a screen change cannot act on the next screen (`src/input/`).
- At most four `VehicleView` objects are created and then reused. Player color comes from the presentation theme. Number labels supplement color, including coincident cars.
- Vehicle positions and headings come from the physical simulation, including sideways drift and sand recovery. Multiplayer starts on an authored physical grid: since 2026-11-01 one row, side by side, every car the same distance behind the line, each car on the side of the gate where its driver started drawing. On the ready and countdown screens the numbered chips line up just behind the row in the cars' order, at least a chip apart, so side-by-side cars never hide each other's number (`src/ui/grid-labels.ts`). Drawing/preview keep only the current driver's numbered chip and compact controls, with no earlier plans or practice-line shortcut exposed.
- Route progress follows actual movement and ordered proximity gates. A car far from its route cannot finish laps just because time passes. All players use the same asphalt/sand rules and bounded steering response; see `docs/HANDLING.md`.
- Drawing and racing use the same camera projection. Projection matrices refresh immediately on layout changes so picking and preview markers agree before another rendered frame.
- Seats run counterclockwise: the bottom-left/bottom-right corners belong to Players 1/2, and Players 3/4 use the top-right/top-left controls, facing the opposite seats. Each player's pads are painted in that driver's car colour (the full paint when ready and on the ready screen, a darker shade while recharging). Solo retains its existing bottom-right controls.
- Theme changes preserve routes, readiness, physics and timing. Imported models keep their authored materials until a paint adapter exists; player labels remain independent of the model.

## Evidence and limits

See `docs/VERIFICATION.md` for the current commands and results. Unit coverage includes full races for two, three and four players, simultaneous independent commands, cooldowns, deterministic timing, ties, common-course ranking, fresh rematches and continuing after the first finish. Browser checks cover handoffs, readiness, input ownership, held input, canceled touches, interruption, pause/resume and results.

Desktop Chrome touch emulation cannot establish iPad ergonomics, iOS gesture behavior, heat or physical Safari frame rate. Four-player racing on an actual iPad is the next validation gate. Identical practice plans naturally produce overlapping ghost cars and ties if players use identical commands; this is expected. Make different plans or time thrust differently to compete.
