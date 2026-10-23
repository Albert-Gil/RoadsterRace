# Phone and modes verification — 2026-10-22

## Release checks

| Check | Result |
|---|---|
| Type checking | Pass |
| Unit suite | 216 pass |
| Focused browser checks | 29 distinct scenarios pass across suites and targeted reruns |
| Pages production build / smoke | Pass; zero page errors or failed required requests |
| Time Trial ghost + live thrust | 75 draw calls, below 90; 40 samples, no page error or interruption |
| Four cars + active thrust | 133 draw calls, below 150 |
| Frozen handling comparisons | Three solo fixtures and six multiplayer comparisons pass |

The ghost capture averages approximately 74.7 renderer fps in desktop Chrome at an 844×390 viewport. This is a desktop measurement, not an iPhone performance result. Raw evidence is ignored under `artifacts/phone-upgrade/`; four-car evidence is `artifacts/santa-monica/multiplayer-report.json`.

## Phone measurements

Captured at 844×390 landscape and 390×844 portrait, device scale factor 2, desktop Chrome/ANGLE Direct3D11. Values are sampled projected road widths in CSS pixels, not physical Safari measurements. Both the authored layouts and the camera change; this is a usability comparison, not an isolated camera benchmark.

| Circuit | Orientation | Previous narrowest sample | Final narrowest sample |
|---|---|---:|---:|
| coastal-launch | landscape | 24.5 | 55.6 |
| launchsite | landscape | 18.7 | 41.6 |
| golden-gate | landscape | 20.7 | 45.8 |
| santa-monica | landscape | 18.1 | 33.3 |
| coastal-launch | portrait | 16.9 | 58.2 |
| launchsite | portrait | 12.9 | 42.1 |
| golden-gate | portrait | 14.6 | 45.7 |
| santa-monica | portrait | 12.2 | 34.5 |

The final compact camera uses 65° elevation, desktop uses 42°, and both remain fixed during the lap. The complete road, full gate/12 m approach and approved jump branch remain visible. Approximate 6 px clearance is measured inside the safe/control rectangle; distant scenery is intentionally cropped. Final before/after images and raw measurements are in ignored `artifacts/phone-upgrade/before/` and `after/`.

## Behavior and compatibility

- All four physical courses have 16 m roads and incremented versions; the compiler is v9.
- Shared road edges pass corner radius, winding, self-crossing, lateral clearance and runoff checks. Current support/jump checks include the moved hotel protection and pier geometry.
- Vehicle force/contact rules remain v8. Three frozen solo handling fixtures and six original-course multiplayer comparisons retain identical results on identical old geometry (finish times within 1e-8 s and exact event counts). The live widened layouts intentionally have different lap times.
- CPU plans finish six laps on all four courses at every difficulty without clean-run recovery. Shared contact/thrust cases finish, and recorded human commands plus CPU decisions match at 30/60/120 rendering rates.
- Time Trial observes actual fixed-step poses at 30 Hz with exact lap endpoints. Storage validation, reload, unavailable-storage fallback and a ghost outside the physical car array are checked.
- Saved championships retain controller types, difficulty and seed. Older physical layouts/compiler versions are rejected without erasing ordinary preferences.

## Browser evidence

The focused suites cover Solo Race/rematch, a complete solo Full Tour with reload/resume, Time Trial replay/reload and unavailable storage, local ghost starts/pause/rematch, two/three/four human controls, simultaneous overlapping touch ownership, six-lap names/paints, phone/tablet setup, real Santa Monica bypass/jump touch traces at high density, airborne pause/retry, four-car mixed branches, older-save rejection, full local championship, custom schedules, fixed drawing/racing projection and delayed-layout phone rotation.

Continuous tracing is disabled for ordinary long race tests (`on-first-retry` remains available). Explicit screenshots/reports and failure screenshots are retained. An earlier development run was interrupted by source hot reload while changes were being finalized; affected input checks are repeated after freezing source. A high-density screenshot also exercised the existing render-gap pause safeguard. The touch test checks that the reason is specifically `render-delay`, explicitly resumes after the screenshot, then verifies the fresh single-player touch and deliberate blur/cancellation/resume behavior. The new full-tour helper resumes explicit headless interruptions without changing game clocks or physics.

The `/RoadsterRace/` production smoke replays real touch input on every venue and Santa Monica's jump, tests Solo Race's four cars/one human control, four private local drawing turns/readiness, and saved championship reload. It checks fonts, icons, manifest, Home navigation, production inspector removal and canvas proportions after rotation. Full completion is covered by unit/development browser runs; the production smoke verifies startup/input/race start. Production report records zero page errors and failed required requests.

## Hosted release checks

The first hosted run exhausted its 30-minute verification budget while executing production smoke sequentially with software WebGL. It had reached Solo Race after checking every course, rotation and local drawing. The workflow now runs the same checks in five independent groups and requires all groups before deployment. Local production smoke remains available as one complete sequential run. This is a release-test scheduling change; game rendering and simulation are unchanged.

## Pending physical testing

Physical iPhone/iPad Safari frame rate, heat, finger comfort, simultaneous touch, jump readability, rotation/browser chrome and hosted Home Screen/cellular use remain pending until tested on hardware. Automated touch/viewport emulation is supplemental evidence.
