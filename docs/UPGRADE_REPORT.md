# Roadster Race — upgrade handoff

Implemented locally on October 21, 2026. Open **http://localhost:5173/** and refresh an older tab. Choose **Let's race** for solo, or **Race with friends** for two to four players. Sound starts muted; use the speaker button to enable it.

## Delivered

| Plan area | Result |
|---|---|
| Baseline/contracts | Earlier captures retained; track/compiler/physics versions updated; permanent protected-infield rule added to AGENTS.md |
| Racing lines | Shared red/amber/green speed mapping, 3 CSS px core/outline, provisional live pace and multiplayer patterns |
| Roadster/presentation | MIT RoadsterLAB port; 9,802-triangle racing and 43,360-triangle showcase versions; wheel roll/steer, brake lights, body lean, thrust; bundled Barlow fonts |
| Barriers/handling | Authored islands with at least 5 m inner runoff, full-capsule plan validation, swept contacts and wall sliding, independent stuck-car recovery; drift preserved |
| Circuit | Pits, grid, gantry, edge markings, wear/patches, concrete walls, tire stacks, layered planting, palms and coastal banks |
| Interface | Graphite/crimson motorsport styling across phases, showcase welcome/results, responsive controls, lap splits and finishing order |
| Handoff | Production build in dist, appearance/sound/asset-rights guides, comparison captures, real 30-second gameplay review clip |

## Evidence

- Type check, **53 unit tests**, production build: passed.
- **19 browser scenarios** passed as a complete suite. Four additional focused checks passed after the final lap/font/audio polish.
- Full solo/two/three/four-player races completed. Four-touch ownership, cancellation, interruption and 50 diagnostic cycles per corner passed.
- Five production smoke scenarios passed with sound enabled and no development API exposed.
- Missing fonts/textures preserve a playable preview. RoadsterLAB and Barlow license notices are bundled.
- Solo recording sampled a maximum of 75 draw calls; four-player sample peaked at 133 (targets 90/150).
- Measured solo desktop gameplay averaged approximately 75 fps at 1280 × 720 on an RTX 3060 Laptop GPU. This is a specific measured run, not certification of every device or sustained four-player performance.

## Review files

- Before: `artifacts/before-overhaul/welcome.png`, `circuit.png`, `four-player.png`.
- After: `artifacts/overhaul/welcome.png`, `circuit.png`, `pace-preview.png`, `blocked-line.png`, `phone-preview.png`, `portrait-welcome.png`, `portrait-drawing.png`.
- Model views: `artifacts/overhaul/car-front.png`, `car-side.png`, `car-rear.png`.
- Multiplayer: `artifacts/overhaul/3-player-race.png`, `3-player-results.png`, `4-player-race.png`, `4-player-results.png`.
- Gameplay: `artifacts/overhaul/gameplay-30s.mp4` (silent, actual browser frames; a review clip, not a published trailer).
- Detailed evidence and device checklist: `docs/VERIFICATION.md`.
- Appearance requests: `docs/VISUAL_GUIDE.md`; central settings in `src/presentation/themes.ts`.
- Future ElevenLabs files: `docs/SOUND_GUIDE.md`; replace named roles in `src/presentation/audio-assets.ts`.

## Remaining device validation

Physical iPhone/iPad Safari remains **pending**: exact device/OS, multitouch with real players, browser chrome/rotation, audio resume, 20-minute thermal performance and sustained mobile fps. Automated touch emulation cannot certify those. This is the next recommended milestone.

No public hosting or posts were created. Hop, challenge/leaderboards, native iOS and car-to-car collisions remain later work. The source RoadsterLAB project and the existing planning documents were preserved.
