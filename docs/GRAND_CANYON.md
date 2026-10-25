# Grand Canyon

Local milestone, 2026-10-24. No commit, push or deployment is included.

## Driving and tuning

The fifth venue is an original 568.8 m figure-eight-style dirt course, difficulty 3/5. The road is 16 m wide. Track version 2 widens supported dirt shoulders to 30 m through bends and 36 m on the straight upper approach, allowing more off-road drawing without folded inside terrain. The receiving ledge and flight corridor retain their narrow physical limits. Start/finish has a flat straight with at least 24 m clear on each side and retains the full-width gate, 12 m drawing approach and discarded finish overshoot.

Follow the western sweepers up to the ledge. The natural crest automatically launches over the lower return road. The receiving mesa leads around the eastern turns and back down to the crossing. There is no road or bridge across the upper opening. The flat lower road remains independently driveable/drawable on the later visit.

| Setting | Value |
|---|---:|
| Packed-dirt lateral grip | 38.4 m/s² (80% of asphalt) |
| On-lane sand drag | None |
| Horizontal speed cap | Unchanged, 42 m/s |
| Takeoff / receiving elevation | 8 m / 6 m |
| Unsupported opening | 18 m |
| Straight upper approach / receiving corridor | 70 m / 80 m |
| Natural-crest upward velocity | 16 + 0.20 × forward speed (m/s) |
| Automatic-flight gravity | 36 m/s² |
| Hidden manual-hop obstacle | 3 m high, 1 m deep |
| Hidden trail distance saving | Approximately 21 m |

At 20 / 30 / 42 m/s, an aligned car travels approximately 24 / 39 / 60 m horizontally before descending to the receiving elevation. These are trajectory values, not guaranteed landings: sideways departures, edge impacts, insufficient speed and contacts can cause failure. Thrust is available in flight. Manual Hop remains 34 m/s upward velocity with 72 m/s² gravity, independent seven-second recharge, and cannot stack a crest impulse.

Hills alter height and pitch without adding slope acceleration or changing horizontal course-distance conventions. Outside the supported packed lane, normal loose-terrain grip/response/drag apply. Lane dust is restrained, and granular sound is quieter than full off-road feedback. Supplied sound files and menu music are retained.

The unmarked eastern service trail has tangent, 12 m-radius joins and a neutral rock obstruction with protected ends. Only a complete forward compiled traversal permits actual-height clearance over its named obstacle. Other protected rocks and same-level rails remain solid during Hop. CPUs use the normal trail and plan at least 22 m/s through the mandatory crest approach, using the same physics and legal abilities as humans.

## Architecture

- `core/elevation.ts`: section lookup, height/grade, ordered road association, support and inverse drawing-ray intersection. A bounded progress search distinguishes both visits to the x/z crossing. Immutable track lookups use cached progress bins.
- `core/tracks/grand-canyon.ts`: ordered height profiles, trail support widths, cliff faces/rails, the natural crest and manual branch. Flight metadata is separate from Santa Monica's ramp tuning.
- `core/support.ts`, `barriers.ts`, `simulation.ts`: full-car support/clearance, approved crossing, height-aware swept impacts, intended receiving surface and recovery. The lower road can never become the upper flight's landing or recovery destination.
- `route.ts` / `route-cleanup.ts`: original and processed samples retain ordered section association; cleanup, lap joining and resampling are clearance-checked at their intended levels. The airborne planning guide is invisible.
- `presentation/canyon.ts`: original procedural dirt roads, earthen shoulders/banks, layered sandstone and scrub. It never supplies simulation decisions. Roads/lines/effects use authored elevations, and the fixed camera reserves both automatic and manual flight heights.

Legitimate vertically separated traffic has no contact; overlapping vehicle-height envelopes retain normal shared contact rules. Recovery returns to the last safe pre-branch section/elevation, waits for same-height occupancy to clear, gives no forward credit and uses dust/impact feedback rather than a water splash. Ghosts remain recorded cosmetic motion and include elevation without entering contacts, audio or occupancy.

## Sessions and compatibility

Grand Canyon is available in Solo Race, Multiplayer and Time Trial, with 1–6 laps. New Full Tours include it as round five; Custom Tours can select it. Saved schedules are never rewritten. Track v2 and compiler v13 reject incompatible tours/records while retaining ordinary driver names, paints and lap preferences. Vehicle rules remain v13.

Run locally with `pnpm dev`, then open `http://localhost:5173/?circuit=grand-canyon`. The production build supports `/RoadsterRace/?circuit=grand-canyon`; publication uses the verified-main GitHub Pages workflow.

## Evidence

See `GRAND_CANYON_VERIFICATION.md` for the final checks, captures and limitations. Physical iPhone/iPad Safari comfort, performance and audio remain pending hardware testing. Automated Chrome touch emulation is supplemental evidence.
