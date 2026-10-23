# Wider circuits and three modes

All four venues now have 16 m roads. Coastal Launch v3, Launchsite v2, Golden Gate v3 and Santa Monica v2 use circular corner transitions instead of spline overshoot. Road edges are shared between asphalt, markings and camera fitting. Ordinary protected obstacles retain at least 5 m runoff; bridge/pier rails remain intentional exceptions. Bridge towers, supported decks and jump landing edges move with the road. Santa Monica's bypass is opened up to preserve the optional jump as a shortcut. Hotels are set behind a protected verge clear of the start straight; pier piles follow supported driving surfaces rather than obsolete hardcoded placements.

## Phone framing

The fixed elevated camera fits the actual road boundaries, full start gate/12 m approach and jump branches/height envelope. It excludes empty scenery and the permitted sand apron. It chooses a fixed fitting azimuth for the viewport, with a 6 CSS px fitting clearance. Compact phone viewports use a 65-degree elevated view to reduce foreshortening; desktop retains 42 degrees. There is no automatic race/drawing zoom or pan. Drawing, preview and racing share the same projection. Rotation interrupts the stroke before reframing.

The compact 48 px side controls leave the road visible. Portrait uses a bottom rail; human multiplayer pads retain corner ownership. Safe areas and dynamic browser chrome remain respected. A camera change cannot change a compiled route or race result.

## Modes

| Mode | Physical cars | Human controls | Format |
|---|---|---|---|
| Solo Race | You, Apex, Vector, Pulse | One thrust pad / Space | Single race, Full Tour or Custom Tour |
| Multiplayer | 2–4 human drivers | Independent corner pads / A L Q P | Single race, Full Tour or Custom Tour |
| Time Trial | One human car | One thrust pad / Space | 1–6 laps, ranked by fastest lap |

Solo opponents have numbered CPU identities and small line/pace differences. They generate independent clearance-validated plans, with an authored bypass fallback. All cars share the existing physics, contacts, recovery, speed limits and rechargeable thrust. CPU thrust decisions run on the fixed simulation clock; they never use a catch-up multiplier. Easy/Normal/Hard target 90/97/100% of the safe pace profile, with -1/0/+1% opponent variation. Easy uses Santa Monica's bypass; Normal assigns one jump plan and Hard assigns two. Impacts can spoil a CPU jump like a human jump. The opening three-second car-contact ghost period applies to all four-car races.

CPU lines are hidden. Only the human draws in Solo Race, and only human participants receive input controls or readiness requirements. Multiplayer retains private sequential drawings. Both racing modes retain 10/6/4/0 championship scoring and shared-place rules. Controller identity, difficulty and deterministic seed save with the championship. Creating a different championship requires explicitly replacing an existing compatible save.

## Time Trial replay

Every completed lap is eligible, including the standing-start first lap. Thrust recharge continues across laps. The fastest lap, not the total session time, is the record; total time remains secondary in results. Keys include circuit ID/version, physics and compiler versions, independently of session lap count.

Lap recordings observe actual fixed-step poses. A compact 30 Hz visual recording retains exact lap endpoints, elevation, heading and thrust state. IndexedDB stores the best recording; an in-memory copy works if browser storage is unavailable. A new best becomes the ghost for the next lap. The selected recording is frozen within each lap. Ghost on/off is saved as a preference.

The ghost is one translucent cosmetic mesh. It does not join the simulation, contacts, occupancy, standings, sound or particle systems, and has no player number or shadow casting. Replay uses recorded poses rather than applying old commands to a newly drawn line.

## Compatibility and verification

The compiler is v9; vehicle rules are now v9: the start-grid allocation and forward joining behavior have changed; ordinary grip, acceleration and contact forces retain their previous tuning. Every physical course changed, so older routes and championships are incompatible. A concise menu notice explains why an old tournament cannot resume; driver names, paints and lap preferences remain. Older total-time results are not imported as fastest-lap records.

Frozen v8 geometry/compiled-route fixtures isolate handling regression checks from intentionally changed road layouts. `tools/check-legacy-handling.mjs` also compares the current simulation against the previous Git revision on identical frozen courses. New geometry checks cover full-width gates, corner radii, non-folded/self-crossing edges, lateral route clearance, runoff and supported surfaces.

Run `pnpm typecheck`, `pnpm test`, `pnpm build`, the relevant browser suites and `pnpm test:pages` with a `/RoadsterRace/` production build. Captures and reports live in ignored `artifacts/phone-upgrade/`. Physical iPhone/iPad Safari performance, drawing comfort and hosted cellular/Home Screen behavior remain pending until tested on hardware.
