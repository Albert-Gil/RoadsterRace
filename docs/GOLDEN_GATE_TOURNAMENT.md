# Golden Gate and physical local championships

This milestone adds Golden Gate, renames Orbital Launchyard to Launchsite in the interface, introduces cumulative local tournaments, and makes multiplayer cars physically interact. It also raises speed/thrust, loosens grip and adds visible pooled thrust vapor with replaceable crash/scrape sounds.

## Courses and compatibility

Coastal Launch remains the first course. Launchsite retains the stable `orbital-launchyard` ID; `?circuit=launchsite` resolves to it. Golden Gate uses `golden-gate`, version 2, approximately 442 m long, with a 12 m road, city boulevard, waterfront chicane and narrow 88 m bridge. Its road stays flat. City and bridge foundations occupy authored solid footprints; deliberate inner runoff and wide outer driving allowance remain.

The Bay setting is original procedural artwork, loosely combining San Francisco-inspired street architecture and suspension bridge references rather than representing a real route. No official Tesla/SpaceX artwork or logos were added. Bridge towers do not change road elevation or enable crossing roads.

## Tournament flow

Choose two to four players, Tournament, then Full Tour or Custom Tour. Full Tour is Coastal → Launchsite → Golden Gate. Custom Tour supports 2–12 rounds, repeated courses and button-based reordering. The selected 1–6 laps apply throughout. Roster, paint, corner assignments and schedule lock at start; everyone draws a fresh line each round.

Points are 10/6/4/0. Race ties use displayed hundredths, share place points and skip following ranks. Championship ties share the title. Round results show earned points and totals; final results also show the complete points breakdown. Scoring occurs once only after every driver finishes.

Completed rounds, roster and schedule save locally. Reload restarts the unfinished round with fresh drawings and preserves completed points. Resume, explicit discard, replacement confirmation and save/exit are available. Physics/routes are not serialized. Save loading validates course versions and current rules, recomputes points from finishing records and rejects invalid data. Storage failure leaves play available in memory with concise save-status feedback.

## Contact and handling

All multiplayer uses solid car capsules, two shared internal substeps per 60 Hz tick, swept pair checks and four bounded contact passes. Pair impulses read a shared snapshot before accumulated corrections are applied. Masses are equal, restitution is 0.10 and tangential friction is 0.20. Contact transfers momentum, permits sliding and can push a car into runoff or barriers. Progress is committed after contact resolution and is bounded by physical movement before overlap correction.

Two-column grids separate cars by 3.2 m laterally and 6 m between rows. Drivers start behind the finish line; the race clock begins at lights-out, with lap progress credited after crossing the line. Tournament grid order rotates each round. Finished cars leave active contact. Recovery holds the car absent for one second and waits for an unoccupied safe position. No damage meter, destruction or rollover physics is included.

Rules version 5: speed cap 42 m/s, thrust acceleration 25 m/s², asphalt grip 48, sand grip 6.5, sand drag 1.10. Compiler version 6: common desired pace range 9–28 m/s. Acceleration/braking, steering alignment, 0.7 s thrust and 5 s recharge remain. Best-time keys include rules/compiler versions as well as course/version/laps.

## Effects and sound

Each racing car has one preallocated vapor billboard mesh with at most 96 puffs, a shared soft texture and visible jet cores at all four rear outlets. Settings live centrally in themes.ts. Cosmetic particle state cannot change physics. Effects freeze with paused race time and clear on restart/scene replacement. Reduced motion shortens the plume and reduces emission.

`car-impact` and `scrape` are original synthesized sound roles. They can later be replaced by local ElevenLabs exports through audio-assets.ts. Contact events contain the involved drivers and intensity; sound is emitted once per pair event, rate/voice-limited and respects mute/pause/browser unlocking. Existing motor, tire, sand, thrust, wall and race cues remain.

## Verification

See docs/VERIFICATION.md for final test evidence and artifacts/golden-gate/ for captures. Physical iPhone/iPad Safari, sustained mobile performance/thermals and real four-person reach remain pending until tested on hardware. Public hosting and posts were not part of this work.

Final source passes type checking, 113 unit tests and the production build. All 30 browser scenarios have passing evidence: the broad run passed 29/30, then the corrected scrape cue and four other affected scenarios passed together. The four-player full tour exercised real collisions, completed scoring, repeated refresh, final-table resume and a fresh championship restart. The real 30-second four-car review clip is `artifacts/golden-gate/gameplay-30s.mp4` (silent); the audible cue palette is `artifacts/sound-preview.wav`. Sampled recording cost peaked at 139 draw calls and about 75 renderer fps on this desktop, with no page exceptions. These are desktop measurements, not physical-mobile certification.


Packaged-build validation also passes 15 circuit/theme/fallback/alias checks and four tournament checks (three phone/tablet completed-save layouts plus unavailable browser storage). The final result panel keeps actions visible while tables scroll. Completed-save layout cases use declared fixtures; the desktop championship image resumes the actual recorded Full Tour results. Local preview remains available at http://localhost:5173/; choose Tournament under Race with friends, or open Golden Gate directly with `?circuit=golden-gate`.

The city/drawing follow-up replaces the first Golden Gate layout. Current geometry, drawing behavior and evidence are documented in GOLDEN_CITY_DRAWING.md and the latest VERIFICATION.md entry; the earlier 113-test/capture evidence above describes the preceding milestone.
