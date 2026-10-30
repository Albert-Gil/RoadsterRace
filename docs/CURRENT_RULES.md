# Current rules and course values

Generated from the source by `pnpm docs:rules` (see `tools/current-rules.ts`). Do not edit by hand; `pnpm test` fails when this file is out of date. Dated milestone documents record history; this file and the code are authoritative.

Conventions: SI units; horizontal plane (x, z) with y up; heading 0 points along +z; angles in radians (degrees in parentheses).

## Versions

| Item | Version |
|---|---:|
| Vehicle rules (`RULES.version`) | 18 |
| Route compiler (`COMPILER_VERSION`) | 18 |
| Newport Island track (`coastal-launch`) | 6 |
| Launchsite track (`orbital-launchyard`) | 9 |
| Golden Gate track (`golden-gate`) | 7 |
| Santa Monica track (`santa-monica`) | 3 |
| Grand Canyon track (`grand-canyon`) | 5 |
| LA nights track (`la-nights`) | 4 |
| Snowy Tahoe track (`snowy-tahoe`) | 5 |
| Capitan Yosemite track (`capitan-yosemite`) | 2 |

Records, ghosts, session bests and championships are scoped by these versions. Change a version whenever a value below changes race results.

## Courses

| Circuit | ID | Track version | Road width (m) | Centerline (m) | Barriers | Branches |
|---|---|---:|---:|---:|---:|---|
| Newport Island | `coastal-launch` | 6 | 16 | 292.9 | 4 | — |
| Launchsite | `orbital-launchyard` | 9 | 16 | 460.6 | 25 | hop lane `service-hop` |
| Golden Gate | `golden-gate` | 7 | 16 | 496.4 | 38 | bridge `golden-span` |
| Santa Monica | `santa-monica` | 3 | 16 | 660.7 | 105 | ramp `pacific-hop` |
| Grand Canyon | `grand-canyon` | 5 | 16 | 595.0 | 43 | crest `canyon-crest`, hop lane `mesa-service-trail` |
| LA nights | `la-nights` | 4 | 16 | 734.0 | 12 | ramp `channel-crossing`, hop lane `backlot-alley` |
| Snowy Tahoe | `snowy-tahoe` | 5 | 16 | 554.8 | 17 | hop lane `forestry-trail` |
| Capitan Yosemite | `capitan-yosemite` | 2 | 16 | 711.2 | 55 | crest `valley-creek-crest`, hop lane `ranger-timber-trail` |

Vehicle envelope: 2.9095 m × 6.877 m. Race distance: 1–6 laps (default 2). Championship points by place: 10 / 6 / 4 / 0.

Continuous terrain is authoritative for drawing, cars, runoff and rendering. Slopes change elevation/pitch, not horizontal acceleration. Weather is presentation only.

| Circuit | Road elevation (m) | Ground grid cell (m) |
|---|---:|---:|
| Snowy Tahoe | 0–60.8 | 3 |
| Capitan Yosemite | 0–28 | 4 |

Main-road ski crests keep continuous terrain support and use automatic-flight gravity. They are not branches, ramps or water exemptions; takeoff is forward-only and does not stack with manual Hop.

| Circuit | Main-road takeoff | Station (m) | Width (m) | Upward velocity (m/s) | Minimum forward speed (m/s) | CPU reference pace (m/s) |
|---|---|---:|---:|---|---:|---:|
| Snowy Tahoe | `summit-ski-crest` | 364 | 16 | 8 + forward speed × 0.1 | 6 | 24 |
| Snowy Tahoe | `valley-snow-roll` | 36 | 16 | 5.5 + forward speed × 0.08 | 6 | 21 |
| Snowy Tahoe | `lakeside-snow-roll` | 146 | 16 | 5.5 + forward speed × 0.08 | 6 | 21 |

## RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `version` | 18 | — | Vehicle rules version; stored with records and championships |
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
| `snowGrip` | 26.4 | m/s² | Packed-snow lateral grip, 55% of asphalt and below packed dirt |
| `snowLooseGrip` | 7.5 | m/s² | Deep-powder lateral grip outside the packed lane |
| `snowDrag` | 1.1 | 1/s | Exponential speed decay at full deep-powder contact |
| `steeringResponse` | 4.8 | 1/s | Yaw-rate gain per radian of heading error |
| `steeringRate` | 2.8 (160.428°/s) | rad/s | Largest commanded yaw rate |
| `steeringSmoothing` | 7 | 1/s | First-order yaw-rate smoothing |
| `lookAhead` | 4 | m | Constant steering look-ahead along the drawn line |
| `lookAheadSeconds` | 0.25 | s | Speed-proportional steering look-ahead |
| `surfaceTransition` | 1.2 | m | Distance over which asphalt blends to sand |
| `driftStartAngle` | 0.17 (9.74028°) | rad | Slip angle that starts a drift |
| `driftEndAngle` | 0.09 (5.15662°) | rad | Slip angle below which a drift ends |
| `driftGripLoss` | 0.14 | fraction | Largest loss of lateral authority beyond peak tire slip; no speed multiplier |
| `driftSaturationRange` | 2 | peak-demand multiples | Excess tire demand over which lateral grip falls smoothly |
| `recoveryHold` | 1 | s | Time a reset car waits before driving on |
| `hazardApproach` | 12 | m | A crash this far before a drawn hazard resets the car past it |
| `hazardPenaltySpeed` | 20 | m/s | Extra reset wait is the skipped circuit distance divided by this |
| `repeatRecoveryWindow` | 15 | m | A second reset within this route distance also moves the car forward |

Derived: level-ground manual hop peak 8.028 m and airtime 0.944 s. Santa Monica ramp launch upward velocity is `rampLaunchBoost + max(0, forward speed) × lipHeight / rampLength`. Grand Canyon uses its authored natural crest: `29 + max(0, forward speed) × 0.05` from 8 m to the 6 m receiving surface, across a 30 m unsupported opening. Grounded elevation changes do not add slope acceleration.

## FLIGHT_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `gravity` | 36 | m/s² | Gravity for automatic ramps and unsupported falls |
| `hopGravity` | 72 | m/s² | Gravity during manual hops |
| `rampLaunchBoost` | 8 | m/s | Upward velocity added at a ramp lip, before the slope term |
| `carHeight` | 1.38862 | m | Vertical vehicle envelope for walls and car contacts |
| `waterHeight` | -2.4 | m | Water surface elevation |

## VEHICLE_DIMENSIONS

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `scale` | 1.3225 | factor | Uniform enlargement relative to the original vehicle |
| `width` | 2.9095 | m | Authoritative horizontal vehicle width on every circuit |
| `length` | 6.877 | m | Authoritative capsule length on every circuit |
| `height` | 1.38862 | m | Vertical vehicle envelope for airborne contacts and barriers |

## CONTACT_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `restitution` | 0.1 | — | Car-to-car coefficient of restitution |
| `friction` | 0.2 | — | Car-to-car tangential friction coefficient |
| `passes` | 4 | — | Contact resolution passes per substep |
| `ghostStartSeconds` | 5 | s | Opening period without car-to-car contact (multi-car races) |

## PACE_RANGE

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `min` | 9 | m/s | Slowest drawn target speed |
| `max` | 30 | m/s | Fastest drawn target speed |

## PACE_FILTER

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `gestureRadius` | 5 | m | Exact half-window for measuring drawing speed |
| `compiledRadius` | 8 | m | Half-window of the compiled pace filter |
| `sampleSpacing` | 1 | m | Maximum spacing of retained timed samples before pace/geometry smoothing |
| `pauseRadius` | 0.35 | m | Motion inside this radius is a resting finger, independent of event rate |

## DRAWING_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `minimumLapProgress` | 0.72 | fraction | Minimum forward course progress, and share of covered stretches, for a completed lap |
| `minimumPhysicalLap` | 0.45 | fraction of centerline length | Minimum actual drawing travel before finish can be counted |
| `backwardTolerance` | 0.08 | m | Backward course movement tolerated before cleanup |
| `backwardShare` | 0.25 | fraction of centerline length | Total backward course movement that marks a wrong-way lap |
| `localLoopRoadWidths` | 2.5 | road widths | Course window searched for loops and spurs |
| `longestPause` | 0.4 | s | Longest pause counted in a drawing; longer hesitations are shortened to this |
| `coverageBins` | 40 | — | Evenly spaced circuit stations checked for lap coverage |
| `coverageRoadWidths` | 0.75 | road widths | A station counts as covered when the line passes within this distance beyond the asphalt |
| `longestStepRoadWidths` | 2 | road widths | Longer jumps between touch samples mean the stroke lost contact |

## GATE_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `leadIn` | 30 | m | Drawing may start this far before the start/finish line |
| `longitudinalTolerance` | 1 | m | Along-track tolerance at the line |
| `lateralTolerance` | 8 | m | Start tolerance beyond each end of the gate |
| `startBeyond` | 8 | m | Drawing may also start this far past the line |
| `finishLateral` | 24 | m | A finish crossing counts this far beyond each end of the gate |
| `closeDistance` | 40 | m | Lifting up to this far before the line still closes the lap onto it |
| `blendDistance` | 20 | m | Length blended at each end of the lap |

## SHORTCUT_RULES

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `clearance` | 0.15 | m | Required vehicle clearance inside a hop corridor |
| `sampleSpacing` | 0.35 | m | Validation sample spacing along a hop corridor |
| `backwardTolerance` | 0.5 | m | Backward movement tolerated inside a hop corridor |
| `commitAlignment` | 0.5 | — | Minimum cosine between the line and the hop lane where the line meets the named obstacle (0.5 = within 60°) |

## AI_TUNING

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `easy` | 0.9 | — | Fraction of the safe pace profile |
| `normal` | 0.97 | — | Fraction of the safe pace profile |
| `hard` | 1 | — | Fraction of the safe pace profile |

## AI_DRIVING

| Key | Value | Unit | Meaning |
|---|---:|---|---|
| `decisionTicks` | 12 | ticks | Fixed-clock interval between each computer driver decision |
| `cornerGripShare` | 0.64 | fraction | Nominal grip used for the safe planned corner pace |
| `brakingShare` | 0.65 | fraction | Ordinary braking reserved by corner and burst predictions |
| `responseSeconds` | 0.45 | s | Extra braking distance for pace-controller response after a burst |
| `followingSeconds` | 0.65 | s | Following headway and speed-response horizon |
| `trafficRange` | 32 | m | Furthest same-level car considered ahead |
| `minimumGap` | 2.5 | m | Minimum bumper-to-bumper following gap |
