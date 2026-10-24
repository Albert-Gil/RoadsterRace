# Higher manual hops and discoverable shortcuts

Local update, 2026-10-23. No commit, push or deployment. Existing recording and menu-music work is retained.

## Flight rules

| Setting | Before | Current |
|---|---:|---:|
| Manual upward impulse | 17 m/s | 34 m/s |
| Manual gravity | 36 m/s² | 72 m/s² |
| Level-ground peak | 4.014 m | 8.028 m |
| Level-ground airtime | 0.9444 s | 0.9444 s |
| Ramp/fall gravity | 36 m/s² | 36 m/s² |
| Ramp launch | 8 m/s + forward speed × ramp slope | Unchanged |
| Hop recharge | 7 s | 7 s |

`flightGravity(origin)` is the common selector for manual flight integration/landing, CPU hop landing prediction, the fixed-camera height envelope and generated rule summaries. Automatic ramp takeoff and unsupported falls retain their existing gravity. Manual Hop on a ramp keeps its manual origin and cannot receive a second lip impulse.

Doubling both manual impulse and gravity doubles height while preserving same-elevation flight time; no horizontal acceleration or guidance changes were added. Landing on a different-height support or making contact can still change flight duration. Approved-corridor protection, water failure, height-aware contacts and recovery continue to apply.

Visual landing compression is bounded to 0.09 m for 0.22 s, centrally configurable in `themes.ts`; it does not scale with the stronger vertical impact. Cold-gas mounts, 0.22 s pulse and all supplied sounds/music are unchanged.

## Discovery and interface

Circuit cards now display name, map, difficulty and length only. Driver/difficulty/lap/tournament controls are preserved; descriptive metadata remains available internally.

Launchsite has no Hop sign, hazard highlight, activation zone or shortcut arrows. Its service barrier uses the same concrete as other barriers, with unchanged footprint/height. Santa Monica has no Jump sign, golden ramp chevrons or takeoff/landing bands. Real ramp, gap, receiving deck, ordinary deck seams, neutral lane boundaries and protective rails remain visible and physical.

Accepted shortcut routes have no preview badge. Invalid routes retain concise clearance/support errors without referring to nonexistent marked lanes. Existing bypass and complete-shortcut compilation rules are preserved.

The fixed drawing/preview/countdown/racing camera reserves the higher envelope, including elevated ramp starts, with the same usable control rectangle and approximately six-pixel limiting clearance. Eight matching phone views show 98.23–100% of previous mean projected road width (less than 2% reduction). All four circuits' ground/height envelopes fit on phone portrait/landscape, tablet and desktop; no live pan/zoom was added.

## Compatibility

Physics version is **12**. Compiler remains **10**; circuit versions and geometry are unchanged. Existing compatibility checks reject older championships and separate old fastest-lap/replay keys. Driver names, paints and lap preferences remain intact. Milestone documents describing four-metre hops are historical; `CURRENT_RULES.md` and code are authoritative.

## Verification and captures

Local evidence is under `artifacts/higher-hop/`:

- `presentation-legacy.log`: all 12 HEAD comparisons pass before the flight change.
- `flight-before.json` / `flight-comparison.json`: 30 recorded comparisons, including all courses with 1/2/4 cars, nine ramp speed/yaw cases, eight manual speed/thrust cases and an unsupported-fall case. Ground/ramp/fall states match; manual horizontal trajectories and landing ticks match while vertical trajectories double.
- `before/`, `after/` and `framing-comparison.json`: matching phone captures plus tablet/desktop framing measurements.
- `unit.log`, `browser.log`, `build.log` and the final verification report: checks and actual gameplay recording.

Physical iPhone/iPad Safari comfort, performance and audio listening remain pending real hardware. Browser emulation supplements that check.
