# Scale and snow verification

Baseline: commit `38e19bff7a4182c399291221b87b467f19ce3838`.
The owner subsequently authorized commit/push after verification; publication
uses the existing main-branch GitHub Pages workflow.

## Completed evidence

- Type checking and the ordinary production build pass.
- All 27 legacy handling fixtures match HEAD exactly: one, two and four cars
  on every registered circuit, including lap/finish times, collisions, drifts,
  recoveries and Hop counts. This comparison uses unchanged baseline geometry.
- Four targeted geometry/terrain tests and nine related attraction/Tahoe tests
  pass. The entire Tahoe heightfield and road geometry match the baseline,
  with a frozen SHA-256 check. New equipment and rocket footprints retain runoff.
- The shadow proxy is closed, finite and 92 triangles. Racing artwork plus proxy
  is 9,996 triangles. A real rendered-frame comparison verifies a filled cabin
  shadow while the proxy is absent from the colour camera's active meshes.
- Ability sizes pass five mouse-layout cases (including 667×320 and 320×568)
  and three touch layouts with phone/tablet scaling. Eight concurrent browser
  touches retain player/ability ownership through holding, sliding, cancellation,
  interruption, pause and 50 overlapping touch cycles.
- Analytic road-edge sightline checks on desktop, phone landscape and portrait
  find no intersections with the enlarged rockets or the 160 close Tahoe firs.
  This supplements, rather than replaces, inspection of actual game captures.

## Existing capture-fixture correction

The seven-second Santa Monica practice jump plan used by the older Hop video
test already incurs two recoveries on HEAD with the enlarged car. The previous
zero-recovery assertion was stale. Eight recorded command sequences, with Hop
at ticks 1/6/12/20 and with/without Thrust, produce **identical finish times and
two recoveries** in baseline and current code. Their logs are local review
artifacts. The browser capture now expects this existing behavior; the separate
20/30/42 m/s aligned-ramp tests still require clean physical landings. No handling
or route change is hidden in this graphics update.

## Final suite and performance

- `pnpm typecheck`, `pnpm test` (**69 files / 863 tests**), `pnpm test:legacy`
  (**27 fixtures**) and `pnpm build` pass. The generated rules document is current.
- **52 broader browser checks** pass: all nine venues' Time Trial/ghost and
  four-car effect budgets, fixed drawing/racing layouts, graphics tiers,
  WebGPU/WebGL selection, page zoom guard, five actual Hop-obstacle races,
  ability controls, actual Hop/ramp capture and strict static-shadow cache
  image equivalence. Four additional shadow-image/touch-scaling checks pass.
- Every venue retains the **90 one-car / 150 four-car** scene draw-call targets,
  including shadows and active effects. The Time Trial budget includes its ghost.
- Both the ordinary root build and `/RoadsterRace/` production build pass.
  Local Pages smoke passes **16 checks**, with **zero page errors and failed
  requests**: touch preview/race start on all nine venues, base-aware assets and
  Home, portrait/rotation, settings/preferences, manifest/icons, multiplayer,
  Hard Solo Race and tournament save/resume. The smoke starts races; it does not
  claim to complete every championship.
- The two refreshed selection cards are 480×270 native captures, **22,890** and
  **20,832 bytes**, beneath the 60 KB cap.

Eight matched desktop Chrome/D3D11 samples compare Launchsite and Tahoe in
Time Trial (ghost visible) and four-car Solo Race, before/after. They use Medium,
844×390 touch emulation at 2× density, a two-second warm-up and 6.5-second
measurement. All samples remain racing, with no page errors. Median frame time
is **8.3 ms in every sample**. P95 is 8.4–11.3 ms before and 8.5–12.4 ms after;
the Tahoe four-car sample has a 1.1 ms higher p95, so this is not a claim of zero
added cost. Both retain the desktop target. Peak draw calls fall by one per car:
Launchsite 52→51 / 102→98; Tahoe 48→47 / 101→97 (one-car / four-car).

The gallery loads all eight displayed images in each of its three view tabs
without errors, and has no horizontal overflow at desktop or 390-pixel width.
Six matching before/after pairs cover both venues on desktop, phone landscape
and portrait. The shadow pair and four-player ability captures are included;
the actual Hop/ramp gameplay recording completes successfully.

Physical iPhone/iPad Safari usability, performance and sound remain pending
testing on hardware. Desktop Chrome mobile emulation is supplemental evidence.

## Review media

`http://127.0.0.1:5181/artifacts/scale-and-snow/index.html` contains matching
desktop/phone before-and-after captures, the close shadow comparison and larger
four-player controls. Review media and baseline archives stay outside the
production bundle. Two refreshed selection cards are native game screenshots.
