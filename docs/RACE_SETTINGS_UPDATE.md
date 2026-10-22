# Race setup and circuit-planning update

Implemented October 21, 2026. This update removes drift coaching during racing and post-race advice, adds configurable distance and driver identity, and prepares the next circuit milestone.

## Player-facing changes

- Both Solo and Local Race open a shared race setup/garage.
- Choose **1–6 laps**. Draw one lap; the same route and pace repeat for the selected distance. Thrust remains live each lap.
- Edit every driver's name, up to 18 characters. Empty names fall back to Player 1–4. Names are treated as text and cannot become HTML.
- Choose from six finishes: Crimson, Glacier silver, Cobalt blue, Solar yellow, Verdant green and Ultraviolet. The showcase previews the selection; racing paint, identity markers, controls and results use the selected finish. Numbers still distinguish drivers with matching names or paints.
- Lap count, names and paints are remembered in this browser. If browser storage is blocked, choices still work for the current page.
- Racing lines now have a **5 CSS px colored core / 7 px outline**, compared with 3/5 previously. Red remains slow, amber intermediate and green fast.
- Results contain all split times and the selected distance. Solo session bests are separated by circuit ID/version and lap count. Changing paint or name does not reset a comparable best.
- Drift sound, dust, skid marks and the compact surface indicator remain. Explanatory drift pop-ups and driving advice on results have been removed. Functional lap/finish/contact/recovery feedback remains concise.

## Implementation boundaries

`src/core/race-options.ts` defines the supported distance. `RaceSimulation` and `LocalRace` accept a validated lap count and share deterministic 60 Hz behavior. Physics rules are version 4; track/compiler geometry is unchanged.

The six paint definitions remain centrally editable in `src/presentation/themes.ts`. `race-settings.ts` validates/saves preferences; `race-setup.ts` supplies the garage UI. Profile data is presentation-only. Theme changes preserve chosen paint. Editing a name does not trigger gameplay keyboard shortcuts.

## Circuit expansion

See `docs/CIRCUIT_EXPANSION_PLAN.md` for the prioritized briefs and architecture/tasks:

1. **Orbital Launchyard** — an original SpaceX-inspired spaceport, longer thrust straight, braking hairpin, flowing S section, hangars and launch infrastructure.
2. **Alpine Relay** — linked hairpins and an offset chicane through a mountain test facility.
3. **Neon Harbour** — right-angle sequences and a double-apex bend around a night shipping port.

The next task is to separate course metadata/scenery selection from the existing coastal bootstrap, then prototype and test Orbital's layout before producing its scenery. **Coastal Launch remains the only playable circuit in this build.** No unfinished venue is shown as playable.

## Verification and remaining checks

Type checking, the production build and **68 unit tests** pass, including every lap count, six-lap determinism, incorrect option rejection and preference validation. Browser evidence is recorded in `docs/VERIFICATION.md` after the final run. Garage screenshots and one-/six-lap results are under `artifacts/race-settings/`.

Physical Safari, real-player reach and sustained mobile performance remain pending. Public hosting, promotional posts, hop and native iOS remain separate milestones.

Final regression: the complete **22 browser scenarios passed together in 7.6 minutes**, including all existing solo/local input/handling checks and the new one-/six-lap and garage scenarios. All **68 unit tests**, type checking and the production build passed. See `docs/VERIFICATION.md` for the scope and physical-device limitations.

Five production smoke scenarios and the six-lap production capture also passed with no page errors or development helpers exposed. Review the finished garage at `artifacts/race-settings/garage-desktop.png` and the selected race at `artifacts/race-settings/six-lap-race.png`.
