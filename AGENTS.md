# Roadster Race

Build on the approved browser prototype and local multiplayer: two to four sequential drawing turns, a shared race, independent corner thrust controls, and finishing order. Preserve solo play. Public GitHub Pages hosting for testing is authorized; hop, leaderboards, accounts and promotion remain later work.

- Stack: TypeScript, Babylon.js, WebGL 2, Vite; DOM/CSS controls.
- Keep `src/core` independent of rendering, DOM, assets, and theme settings.
- Presentation settings live in `src/presentation/themes.ts`; assets have stable roles.
- Preserve timing through route compilation. All players/strokes use the same pace mapping.
- Simulation uses a 60 Hz fixed step. Visual quality and theme must not change results.
- Touch ownership lasts until release/cancel; never route solely through the primary pointer.
- Use the pinned pnpm toolchain and lockfile. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` after meaningful changes. Run relevant browser tests for input/session/presentation changes.
- Document physical Safari verification as pending until a real device has been tested. Automated mobile emulation is supplemental evidence.
- Preserve existing planning documents. Never put secrets or generated dependencies in version control.
- Local preview and the public Albert-Gil/RoadsterRace GitHub Pages testing site are authorized. External posts/promotion and additional hosting services remain outside the milestone. Deploy only verified main builds of dist/; keep assets/Home beneath the configured base path. No service worker/offline caching during testing. Physical hosted Safari checks remain pending until performed on hardware.
- Circuits must include authored inner barriers or solid obstacle areas that prevent excessive corner cutting while preserving deliberate runoff. Visible obstacles and collision footprints must agree. Route compilation must reject solid crossings with vehicle clearance. Future hop mechanics must respect protected infield areas and ordered course progression; shortcuts require explicit track design and validation.

- Race distance is selectable from one to six laps. Reuse one compiled line/pace across laps; scope session bests by circuit ID/version and lap count.
- Driver names and selected paint are presentation preferences. Preserve them across themes and rematches, render names as text, and keep player numbers visible when names/paints repeat. The six paint definitions live centrally in themes.ts.
- Drift coaching pop-ups and post-race driving advice are intentionally omitted. Keep necessary lap, finish, contact and recovery feedback concise.

- Playable courses are registered in src/content/circuits.ts. Use the selected TrackDefinition for drawing, simulation, projection and timing; keep scenery selection outside src/core. Course changes must discard all plans, readiness and race state while preserving driver preferences and lap count, and must dispose old scene resources.

- Local multiplayer includes physical car-to-car contact in individual races and tournaments. Use a non-overlapping, barrier-clear starting grid. Resolve all cars together before crediting progress/checkpoints/finishes; overlap correction must not award distance. Recovering cars wait for an unoccupied safe position; finished cars leave active contact.
- Multiplayer races begin with three seconds of ghosting, measured by the fixed simulation clock. Disable only car-to-car contact/impulses/scrapes during that period; barriers and surface physics remain active. Pause freezes the remaining time; every new race, rematch and tournament round starts a fresh ghost period. Solo has no ghost period. The duration is centralized in CONTACT_RULES.
- Tournament rounds award 10/6/4/0 points. Hundredth-place ties share rank points and skip subsequent places; equal championship totals share the title. Commit each complete round exactly once. Preserve completed rounds across reloads, restart an interrupted round with fresh drawings, and validate saved circuit/rules/compiler versions.
- Player-facing venue names are Coastal Launch, Launchsite and Golden Gate. Preserve the legacy orbital-launchyard identifier for preference/link compatibility; launchsite is a URL alias. Golden Gate is original stylized Bay Area scenery, with flat physical road and supported city blocks, a narrow suspension bridge and protected solid footprints.

- Drawing starts anywhere across the authoritative full-width start/finish gate, or within its 12 m approach. Preserve timestamped raw lead-ins/overshoots for display, but exclude them from geometry, pace, drawing duration and lap validation. Interpolate gate crossings. Every accepted lap connection must share a forward anchor, preserve pace and pass full vehicle-clearance validation before confirmation.
- The first valid forward finish crossing after a full lap ends the counted drawing. Permit release anywhere afterward; ignore all subsequent movement and pauses, with no overshoot-distance limit. Incomplete and wrong-way laps remain invalid.
- Phase-specific route widths live in themes.ts: planning 10/14 CSS px (color/outline), racing 8/11 px. Keep the planning vehicle clear of the full touch gate.
- Maximize the phone drawing surface: render scenery edge to edge and fit every interactive phase into the same safe course rectangle. Do not restore large header/footer bands, drawing instructions, pace legends or preview statistics. Use compact, accessible 44+ px controls (side rail in landscape, bottom rail in narrow portrait), keep numbered multiplayer identity and concise validation errors, and reserve explanatory copy/practice-line UI for a future tutorial. The practice fixture is development-only until that tutorial is explicitly built.
- Narrow bridge rails/supports are explicit, bridge-tagged exceptions to ordinary 5–7 m runoff. The deck is road-width only; visible rail geometry must exactly follow authoritative footprints. Do not reintroduce a shoulder/apron across water. City building footprints must be supported by authored land and protected areas; preserve a flat physical road.

- Keep repeated scenery colors and bounded cosmetic particles batched. Verify the 90 solo / 150 four-car draw-call targets with shadows, thrust and sand/impact effects active; cosmetic optimization must not alter simulation or input behavior.
