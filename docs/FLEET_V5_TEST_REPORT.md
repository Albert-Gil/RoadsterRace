# Fleet v5 verification — full Navy-style decks

Date: 2026-11-06 (America/Los_Angeles). This report includes the retained local Fleet v4 work and the subsequent v5 command-structure/full-deck pass. Nothing was committed, pushed or deployed.

## Delivered

- Full dark non-skid driving decks on all six vessels and six ramp surfaces. The separate asphalt ribbon and generic direction arrows are removed. Normal course progression and all eight authored crossings remain unchanged.
- Carrier command islands reach 48 m above deck, escort bridges 30 m and auxiliary wheelhouses 18 m. Larger protected footprints, command annexes and multiple substantial equipment families frame the driving space.
- Twelve parked aircraft, including radar-disc aircraft and tandem-rotor transports; salvage cranes, crash trucks, launcher cells, tugs, engine racks, galleries, radomes and visible bridge glazing. All original geometry shares the existing ship batches.
- Version 5 scopes the changed Fleet driving surfaces and physical equipment. Physics 19/compiler 20, ability tuning and the other nine circuit versions/geometry stay unchanged.

## Verification

| Check | Evidence |
|---|---|
| Type checking | Passed after final artwork changes |
| Full unit suite | 78 files / 947 tests passed on the final core/track state |
| Final artwork validation | 10 tests passed after correcting sloped-wall glazing; supported equipment, parcel clearance, moving bounds and triangle limits |
| Generated rules | Regenerated; focused source/document consistency check passed |
| Existing nine-course handling | All 27 recorded one/two/four-car fixtures match committed HEAD |
| Browser journeys | Initial 10 passed: real touch routes on portrait/landscape, all branch choices, human race/medals/reload, Collection, four humans, reduced motion and fixed views |
| Final presentation/browser checks | Seven passed after glazing refinement, including both support sequences with legal Hop keys, full live human race and all three fixed-view tests |
| Native production bake | Passed; baked rails match retained authoring |
| Builds | Root and `/RoadsterRace/` production builds passed after final changes |
| Local Pages smoke | Complete production touch race; sound enabled; no browser errors or failed required requests |
| Review gallery | Nine images and both 1280 × 720 gameplay clips (30/36 seconds) load without errors |

The complete unit run preceded the final camera/glazing presentation refinements; those received focused geometry, browser, build and production checks. No core/track edits followed the full unit run. Browser results collectively cover eleven distinct scenarios rather than claiming seventeen unique tests. The full suite includes the fifteen-seed two-lap CPU batch, six-lap checks and speed/yaw crossing regressions.

The fixed camera is authored at 64°/180° elevation/azimuth on desktop, 68°/210° on phone landscape and 56°/135° in portrait. It fits the safe rectangle once per layout and never follows the car. The visibility test checks every compiled normal-route sample: no island hides a car-length stretch; only an isolated thin fitting may cross one sightline. Drawing, preview and racing retain identical camera positions. Touch emulation is supplemental evidence, not hardware certification.

## Performance

Chrome / WebGL 2 / D3D11, Medium, 1440 × 900, animated scenery and live Thrust/Hop. The saved pre-task Fleet v4 working copy is served separately from the final v5 checkout; no checkout replacement was used. Runs follow before → after → after → before with other browser tests stopped.

| Measurement | Fleet v4 | Fleet v5 |
|---|---:|---:|
| Average of median frame intervals | 13.40 ms | 13.30 ms |
| Average of median scene-render durations | 1.50 ms | 1.45 ms |
| Peak four-car scene draw calls | 85 | 79 |

Frame interval changed by approximately -0.75%; scene-render duration by -3.33%. These are desktop elapsed measurements, not GPU timer queries or guaranteed device frame rates. Final native venue geometry is 64,696 triangles including radar/rotor geometry, below 120,000. There are four opaque static ship batches, with existing water/radar batches; no extra lights, reflection cameras, passes or per-prop meshes. Time Trial with its ghost and active effects peaks at 29 calls; the final measurement is retained in `artifacts/fleet-v5/ghost-performance.json` against its 90-call budget.

## Review and limitations

- Play locally: http://127.0.0.1:5184/?circuit=san-diego-fleet
- Before/after desktop, phone landscape/portrait, close-ups and actual gameplay: http://127.0.0.1:5184/artifacts/fleet-v5/index.html
- Appearance/source/reference guide: `docs/FLEET_V5.md`; public Navy study references and original artwork attribution: `docs/ASSET_RIGHTS.md`.
- Logs, captures, performance JSON and the production smoke report are retained in ignored `artifacts/fleet-v5/`.
- Close-ups use an inspection camera; gameplay and phone comparisons use the real fixed gameplay view. Browser gameplay recordings have no recorded audio.
- Physical iPhone/iPad Safari drawing comfort, performance and sound remain pending hardware testing.
- Historical Collection progress and ordinary names, paints and lap preferences are preserved. Existing incompatible Fleet routes, ghosts and championships require fresh runs.
