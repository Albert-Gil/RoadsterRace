# San Diego Fleet v2 — verification report

Date: 2026-11-06. Baseline: `e40352e3df84c113a831fec130fbc8dc181f8f7a`.
The previous challenge implementation is preserved. The owner authorized commit and
push after verification. Public deployment remains gated by the verified-main workflow.

## Final result

- Fleet v2: 714.8 m, 16 m road, six stationary vessels at 24/22/16 m, two automatic
  main crossings and two complete support-vessel alternatives.
- Ship-shaped/sculpted support outlines, layered hull sides, narrower waterlines,
  deep keels, original naval markings/anchors/life rafts, larger command islands,
  eight folded-wing fighters, two rescue helicopters and four deck tractors.
- Smooth graded transfers reach carrier height before any receiving-deck overlap.
  Their structural trusses sit below the driving deck, without unmodeled upper rails.
- Other nine course geometries, versions and handling remain unchanged. Physics 19
  and compiler 20 remain unchanged; Fleet compatibility is scoped through track v2.

## Verification

| Check | Result |
|---|---|
| Type checking | Passed |
| Offline native production bake / rail equivalence | Passed |
| Generated rules documentation | Regenerated and test-checked |
| Production Pages-path build | Passed |
| Other-nine-course legacy comparison | 27 one/two/four-car fixtures match HEAD |
| Final Fleet/challenge/rules unit suites | 4 files / 28 tests passed |
| Clean pre-push full unit suite | 74 files / 933 tests passed (`pnpm test --maxWorkers=4`) |
| Generic ten-course runoff checks | All ten passed after parking/prop-clearance adjustments |
| Mouse/touch Fleet browser cases | Four passed: both phone orientations/hidden decks, live normal race, Fleet Explorer |
| Four-player phone race | Passed, including simultaneous abilities, contact, starting ghosting, pause/resume and full-course framing |
| Ultra graphics on all ten venues | Passed; automated Chrome restored a transient context loss while cycling scenes |
| Final built-site smoke | Real touch drawing, preview, sound and complete Fleet race passed under `/RoadsterRace/`, with no errors or failed required requests |
| Gallery images / comparison slider | Passed |
| Whitespace check | Passed |

The final focused unit run includes the fifteen seeded two-lap CPU races (five seeds
on each difficulty), all six crossings at 20/30/42 m/s with ±20° body yaw and sideways
momentum, six-lap individual branch runs, real landing-event challenge evidence,
missed-Hop recovery, concave deck triangulation, exact water-gap ownership, supported
prop footprints/heights, outward hull normals, geometry budget and save compatibility.

A separate six-lap run used **both support vessels every lap**, with **12 legal Hops,
zero recoveries**, and all six laps complete. Source fixes address every failure
observed during iteration. After the localized gangway fix, a clean full-suite rerun
passed all 933 tests. The final focused suites and built race have no unresolved failures.

## Measured rendering cost

Development desktop, Chrome/WebGL 2, Medium, 1440×900. Effects were activated during
each measurement; Time Trial replay was obtained from an actual preceding lap.

| Scenario | Peak scene draw calls | Median render work | Median frame interval |
|---|---:|---:|---:|
| Four cars with effects | 82 / 150 budget | 2.8 ms | 7.6 ms |
| Time Trial + ghost + effects | 35 / 90 budget | 1.2 ms | 10.1 ms |
| Planning / overview | 16 | — | — |

Native fleet geometry totals **44,658 triangles**, including the radar batch, below
the 120,000-triangle limit. The existing static ship, water and dynamic radar batches
remain; no lights, reflection cameras or screen passes were added. Values are local
desktop measurements, not claims about iPhone hardware or a comparative FPS guarantee.

## Evidence

Review page: `http://127.0.0.1:5184/artifacts/fleet-rebuild/index.html`.
Playable preview: `http://127.0.0.1:5184/?circuit=san-diego-fleet`.

Ignored artifacts in `artifacts/fleet-rebuild/` contain matching before/after views,
phone landscape/portrait, tablet and carrier-detail images, actual gameplay videos,
performance JSON, gallery verification, six-lap evidence, final focused test output
and production build output. The built-site smoke report is `artifacts/pages/report.json`.

Physical iPhone/iPad Safari usability, sound and sustained performance remain pending
actual hardware testing. Automated phone emulation is supplemental evidence.
