# Shortcuts, scenery and phone pause fixes

The preceding attraction upgrade was committed and pushed as `f2bb7d8`. This follow-up addresses the owner's marked Launchsite T2 and Golden Gate T4 screenshots, desktop drawing visibility and the phone pause sheet.

## Changes

- Launchsite has five additional large launch vehicles in its existing rocket batch: the previous two in the launch complex and three on separate north/west staging pads. Remote pads and vehicles have authored protected footprints, and the ground is flat beneath them. Boil-off now uses 96 quads in one non-shadow-casting batch, twice the previous capacity, with substantially larger, denser white clouds from all launch areas. Translucent gas is excluded from the geometry buffer used by High/Ultra ambient occlusion and reflections. Settings remain in `themes.ts`.
- Launchsite's two low hairpin/yard-tip obstacles retain their real heights. Their authored flight allowance is 22 m, permitting a modestly diagonal hand-drawn approach with the enlarged car footprint. Broadened allowances require the line centre to actually cross the named obstacle in the forward direction. Neighbouring protected parcels and tanks remain solid. The obstacle is still impassable without adequate actual swept height.
- Golden Gate has a native, unmarked 1.2 m planter inside T4. Only a compiled forward `quayside-hop` traversal authorizes manual-Hop clearance. The normal road remains the bypass. No activation paint, sign or special preview badge is added. The two bridge shore abutments now stop exactly at the road edges instead of projecting 1.5 m onto it.
  The crossing retains the existing tiled quay; it does not add an asphalt fork or special lane markings.
- Yosemite's three canoes now travel approximately 10 m along their river segments, following the river heading and turning smoothly rather than wrapping/teleporting. Hulls, paddlers and paddles remain one opaque dynamic mesh. All geometry stays inside the water and clear of rocks and race takeoffs across the entire cycle. Reduced motion freezes both travel and paddling.
- Route rendering uses the unlit standard GreasedLine plugin. The previous simple material could be ready and active while producing no visible line in desktop WebGL. The replacement retains planning/racing widths, pace colours, elevated geometry and separate translucent outline, and is explicitly excluded from the geometry pre-pass.
- Pause-sheet centering uses insets and auto margins, independently of the arrival animation. Safe-area-aware maximum height and internal scrolling preserve Resume, Restart, New lines, Sound and Home on short phone screens.

## Compatibility and scope

Physics remains 18. Compiler is 19, Launchsite 11 and Golden Gate 8. Other circuit versions and handling constants are unchanged. Existing version checks segregate incompatible records/replays and championship saves while keeping driver names, paint and lap preferences.

No additional lights, reflection cameras or rendering passes were added. New rockets reuse the opaque architecture batches; vapor remains one batch; canoe travel updates the existing buffers. The course camera still fits driving geometry, not distant rockets or scenery.

## Verification

- Full unit suite: 859 tests across 68 files passed; focused Launchsite/landmark/landscape checks passed again after final rocket placement, and shortcut/render-surface checks passed after the final quay cleanup. A final full-suite rerun is recorded in `artifacts/playability-fixes/unit-tests-final.txt`.
- Unchanged handling: all 27 HEAD comparisons matched exactly (one, two and four cars on all nine circuits).
- Browser verification: 62 passing cases across the new desktop-pixel/pause/canoe suite, attraction suite, drawing layouts, earlier shortcut approvals, effects budgets and actual Hop races. The Launchsite service lane, hairpin wing, yard tip, Golden Gate T4 and LA backlot each completed a real browser race with one Hop and zero collisions/recoveries. The Golden Gate unit fixture also completed six laps with six clean Hops; omitting Hop caused real impacts.
- All four graphics tiers rendered actual desktop stroke pixels. Pause actions were centered and reachable with normal motion at 844×390, 740×320, 390×844 and 1440×900. The canoe mesh translated and froze under reduced motion; full-cycle geometry checks kept every hull, paddle and wake inside water and clear of rocks/takeoffs.
- Across all nine scenes, stress checks including shadows, a visible replay ghost or four physical cars, thrust and dust/impact effects stayed within 90/150 calls (observed maxima 64/120).
- Twelve paired desktop-GPU samples at an emulated 844×390 touch viewport, DPR 2 and Medium graphics compared Launchsite, Golden Gate and Yosemite in Time Trial with a ghost and Solo Race. Before and after: 16.7 ms median and 16.8 ms p95 (about 60 Hz), with identical per-venue/mode draw-call counts. These are development-desktop results, not physical-phone performance claims.
- Matching before/after desktop, phone landscape and portrait captures preserve identical course projections in all nine pairs. The review gallery checks both revisions, with 12 displayed images each and no broken images, overflow or page errors. Browser: Chrome 156.0.8078.80 on Windows, ANGLE/D3D11.
- Type checking, root build and `/RoadsterRace/` build passed. All 16 production smoke checks passed with zero errors or failed asset requests, covering all nine courses, portrait/Graphite/Home metadata, four local players, Solo CPUs and tournament save/resume. After the final vapor-buffer exclusion, six affected browser cases passed again, followed by a fresh Launchsite production check. Full production evidence is preserved in `artifacts/playability-fixes/pages-full-report.json`; the focused final run is `pages-launchsite-final-report.json` in the same directory.

Review captures: `http://127.0.0.1:5181/artifacts/playability-fixes/index.html`.
Raw measurements and screenshots remain in the ignored `artifacts/playability-fixes/` directory. Refreshed circuit-card artwork remains 480×270 and under 60 KB per file.

Physical iPhone/iPad Safari checks remain pending hardware testing; desktop mobile emulation is supplemental only.
