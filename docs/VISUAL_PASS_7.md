# Visual pass 7: drifting cloud shadows

Owner request, 2026-11-20 ("continue improving"). Presentation only: no support, barrier,
grip, progression, camera, track-version, rules or physics change.

- Soft cloud shadows now drift slowly across every lit surface of the nine daytime venues
  (ground, roads, water, buildings, rocks, plants). This gives the fixed overview
  depth and movement (`cloud-shadows.ts`, values `cloudShadowAppearance`).
- **How:** a material plugin (`CloudShadowPlugin`, GLSL and WGSL) evaluates three octaves
  of value noise from world X/Z in the fragment shader and darkens the final colour by up
  to 18 % (12–14 % on bright venues) under a "cloud". There is no texture, extra pass or draw
  call. Cloud size, coverage, strength and wind can be set per venue.
- The shade depends only on position and the shared animation clock
  (`SurfaceDetailPlugin.time`). Reduced motion therefore freezes the clouds.
- **Where it applies:** on Medium, High and Ultra (tiers with `surfaceDetail`). It is off on Low
  and on LA nights. Unlit materials, translucent overlays (`roadsterOverlay`) and the PBR cars
  are excluded. Materials created later (lazy landscape batches) are attached through
  `scene.onNewMaterialAddedObservable`. A tier change enables or disables the plugin live.
- Verified in the browser: enabled on Newport's materials on Medium; zero materials enabled on
  LA nights and on Newport Low; no page errors on Newport, Grand Canyon or Golden Gate.
  The graphics, scenery composition, venue craft and production kit unit tests pass.
- Not verified: WebGPU (WGSL path) and the frame-time cost on a physical phone. The
  per-pixel cost is three value-noise lookups. If it shows on devices, lower to two octaves or
  restrict to High/Ultra in `applyCloudShadows`.
