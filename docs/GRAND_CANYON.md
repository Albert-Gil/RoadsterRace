# Grand Canyon

Current local terrain revision, 2026-10-27. No commit, push or deployment is included in this revision.

## Driving and tuning

The fifth venue is an original 595.0 m figure-eight-style dirt course, difficulty 3/5. The road is 16 m wide. Track version 5 retains the opened 19 m-radius corners, extending the outer turns slightly to preserve a 70 m straight approach and 80 m receiving runout around its wider natural crossing. Supported shoulders are 30 m through bends; the upper approach joins at 30 m, broadens to 36 m and narrows gradually to 24 m at the lip. The landing ledge widens continuously from 16 to 30 m into the next turn. Start/finish retains the full-width gate, new 30 m drawing approach and discarded finish overshoot. The full 38 by 32 m touchdown rectangle is visible and accepted.

Follow the western sweepers up to the ledge. The natural crest automatically launches over the lower return road. The receiving mesa leads around the eastern turns and back down to the crossing. There is no road or bridge across the upper opening. The flat lower road remains independently driveable/drawable on the later visit.

| Setting | Value |
|---|---:|
| Packed-dirt lateral grip | 38.4 m/s² (80% of asphalt) |
| On-lane sand drag | None |
| Horizontal speed cap | Unchanged, 42 m/s |
| Takeoff / receiving elevation | 8 m / 6 m |
| Unsupported opening | 30 m |
| Straight upper approach / receiving corridor | 70 m / 80 m |
| Natural-crest upward velocity | 29 + 0.05 × forward speed (m/s) |
| Automatic-flight gravity | 36 m/s² |
| Hidden manual-hop obstacle | 3 m high, irregular rock footprint approximately 4 m deep |
| Hidden trail distance saving | Approximately 27 m |

At 20 / 30 / 42 m/s, an aligned car travels approximately 35 / 53 / 75 m horizontally before descending to the receiving elevation. All three and ±20° body yaw with modest sideways drift pass the full-vehicle landing checks. These are trajectory values, not guaranteed landings: disrupted or slow approaches and contacts can still fail. Thrust is available in flight. Manual Hop remains 34 m/s upward velocity with 72 m/s² gravity and independent seven-second recharge. It cannot stack a crest impulse; a manual Hop too early or too slowly can fall short of this larger opening.

Hills alter height and pitch without adding slope acceleration or changing horizontal course-distance conventions. Outside the supported packed lane, normal loose-terrain grip/response/drag apply. Lane dust is restrained, and granular sound is quieter than full off-road feedback. Supplied sound files and menu music are retained.

The unmarked eastern service trail has tangent, 12 m-radius joins and an irregular row of weathered boulders with overlapping protected end piles. The former straight service-wall outline is removed. Only a compiled forward traversal permits actual-height clearance over its named centre obstacle. Other protected rocks and same-level rails remain solid during Hop. CPUs use the normal trail and plan at least 22 m/s through the mandatory crest approach, using the same physics and legal abilities as humans.

## Natural trail appearance

Layered hillsides flare outward toward the canyon floor; broad, uneven scree toes replace the upright platform sides. Inside expansion is bounded by local corner curvature so the hill cannot fold over itself. Jump-facing cliff slopes extend six metres from their lips toward the opening, narrowing it to an 18 m-wide clear floor corridor around the 16 m lower road. Their physical height varies across their authored footprint and is evaluated over the full capsule. Below-ground toes create no phantom wall. General hillside slopes remain cosmetic geology, not additional driving supports.

Shared irregular rims join the multi-row shoulders to the hillsides. Compacted dirt has ragged edges and a feathered colour transition, with narrower wandering tire paths. The narrow receiving corridor stays within its physical support. Ground sediment and contact shade follow the new hill toes. All elevation, flight tuning, handling and audio remain unchanged.

## Architecture

- `core/elevation.ts`: section lookup, height/grade, ordered road association, support and inverse drawing-ray intersection. A bounded progress search distinguishes both visits to the x/z crossing. Immutable track lookups use cached progress bins.
- `core/tracks/grand-canyon.ts`: ordered height profiles, trail support widths, cliff faces/rails, the natural crest and manual branch. Flight metadata is separate from Santa Monica's ramp tuning.
- `core/support.ts`, `barriers.ts`, `simulation.ts`: full-car support/clearance, approved crossing, height-aware swept impacts, intended receiving surface and recovery. The lower road can never become the upper flight's landing or recovery destination.
- `route.ts` / `route-cleanup.ts`: original and processed samples retain ordered section association; cleanup, lap joining and resampling are clearance-checked at their intended levels. The airborne planning guide is invisible.
- `presentation/canyon.ts`: original procedural dirt roads, earthen shoulders/banks, layered sandstone and scrub. It never supplies simulation decisions. Roads/lines/effects use authored elevations, and the fixed camera reserves both automatic and manual flight heights.

Legitimate vertically separated traffic has no contact; overlapping vehicle-height envelopes retain normal shared contact rules. Recovery returns to the last safe pre-branch section/elevation, waits for same-height occupancy to clear, gives no forward credit and uses dust/impact feedback rather than a water splash. Ghosts remain recorded cosmetic motion and include elevation without entering contacts, audio or occupancy.

## Sessions and compatibility

Grand Canyon is available in Solo Race, Multiplayer and Time Trial, with 1–6 laps. New Full Tours include it as round five; Custom Tours can select it. Saved schedules are never rewritten. Track v5, compiler v15 and vehicle rules v14 reject incompatible tours/records while retaining ordinary driver names, paints and lap preferences.

Run locally with `pnpm dev`, then open `http://localhost:5173/?circuit=grand-canyon`. The production build supports `/RoadsterRace/?circuit=grand-canyon`; publication uses the verified-main GitHub Pages workflow.

## Evidence

See `GRAND_CANYON_VERIFICATION.md` for the final checks, captures and limitations. Physical iPhone/iPad Safari comfort, performance and audio remain pending hardware testing. Automated Chrome touch emulation is supplemental evidence.
