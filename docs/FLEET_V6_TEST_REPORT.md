# Fleet v6 verification

Verified locally on 2026-11-07. The requested carrier-lane restoration, additional physical deck equipment, larger small-ship command cabins and flags are complete. Verification was completed locally. The owner subsequently authorized commit and push on 2026-11-07; publication remains gated by the existing verified-main GitHub Pages workflow.

## Changes

- Restored clear runway-style lanes on both carriers, with white edges, dashed centre marks and red/white bend kerbs. All existing naval artwork is retained. The whole supported deck still has road grip.
- Added fourteen physical equipment parcels across all six ships: workshops, fuel bowsers, winches and jet-blast deflectors. Models include doors, ventilation, wheels, tank bands, hoses, cable turns, hydraulic supports and controls.
- Escort bridge height increases from 30 to 36 m. Auxiliary bridge envelopes increase from 22 × 3.8 × 18 m to 34 × 5.2 × 28 m; their maximum supported beam increases from 28 to 31 m. The central 16 m corridor and existing ramp/water-gap dimensions remain clear.
- All six ships have original static naval ensigns. Smaller hulls have more pronounced fine bows. The automatic and manual ship sequences, global handling and ability tuning are unchanged.

## Checks

| Check | Result |
|---|---|
| Full unit suite | 79 files / 950 tests passed |
| Existing nine-course handling | All 27 recorded one/two/four-car fixtures match committed HEAD |
| Lane geometry | Paint and kerbs remain on carrier support, stop at ramp bases, have upward normals and do not span water |
| Equipment/support | Supported footprints, non-overlapping unrelated parcels, 2 m reference-road runoff, larger bridge envelopes and static flag bounds passed |
| Fleet simulation | Main/alternate crossings, speed/yaw probes, six-lap cases and the fifteen-seed CPU batch passed within the full suite |
| Browser journeys | 11 passed: real touch drawings on portrait/landscape, both manual ship sequences, human race/medals/reload, four local drivers, Collection, reduced motion and fixed camera views |
| Generated rules | Regenerated and source/document consistency test passed |
| Native production bake | Passed; authorized support-deck rail update matches retained authoring |
| Production builds | Root and `/RoadsterRace/` builds passed |
| Local Pages smoke | Complete production touch race, sound enabled, no page errors or failed required requests |
| Review gallery | Nine images and both 1280 × 720 gameplay clips (30/36 seconds) load without errors |

No core/track changes followed the successful full unit run. The initial placement review caught a fuel-bowser/crane overlap; the bowser was moved before the final run. Lane winding was corrected before acceptance so the painted floor receives light consistently with the original deck. Slender auxiliary proportions are retained with the final 31 m beam.

## Rendering

Matched Chrome/WebGL 2/D3D11 tests at Medium, 1440 × 900, animated scenery and active Thrust/Hop. The saved pre-task Fleet v5 working copy was served separately. Runs follow before → after → after → before with other browser tests stopped.

| Measurement | Fleet v5 | Fleet v6 |
|---|---:|---:|
| Average of median frame intervals | 13.30 ms | 13.35 ms |
| Average of median scene-render durations | 1.50 ms | 1.55 ms |
| Peak four-car scene draw calls | 79 | 79 |

The median-frame difference is approximately +0.38%; scene-render elapsed time +3.33%, within the 5% investigation threshold. Measurements are desktop elapsed observations, not GPU timer queries or promises of real-device performance. Final native venue geometry totals 84,978 triangles including radar/rotor geometry, below 120,000. Carrier floor/paint/kerbs and all new props/flags append to existing batches. There are no additional lights, reflection cameras, rendering passes, cloth simulation or per-prop meshes.

Time Trial with its ghost and active effects peaks at 29 draw calls. Its data is retained in `artifacts/fleet-v6/ghost-performance.json`; its draw-call budget is 90. Four-car budget remains 150.

## Review and compatibility

- Play: http://127.0.0.1:5184/?circuit=san-diego-fleet
- Comparisons, ship close-ups and actual gameplay: http://127.0.0.1:5184/artifacts/fleet-v6/index.html
- Source/appearance guide: `docs/FLEET_V6.md`; attribution: `docs/ASSET_RIGHTS.md`.
- Gallery comparisons use the actual fixed gameplay camera. Ship close-ups use an inspection camera. Browser gameplay clips contain no captured audio.
- Fleet track 6, physics 19, compiler 20. Other nine geometries/versions are unchanged. Incompatible Fleet plans, ghosts, records and championships require fresh runs; ordinary driver preferences and historical Collection progress survive.
- Physical iPhone/iPad Safari drawing comfort, performance and sound remain pending hardware testing.
