# Professional miniature-world presentation — 2026-11-03

This upgrades the eight existing venues and interface. Physics, compiler, track
versions, support, barriers, drawing and race clocks remain unchanged. New modes,
abilities, shortcuts, accounts and online competition remain future work.
Commit and publication follow the owner's explicit request after local verification.

## Artwork

- Newport/Launchsite: irregular sand/dust fringes, varied coastal or dry plants,
  protected slatted furniture and grounded service equipment.
- Golden Gate/LA nights: restrained pavement seams and matte asphalt; keep the
  existing supported architecture and night bloom membership.
- Santa Monica: weathered wood grain/plank relief replaces the pier's concrete
  finish. Beach transitions complement the existing beach-life batch.
- Grand Canyon: sediment-coloured fringes conform to supported ledges. No new
  support is granted over cliffs, the crossing or the hidden trail.
- Tahoe: dedicated snow detail combines soft wind forms with groomed relief.
- Yosemite: irregular dirt/meadow fringes, feathered road colour, granite mineral
  weathering and varied conifer crowns within existing bounds.

Shared finish colours/widths and per-venue sun directions live in themes.ts.
venue-fringe.ts appends opaque supported colour geometry to the existing roadside
batch, with no new material or draw. It clears all gates, alternate lanes, jump
corridors and protected obstacles. Benches have separated slats at slightly lower
triangle cost. Existing static-shadow caching and worker generation remain enabled.
Fringe construction uses the existing exact nearest-segment index and build-local
shared-sample caches; this preserves byte-identical geometry without repeated
terrain/support searches.
New wood/snow tiles use the existing map worker/cache and shared GLSL/WGSL shaders.
No new light, shadow map, screen pass or runtime scenery download is introduced.

## Interface

Circuit cards add authentic 480×270 gameplay WebPs (60 KB/file maximum) alongside
maps, name, difficulty and length. Images lazy-load with base-aware URLs and
circuitArtRevision. A failed image leaves the full map. No live 3D card previews.

Regenerate with WEBGL_BACKEND=d3d11 node tools/capture-circuit-art.mjs on Windows,
with the development server on 5181. ART_URL and FFMPEG_PATH override the server
and encoder. The offline script captures the game's original scene and existing
licensed assets, hiding the planning gate. Source PNGs stay in ignored artifacts.

Landscape setup spacing/footer is compacted; scroll restoration remains intact.
Button motion lasts 160 ms and classification rows stagger by 40 ms. Reduced
motion disables these animations; actions are never delayed by animation.
Starting lights read the existing countdown clock, with no new timer. Results
show rank/time/gap and expandable lap splits, retaining Restart/New lines/Home.
Tournament point motion reads already-committed results. Time Trial only celebrates
a record actually accepted during that run; equal retries are not new records.

## Performance and verification

Baseline: frozen HEAD 5f2af38, served separately from the working copy.
Evidence: artifacts/pro-polish/. The four-car benchmark uses Medium, 844×390 at
2× device density, six-lap plans, a 10-second warm-up and three 60-second samples
per venue. It records frame intervals, drawable-scene latency, resources and phase.

Gates: 90 Time Trial / 150 four-car scene draws with active effects; no added lights,
screen passes, resolution reduction or scenery-driven camera changes. Investigate
repeatable median/p95 frame or warm drawable-time regressions above 5%. Repeat
noisy measurements and report them rather than suppressing them. Circuit changes
must dispose old scenes, textures and workers.

Automated figures are not physical iPhone FPS claims. iPhone/iPad Safari comfort,
sustained performance, heat and sound remain pending hardware testing.
Final results are recorded in PRESENTATION_UPGRADE_VERIFICATION.md.
