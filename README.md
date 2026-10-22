# Roadster Race

A browser racing prototype for solo play or two to four people on one device: draw a line and its pace, race one to six laps, and time your rechargeable thrust. Visuals are replaceable through shared settings and assets. No account, backend, or external service is required to play.

Four venues are available: Coastal Launch, Launchsite, Golden Gate and **Santa Monica**. Santa Monica adds a sunset amusement pier, an optional automatic ramp over water and a flat bypass. Draw through the ramp to take the shortcut; use the existing thrust pad to help clear it. Newly created Full Tours end at Santa Monica. See [course and jump tuning](docs/SANTA_MONICA.md).

## Online testing

Testing site: **https://albert-gil.github.io/RoadsterRace/**. GitHub Actions verifies main builds before deploying. See [online testing and iPhone installation](docs/ONLINE_TESTING.md) for release, rollback, build labels and physical-device checks. Hosted physical iPhone/iPad verification remains pending until performed on hardware.

## Play locally

The dependencies are installed in this workspace. From this directory:

```powershell
pnpm dev
```

Open the Local URL printed by the server, normally http://localhost:5173/. On an iPhone/iPad connected to the same Wi-Fi, open the printed Network URL. Keep the computer and server running. A Windows firewall or isolated guest Wi-Fi can prevent access; no firewall rule is changed by this project.

For a new checkout, install Node 22.12 or newer and pnpm 11.25, then run:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

The supplied desktop runtime also provides pnpm at `C:\Users\alber\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd`. If needed in PowerShell, invoke that absolute path with `&`. This machine's system npm installation failed during setup; the project uses a pnpm lockfile and a local, ignored package cache instead. On networks using a trusted corporate certificate, Node's `NODE_USE_SYSTEM_CA=1` option may be needed for dependency downloads. TLS verification remains enabled.

## Controls

1. Select **Let's race**, choose 1–6 laps, enter your driver name and select a paint finish. Choose **Draw racing line** to continue.
2. Start anywhere across the highlighted start/finish strip, or up to 12 metres behind it, and draw one complete lap following the arrows. Draw slowly for deliberate corners and faster for straights. Once you cross the finish, lift anywhere; all later drawing is ignored.
3. Inspect the route and choose **Race this line**. Explanations and a practice example are reserved for a future tutorial.
4. Tap the **THRUST** pad, or press **Space** on desktop. Each activation lasts 0.7 seconds and recharges in five seconds. Holding does not repeat.
5. Use **Escape** or Pause to pause. App/tab interruption also pauses the race. Resume includes a countdown.
6. Retry the same line or draw a new one. Personal bests last for this page session only.

### Race with friends

1. Choose **Race with friends**, select two, three, or four players, choose 1–6 laps, customize each name/paint, then **Plan your lines**.
2. Each player draws, previews and locks in a line. Pass the device at the handoff screen; earlier lines stay hidden until all plans are locked in.
3. Place the device flat in landscape. Everyone taps their numbered corner pad to get ready. The shared countdown starts when all players are ready.
4. Tap your pad for thrust during the race. Cars start on a separated grid with three seconds of ghosting, then physically collide: rear impacts transfer momentum, side contacts push and slide, and crashes can send you into sand or barriers. Finished cars leave active racing while everyone else completes the distance.
5. See finishing order and individual times. Times equal to the displayed hundredth share a place. **Rematch** preserves all lines and requests readiness again; **Draw new lines** starts at Player 1.

| Player | Corner | Desktop key |
|---|---|---|
| 1 | Bottom left | A |
| 2 | Bottom right | L |
| 3 | Top left | Q |
| 4 | Top right | P |

Solo keeps the bottom-right thrust pad and Space key. The top two multiplayer controls face players seated opposite the screen. Numbered car labels supplement color. Escape pauses everyone together. An interruption during the ready check clears readiness; an interrupted race requires an explicit resume and countdown. Four people are best served by a tablet; real-device comfort and Safari performance still need testing.

The separate **Touch test** screen remains available for the 50-cycle input diagnostic.

### Tournaments and three circuits

Choose **Tournament** in multiplayer setup. **Full Tour** races Coastal Launch, Launchsite and Golden Gate in that order. **Custom Tour** supports 2–12 races, repeated venues and up/down reordering. The selected 1–6 laps apply throughout; each round begins with fresh private drawing turns.

First/second/third/fourth receive **10/6/4/0 points**. Race ties share place points and skip following ranks; equal championship totals share the title. Completed points save locally. **Resume tournament** preserves earlier results and restarts the unfinished round with fresh lines. Drivers and schedule lock at tournament start.

Golden Gate is a fictional San Francisco-inspired city circuit, approximately 442 m long, with flat road and protected infield areas. Launchsite is the new display name for Orbital Launchyard; the older URL/preferences still work. Open [Golden Gate](http://localhost:5173/?circuit=golden-gate) or [Launchsite](http://localhost:5173/?circuit=launchsite). See [the milestone guide](docs/GOLDEN_GATE_TOURNAMENT.md).

The current handling raises the speed cap to 42 m/s, maximum drawn pace to 28 m/s and thrust acceleration to 25 m/s². Asphalt slides slightly more; off-road grip is substantially lower with a modest reduction in drag. White pooled vapor makes thrust visible. Turn **Sound on** in the header for motor, tire, thrust, impact and scrape sounds; local recordings can replace these roles later.

### Drawing and handling

Small finger wiggles and pace fluctuations are smoothed. Acceleration and braking build progressively. The drawn line is a steering target: taking a corner too fast carries the car away from it while steering tries to recover. Grip loss does not impose a timed speed cap or instant slowdown. Ordinary braking still follows the pace you drew.

When you lift your finger, accidental backward sections, hooks and small loops are removed. The preview shows the cleaned line; deleted detours do not become long braking pauses. You can also draw substantially beyond the asphalt, through roughly one additional road width of sand on either side. Start and finish can use different positions across the full-width gate. The compiler blends the last/first 20 metres into a safe forward connection. Muted dashed lead-ins stay visible but do not count toward pace or duration.

When the physical car reaches sand, lower traction makes it slide more and surface drag slows it down. The effect ends as the tires return to asphalt. Dust and the SAND/DRIFT labels show what is happening. This applies equally to solo and multiplayer. See [handling and tuning](docs/HANDLING.md).

## Commands

```powershell
pnpm typecheck
pnpm test
pnpm test:browser
pnpm test:pages
pnpm build
pnpm report:size
pnpm preview
```

Browser checks use locally installed Google Chrome on Windows and Playwright Chromium on Linux (`pnpm exec playwright install --with-deps chromium`). Set `CHROME_PATH` for another installed Chrome/Chromium executable. By default they use software WebGL and touch emulation, so they do not certify physical Safari performance. If the preview server is not already running, the browser suite starts a local test server. `test:pages` needs a production build made with `VITE_BASE_PATH=/RoadsterRace/`; see the online-testing guide.

On this Windows machine, Intel Direct3D 11 rendering avoids software-renderer stalls. To use that verified backend for browser checks:

```powershell
$env:WEBGL_BACKEND = 'd3d11'
pnpm test:browser
```

Without that setting, the portable default remains SwiftShader. `node tools/check-renderer.mjs` checks the local Windows renderer and game-clock progress; neither backend certifies Safari on a physical iPhone/iPad.

## Change the appearance

Edit `src/presentation/themes.ts` for branding, typography, semantic UI colors, player colors, materials, lighting, and scene colors. Edit `src/presentation/assets.ts` for optional model/texture files. See [the visual guide](docs/VISUAL_GUIDE.md) for asset conventions and common requests.

- Default: **Coastal Day**.
- Alternate: add `?theme=graphite` to the URL.
- During development, **T** toggles the two presets without restarting the race.
- There is no end-user style editor. Describe a desired change and update the central presentation files.

Appearance examples: [Coastal Day](artifacts/coastal-day.png) and [Graphite](artifacts/graphite.png). Also see [multiplayer racing](artifacts/multiplayer-race.png), [phone readiness](artifacts/multiplayer-ready-phone.png), [four-player phone results](artifacts/multiplayer-four-results-phone.png), the [solo phone preview](artifacts/phone-preview.png), and [touch diagnostics](artifacts/touch-diagnostics.png).

The current upgrade adds a RoadsterLAB-derived car in showcase/racing detail, graphite/crimson menus with bundled Barlow typography, thicker red-to-green pace lines, pits/gantry/grid and protected landscaped islands. Solid walls reject planned crossings and physically stop or slide drifting cars. Stuck cars recover independently without gaining progress; ordinary drifting still has no timed speed penalty. The road remains flat. See [appearance guide](docs/VISUAL_GUIDE.md), [handling](docs/HANDLING.md) and [asset provenance](docs/ASSET_RIGHTS.md). Matching comparison views are in `artifacts/before-overhaul/` and `artifacts/overhaul/`.

## Sound

Tap the speaker button to turn sound on. The electric drive tone follows speed; tire and sand layers follow actual sliding/contact. Thrust, 3–2–1, start, final lap, finish and recharge have distinct cues. Pause/interruption silence play sounds; mute leaves the race running. Sound begins off so browser autoplay restrictions do not block play.

Recordings can replace individual roles through `src/presentation/audio-assets.ts`, with synthesized fallback. This is ready for future ElevenLabs exports without adding any service credentials or API dependency to the game. See [the sound guide](docs/SOUND_GUIDE.md) for file slots, briefs and mix settings, and listen to the [current synthesized cue preview](artifacts/sound-preview.wav).

## Architecture

`src/core` contains track data, route compilation, and the engine-independent 60 Hz simulation. `LocalRace` advances all cars through shared forces/contact substeps, commits physical progress afterward and ranks positions against the common circuit. The core tournament module scores complete rounds independently of presentation and local storage. `src/input` contains independent pointer ownership. `src/presentation` contains themes, assets, procedural scenery/cars, optional GLB loading, and audio cues. `src/main.ts` coordinates drawing turns, readiness, races and DOM controls. Theme changes cannot alter route or simulation data.

Current scope: one to four local players, three playable circuits, physical car contact, saved local tournaments, one to six laps, six paint choices, saved driver profiles, thrust, solo session bests per lap count, rematch, two presentation presets, four-touch diagnostics and public GitHub Pages hosting for testing. Hop, challenge mode, persistent/global records, native iOS and promotion remain later milestones.

See [multiplayer decisions and next steps](docs/MULTIPLAYER.md), [verification and device checklist](docs/VERIFICATION.md), [original asset ledger](docs/ASSET_RIGHTS.md), and the existing detailed planning documents. Physical iPhone/iPad verification remains pending until tested on actual hardware.

## Race setup and driver identity

Race setup now serves solo and local play. Choose 1–6 laps and enter each driver's name (up to 18 characters) and one of six paints: Crimson, Glacier silver, Cobalt blue, Solar yellow, Verdant green or Ultraviolet. A live showcase previews paint. Names are carried through handoff, controls and results; driver numbers remain visible when names or paints repeat.

These choices are saved locally in this browser, with a safe session-only fallback if storage is unavailable. The pace line is 10 CSS pixels wide while planning (14 px outline), and 8 pixels during racing (11 px outline). Coaching pop-ups during drift and advice after the race have been removed. Results show the selected distance, split times and session best, scoped separately by circuit/version/lap count.

Coastal Launch, Launchsite and Golden Gate are playable. Alpine Relay and Neon Harbour remain future concepts in [the expansion plan](docs/CIRCUIT_EXPANSION_PLAN.md).

## Select a circuit

In race setup, choose **Coastal Launch**, **Launchsite** or **Golden Gate** before drawing. The cards show actual layouts, approximate centerline lengths and course character. Launchsite combines a long straight and technical return with original spaceport scenery. Golden Gate combines a city boulevard, technical waterfront streets and an 88 m red suspension bridge with a 12 m deck and solid edge rails. Both newer environments remain original procedural art passes ready for further refinement.

The selected circuit is remembered with names, paint and lap count. A deliberate circuit change discards every previous plan, ready state and race; names, paint and distance remain. Session bests remain separate by circuit/version/lap count. Old one-circuit saved preferences migrate to Coastal Launch. A direct local link is `http://localhost:5173/?circuit=orbital-launchyard`.

Circuit metadata lives in `src/content/circuits.ts`, physical Orbital geometry in `src/core/tracks/orbital.ts`, and biome dispatch in `src/presentation/scenery.ts`. Spaceport materials/lighting are centralized alongside the other presentation settings in `themes.ts`. The scene changes reuse one WebGL engine and dispose previous scenes. Physical Safari and sustained mobile performance remain pending.

See [Golden Gate city and drawing guide](docs/GOLDEN_CITY_DRAWING.md) for gate tolerances, lap blending, supported city placement and bridge exceptions.
