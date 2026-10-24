# Prototype asset ledger

| Asset | Origin | Files / implementation | Notes |
|---|---|---|---|
| R marks, Coastal and Graphite | Original vector placeholders created for this project | `public/assets/mark*.svg` | No Tesla/SpaceX identity used |
| Roadster body, wheels, aero and outlets | Adapted from the user's MIT-licensed RoadsterLAB scene | `roadster-geometry.js`; `tools/port-roadster.mjs`; `public/licenses/RoadsterLAB.txt` | Ported from `TRoadster/impulse/src/scene.js`; source project unchanged. Both detail levels derive from one definition. Retain the complete upstream copyright/MIT notice |
| Track, curbs, island, palms, rocks, pavilion and offshore boat | Original procedural geometry | Track data and scene/coast presentation | No third-party track/art copied |
| Orbital layout, assembly buildings, tanks, rocket/tower and course-card maps | Original authored procedural geometry and SVG paths | `core/tracks/orbital.ts`, `content/circuits.ts`, `presentation/spaceport.ts` | Fictional spaceport inspired by reusable-rocketry infrastructure; no SpaceX logos, official imagery, downloaded rocket model or real launch-site layout included |
| Asphalt, sand, water grain and contact shadows | Original code-generated seeded/grayscale canvas textures | `textures.ts` | No downloaded or generated third-party bitmap assets |
| Asphalt and grassy limestone photo-surface materials | Newly generated original images using the built-in image-generation tool | PNG masters in `artifacts/generated/`; WebP versions in `public/assets/textures/` | Exact prompts, provenance and export details in `docs/ART_DIRECTION.md`; source-game screenshots were not supplied to the generator or included as game assets |
| Reflection sky, raised terrain and spectator stand | Original procedural texture/geometry | `environment.ts`, `coast.ts` | No external HDR/environment-map download |
| Synthesized audio fallbacks | Original oscillator/noise synthesis | Remaining unset cue roles; `artifacts/sound-preview.wav` is a synthesized cue preview | Retained alongside the supplied recordings below |
| Barlow Regular/Semibold and Barlow Condensed Bold Italic | Jeremy Tribby / Barlow project, SIL OFL 1.1 | `public/assets/fonts/`; `public/licenses/Barlow.txt` | Unmodified files from the official Google Fonts repository, `ofl/barlow` and `ofl/barlowcondensed`. Retain OFL. System fallbacks remain |
| Babylon.js and tools | Package dependencies | Locked package manifests | Retain upstream package license files; review notices if redistributing publicly |

The project is a public testing prototype. A future custom model, font, texture, logo, music track, or public branding treatment needs its own origin/license record before inclusion in a public build. The shipped Babylon runtime license and upstream notices are retained in `public/licenses/Babylon-Apache-2.0.txt` and `public/licenses/Babylon-NOTICE.txt`, alongside the Barlow and RoadsterLAB notices. Home Screen PNG icons are raster exports of the project's original R mark, created with `tools/generate-app-icons.mjs`.

Golden Gate's factory hall, solar canopies, red suspension portals/cables, shoreline, skyline and course layout are original procedural geometry. Its foundry sign uses original wording and bundled/fallback typography; no Tesla logo or copied factory/bridge model is included. The spaceport's player-facing name is now Launchsite, with its original geometry unchanged. Thrust vapor uses an original radial canvas texture and a bounded billboard mesh; car-impact and scrape cues use original oscillator/noise synthesis. No ElevenLabs audio or network service was added.

DrawRace 2 screenshots were viewed only as visual references. Inspection copies named `artifacts/reference-drawrace2*` are ignored and are not shipped in the runtime build.

Golden Gate v2 replaces the historical foundry/canopies with original code-authored city buildings, shopfronts, foundations, land areas, quays and a narrow suspension span. The new layout, gates, muted drawing guides and facade palette are original project work. No third-party building, bridge model, skyline image, logo or audio was downloaded. Prior foundry descriptions above record the retired version.

## Santa Monica additions

The sunset beach/pier, amusement wheel, coaster, train, buildings, palms, deck supports and signs are original procedural meshes authored for this project. They depict a fictional Santa Monica-inspired venue. No Pacific Park logos, real attraction branding or downloaded amusement-park artwork are bundled. Takeoff/landing/splash fallbacks are original Web Audio synthesis. Existing RoadsterLAB/MIT and font attributions remain in force.

The 2026-10-23 venue finishing pass (rooftops, planting, spectator shapes, concrete/timber/water grain and corrected jump paint) is original procedural geometry and canvas artwork in this repository. It adds no third-party asset downloads. RoadsterLAB and font attributions above continue to apply.

Manual-hop additions use an original inline arrow icon, downward puffs in the existing procedural vapor pool and an original Web Audio pressure/lift cue. No Tesla sound, ElevenLabs recording, model or third-party artwork was added. Gameplay captures show this prototype's actual simulation.


The heavier-flight milestone adapts RoadsterLAB’s MIT-licensed four-mount, crossed pale-core/widening white-vapor treatment from its local scene source, without a runtime dependency or modifications to that project. The batched underbody nozzle geometry, pooled gas implementation, service lane, barrier stripes and Hop signage are authored in this repository. Existing `public/licenses/RoadsterLAB.txt` attribution is retained. Hop height/gravity and vehicle dimensions are game tuning, not manufacturer specifications.

## User-supplied audio — 2026-10-23

The user provided 19 WAVs in `audio_files.zip` for integration following the ElevenLabs brief. Their exact role mapping is in `AUDIO_INTEGRATION.md`; optimized copies ship in `public/audio/`. Source ZIP and unchanged WAV masters remain local. Preparation hashes and measurements are retained in `artifacts/audio/preparation.json`. Generation date, account/license terms and external rights have not been independently verified; source is recorded as user-supplied rather than falsely asserting an upstream license. This local update adds no external audio service, API key, downloaded music or deployment. Earlier statements about synthesis-only audio describe historical releases.

The user subsequently supplied `Electric_motor.wav` (6.08 seconds) and `menu_background.wav` (64 seconds). Their unchanged masters join the original 19 WAVs locally; optimized `electric_motor.mp3` and `menu_background.mp3` are included in `public/audio/`. The music is a user-supplied track, not a recording generated by this agent. Preparation and source hashes are included in the same local report. No commit, push or deployment was performed.


## Circuit detail pass — 2026-10-24

Architectural mullions, rooftop terraces, industrial service details, pier brackets, canyon sediment shelves and procedural mineral/timber textures are original project geometry and code. No external artwork or new licensing dependency was added. Existing vehicle, font and sound attributions remain unchanged.

## Grand Canyon additions — 2026-10-23

The fictional canyon layout, elevated trails, natural crest, layered sandstone mesas, cliff support faces, scrub and dirt/rut/sandstone textures are original procedural geometry and seeded canvas artwork in `src/presentation/canyon.ts`, `textures.ts` and the authored track data. No downloaded geography, Grand Canyon photography, park branding, terrain model or third-party audio was added. Existing vehicle/font notices and user-supplied sound provenance remain intact. Canyon wind is the existing synthesized role; granular dirt uses the supplied recording at a quieter mix. Local gameplay captures depict this prototype's actual simulation.
