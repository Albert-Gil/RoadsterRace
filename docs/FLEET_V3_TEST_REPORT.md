# Fleet v3 — verification report

Date: 2026-11-06. Baseline: `2709eff04d8c7bcc36fa05720b797764f3d06d40`.
Scope: local San Diego Fleet upgrade. No commit, push or deployment performed.

## Result

- Fleet track 3, 719.1 m, 16 m main road, staggered six-vessel arrangement.
- Four explicit 3 m automatic steel ramps with real wedge support and open water
  beyond each lip. Manual water-Hop entries have no ramp or activation paint.
- Both narrow auxiliary ships point along the shortcut, have no painted road/edge
  ribbon, no above-deck superstructure and normal road grip across the full deck.
- Refined closed jet geometry, glazing, thick wings, intakes, exhausts and tails;
  all existing hull/water/radar material batches retained.
- 39,718 venue triangles including the radar geometry, versus 44,658 in the v2 bake.
  No new lights, reflection cameras or postprocessing passes. Six original geometry
  roles remain; the 120,000-triangle budget is preserved.
- Other nine course geometry/versions and global rules 19/compiler 20 unchanged.
  Fleet compatibility is handled by track 3. See FLEET_V3.md.

## Completed focused checks

- Every crossing lands at 20/30/42 m/s with +/-20 degree body yaw and modest lateral
  velocity. Vehicle-sized landing support, real gap ends and continuous graded joins.
- Both separate branch variants complete six laps, one legal Hop per branch per lap,
  with no recovery. A missed manual water Hop recovers to the source carrier.
- Fifteen deterministic two-lap four-car CPU races (five seeds per difficulty) finish
  within 240 simulated seconds; CPUs retain main-route automatic launches.
- Full-width ramp support, whole-working-deck grip, no alternate asphalt ribbon,
  stationary hulls, affine prop containment, staggered axes and adequate Hop spacing.
- Every course's ordinary protected-prop runoff audit passes, including the relocated
  Fleet bridges and turrets. The full start touchdown area remains supported.
- Five Fleet browser tests pass: desktop mouse/real keyboard use through both auxiliary
  sequences, portrait/landscape real touch drawing for main/each alternate, human
  completion/medals/reload, four local phone drivers with simultaneous controls,
  ghost start, pause/resume/Home and complete finishing order. An additional four-round
  Hard Frontier browser regression also passed (six browser tests total).
- Type checking, ordinary production build, base-path Pages build, generated rules
  and native geometry bake pass.

## Review media

`artifacts/fleet-v3/index.html` includes the full gameplay camera on desktop, phone
landscape/portrait and tablet, the previous v2 comparison, carrier/aircraft detail,
and an actual browser recording of both auxiliary sequences. The selection thumbnail
was regenerated from the shipped scene (480x270 WebP, 7,342 bytes).

Physical iPhone/iPad Safari comfort, sound and sustained performance remain pending
hardware testing. Automated mobile emulation does not claim physical-device results.

## Final automated results

- Full unit suite: **75 files / 937 tests passed** on the frozen final source, including the exact support-query optimization.
- Unchanged-venue handling: **27 exact fixtures match HEAD** across one/two/four cars
  on the other nine courses, including legal Hop and Thrust commands.
- All six selected browser tests passed, including the five Fleet checks and the
  four-round Hard Frontier regression.
- Production Pages-path smoke passed: real touch preview, race start, complete finish
  and sound activation; **zero page errors and zero failed required requests**.
- Ordinary and `/RoadsterRace/` production builds, type checking, rules generation,
  native bake and whitespace checks passed.
- Scene draw-call peaks remain **82 four-car / 35 Time Trial with ghost**, matching
  v2 and below 150/90. Initial frame timing was sampled during the heavy suite;
  a matched old/new comparison is recorded separately in the local artifact gallery.

Evidence: artifacts/fleet-v3/unit-tests.log, browser-tests.log, legacy-tests.log,
focused-tests.log, build.log, pages-build.log, pages-smoke.log, performance.json,
matched-performance.json and the review gallery/media.

## Frame timing investigation

The initial timing sample overlapped the heavy suite. A same-machine, same-browser
comparison then revealed a context-order bias: the second four-car context measured
slower regardless of which version it loaded. Both orders were measured, 600 frames
per sample, 1440x900 Medium, D3D11 Chrome, reduced motion, with legal abilities activated.

| Metric | Previous Fleet v2 | Updated Fleet v3 |
|---|---:|---:|
| Four-car average of the two median frame samples | 9.05 ms | 8.35 ms |
| Four-car average median rendering submission | 2.20 ms | 2.30 ms |
| Four-car peak scene calls | 82 | 82 |
| Time Trial + ghost median frame | 9.40 ms | 8.80 ms |
| Time Trial + ghost median rendering submission | 1.10 ms | 1.10 ms |
| Time Trial + ghost peak scene calls | 35 | 35 |

No sustained median-frame regression is shown by the counterbalanced desktop sample.
These are automated desktop measurements, not physical iPhone results. Raw data are
matched-performance.json, reverse-performance.json and pre-optimization-performance.json.
The exact support-query bounds optimization is additionally covered by 60,000
reference comparisons and edge tests; all 31 focused Fleet/challenge tests pass.

Final post-optimization run: 75 files / 937 tests passed (755.99 s in the restricted
local runner), 27 unchanged-venue handling fixtures matched HEAD again, and both final
builds plus the complete Pages-path production touch race passed. The six browser
journey checks preceded the exact query optimization; final production touch/race and
the full unit/reference comparisons were repeated afterward. No simulation, geometry
or UI edits were made after these final checks. Physical Safari remains pending.


## Publication authorization

After local verification, the owner requested commit and push on 2026-11-06.
Public testing updates remain gated by the existing verified-main Pages workflow;
physical iPhone/iPad Safari acceptance remains pending hardware testing.
