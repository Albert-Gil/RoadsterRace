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
| Motor, tire, sand, coast and race cues | Original oscillator/noise synthesis | Audio presentation; `artifacts/sound-preview.wav` is a synthesized cue preview | No sampled commercial music or sound. No ElevenLabs recordings included yet |
| Barlow Regular/Semibold and Barlow Condensed Bold Italic | Jeremy Tribby / Barlow project, SIL OFL 1.1 | `public/assets/fonts/`; `public/licenses/Barlow.txt` | Unmodified files from the official Google Fonts repository, `ofl/barlow` and `ofl/barlowcondensed`. Retain OFL. System fallbacks remain |
| Babylon.js and tools | Package dependencies | Locked package manifests | Retain upstream package license files; review notices if redistributing publicly |

The project is a local private prototype. A future custom model, font, texture, logo, music track, or public branding treatment needs its own origin/license record before inclusion in a public build.

Golden Gate's factory hall, solar canopies, red suspension portals/cables, shoreline, skyline and course layout are original procedural geometry. Its foundry sign uses original wording and bundled/fallback typography; no Tesla logo or copied factory/bridge model is included. The spaceport's player-facing name is now Launchsite, with its original geometry unchanged. Thrust vapor uses an original radial canvas texture and a bounded billboard mesh; car-impact and scrape cues use original oscillator/noise synthesis. No ElevenLabs audio or network service was added.

DrawRace 2 screenshots were viewed only as visual references. Inspection copies named `artifacts/reference-drawrace2*` are ignored and are not shipped in the runtime build.

Golden Gate v2 replaces the historical foundry/canopies with original code-authored city buildings, shopfronts, foundations, land areas, quays and a narrow suspension span. The new layout, gates, muted drawing guides and facade palette are original project work. No third-party building, bridge model, skyline image, logo or audio was downloaded. Prior foundry descriptions above record the retired version.
