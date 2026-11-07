# Fleet v4 verification — 6 November 2026

## Implemented

- A 736.8 m main lap with four automatic ramp-and-water crossings; both former gangways are gone.
- Six aligned 16 × 16 m, 3 m-rise ramps; full-width mouths are perpendicular to their final world-space launch axes. Asphalt and ramp bases share the centrally configured driving offset. No road triangles extend over the water openings.
- Auxiliary decks raised to adjacent carrier heights (24/22 m). Manual entry gaps are 8 m; automatic exits are 12 m. Main down gaps are 14 m, uphill returns 12.53 m. Auxiliary centres stay clear and unmarked.
- All six ships have supported control structures. Longer carrier islands, angular escort bridges, edge wheelhouses, fine hull bows, hangars, distributed lifeboats, aircraft and deck detail remain in existing batches.
- Fleet-only uphill CPU approach planning (18.5 m/s reference, ordinary difficulty scaling) avoids arriving too fast for the receiving turn. Shared vehicle forces and human pace are unchanged.

## Automated evidence

| Check | Result |
|---|---|
| Type checking | Passed after final source edits |
| Entire initial unit suite | 77 files / 942 cases exercised; 939 passed initially, three failures investigated and corrected |
| Final Fleet / rules rerun | 16 passed, including 72 speed/yaw crossing landings, both six-lap shortcut variants, and 15 seeded four-car two-lap races |
| Final six-lap CPU difficulty check | Passed: three opponents × all three difficulties, zero recoveries and increasing aggregate pace |
| Final artwork / geometry rerun | 13 passed, including ramp seams, supported structures, moving-envelope bounds and lifeboat distribution |
| Other nine-course handling comparison | All 27 one/two/four-car fixtures match committed HEAD |
| Browser journeys | Seven passed: real touch drawing on landscape/portrait, full live Time Trial and medals/reload, Collection and four-human races |
| Both support sequences in browser | Passed with real drawing and legal Hop keys; zero recovery; challenge persisted |
| Final phone animation / reduced-motion checks | Two passed |
| Native production bake | Passed; current baked rail data matches authoring |
| Root and Pages-path production builds | Passed after final artwork changes |
| Local Pages production smoke | Completed production touch race, sound enabled, no page errors or failed required requests; final report in artifacts/fleet-v4/pages-report.json |
| Gallery | Nine images and both gameplay videos load |

The initial full run caught an over-fast CPU landing approach, an uneven visual ramp seam, and a wall-clock timeout in the fifteen-seed test under concurrent verification load. The seam and planning were corrected; subsequent six-lap testing also led to the final 18.5 m/s reference for consistent difficulty ordering. Wall-clock allowances were separated from the unchanged 240-s simulated race deadline. The affected files and new cases were rerun successfully; verification combines that complete run with the focused reruns rather than claiming a second complete-suite run. Logs retain both the initial failures and their final resolutions.

No core geometry or handling edits followed the final simulation checks. The later hull-skin/outfitting correction was presentation-only and received its own geometry, browser-art, build and performance checks.

## Rendering and comparison

Chrome / WebGL 2 / D3D11, Medium, animated scenery and active abilities, 1440 × 900. A separate ignored copy of committed HEAD (13c209a, Fleet v3) was used for the baseline; the active checkout was never replaced. Before → after → after → before ordering reduces warm-up/order bias.

| Measurement | Before | After |
|---|---:|---:|
| Average of median frame intervals | 13.35 ms | 13.30 ms |
| Average of median scene-render durations | 1.50 ms | 1.55 ms |
| Peak four-car scene draw calls | 85 | 85 |

The median-frame comparison is -0.37%; scene-render duration is 3.33%, within the 5% investigation threshold. Scene-render duration is an observable-based elapsed measurement, not a GPU timer query. Current Time Trial with ghost peaks at 35 calls, versus its 90-call limit; four cars remain below 150. Native venue geometry totals 61,848 triangles including its animated radar/rotor batch, below 120,000. No new lights, reflection cameras or rendering passes were added.

Phone screenshots are 844 × 390 and 390 × 844 at 2× density; tablet is 1024 × 768. These desktop/emulated measurements do not certify real iPhone performance. Physical iPhone/iPad Safari drawing comfort, audio and performance remain pending hardware testing.

## Review and compatibility

- Local play: http://127.0.0.1:5184/?circuit=san-diego-fleet
- Comparisons, close-ups and actual gameplay: http://127.0.0.1:5184/artifacts/fleet-v4/index.html
- Tuning and original-asset reference notes: FLEET_V4.md; generated values: CURRENT_RULES.md.
- Fleet track 4; physics 19 / compiler 20. Other nine track versions stay unchanged. Incompatible Fleet routes, ghosts and championships require fresh runs; names, paints, laps and historical Collection progress remain.
- Changes remain local and uncommitted. No push or deployment was performed.
