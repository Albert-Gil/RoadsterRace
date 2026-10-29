# Prototype asset ledger

| Asset | Origin | Files / implementation | Notes |
|---|---|---|---|
| R marks, Coastal and Graphite | Original vector placeholders created for this project | `public/assets/mark*.svg` | No Tesla/SpaceX identity used |
| Roadster body, wheels, aero and outlets | Adapted from the user's MIT-licensed RoadsterLAB scene | `roadster-geometry.js`; `tools/port-roadster.mjs`; `public/licenses/RoadsterLAB.txt` | Ported from `TRoadster/impulse/src/scene.js`; source project unchanged. Both detail levels derive from one definition. Retain the complete upstream copyright/MIT notice |
| Track, curbs, island, palms, rocks, pavilion and offshore boat | Original procedural geometry | Track data and scene/coast presentation | No third-party track/art copied |
| Orbital layout, assembly buildings, tanks, rocket/tower and course-card maps | Original authored procedural geometry and SVG paths | `core/tracks/orbital.ts`, `content/circuits.ts`, `presentation/spaceport.ts` | Fictional spaceport inspired by reusable-rocketry infrastructure; no SpaceX logos, official imagery, downloaded rocket model or real launch-site layout included |
| Asphalt, sand, water grain and contact shadows | Original code-generated seeded/grayscale canvas textures | `textures.ts` | No downloaded or generated third-party bitmap assets |
| Asphalt and grassy limestone photo-surface materials | Newly generated original images using the built-in image-generation tool | PNG masters in `artifacts/generated/`; WebP versions in `public/assets/textures/` | Exact prompts, provenance and export details in `docs/ART_DIRECTION.md`; source-game screenshots were not supplied to the generator or included as game assets |
| Reflection sky (Low tier and fallback), raised terrain and spectator stand | Original procedural texture/geometry | `environment.ts`, `coast.ts` | Used on the Low graphics tier and whenever a sky file fails to load |
| Real-sky lighting files (Medium/High/Ultra) | CC0 1.0 HDRIs from the `@pmndrs/assets` 1.7.0 npm package (described by the package as a selection of Poly Haven HDRIs, resized and DWAB-compressed) | `public/assets/env/{sky,sunset,dawn,night}.env`, baked by `tools/bake-environments.mjs` (`pnpm bake:env`) | Derived files: decoded with three.js `EXRLoader` (MIT, dev-only), highlights clamped, prefiltered by Babylon into 128 px cube `.env`. CC0 requires no attribution; the source package does not name the individual Poly Haven titles, so none are claimed here. |
| Synthesized audio fallbacks | Original oscillator/noise synthesis | Remaining unset cue roles; `artifacts/sound-preview.wav` is a synthesized cue preview | Retained alongside the supplied recordings below |
| Barlow Regular/Semibold and Barlow Condensed Bold Italic | Jeremy Tribby / Barlow project, SIL OFL 1.1 | `public/assets/fonts/`; `public/licenses/Barlow.txt` | Unmodified files from the official Google Fonts repository, `ofl/barlow` and `ofl/barlowcondensed`. Retain OFL. System fallbacks remain |
| Babylon.js and tools | Package dependencies | Locked package manifests | Retain upstream package license files; review notices if redistributing publicly |

The 2026-10-29 car refinements (body shaping, twin-spoke wheels, stationary brakes, mirrors, lower aero and generated satin-steel normal map) are original procedural changes to that adaptation. No manufacturer mesh, logo, photograph or external texture was imported. The existing RoadsterLAB MIT notice remains applicable.

The subsequent larger raised steel airfoil, endplates and supports are original procedural refinements of the same model. The 15% artwork enlargement and batched four-nozzle forward exhaust introduce no downloaded artwork or new third-party assets; the existing RoadsterLAB notice remains.

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

## LA nights additions — 2026-10-24

The fictional street layout, channel, buildings, lit-window grids, rooftop details, palms, light-pool texture and LA NIGHTS / ORBIT / ECHO / VOLT signage are original procedural geometry and canvas artwork. No third-party Los Angeles model or brand artwork is used. Existing city ambience is reused under its recorded user-supplied provenance.

## Graphics upgrade — 2026-10-25

Graphics tiers, world-space surface detail (asphalt, sand, dirt, concrete, grass, rock and water tiles generated in code by `src/presentation/surface-maps.ts`), screen-space effects and colour grading are original code using Babylon.js features. The only new external art is the CC0 sky lighting listed in the ledger above. The iOS app wrapper uses Capacitor (MIT) packages; its icon and launch images are rasterised from the original R mark by `tools/generate-app-icons.mjs`. Development-only packages `three` (MIT) and `@pmndrs/assets` (CC0) are not shipped in the game bundle.

## Newport harbour props (CC0 Kenney models) — 2026-10-25

Coastal Launch is renamed **Newport** and dressed as a fictional Newport Beach-inspired harbour. Its boats, beach houses, palms and buoys are third-party models; the piers, pilings, islets and shoreline are original code geometry.

| Pack (version) | Source | Licence | Zip SHA-256 |
|---|---|---|---|
| Watercraft Kit (2.1) | https://kenney.nl/assets/watercraft-kit | CC0 1.0 | `cd1470c1cf441c7f46d0944ae6d0d897242365dc97677c5079b3238965d659f3` |
| Pirate Kit (2.1) | https://kenney.nl/assets/pirate-kit | CC0 1.0 | `667ed2caf92954ddb98f7b7cede831fe99ab75063c26b25e23d32715bee9c943` |
| City Kit (Suburban) (2.0) | https://kenney.nl/assets/city-kit-suburban | CC0 1.0 | `5869c35cf30b1c87bdb2d197b6d325eebadd2ef08ea27f04797e8e08d77a9a39` |
| Racing Kit (2.0) | https://kenney.nl/assets/racing-kit | CC0 1.0 | `8a71ea16219315a01d00d5a90c4f6b5c090faddbc56d80ecf727e2b3b853c6c0` |
| Nature Kit (2.1) | https://kenney.nl/assets/nature-kit | CC0 1.0 | `fa7974a0d342bfe63c38664ba9f8ec1a4aab8ea25f099bdc56870e33588c4d9d` |

- Created and distributed by Kenney (www.kenney.nl). Each pack's `License.txt` states Creative Commons Zero (CC0); credit is appreciated but not required. Downloaded from the official kenney.nl links on 2026-10-25 (Pacific time), at the user's request.
- The source zips are kept locally in `asset-sources/kenney/` (git-ignored) and are not shipped.
- `pnpm bake:props` (`tools/bake-props.mjs`) converts only the models listed in its `CATALOGS` into `public/assets/models/<venue>-props.bin`. That is the only shipped form: geometry converted to the game's left-handed axes, colour atlases sampled into vertex colours (houses use the pack's own "variation C" and "variation A" palettes), and positions quantised.
- Newport uses Watercraft (boats, buoys), Pirate (palms) and City Kit Suburban (houses, trees). The Racing and Nature kits are downloaded for later circuits and not used yet.
- No Newport Beach, Balboa or other real-world branding, logos or photography is included.

## Launchsite desert rock (CC0 Poly Haven scans) — 2026-10-25

Launchsite's rock formations, terrain, painted ground, loose stones and plants are original procedural code (`src/presentation/landscape/`, `src/presentation/launchsite*.ts`). The only external art is eight photo-scanned rocks from Poly Haven, used for the granite boulders, the boulder-cliff faces set into two tors, a layered rock face set into a sandstone ledge and part of the loose stones.

| Model | Source page | Licence |
|---|---|---|
| Namaqualand Boulder 02 | https://polyhaven.com/a/namaqualand_boulder_02 | CC0 1.0 |
| Namaqualand Boulder 03 | https://polyhaven.com/a/namaqualand_boulder_03 | CC0 1.0 |
| Namaqualand Boulder 04 | https://polyhaven.com/a/namaqualand_boulder_04 | CC0 1.0 |
| Namaqualand Boulder 05 | https://polyhaven.com/a/namaqualand_boulder_05 | CC0 1.0 |
| Namaqualand Cliff 01 | https://polyhaven.com/a/namaqualand_cliff_01 | CC0 1.0 |
| Rock Face 01 | https://polyhaven.com/a/rock_face_01 | CC0 1.0 |
| Rock 07 | https://polyhaven.com/a/rock_07 | CC0 1.0 |
| Rock 09 | https://polyhaven.com/a/rock_09 | CC0 1.0 |

- All Poly Haven assets are published under CC0 (https://polyhaven.com/license); no attribution is required. Downloaded on 2026-10-25 (Pacific time) at the user's request from `dl.polyhaven.org` (1k glTF, its geometry `.bin` and the 1k diffuse JPEG only), recorded in `asset-sources/polyhaven/manifest.json` with every URL and size, and packed as `polyhaven-rocks.pack` (SHA-256 `8ce48cd8f47e775fd32fe71cb445846214771fb9ab0d739a2c03afb482b3f64d`). Sources stay in git-ignored `asset-sources/polyhaven/` and are not shipped.
- `pnpm bake:props` decimates each scan (meshoptimizer, dev-only, MIT) to 120–2,600 triangles, samples the photo texture into blurred vertex colours (jpeg-js, dev-only, BSD-3-Clause) and writes `public/assets/models/launchsite-props.bin` (about 100 KB), the only shipped form. In the game some scans are tinted toward the venue's rock palette.

## Landscape at the other five venues — 2026-10-26

Grand Canyon, Golden Gate, Santa Monica, Newport and LA nights now carry the same kind of procedural landscape as Launchsite: terrain, painted ground maps, solid rock from 'rock' barriers, loose rocks, plants, tennis and volleyball courts, streets, parked cars and lamps are original procedural code (`src/presentation/landscape/` and each venue's `*-landscape.ts` / `*-detail.ts`). The only external art they use is the same eight CC0 Poly Haven rock scans already shipped in `public/assets/models/launchsite-props.bin` (tinted toward each venue's rock palette); nothing new was downloaded and no new asset file is shipped.

## Grand Canyon trail integration — 2026-10-27

The eroded trail foundations, coloured strata, shoulder sediment map, floor contact/fan painting
and terraced background ridges are original procedural geometry and canvas artwork authored in
this repository. No new external assets or models were downloaded. Existing CC0 Poly Haven
formations, RoadsterLAB, font and audio provenance remain unchanged.

The follow-up broad-footed hillsides, irregular dirt/shoulder borders and staggered shortcut
boulder rows are also original procedural code. Their fine mineral texture reuses the existing
locally generated sandstone texture; no additional artwork, downloads or licences were added.

The sloping overpass heads, continuous canyon shoulders, expanded drawing guides, Launchsite
desert rubble and LA backlot rubble are further original procedural geometry. No third-party
asset was added for this revision; existing CC0 scan fallbacks and other provenance remain unchanged.

The approved Newport apex formation, Launchsite storage vessel, Golden Gate annex/arcade and
LA studio hall use the existing original procedural scenery and material systems. No new
third-party model, texture or audio file was introduced for these cut blockers.

The wider follow-up ridge, concave industrial complex/heat-exchanger wing and market arcade
also use original procedural geometry. The building's ear-clipped roof and walls follow the
authored polygon, while Newport's rock mesh is scaled vertically to its authoritative peak.
Existing asset sources and licences remain unchanged.

The subsequent lighter revision uses the existing original palm/shrub generator, low parcel
edges, procedural tank bodies and pipework, and varied original city storefronts with a pocket
plaza. No new third-party assets were added. Shared physical component dimensions live in
`src/core/tracks/venue-parcels.ts`; decorative dressing remains in presentation.

Launchsite's compact utility conduit/valve beds and LA nights' individual studio flight cases,
hardware and planted end beds are original procedural geometry (`presentation/hop-obstacles.ts`).
Their shared dimensions are in `core/tracks/hop-obstacles.ts`. They replace the experimental
rock rows; no model, texture, recording or external licence was added for this revision.

## Home key art (AI-generated, supplied by the project owner) — 2026-10-27

The five Home pictures in `public/assets/hero/` (`thruster-hop`, `drivers-grid`, `door-to-door`, `water-jump`, `canyon-jump`, each as `-wide` 1672×941 and `-tall` 941×1672 WebP at quality 74) are AI-generated images that the project owner created and supplied on 2026-10-26 in the folder `RoadsterRace_Key_Art_v10_Water_Fix`, from prompts written for this project. They depict the game's own fictional roadster and drivers: no Tesla, SpaceX or other real brand, logo or car is intended. Hidden Hop shortcuts are not shown.

| Picture | Source PNG (not shipped) | SHA-256 (first 16 hex) |
|---|---|---|
| thruster-hop wide / tall | `01_thruster_hop_16x9.png` / `01_thruster_hop_9x16.png` | `1359a420d2dc7a16` / `cf3576fc8b5df71d` |
| drivers-grid wide / tall | `02_drivers_grid_16x9.png` / `02_drivers_grid_9x16.png` | `8427c056b966cc5d` / `c248780101043a94` |
| door-to-door wide / tall | `03_door_to_door_night_16x9.png` / `03_door_to_door_night_9x16.png` | `1861e9c10ffad091` / `2d63179866d2ecf1` |
| water-jump wide / tall | `04_jump_over_water_16x9.png` / `04_jump_over_water_9x16.png` | `56f3a0b375a7a5b1` / `89c3123f8c869c1e` |
| canyon-jump wide / tall | `05_canyon_jump_16x9.png` / `05_canyon_jump_9x16.png` | `e9158746b69ae5ab` / `84bde5597be96395` |

- The PNG masters stay with the owner and are not committed; only the WebP conversions ship.
- **Pending:** the image-generation service used and its terms (commercial use, attribution) have not been recorded yet. Record them here before any public release beyond the testing site.
- The studio sky (`studio.env`) used by the former menu turntable car was removed with that car.

## Snowy Tahoe and venue refinements — 2026-10-28

Snowy Tahoe’s snow terrain, packed trail, fir geometry, timber lodge, log obstacle, granite ends and snow texture are original procedural assets created in this repository (`presentation/tahoe.ts`, `textures.ts`). No external model or new recording is included. The alpine sky reuses the existing recorded CC0 `sky.env` source. The quiet granular snow mix and alpine wind reuse the project’s existing recordings and fallback roles.

The six existing venues receive original native facade/entrance, garden furniture, utility pipe, bridge-bearing and pier-brace geometry in `presentation/venue-refinements.ts`, plus canyon mineral shading and centrally configured LA material colors. Existing third-party asset licences are unchanged. No Tesla/SpaceX art or branding was added.

## Snowy Tahoe alpine upgrade — 2026-10-28

The steep-roof chalets, timber terraces, windows, icicles, firewood, tracked snow groomer, lift stations/pylons/cables/chairs, irregular fir boughs, granite crowns and snowfall sprites are original procedural geometry/textures created in this repository. No model pack, recording, external weather feed or additional licence was introduced. The existing CC0 sky and recorded audio roles remain unchanged. Chair motion and snow are cosmetic only.

The v4 rental/rescue chalets, lanterns, ski racks and bindings, rescue sled,
chairlift skis, packed-snow summit cornice and denser snow/powder sprites are also
original native geometry and procedural effects. No external model, new recording
or additional licence is introduced.

Snowy Tahoe v5's two snow rolls, transverse groomer traces and surface-projected vehicle/shadow geometry are original procedural work in this repository. No external art, model or sound was introduced. Existing recordings and licences remain intact.

## Capitan Yosemite — 2026-10-29

The fictional circuit layout, granite monoliths, pine geometry, ranger buildings, campground objects, fallen cedar, water geometry, waterfall and mist sprites are original procedural work created in this repository. No park maps, photographs, logos or third-party models were copied. The venue reuses the existing recorded CC0 sky environment and existing licensed sound roles; no new recording or external asset was added.

### Yosemite refinement — 2026-10-29

The new mineral/lichen cliff colouring, rounded rock skin, layered conifers, meadow variation, worn dirt treatment, depth-coloured creek/foam, stone-and-timber ranger buildings and detailed fallen cedar are original native procedural work in this repository. They add no third-party models, maps, photographs, recordings or trademarks. Existing environment/audio licences and the RoadsterLAB model attribution remain unchanged.
