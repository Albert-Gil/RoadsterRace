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
venue → file mapping and intensities are `venueSkies`; the menu car uses `showcaseSky` (a
photographic studio at 0.75 intensity) with the brightest softbox turned 145° from the camera,
so it shows as a soft streak on the glass and haunches instead of a white sheet over the roof
and hood; the plinth takes 0.45 of the studio light so it stays a dark stage.

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

Venues can use third-party CC0 models (see `docs/ASSET_RIGHTS.md`). `pnpm bake:props` turns the selected models into one compact vertex-coloured file per venue (`public/assets/models/<venue>-props.bin`, ~430 KB for Newport). At load, `src/presentation/props.ts` merges every placement of a venue into **one mesh with one plain material**, so a whole harbour costs one draw call (plus one per moving boat). The file is fetched like the sky; the scene reports ready only after it arrives. `tools/props-preview/index.html?venue=newport` on the dev server shows every baked prop.

Newport's harbour (`src/presentation/newport.ts`, settings `newportHarbour` in `themes.ts`) sits entirely in the water beyond the island's shore: marina piers with berthed boats, a mooring field in the shallows, four Lido-style islets with beach houses and private docks, buoys and three boats under way (frozen with reduced motion). The sea is a calm harbour level just below the beach. Nothing new stands on the island's sand, and the circuit layout, collision footprints and track version are unchanged. As before, Newport's sea has no physics (a line drawn far into it is driven as sand), so the harbour props there have no collision either; they sit at least 12 m beyond the road edge, mostly at the edges of the fixed camera.

### Post-processing

`PostEffects` (`post-processing.ts`) runs in LDR: materials still apply tone mapping and
exposure, so the drawn route keeps its tuned colours. Overlay materials that are not pre-pass
capable (route lines, guide lines) are excluded from the geometry buffer so they cast no
ambient-occlusion halos. When ambient occlusion or reflections are active, MSAA runs on the
pre-pass render target.

## Budgets and testing

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
