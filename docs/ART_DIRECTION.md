# Miniature 3D racing direction — October 21, 2026

The requested visual target is the detailed miniature racing world of DrawRace 2. Reference review: [game artwork portfolio](https://www.meowltd.com/draw-race-2) and [the 148Apps gameplay reference](https://www.148apps.com/drawrace/e3-chillingo-handson-drawrace-2/). The useful cues are realistic road texture, layered rocky/planted terrain, strong directional lighting, readable small cars, building volume and roadside racing detail.

The implementation uses original geometry, our existing circuit and newly generated surface materials. Reference screenshots are inspection-only, ignored by Git, and absent from `public/` and the production build. This is an evolving original coastal circuit, not a pixel-for-pixel recreation of the reference game.

## Current implementation

- Perspective camera: elevation 42°, azimuth 5°, vertical field of view 0.5 radians. Fitting uses the actual circuit plus the full drawing allowance; it avoids wasting space on unused bounding-box corners. Compact landscape reserves 52 CSS pixels above and 110 below the scene.
- Real depth: terrain mounds, taller rock formations, stepped spectator seating, roof supports, a two-level pit pavilion, foliage and a sculpted roadster.
- Sun shadows: one 1024² PCF map shared by static scenery and moving vehicles; subtle contact shadows remain beneath props/cars.
- Materials: original asphalt/limestone-grass photosurface textures, irregular planted edges, a translucent established tire-wear layer, reflective PBR paint/glass, and a small original reflection sky.
- Consistency: the drawing plane, physical road dimensions, steering, traction, sand drag, laps and fixed-step timing are preserved. Terrain relief is outside the driving surface. Cosmetics still load through theme/asset roles.

The source material images below were generated using the built-in image-generation tool. The complete square images were encoded as 768×768 WebP at quality 0.82; there was no hand retouching or cropping. The PNG masters remain available for future higher-resolution exports. Re-run `node tools/prepare-terrain-texture.mjs` with the local server running to reproduce the encoding.

## Grassy limestone material

- Master: `artifacts/generated/coastal-embankment-v1.png` (1254×1254).
- Runtime: `public/assets/textures/coastal-embankment-v1.webp` (255,340 bytes).
- Slot: `visualAssets.embankmentTexture`; shared by raised planted terrain and mossy coastal rocks. Missing-file recovery restores plain materials.
- Generation mode: built-in image generation, new asset; no source-game image supplied to the generator.

Exact prompt:

> Use case: game material texture. Create a single square seamless tileable albedo texture for the rocky grassy embankments of an original realistic miniature 3D coastal racing game. Orthographic straight down close-up surface scan, covering about 6 by 6 meters. Natural subdued olive coastal grass mixed with pale weathered limestone fragments and a little dry earth; irregular small stones, believable fine grain and organic patches. Medium-scale broad mottling with fine detail, consistent density edge to edge. Neutral diffuse overcast lighting, no directional baked shadow, no perspective, no objects, no track, no vehicles, no text, no logos, no border. All four edges should tile seamlessly. Natural photorealistic game-ready surface material, restrained saturation, no illustration or cartoon outlines.

## Asphalt material

- Master: `artifacts/generated/asphalt-v1.png` (1254×1254).
- Runtime: `public/assets/textures/asphalt-v1.webp` (251,534 bytes).
- Slot: `visualAssets.roadTexture`; longitudinal UVs repeat every seven world units. Missing artwork retains a plain road.
- Generation mode: built-in image generation, new asset; no source-game image supplied to the generator.

Exact prompt:

> Use case: game material texture. Asset type: one seamless tileable albedo/diffuse texture for the asphalt track of an original realistic 3D miniature racing game. Create a square orthographic straight-down scan of dry weathered medium charcoal-gray asphalt, covering approximately 4 by 4 meters. Fine natural aggregate grit, restrained irregular gray tonal variation, very subtle dark wear and one or two hairline age cracks. It should look like a convincing real racing surface viewed from above, not gravel and not polished concrete. Neutral flat diffuse light, no directional shadows, no glossy highlights. Balanced even detail to all four edges, seamless tiling. No road markings, painted lines, curbs, cars, vegetation, text, logos or border. Avoid repeated geometric/checker patterns or prominent large cracks.

## Review priorities

The two textures total approximately 507 KB on disk. They add no account, network-service or runtime generation dependency. They do increase download/decoded-texture cost, and the shadow map adds one rendering pass. Inspect the phone layout and physical Safari thermal/frame behavior before raising resolution or adding heavier post-processing.

The next art work should refine scene composition and original models: more natural foliage, richer cliff silhouettes, a deliberately authored vehicle mesh and more convincing pit/stand detail. Keep one excellent circuit as the priority. Native iOS, hop and additional circuits remain separate milestones.

## Motorsport venue upgrade — October 21

The second October 21 pass ports the user's MIT RoadsterLAB geometry to Babylon with showcase and racing detail, bundles Barlow fonts under OFL, replaces the marks with original slanted R artwork, and introduces graphite/crimson racing panels. All three circuit zones now have additional detail: grid/gantry/pit bays, coastal palms and banks, and wall-protected landscaped islands with tires and markings. Racing lines use shared red/amber/green pace colors and a CSS-pixel-sized outlined mesh. Source texture masters and original generation prompts above remain unchanged.

The road width/layout and flat surface are preserved. Inner walls are generated from authoritative collision polygons; this is now a physical venue, not solely decorative scenery. Cosmetic changes still do not alter simulation. Retain RoadsterLAB and Barlow licenses in `public/licenses/`. Comparison images: `artifacts/before-overhaul/` and `artifacts/overhaul/`.

## Two-course art foundation

Coastal Launch remains available alongside the new Orbital Launchyard prototype. The Orbital layout and first procedural spaceport pass use original geometry and existing shared materials: assembly/mission-control buildings, utility tanks, rocket/service tower and a dry sand setting. Its current role is to make the layout playable and visually distinct before the next production-art pass. No external SpaceX artwork or logo is bundled.

Biome palettes/light colors are defined separately from interface branding and driver paint in `themes.ts`. The circuit registry and scenery factory now own course metadata/assembly. Whole-scene replacement preserves one WebGL engine and releases the previous scene resources. Screenshots and route/race evidence are under `artifacts/orbital/`; details are in `docs/ORBITAL_MILESTONE.md`.

## Golden Gate and race-contact presentation

The third venue is Golden Gate: an original miniature factory/bridge scene with red suspension portals and hangers, assembly-hall skylights/loading doors, solar canopies, low shoreline and a distant skyline. Its approximately 415 m physical road stays flat; substantial landmarks sit within protected footprints or beyond the usable driving corridor. The spaceport is now named Launchsite in player-facing screens, retaining its previous internal ID.

The Bay palette lives alongside coastal/spaceport palettes in themes.ts. The current factory/bridge scene is a playable procedural art pass, designed for replacement/refinement rather than final production artwork. No new external bitmap or downloaded architecture asset is included. Course silhouettes come from actual centerlines.

White/cool-gray thrust vapor uses one pooled billboard mesh per car and a shared radial texture. Jet cores, expansion and fade are centrally editable. Contact reuses restrained impact dust/body feedback with distinct synthesized crash and scrape roles. Cosmetic feedback never decides collision response, points or timing. See GOLDEN_GATE_TOURNAMENT.md and SOUND_GUIDE.md.
