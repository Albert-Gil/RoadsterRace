# Current rules and course values

Generated from the source by `pnpm docs:rules` (see `tools/current-rules.ts`). Do not edit by hand; `pnpm test` fails when this file is out of date. Dated milestone documents record history; this file and the code are authoritative.

Conventions: SI units; horizontal plane (x, z) with y up; heading 0 points along +z; angles in radians (degrees in parentheses).

## Versions

| Item | Version |
|---|---:|
| Vehicle rules (`RULES.version`) | 13 |
| Route compiler (`COMPILER_VERSION`) | 11 |
| Coastal Launch track (`coastal-launch`) | 3 |
| Launchsite track (`orbital-launchyard`) | 3 |
| Golden Gate track (`golden-gate`) | 3 |
| Santa Monica track (`santa-monica`) | 2 |
| Grand Canyon track (`grand-canyon`) | 1 |

Records, ghosts, session bests and championships are scoped by these versions. Change a version whenever a value below changes race results.

## Courses

| Circuit | ID | Track version | Road width (m) | Centerline (m) | Barriers | Branches |
|---|---|---:|---:|---:|---:|---|
| Coastal Launch | `coastal-launch` | 3 | 16 | 292.9 | 4 | — |
| Launchsite | `orbital-launchyard` | 3 | 16 | 460.6 | 7 | hop lane `service-hop` |
| Golden Gate | `golden-gate` | 3 | 16 | 496.4 | 25 | bridge `golden-span` |
| Santa Monica | `santa-monica` | 2 | 16 | 660.7 | 104 | ramp `pacific-hop` |
| Grand Canyon | `grand-canyon` | 1 | 16 | 568.8 | 9 | crest `canyon-crest`, hop lane `mesa-service-trail` |

Vehicle envelope: 2.2 m × 5.2 m. Race distance: 1–6 laps (default 2). Championship points by place: 10 / 6 / 4 / 0.

## RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `version` | 13 | — | Vehicle rules version; stored with records and championships |
| `dt` | 0.0166667 | s | Fixed simulation step (two equal substeps per step) |
| `laps` | 2 | laps | Default race distance |
| `acceleration` | 6 | m/s² | Maximum pace-following acceleration |
| `braking` | 8.5 | m/s² | Maximum pace-following braking |
| `accelerationJerk` | 14 | m/s³ | Maximum rate of change of acceleration |
| `paceResponse` | 1.6 | 1/s | Proportional gain from speed error to requested acceleration |
| `paceDeadband` | 0.4 | m/s | Speed error ignored by the pace controller |
| `maxSpeed` | 42 | m/s | Horizontal speed cap |
| `thrustAcceleration` | 25 | m/s² | Thrust acceleration while a burst is active |
| `thrustDuration` | 0.7 | s | Thrust burst length |
| `thrustRecharge` | 5 | s | Thrust recharge, measured from activation |
| `hopRecharge` | 7 | s | Hop recharge, measured from activation |
| `hopLaunchSpeed` | 34 | m/s | Upward velocity of a manual hop |
| `flightLaunchCorrection` | 0.349066 (20°) | rad | Largest momentum rotation at launch |
| `flightTurnRate` | 0.523599 (30°/s) | rad/s | Largest momentum rotation rate in flight |
| `asphaltGrip` | 48 | m/s² | Lateral acceleration limit on asphalt |
| `dirtGrip` | 38.4 | m/s² | Packed-dirt lateral grip |
| `sandGrip` | 6.5 | m/s² | Lateral acceleration limit on sand |
| `asphaltResponse` | 7.5 | 1/s | Velocity alignment gain per radian of slip on asphalt |
| `sandResponse` | 1.8 | 1/s | Velocity alignment gain per radian of slip on sand |
| `sandDrag` | 0.95 | 1/s | Exponential speed decay at full sand contact |
| `steeringResponse` | 4.8 | 1/s | Yaw-rate gain per radian of heading error |
| `steeringRate` | 2.8 (160.428°/s) | rad/s | Largest commanded yaw rate |
| `steeringSmoothing` | 7 | 1/s | First-order yaw-rate smoothing |
| `lookAhead` | 4 | m | Constant steering look-ahead along the drawn line |
| `lookAheadSeconds` | 0.25 | s | Speed-proportional steering look-ahead |
| `surfaceTransition` | 1.2 | m | Distance over which asphalt blends to sand |
| `driftStartAngle` | 0.17 (9.74028°) | rad | Slip angle that starts a drift |
| `driftEndAngle` | 0.09 (5.15662°) | rad | Slip angle below which a drift ends |

Derived: level-ground manual hop peak 8.028 m and airtime 0.944 s. Santa Monica ramp launch upward velocity is `rampLaunchBoost + max(0, forward speed) × lipHeight / rampLength`. Grand Canyon uses its authored natural crest: `16 + max(0, forward speed) × 0.20` from 8 m to the 6 m receiving surface, across an 18 m unsupported opening. Grounded elevation changes do not add slope acceleration.

## FLIGHT_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `gravity` | 36 | m/s² | Gravity for automatic ramps and unsupported falls |
| `hopGravity` | 72 | m/s² | Gravity during manual hops |
| `rampLaunchBoost` | 8 | m/s | Upward velocity added at a ramp lip, before the slope term |
| `carHeight` | 1.05 | m | Vertical vehicle envelope for walls and car contacts |
| `waterHeight` | -2.4 | m | Water surface elevation |

## CONTACT_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `restitution` | 0.1 | — | Car-to-car coefficient of restitution |
| `friction` | 0.2 | — | Car-to-car tangential friction coefficient |
| `passes` | 4 | — | Contact resolution passes per substep |
| `ghostStartSeconds` | 3 | s | Opening period without car-to-car contact (multi-car races) |

## PACE_RANGE

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `min` | 9 | m/s | Slowest drawn target speed |
| `max` | 30 | m/s | Fastest drawn target speed |

## PACE_FILTER

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `gestureRadius` | 5 | m | Half-window for measuring drawing speed |
| `compiledRadius` | 8 | m | Half-window of the compiled pace filter |

## DRAWING_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `runoffRoadWidths` | 1 | road widths | Permitted drawing beyond the asphalt on each side |
| `backwardTolerance` | 0.08 | m | Backward course movement tolerated before cleanup |
| `localLoopRoadWidths` | 2.5 | road widths | Course window searched for loops and spurs |

## GATE_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `leadIn` | 12 | m | Drawing may start this far before the start/finish line |
| `longitudinalTolerance` | 1 | m | Along-track tolerance at the line |
| `lateralTolerance` | 0.5 | m | Across-track tolerance beyond the gate width |
| `blendDistance` | 20 | m | Length blended at each end of the lap |

## SHORTCUT_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `clearance` | 0.15 | m | Required vehicle clearance inside a hop corridor |
| `sampleSpacing` | 0.35 | m | Validation sample spacing along a hop corridor |
| `backwardTolerance` | 0.5 | m | Backward movement tolerated inside a hop corridor |

## AI_TUNING

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `easy` | 0.9 | — | Fraction of the safe pace profile |
| `normal` | 0.97 | — | Fraction of the safe pace profile |
| `hard` | 1 | — | Fraction of the safe pace profile |
