# Graphics tiers and rendering

All of this is presentation. No tier, sky, effect or setting enters route compilation, the
60 Hz simulation, timing or input (`pnpm test:legacy` stays identical to the previous release).

## Choosing a tier

**Race setup → 05 / Graphics** offers *Auto, Low, Medium, High, Ultra*. The choice is a device
preference (`localStorage` key `roadster-race.graphics.v1`), separate from race preferences.
`?graphics=low|medium|high|ultra|auto` overrides it for testing.

*Auto* (`src/presentation/graphics.ts`):

1. **Detects** a starting tier once per session from the WebGL renderer string, pointer type,
   CPU cores, device memory and screen size. Apple phones/tablets start on High, Apple desktops
   and discrete desktop GPUs on Ultra, integrated Intel graphics on High (Medium above ~2600 px),
   unknown mobile GPUs on Medium, software renderers and 2 GB/2-core devices on Low.
   Automated browsers (`navigator.webdriver`: Playwright, CI) start on Low.
2. **Steps down** one tier when, after a 3 s warm-up, a 4 s window of real frames averages
   slower than 45 fps (`graphicsGovernor` in `themes.ts`). Gaps over 250 ms (tab switches,
   pauses) are ignored. A step requested during a countdown or race waits until the race
   ends or pauses, so a rebuild never interrupts driving. It never steps back up during a
   session, so it cannot oscillate. The setup screen shows the tier Auto is currently using.

A fixed choice never changes by itself.

## What each tier renders

Presets live in `graphicsTiers` (`src/presentation/themes.ts`).

| | Low | Medium | High | Ultra |
|---|---|---|---|---|
| Render density | ≤1× device pixels, 0.9 MP | ≤1.5×, 1.6 MP | ≤2×, 2.6 MP | ≤2.5×, 4.6 MP |
| Sun shadows | 1024, PCF low | 2048, PCF | 2048, PCSS (contact-hardening) | 4096, PCSS high |
| Sky lighting | procedural sky | real CC0 sky (HDRI) | real sky | real sky |
| Surface detail | – | world-space detail, 128 px tiles | 256 px tiles | 256 px tiles |
| Ambient occlusion | – | – | SSAO, half res, 8 samples | 0.75 res, 16 samples |
| Screen-space reflections | – | – | – | yes |
| Post | – | – | MSAA 4×, bloom, sharpen, colour grade | + FXAA |

*Render density* is capped twice: by a pixel ratio and by a megapixel budget, so a 13-inch
iPad renders below native density on High instead of quadrupling the work of a phone.

### Real-sky lighting

`public/assets/env/*.env` are prefiltered Babylon environment files (128 px cube, about
220–280 KB each, only the current venue's file is downloaded). They come from CC0 HDRIs (see
`docs/ASSET_RIGHTS.md`) and are rebuilt with `pnpm bake:env` (decode EXR → clamp the sun, which
the directional light already provides → Radiance HDR → Babylon prefilter in a headless browser).
`tools/env-bake/preview.html?env=sky` previews a file on the dev server.

At load the sky is turned so its brightest direction (from the file's first-order spherical
harmonics) lines up with the scene's sun, keeping reflections and shadows consistent. The
venue → file mapping and intensities are `venueSkies`. (The menu turntable car and its studio
sky were removed in the 2026-10-27 interface redesign; Home now shows key art.)

The sky lights the PBR car directly and is reflected by water, glass and metal roles through
their Standard materials (Fresnel-weighted, roughness by mip level).

### Surface detail

`SurfaceDetailPlugin` (`src/presentation/surface-detail.ts`) is a Babylon material plugin for
the venue's Standard materials. It samples a tileable detail map in **world space** (planar from
above, plus a side projection for rock, foliage and facades), so authored mesh UVs never matter:

- perturbs the normal (metre-scale ripples, clumps, swell — sized for the fixed whole-course
  camera at roughly 0.2–0.4 m per screen pixel),
- mottles the albedo at 5–100 m scales with a slight warm/cool shift,
- for water, scrolls two wave layers on a shared clock (frozen with reduced motion).

Tiles are generated in code (`surface-maps.ts`) on a Web Worker; a neutral tile stands in for the
few frames before it arrives. Finishes per role (and per-venue overrides) are `surfaceFinishes`
and `sceneryFinishes` in `themes.ts`.

### Scenery props (CC0 models)

Venues can use third-party CC0 models (see `docs/ASSET_RIGHTS.md`). `pnpm bake:props` turns the selected models into one compact vertex-coloured file per venue (`public/assets/models/<venue>-props.bin`, ~430 KB for Newport, ~100 KB of decimated rock scans for Launchsite). At load, `src/presentation/props.ts` merges every placement of a venue into **one mesh with one plain material**, so a whole harbour costs one draw call (plus one per moving boat). The file is fetched like the sky; the scene reports ready only after it arrives. `tools/props-preview/index.html?venue=newport` on the dev server shows every baked prop.

Newport's harbour (`src/presentation/newport.ts`, settings `newportHarbour` in `themes.ts`) sits entirely in the water beyond the island's shore: marina piers with berthed boats, a mooring field in the shallows, four Lido-style islets with beach houses and private docks, buoys and three boats under way (frozen with reduced motion). The sea is a calm harbour level just below the beach. Nothing new stands on the island's sand, and the circuit layout, collision footprints and track version are unchanged. As before, Newport's sea has no physics (a line drawn far into it is driven as sand), so the harbour props there have no collision either; they sit at least 12 m beyond the road edge, mostly at the edges of the fixed camera.

### Procedural landscape (Launchsite)

Launchsite's desert is generated in code from the track data (`src/presentation/launchsite.ts`, generators in `src/presentation/landscape/`), deterministically, on every tier:

- **Terrain** (`landscape/terrain.ts`): one heightfield (3 m cells over 480 × 370 m, plus a flat skirt to the horizon) on the venue's `terrain` material. It is exactly level across the planning corridor and rises beyond it into wind-shaped dunes, bajadas toward the buttes and two dry washes. Vertex tints carry broad colour (compacted run-off, desert pavement, iron-stained ground near rock, pale wash sand).
- **Painted ground** (`landscape/paint.ts`): a 2048 px canvas over the same extent (about 0.23 m per texel) used as the terrain's diffuse map: run-off wear, slide marks on the outside of corners, gravel traps, graded service roads and a fading two-track, wash beds with cobbles, ripples, launch-pad soot, pebbles and contact shadows under every rock and plant.
- **Rock** (`landscape/rocks.ts`): each `'rock'` barrier becomes a formation inside its footprint — layered sandstone buttes and mesas (crisp beds and ledges, jointed walls, alcoves, varnish streaks, talus with fallen blocks, a hoodoo spire), granite tors and boulder fields built from the Poly Haven scans, broken sandstone ledges — plus about 1,000 loose stones beyond the corridor. One mesh, one material (`landscape-rock`).
- **Plants** (`landscape/plants.ts`): about 1,150 creosote, bursage, bunch grass, cholla, deadwood and Joshua trees, gathered along the washes and at the feet of rock. One mesh, one material (`landscape-plants`).

Rock and plants add two draw calls (Launchsite Medium: 45 → 47). The terrain and its tints are built with the scene; the painted map, rock and plants follow a step per frame after it (the scene reports ready when they are in), from a lazily loaded chunk. On this project's sandbox the main-thread work is about 0.2 s before the first frame and about 0.5 s spread over the following frames; added geometry is about 40 k (terrain), 150 k (rock) and 55 k (plants) triangles. `tools/landscape-preview/index.html?x=&z=&radius=&alpha=&beta=` on the dev server shows the landscape from any angle.

### Procedural landscape at the other venues

The same generators (`src/presentation/landscape/`: `runtime.ts` runs a venue's build step by step after the first frame; `scatter.ts` and `ground-paint.ts` hold the shared placement and painting passes) dress the other five venues, each from its own `*-landscape.ts` (layout, built with the scene) and `*-detail.ts` (painting, in the lazy chunk). Every layout is deterministic and tested (`tests/unit/landscape-venues.test.ts`).

- **Grand Canyon** (`canyon-landscape.ts`, v4): a canyon-floor heightfield at -2.6 m (level beside the trail supports, talus aprons swelling toward the walls, two dry washes, rims rising behind the walls) with a painted map; every `'rock'` and infield barrier becomes layered Supai-red buttes, mesas, ledges and walls (coarser far away) and rim boulder piles; junipers, sage, agave, yucca, grass and deadwood beyond the corridor. The hidden trail uses staggered boulder-row geometry clipped to its irregular collision footprints, on the 6 m mesa surface.
- **Golden Gate** (`golden-gate-landscape.ts`, v4): the city's land boxes take world UVs over a full-colour painted map (`city-ground` material): mown lawns, sidewalks with joints and drains, block plazas, seawall promenades with benches and lamps, quays, park paths, two tennis courts, a lagoon, a fountain plaza, flower beds and picnic blankets. Granite riprap (scanned boulders and low-poly quarried blocks) lines every visible seawall, a beach runs along the south shore, Monterey cypress, palms, shrubs and ice plant grow beyond the corridor, golden headlands rise across the bay (`golden-shore`, one vertex-coloured heightfield), and the four park-boulder barriers become granite groups.
- **Santa Monica** (`santa-monica-landscape.ts`, v3): the flat beach slab and shore ribbons are replaced by one beach heightfield (level across the corridor and to the shoreline, a berm, restored dunes further out, the wet slope into the Pacific) with a painted map: groomed lanes, swash, foam and wrack lines, the bike path, volleyball courts (with nets), towels, footprints and a lifeguard truck's tracks. Palisades palms line the promenade, the venue's palms are now proper palms, dune grass and ice plant hold the dunes, and the groyne root (`'riprap'` formation) carries on into the surf as blocks.
- **Newport** (`newport-landscape.ts`, visual only): the island's sand gets a painted map (its UVs already spanned it; islet sand takes world UVs and clamps to plain sand), granite groups replace the round shore stones, a rock jetty runs out on the grandstand side and ice plant and dune grass grow along the upper beach.
- **LA nights** (`la-landscape.ts`, visual only): the city ground takes a full-colour painted map (`la-ground`): avenues and side streets with lane markings, intersections with crosswalks, sidewalks, parking lots with stalls, all darker than the circuit; fan palms line the avenues; cars stand in the lots and at the curbs and street lamps (heads among the batched emissive architecture) light the avenues.

Draw calls (Medium, phone landscape, drawing phase; before → after): Newport 58 → 61, Launchsite 45 → 47, Golden Gate 51 → 56, Santa Monica 50 → 51, Grand Canyon 25 → 24, LA nights 64 → 66. Added geometry (triangles, rock / plants): Grand Canyon about 280 k / 110 k, Golden Gate 66 k / 46 k, Santa Monica 7 k / 46 k, Newport 6 k / 7.5 k, LA nights 16 k of palms (cars are batched boxes). Painted maps are 2048 px wide (1536 at Santa Monica).

### Grand Canyon trail integration

The elevated trails share the surrounding canyon's geology. `canyon-earthwork.ts` derives
exact non-flight section paths and creates one vertex-coloured bank mesh, one multi-row
shoulder mesh and one ragged dirt mesh. Sixteen depth bands carry horizontal sandstone beds,
mineral stains, erosion channels and dusty rims. The base spreads about 1.65 times the bank
height beyond the flat support, varied by weathering; curvature bounds keep inside toes from
folding. The v5 overpass has authored sloping jump heads: the opening between lips grows to
30 m, while the feet leave 18 m clear around the lower 16 m road. Physical cliff height follows
the same lip/toe definition over the full capsule. The landing shoulders widen continuously
from 16 to 30 m and their rails follow that profile. General sloping scenery adds no driving support.

The shoulder has its own world-space sediment map, irregular rims, broken edge wear and gravel.
Compacted dirt has uneven feathered borders and wandering tire paths. Narrow receiving-edge
variation stays inside the actual support. Flat painted sediment fans and contact shade tie the bank toes
into the floor. The old smooth vertical bank ribbons and decorative scrub on the driving
shoulder were removed. Existing inner mesas now have foundations down to the canyon floor,
with the same original tops and footprint.

Beyond the full planning corridor, terraced ridges connect the isolated buttes into a broader
landscape. Their height is limited by distance from the road, and terrain near formations is
capped to preserve exposed cliff faces. These are cosmetic heightfields. The v5 track extends
the outer turns to retain 70/80 m straight approach/runout around the larger opening. Its natural
crest assistance is retuned to 29 + 0.05 times forward speed; ordinary handling and manual Hop
remain unchanged. Appearance tuning lives in
`themes.ts` (`canyonIntegration`, canyon scenery palette and material finishes).

Geometry safety is covered by `tests/unit/canyon-integration.test.ts`. Matching desktop,
phone landscape, phone portrait and inspection views are captured in
`artifacts/canyon-integration/{overpass-before,overpass-after}/`. Physical iPhone/iPad Safari verification remains
pending.

### Post-processing

`PostEffects` (`post-processing.ts`) runs in LDR: materials still apply tone mapping and
exposure, so the drawn route keeps its tuned colours. Overlay materials that are not pre-pass
capable (route lines, guide lines) are excluded from the geometry buffer so they cast no
ambient-occlusion halos. When ambient occlusion or reflections are active, MSAA runs on the
pre-pass render target.

## Budgets and testing

Protected infields use low, readable boundaries with venue-specific contents: Newport's
authored palm garden (`newportLandscapeLayout.grovePlants`, separate from loose scatter),
Launchsite's individual vessels and pipework, and Golden Gate's varied market frontage and
pocket plaza. Their broad protected footprints retain the accepted cut policy without giant
solid scenery masses. The existing non-jumpable-infield rule remains in the simulation.
Tank/storefront physical dimensions are shared through `src/core/tracks/venue-parcels.ts`;
palettes, planting, facade treatment and decoration remain in presentation. The concave
Launchsite plinth uses `building-geometry.ts` with UV/colour attributes matched to the static
batch. Do not reintroduce a bounding box over its road-facing notch.

The Launchsite and LA manual-Hop lanes use compact native props from
`presentation/hop-obstacles.ts`, with geometry shared through `core/tracks/hop-obstacles.ts`.
Only their IDs are skipped by generic wall rendering. They reuse existing static materials,
cast normal shadows, add no lights/bloom, and never enter the rock landscape generator.
Grand Canyon's natural rock Hop trail keeps its existing scenery.

- Draw-call targets (90 one-car / 150 four-car) are scene draw calls. Low and Medium render the
  same scene draw calls; High and Ultra add a fixed number of screen passes (about 5–15).
  Browser tests run on Low automatically (see above) unless they choose a tier.
- `tests/unit/graphics.test.ts`: detection, render density, governor, tile generation.
- `tests/browser/graphics.spec.ts`: switching tiers live, persistence, identical route
  compilation across tiers, every venue on Ultra without errors, zoom guard.
- Performance on real devices is **not yet measured**. Software WebGL (CI and this project's
  sandbox) is far slower than any GPU and is not representative; use the setup screen on the
  iPhone/iPad and note which tier Auto settles on.

## Renderer: WebGL 2 or WebGPU (beta)

WebGL 2 is the default everywhere. **Race setup → Renderer → WebGPU (beta)** (or `?renderer=webgpu`)
saves the choice and reloads the game on Babylon's WebGPU engine (`src/presentation/engine.ts`,
loaded as a separate chunk only when chosen). The scene, tiers and effects are the same; the
surface-detail plugin carries both GLSL and WGSL. If the browser or app web view has no usable
WebGPU adapter, the game starts on WebGL 2 and the setup screen says so. Switch back the same way.

Verification so far is software-only (Chromium with SwiftShader's Vulkan WebGPU adapter): the
engine starts, every tier reaches a ready scene without errors, and a read-back frame on Low
matches the WebGL 2 frame. Real-device behaviour (Safari / iOS 26 web view on Apple GPUs) and any
performance benefit are untested; treat it as an experiment and compare tiers on both renderers.

## Zoom and gestures

`src/app/zoom-guard.ts` prevents Safari pinch (`gesture*`) and double-tap zoom, multi-finger
page scrolling, and returns the page to 1:1 if assistive zoom or a focused field left it scaled.
`touch-action: manipulation` covers the whole page; drawing and race controls keep
`touch-action: none`. Form fields use 16 px text so iOS does not zoom on focus. The iOS app
additionally honours `user-scalable=no`.
