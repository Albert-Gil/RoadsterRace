# Drawing sensitivity, drift and sand

> **Historical milestone record.** Values below describe the state when each section was written and several are superseded (rules, compiler and track versions, pace range, grip, sand drag, road width and control sizes). Current values: [CURRENT_RULES.md](CURRENT_RULES.md), generated from the source.

The October 20 handling revision implements the user's requested behavior: gentler interpretation of steering/pace, outward momentum when a turn is too fast, active steering back to the drawn line, and lower grip plus drag on sand. The former instant 45% speed loss and 0.85-second penalty window are removed.

## How the car moves

`RaceSimulation` now owns a world position, velocity vector and body heading. Steering aims at a point ahead on the drawn line. It turns the car's heading smoothly; tires can only bend the travel direction by the available lateral grip. At excessive speed, momentum cannot follow the turn and the car moves away from the line. Steering continues to seek it and recover. The renderer interpolates these physical poses, without snapping the car back to route samples or adding a grip-loss wobble.

Lateral tire steering preserves speed on asphalt. Normal drawn-pace acceleration/braking and forward thrust still apply. There is no per-drift speed multiplier, temporary low-speed target or recovery timer. The normal global maximum speed remains common to every player.

Surface contact is measured from the actual car footprint against track geometry. As tires leave the road, grip and response blend down over 1.2 world units while sand drag increases. Lower response sustains sideways motion; drag reduces speed while the car is actually on sand. Returning to asphalt restores its surface properties immediately. Dust is a presentation effect derived from sand amount; reduced-motion settings suppress it without changing physical behavior.

Navigation advances from local projection of actual movement. It cannot jump to a neighboring hairpin. Eight ordered proximity gates per lap require the physical car to come within 0.8 road widths of the corresponding route point. A badly missed gate becomes the recovery target. This keeps drift recovery connected to actual lap progress. Cars can hit solid circuit barriers. Car-to-car contact remains outside this milestone.

## Gentler drawing and pace

- Pace is measured over an eight-metre distance window, rather than a fixed number of browser events.
- Uniform route samples receive bounded spatial smoothing. Three passes remove small direction changes while moving points at most 0.8 m from the initial resampling. Start/finish stays anchored and road/checkpoint validation still runs.
- A weighted six-metre window filters short pace spikes, including the lap seam. Distances are recalculated after smoothing and resampled uniformly.
- The shared mapping spans 9–25 m/s with a broader gesture-speed range than before. Slow and fast sections remain different; strokes are never individually normalized to maximum speed.
- Desired pace is filtered again during driving. Acceleration, braking, jerk and a small pace deadband prevent abrupt throttle/brake changes.

## Forward cleanup and wider planning

The follow-up drawing revision runs when the player lifts their finger. It removes local self-crossing loops and out-and-back spurs first, then erases backward course sections and their outbound hooks. Direction means progress around the circuit, so legitimate hairpins remain intact. Nearby branches are associated continuously to avoid mistaking an ordinary wide line for a jump to a later part of the track.

A small overshoot beyond the finish is clipped at the first completed lap. It cannot become a backward closing segment. An entire extra lap is still rejected rather than silently trimmed.

Kept sections retain their recorded timing. A bridge across a removed detour uses the nearby recorded finger pace; time spent retracing the deleted section is not converted into an unintended braking pause. The preview displays the cleaned geometry and reports when it has tidied a correction. The Drawing statistic still shows the original gesture duration. Optional cleanup metadata records removed points/time for inspection and never affects physical grip.

The planning corridor now extends one additional road width beyond the asphalt, allowing substantial lines through sand. For Coastal Launch, the car-center limit is 16.15 m from the track centerline, compared with approximately 4.53 m before. The road mesh and physical surface rules are unchanged. A planned sand section still has lower traction and drag during the race; accepting a wider drawing never makes it behave like asphalt.

Validation runs on cleaned segments, including intermediate points on longer bridges. It still requires the correct start/finish area, a continuous complete forward lap and course coverage. A whole wrong-way lap, extra whole lap, major missing section or distant excursion is rejected with an explanation. Small corrections are repaired instead of rejecting an otherwise valid lap.

## Central tuning

Gameplay values live in `src/core/simulation.ts` (`RULES`), drawing pace/smoothing in `src/core/route.ts`, and cleanup/corridor settings in `src/core/route-cleanup.ts` (`DRAWING_RULES`). Themes and visual assets never influence them. Physics rules are version 4, the route compiler is version 4, and Coastal Launch is track version 2. Compiled routes record track version; obsolete geometry is rejected at race creation.

| Parameter | Current value | Effect |
|---|---:|---|
| Acceleration / braking | 6 / 8.5 m/s² | Softer than the previous 8 / 16 |
| Acceleration jerk | 14 m/s³ | Limits how abruptly throttle/brake force changes |
| Pace deadband | 0.4 m/s | Suppresses tiny throttle/brake corrections |
| Asphalt / sand lateral grip | 52 / 10 m/s² | Maximum ability to change travel direction |
| Asphalt / sand alignment response | 7.5 / 1.8 per second | Momentum aligns more slowly on sand |
| Sand drag | 1.25 per second at full contact | Applies continuously at the car's actual location |
| Steering lookahead | 4 m + speed × 0.25 s | Smooths path following and directs recovery |
| Maximum heading turn rate | 2.8 radians/s | Bounds steering rotation |
| Thrust duration / recharge | 0.7 / 5 seconds | Unchanged live ability timings |
| Extra drawing runoff | 1 road width per side | Permits wide sand plans without widening the physical asphalt |

These are arcade tuning values, not manufacturer specifications. Playtest changes should preserve physical drift/recovery and the absence of timed grip penalties.

## Verification and comparison

`pnpm test` covers physical deviation, finite movement, recovery, no speed loss caused by asphalt tire saturation, lower grip/greater retained slip on sand, sand drag, immediate restoration on asphalt, gate/lap validity, smoother pace/geometry, bounded acceleration jerk and deterministic races.

The browser drift scenario replays an actual two-second mouse gesture through Pointer Events, then checks rendered position against physics, observes sand slowdown, waits for steering recovery and completes two laps. Screenshots are `artifacts/drift-sand.png` and `artifacts/drift-recovered.png`.

Drawing-cleanup coverage includes forward strokes left untouched, backward corrections with retained pace, radial spurs, self-crossing loops, initial reversals, finish overshoots, wrong-way/incomplete/extra laps, invalid timestamps, wide straights/sweepers, wide hairpin lines and complete two-lap sand races. Browser checks capture `artifacts/route-cleaned.png`, `artifacts/route-wide-phone.png` and `artifacts/route-wide-racing.png`.

For a reproducible core-only tuning report on Node 24, run `node tools/physics-report.mjs`. It runs 2/4/7/14/24-second drawing fixtures without a renderer and writes `artifacts/physics-report.json` plus the fast-route trace in `artifacts/drift-telemetry.json`. This is simulation evidence; it is not a measurement of physical Safari performance or a substitute for evaluating feel with real fingers.


## Solid barriers and recovery — October 21

Coastal Launch has authored central and apex islands plus footprints for the outer gantry support and grandstand. Every island edge is at least five metres from the asphalt; most designed inner runoff is approximately six metres. Wider outer sand remains available. Route validation checks the full 2.2 × 5.2 m capsule plus 0.12 m clearance on cleaned and final smoothed geometry, including intermediate samples on long segments. A rejected section stays visible for inspection and cannot be confirmed.

Collision uses deterministic swept capsule substeps no farther than 0.18 m apart, including rotation, followed by penetration correction. Spatial bounds reject distant obstacles before polygon tests. Contact removes inward velocity and adds bounded tangent friction; head-on impacts therefore lose more speed than glancing contacts. Steering seeks a reachable route target after impact. This does not restore a grip-loss speed cap: asphalt momentum and physical sand drag still govern ordinary drifting.

After two seconds without half a metre of progress near a collision, that car returns to its last safe route position with zero speed and a one-second recovery hold. It receives no forward progress or refill. Race time and thrust recharge continue, and other players keep racing. Collision/recovery events drive particles, notices and replaceable sound roles. Recovery is separate from ordinary drift recovery.

Barrier footprints are immutable within a race. Changing their coordinates requires a new track definition/version; the collision broad phase caches bounds by footprint identity. Future hop must respect protected infield areas and ordered progression, as recorded in AGENTS.md.

## Orbital course physics

Orbital Launchyard is a separate `TrackDefinition` (ID `orbital-launchyard`, version 1), approximately 450 m at the physical centerline. It uses the same 60 Hz simulation, pace mapping, asphalt/sand grip, thrust, wall response and recovery as Coastal. The assembly and utility islands protect the technical return; the distant launch structure has a matching protected footprint. Tests sample obstacle edges and require at least five metres of asphalt-to-obstacle runoff. A distinct environment does not introduce hidden grip or thrust changes.

## Physical multiplayer and faster handling — October 21

The current shared rules are version **5** and the route compiler is version **6**. Speed cap is 42 m/s; drawn target pace is 9–28 m/s, thrust acceleration 25 m/s², asphalt grip 48, off-road grip 6.5 and off-road drag 1.10. All courses use these rules. Acceleration/braking/steering, 0.7 s thrust and 5 s recharge are retained. Earlier numeric descriptions above are historical baselines.

Multiplayer cars now collide using equal-mass capsules, restitution 0.10 and friction 0.20. Each 60 Hz tick contains two shared motion/contact substeps. All pair impulses read a common snapshot; wall-safe correction follows, and only then are progress, checkpoints and finishes credited. Swept relative-motion checks prevent tunneling. Four bounded passes handle compound contacts; velocity remains capped and overlap correction cannot create credited movement.

Separated two-column grids replace overlapping starts. First-lap progress begins after crossing the start plane. Championship grid slots rotate by round; solo retains its original start. Finished cars leave contact. Stuck contact can trigger the existing recovery hold; a recovering car waits if its last safe position is occupied. The race clock and recharge continue throughout recovery.

Golden Gate is approximately 442 m long (version 2) with 12 m road width, city/bridge foundations and flat physics. Launchsite retains the `orbital-launchyard` ID. Bests include course/version/laps and rules/compiler versions, avoiding comparisons with earlier handling. See `GOLDEN_GATE_TOURNAMENT.md` for tournament rules and persistence.

## Full-width gate compiler v6

`start-finish.ts` trims timestamped strokes at interpolated forward gate crossings before cleanup and gesture-speed filtering. The 12 m lead-in and at most 4 m overshoot remain presentation metadata. A slow/paused/backward pre-line approach cannot impose braking on the counted lap. Lateral tolerance is 0.5 m; longitudinal stripe tolerance is 1 m, with 1 mm numerical tolerance for screen unprojection. Accepted samples are clamped onto the physical gate width.

The final/initial 20 m blend laterally into the midpoint of accepted crossings, with immediate neighbors aligned to the gate's forward direction. Gesture speeds are measured before geometric joining, without a synthetic closing segment or pause. Full capsule clearance is checked on the retained counted stroke, cleaned geometry, joined geometry and final smoothed/resampled route. Unsafe connections require redrawing. Ordinary reversal cleanup no longer performs its legacy centerline-based finish clipping on gate-trimmed strokes.

Golden Gate's road-edge bridge rails and abutments are explicit bridge-tagged exceptions to ordinary 5–7 m runoff. The physical rules remain version 5: city and bridge appearance introduces no grip, acceleration, sound or contact tuning change. See GOLDEN_CITY_DRAWING.md for current contracts.
