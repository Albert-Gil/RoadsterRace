# Drawing pace, CPU decisions and overspeed drift — 2026-10-28

Vehicle rules **15**, compiler **16**. Circuit geometry and versions are unchanged.
This handling update was verified locally before release. GitHub Pages publishes successful
main builds through the existing verification workflow.

## Drawing

Pace remains world distance per second divided by circuit length, using the same 9–30 m/s
mapping for every driver. Neither CSS pixels, device-pixel ratio, camera distance nor zoom
enters that mapping. Deliberate slow/fast sections and the recorded event clock are preserved;
individual strokes are never normalized to maximum speed.

The input layer retains stationary, coalesced and terminal samples. It rejects stale events
and updates the visual line at most once per rendered frame. Raw strokes remain available
for display/inspection. Trimming still excludes lead-in and all movement after the finish.

`src/core/drawing-pace.ts` bounds a resting finger to 0.4 seconds inside a 0.35 m radius and
erases backward corrections, then resamples to at most 1 m spacing before smoothing. Pace windows interpolate their exact
distance/time endpoints, instead of choosing nearby events whose spacing depends on the
device. Live colors and compilation share this preparation and the 5 m gesture window;
the confirmed profile retains the existing 8 m smoothing filter. Live trailing colors are
provisional until subsequent samples arrive, and geometry cleanup can still adjust a hook.

## Computers

Each CPU plans an independent, clearance/hazard-checked route, with modest lateral variation
and the established difficulty factors. The cyclic braking pass includes the lap seam.
Authored mandatory jumps remain on the route and manual-hop lanes remain bypassed.

Fixed-clock decisions are staggered by four ticks between opponents. CPUs now:

- Predict the full Thrust burst, pace-controller response and ordinary braking distance.
- Withhold a burst when that prediction overspeeds an upcoming corner or encounters traffic.
- Recognize cars ahead on the same elevation rather than braking for every nearby car.
- Lift for a following gap or a slide, releasing the limit once aligned and clear.
- Retain the existing conservative, supported, traffic-overtaking Hop decision.

`setPaceLimit` only lowers a CPU's own planned target. It uses the shared acceleration,
braking and jerk limits; it changes no grip, speed cap, recovery, contact or ability recharge.
No player-position catch-up, hidden assistance or render-clock decisions are added.

## Drift

Below peak tire demand, grip is unchanged: asphalt 48, packed dirt 38.4, sand 6.5 m/s².
Beyond the peak, available lateral grip falls smoothly, by at most **14%** over two further
peak-demand multiples. This makes overspeeding carry momentum farther outside the line.
There is no timed speed reduction or asphalt speed multiplier. Sand still uses 0.95 drag;
maximum speed, acceleration, braking, flight, Hop and Thrust tuning are unchanged.

## Compatibility and verification

The rules/compiler versions segregate old records/replays and reject incompatible tours.
Names, paints and lap preferences remain intact. Existing historical geometry/pace fixtures
have a separate v15 handling snapshot because their old drift trajectories intentionally change.

Before editing, all 18 legacy comparisons matched HEAD `6b68de3`. The initial before/after
batch uses seed 92, all six venues, all three difficulties and two laps, with four physical
cars. All 18 new races finish; contacts total **208**, versus **1,772** before, and recoveries
total **0**, versus **1**. These are reproducible batch results, not a claim that every live
race avoids contact. Evidence: ignored `artifacts/driving-update/baseline.json` and `after.json`.

## Verification evidence

Local evidence is under `artifacts/driving-update/` (not published).

| Check | Result |
|---|---|
| Complete final unit suite | **549 / 549 tests, 39 / 39 files pass** (`unit-final.log`); includes all six courses/difficulties over six clean laps and fixed-command render-rate determinism |
| Timing at different capture rates | All six circuits preserve a deliberate slow/fast profile at 30, 60, 120 and 240 Hz; pause compression also matches sparse/frequent deliveries |
| Real touch projection comparison | Desktop, phone landscape/portrait, DPR 1/2/3 and a wider FOV: maximum target-speed difference **0.00283 m/s** on Newport and **0.00716 m/s** on Grand Canyon; counted duration differs by at most 0.0001 s for the 10 s recordings |
| Actual browser races | Overspeed drift/sand/recovery, Solo against three CPUs, Time Trial reload/replay, and Grand Canyon upper jump/lower return all pass |
| Actual corrected/wide drawings | Mouse backtracking is removed without a false pace dip; a wide phone touch line remains off-road and raceable |
| Pages-base production check | Full Hard Solo race completes with real touch drawing, one human ability pair, Hop/Thrust and all four cars; no page errors or failed requests (`pages-report.json`) |
| Overspeed comparison on identical frozen geometry/pace | Mean line error rises from **6.63 to 7.80 m**, max from **9.68 to 12.05 m** on the deliberate 25 m/s, 9 m-radius tire-saturation test; requested/actual speed remains 25 m/s |
| Flight isolation | Stationary Hop peak remains **8.0267 m**, landing tick **0.95 s**, exactly matching baseline `6b68de3` in the same comparison |
| Build / rules | Production build at `/RoadsterRace/` and type checking pass; generated rules updated |
| Rendering with active effects | LA nights: **128** four-car draw calls (target 150), **87** Time Trial + ghost (target 90); `budget-browser.log` / `artifacts/parcel-presentation/la-nights.json` |

The first complete unit run passed 547/549 cases and exposed two issues: resampling across an
erased backward hook could carry its clock into the retained stroke; and an old recovery test
depended on v14 drifting into one building twice. Cleanup now precedes resampling (its original
pace assertion passes). Recovery is tested with two deterministic blocked-motion/contact
episodes through the public motion-commit interface, then a completed lap; recovery rules
were not changed. Historical handling snapshots explicitly record the intentional v15 tire
change. The subsequent full run passes all 549 tests. Browser evidence is in `browser.log`,
`browser-final.log`, `cleanup-browser.log` and `budget-browser.log`; these cover nine distinct
cases, including a repeated final camera comparison after the correction. The frozen HEAD
overspeed/Hop comparison is `overspeed.json`; final race batches are in `after-final.json`.

Physical iPhone/iPad Safari drawing comfort, performance and sound remain pending hardware
testing. All results above were recorded locally before commit and push.
