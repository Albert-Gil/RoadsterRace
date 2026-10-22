Roadster Race — development and launch plan
==========================================

Prepared October 19, 2026. Status: planning only. The workspace was empty when inspected. No game, repository scaffolding, dependencies, hosting, accounts, or social posts have been created. Estimates and numerical tuning values below are planning assumptions, not benchmark results or supplier quotes.

Update, October 20, 2026: the bounded one-player prototype has since been authorized and implemented. The original paragraph above records the planning snapshot. See README.md for the runnable game and docs/VERIFICATION.md for current evidence; the broader public release described below remains future work.

The expanded [detailed execution plan](ROADSTER_RACE_EXECUTION_PLAN.md) is now the primary implementation reference. It adds 53 proposed tickets, exact behavior specifications, dependencies, test procedures, milestone gates, a first-ten-days schedule, and launch operations. Its refined working estimate is 12–16 weeks; the original roadmap below provides the supporting rationale and research.

**Recommendation:** build one beautiful, short 3D circuit for a free browser game. Prove that drawing speed, thrust timing, and one optional hop shortcut are fun on real devices before adding content. Start provisionally with TypeScript, Babylon.js, and WebGL 2; make the engine decision after a small mobile feasibility experiment. Showcase four-player play on a tablet and make the solo challenge excellent on a phone. Release through one HTTPS link, supported by a 30-second trailer captured from the shipping game. Native iOS follows evidence of demand.

**Product promise:** “Draw your racing line. Time your thrust. Jump the shortcut. Race your friends.” Getting the game seen and played by Elon Musk is an outreach ambition, not a deliverable that development can guarantee.

**1. Scope and priorities**

| Priority | Required outcome | Scope boundary |
|---|---|---|
| P0 | A working mobile web link; readable, attractive 3D; satisfying draw-and-race loop | One circuit, one vehicle class, one visual theme |
| P0 | Drawing captures both route and intended pace; thrust rewards timing | Automatic racing after planning; no steering during the race |
| P0 | One to four local players, including reliable simultaneous controls | Same device; tablet recommended for four people |
| P0 | Time trial, replay/retry, personal best, fixed solo challenge | Local persistence; no account required |
| P0 | One optional obstacle/shortcut with a less frequent hop | Safe route always completes without hopping |
| P0 | Measured device reliability, asset rights review, authentic trailer | Launch only after the release gates pass |
| P1 | Result sharing, lightweight anonymous analytics, performance presets | Sharing and analytics failures must not prevent racing |
| P2 | More tracks, daily challenges, richer ghosts, optional PWA | Add after players demonstrate repeat play |
| Later | Native iOS, online multiplayer, public verified leaderboard | Separate projects with separate scope and estimates |

Keep the release free, without ads, purchases, wallets, or mandatory registration. Avoid vehicle upgrades, a career economy, procedural circuits, live multiplayer, realistic damage, and extensive car customization in the first release. Preserve polish by reducing content count.

**2. Modes and complete player journey**

Landing page → tap Play → brief landscape prompt if needed → choose Solo or Friends → draw → confirm → countdown → automatic race with thrust/hop → results → instant retry, redraw, or share.

- **Solo time trial:** race your own best ghost or a clearly labeled developer ghost. Default to the last confirmed route on retry; offer Redraw alongside Retry. Keep personal bests separated by track, rules version, and assists. A failed storage write must leave the game playable.
- **Local Friends:** choose two, three, or four players. Assign a color, number, pattern, and control corner. Each draws sequentially, sees a short preview, then confirms. Hide earlier players’ routes during later drawing turns. Race together; display finishing order and a useful result such as “Lost 0.8 seconds to corner overspeed.” Offer “Race same lines” and “Draw again.”
- **Elon Challenge:** a fixed circuit and ruleset, a recorded developer target, and a one-tap replay. This is an invitation for Elon and everyone else to beat the time. It must not imply Elon supplied the target, played the game, or endorsed it. Label the benchmark “Developer time.” Use a neutral public name such as “Roadster Challenge” if review of the named challenge remains unresolved.

Suggested race length: two laps, roughly 40–50 seconds in total. Draw one lap and repeat its route and speed profile. Keep sequential drawing turns around 10–20 seconds. Treat these as hypotheses: if four-player setup feels slow, shorten the circuit or use a one-lap party ruleset after testing. Do not automatically replay thrust inputs on lap two.

On phones, foreground Solo and two-player Friends. Keep three/four-player selection available on devices that pass input and layout checks, with “Best on a tablet” guidance. Do not pretend four adults crowding a small phone is comfortable. Desktop uses mouse drawing and separate keyboard thrust/hop bindings per player; on-screen pads remain visible.

**3. The vertical-slice circuit**

Working title: **Coastal Launch Circuit**. A compact, sunlit coastal test track on a raised terrain island: pale concrete, dark asphalt, turquoise water, restrained futuristic architecture, and an original sports roadster.

Design the course around three readable decisions:

1. A broad opening sweeper teaches drawing a smooth route and a deliberate pace.
2. A long straight makes forward thrust visibly useful, followed by a hairpin that punishes careless late activation.
3. A final chicane has a longer safe road around it and a clearly marked, approximately straight hop corridor across a low barrier or small gap.

Make the shortcut visually obvious before the race. Mark takeoff and landing regions, and distinguish “valid if airborne” from ordinary out-of-bounds terrain. Use fixed obstacle positions in version one; unexpected random obstacles would undermine the route players just planned. Route geometry, obstacle collision, checkpoint logic, and visible art must agree.

The full track stays visible from a fixed elevated camera. Keep the central circuit outside the corner control pods and likely finger occlusion. Use the same ground projection for drawing and racing initially; a cinematic camera shift must never change the route or obscure timing. Reserve close-up camera work for menus and post-race replays.

Acceptance: a player can identify the safe route and shortcut from one screenshot; at least three plausible racing lines are competitive; the shortcut offers a measurable reward with a real failure cost; no hop is required to finish.

**4. Engine choice and actual browser feasibility**

Current Unity documentation lists mobile browser support, including iOS Safari 15+ and Android Chrome 58+. Those are documented compatibility floors, not a sensible promise of performance on every old device. Older blanket statements that Unity Web does not support mobile are outdated. [Unity 6.3 browser compatibility](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/webgl/intro/browsercompatibility)

| Option | Why it fits | Main tradeoff | Decision |
|---|---|---|---|
| Babylon.js + TypeScript | Web-oriented 3D, direct browser input/UI integration, testable standalone simulation | More custom game tooling; a later native implementation is a separate effort | Provisional first choice for link-first launch |
| Unity + C# + URP | Strong scene/art workflow; native iOS path and substantial code/asset reuse | Must measure download, initialization, memory, browser integration, and touch behavior | Main alternative if team experience or near-term native release outweighs web overhead |
| PlayCanvas | Web-oriented engine and visual authoring workflow | Evaluate editor/export workflow, account needs, and commercial terms for the chosen setup | Prefer if the artist-led workflow materially speeds production |
| Three.js + TypeScript | Flexible renderer and direct control | More game systems and tooling must be assembled | Use if the developer already knows it well |
| Godot | Integrated open-source editor and native targets | Current stable web export uses WebGL 2; Godot 4 C# web export is unavailable | Viable with GDScript, but not the default for this particular launch |

Babylon maintains WebGL and WebGPU side by side. Use **WebGL 2 as the release baseline**, with WebGPU optional later; do not make a new graphics API a dependency of the launch link. Three.js’s current WebGL renderer also requires WebGL 2. Godot documents single-threaded web export as its preferred default and describes its mobile/export constraints. [Babylon support](https://doc.babylonjs.com/setup/support/webGPU/), [Three.js renderer](https://threejs.org/docs/pages/WebGLRenderer), [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)

PlayCanvas’s guidance emphasizes controlling initial assets, compressing delivery, and staging loading. These principles apply whichever engine is selected. Do not infer a guaranteed bundle size or frame rate from the engine name. [PlayCanvas loading guidance](https://developer.playcanvas.com/user-manual/optimization/load-time/)

**Engine decision experiment, before production art:** deploy a representative Babylon build with four cars, a track, the intended lighting style, particle bursts, audio, and four independent touch pads. Measure on an older target iPhone, a current iPhone, an iPad, and a midrange Android phone. If Unity is a serious candidate because of developer experience/native priority, run the same small scene there within a strictly bounded comparison. Do not build two complete prototypes.

Record transferred bytes, cold/warm startup, frame-time distributions, memory observations where available, touch correctness, tab reloads, thermal behavior, and embedded-browser behavior. Select the simplest option that passes the release budgets. If none passes, simplify materials, resolution, and assets before broadening scope. Freeze the chosen stable engine/tool versions in a decision record.

**5. Mobile browser constraints and budgets**

Browser feasibility depends on the actual scene and device, not merely WebGL availability. X and LinkedIn embedded browsers are separate test surfaces. A user should reach a game immediately when supported; provide a clear external-browser recovery path when a tested embedded browser fails. Do not force every visitor through a browser-switch tutorial.

- Launch directly as a top-level HTTPS page, rather than relying on an embedded portal or iframe.
- Support normal browser chrome. Fullscreen and orientation lock are enhancements; use a rotate prompt when locking is unavailable. Orientation locking is not universally supported. [MDN orientation lock](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock)
- Unlock/resume sound from the Play tap, with a visible mute option. [MDN Web Audio guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- Respect notches, rounded corners, and the home indicator; keep input pads inset from system gesture edges. Browser gesture suppression cannot guarantee control over OS gestures. [WebKit safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- Pause local races and clear held inputs on visibility loss, focus loss, or a substantial rotation interruption. Clear canceled pointer ownership without necessarily pausing the whole race. Resume a paused session with a short countdown. Keep paused challenge attempts separate from valid uninterrupted benchmarks.
- Detect missing WebGL 2 and initialization/context loss. Offer a comprehensible retry or compatibility message; never leave a frozen loading screen.
- Limit device-pixel ratio and lower internal rendering resolution before reducing input responsiveness. Release textures and replay buffers between sessions.

Proposed budgets, to validate rather than advertise as achieved:

| Measure | Target / release threshold |
|---|---|
| Initial playable transfer | Target ≤10 MB compressed; hard review above 15 MB, excluding optional trailer |
| Cold navigation to drawable circuit | p75 ≤15 s on a measured 10 Mbps / 80 ms connection, including download and initialization |
| Warm start | p75 ≤5 s on supported devices |
| Main target devices | Median approximately 60 fps; p95 frame time ≤25 ms during representative racing |
| Lowest supported tier | Median ≥30 fps; p95 frame time ≤50 ms, with no repeated long stalls |
| Input feedback | p95 press-to-visible-response ≤100 ms in physical-device measurement |
| Stability | No crash, unwanted reload, or WebGL context loss in a 20-minute repeated-race session on each release-gate device |
| Render workload | Initial guide: <150 draw calls and <150k visible triangles; replace with measured budgets |

Avoid a claimed universal Safari memory ceiling. Tools expose memory unevenly, and browser termination depends on device and system pressure. Track decoded asset budgets, observed heap where available, and real reload behavior. A 10 MB download can occupy much more memory after decoding.

**6. Drawing route and speed profile**

Capture timestamped pointer positions, transform them into track-local ground coordinates, and preserve both geometry and pace. The camera, aspect ratio, and CSS pixel density must not create different racing speeds for the same intended gesture.

Pipeline:

1. Start near the marked start gate and accept one drawing pointer. Ignore unrelated touches during that turn.
2. Project samples onto the ground; record monotonic time. Use coalesced samples when available with a normal-events fallback.
3. Filter duplicate points and jitter; apply bounded smoothing that preserves corner intent. Resample the route at regular arc-length intervals.
4. Estimate local drawing speed from distance/time before timing information is discarded. Smooth it separately from geometry. Clamp unreasonable sample gaps and explain interrupted strokes instead of inventing long missing segments.
5. Map drawing speed through one shared, tunable curve to desired car speed. Use track-normalized distances so camera sizing does not change the mapping. Do not normalize each player’s fastest point to the same maximum; that would erase deliberate overall pace differences.
6. Validate start/finish closure, ordered checkpoints, legal route corridors, and car-width clearance. Revalidate the smoothed route so smoothing cannot cut through a wall.
7. Display the route with a pace visualization using both line treatment and color, then offer Preview, Redraw, and Confirm. Explain “Draw slowly through turns; faster on straights.”

Auto-connect only a short finish gap within a defined tolerance and only through legal ground. Reject incomplete laps, reversed progress, skipped gates, and invalid crossings with a specific highlighted location. A lifted finger cancels the unfinished attempt in the first version; later editing is optional. Allow legitimate shortcut corridors during drawing even though they require a hop during the race.

Store raw samples for debugging during development, and store the compiled route, speed profile, rules version, and track version for replay. Do not transmit raw touch data as routine analytics.

Acceptance: slower/faster gestures change the resulting speed profile predictably; smoothing preserves the chosen line; all players use identical mapping; replay at different render rates yields equivalent times within the documented simulation tolerance.

**7. Physics, race rules, and balancing**

Use a lightweight **arcade path-following simulation**, rather than a full tire/rigid-body simulation. The player’s route remains authoritative. Longitudinal speed and grip penalties create racing decisions; wheel rotation, body lean, tire smoke, and limited lateral slip provide visual feedback without requiring unstable vehicle physics.

Maintain distance along the route, speed, grip state, thrust charge/cooldown, hop state, checkpoint progress, penalties, and finish time. Run at a fixed 60 Hz step with interpolated rendering. Queue player actions against simulation ticks. Bound catch-up work; if the page stalls badly, pause/recover rather than skipping obstacle checks or advancing cars through geometry.

Core model:

- Advance distance by `speed × fixedDelta`.
- Approach the drawn target speed with bounded acceleration and braking.
- Estimate required lateral acceleration as `speed² × routeCurvature` and compare it with a tunable grip limit.
- In the first release, sustained excess produces an explicit skid/speed-loss event and a brief recovery state while keeping the car near the drawn route. Avoid silently clamping every corner to the perfect speed: then drawing fast everywhere would become optimal.
- Forward thrust adds acceleration for a short fixed burst, with a speed cap. The grip rule still applies; a badly timed burst before a hairpin can lose time.
- Separate simulation state and collision proxies from visual particles, suspension, and camera effects.

Start with non-contact cars: visually identify overlap and avoid opaque stacks, but do not let another player bump someone off their planned path. Equal cars, equal starting charge, shared start distance, and no random performance variation. Use separated cosmetic staging positions, blending onto each route without changing scored distance. Add physical car-to-car contact only if later testing demonstrates a clear benefit.

Rank race finish by simulation crossing time, including within-tick interpolation; show a tie if the resolved difference is beneath the declared precision. During racing, compare canonical checkpoint/sector progress rather than each player’s percentage of their own route, because shortcut and wide-line lengths differ.

Starting tuning values:

| Parameter | First experiment | Desired effect |
|---|---|---|
| Forward thrust | 0.6–0.8 s burst, roughly 5 s recharge from activation | Several useful decisions per race |
| Activation | Tap triggers one burst; a held finger does not auto-fire | Timing beats holding a button |
| Hop | 0.6–0.9 s flight, roughly 14 s recharge | Less frequent and more deliberate than thrust |
| Initial charge | Both abilities ready at the start | Clear, consistent first-race rules |
| Shortcut gain | Approximately 0.7–1.3 s per successful attempt | Worth attempting without guaranteeing victory |
| Failed hop | Checkpoint recovery with approximately 1.5–2.5 s total loss | Failure matters but permits a comeback |

All numbers are provisional. Use automated route replays to compare a careful line, shortest line, fast-everywhere line, wide fast line, shortcut line, and random/constant thrust timing. Use human sessions to confirm readability and enjoyment. Require thoughtful pace and thrust timing to outperform “draw fast everywhere and tap whenever ready” by a meaningful margin, initially around 5% on the benchmark set.

Do not add hidden rubber-banding to time trials. If party assists are later helpful, label and version them and exclude assisted times from comparable records. Never silently retune an existing challenge benchmark; create a new rules version.

**8. Hop and shortcut behavior**

Hop is an explicit player action, with its own recharge indicator. Give the safe route sufficient room to avoid the obstacle entirely. Hop should reward committing to a route and timing the launch, rather than appearing automatically at a trigger.

- Simulate vertical motion with a consistent arcade ballistic arc over a defined flight duration. Continue longitudinal travel along the validated path.
- Keep permitted airborne shortcut corridors approximately straight, with bounded curvature. Do not allow arbitrary steering around a sharp corner while flying.
- Check the car’s swept footprint and height against obstacle volumes throughout the step; a car must actually clear the barrier. Visual elevation alone cannot count as collision avoidance.
- Require a legal landing polygon and acceptable landing heading. Thrust can change horizontal travel during flight, so test combined activations and overshoots explicitly.
- A failed crossing or landing returns the car to its last safe checkpoint, restores corresponding route progress, keeps the clock running, and applies one documented recovery cost. Do not count both a freeze and an extra penalty unintentionally.
- Model shortcuts as explicit branches in the course checkpoint graph. A permitted branch replaces only its designated main-route sector; it cannot bypass arbitrary checkpoints.
- Use persistent takeoff/landing markings and a modest launch cue. In a competitive challenge, any assistance must be consistent for all runs.

Acceptance: an obstacle can be safely driven around; early, late, and missing hops fail consistently; a correctly timed hop succeeds; thrust/hop combinations never tunnel through a barrier or skip a lap; four cars can land concurrently without changing each other’s trajectories.

**9. Corner controls and multitouch UX**

Each occupied corner gets a control pod: a large THRUST pad with a circular recharge indicator and a nearby, distinct HOP pad. Use player numbers and symbols as well as color. Mirror positions and orient labels for players on opposite sides of a tablet. Keep both pads away from screen edges and the home indicator.

Prototype thrust targets around 64–88 CSS pixels and hop targets around 48–56, then check physical size and overlap on actual screens. Target sizes must not shrink below usable bounds to squeeze four players onto a phone. Allocate the track composition around the pods.

Tap-to-burst lets a player tap thrust, lift, then tap hop during that burst; eight simultaneous fingers are not required for four-player play. Permit two fingers per pod when hardware supports it. Require four independent contacts for four-player certification, and stress-test additional contacts without making universal hardware claims.

For the proposed web stack, use Pointer Events and an explicit `pointerId → player/action` binding. Capture each pointer at press, release on up/cancel/lost capture, and do not reassign it merely because a finger slides across another pod. Do not filter to the primary pointer, which would discard other players. Suppress scrolling/selection on the play surface, not the whole information site. Handle cancellation rather than assuming every down event gets an up event. [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)

Before the first multiplayer race, a short “Everyone tap your corner” check establishes ownership and exposes touch issues. Input diagnostics should be available in development builds. On iPad, test system multitasking gestures and Safari chrome; provide recovery guidance when they interrupt play.

Provide visible cooldown feedback, sound cues with mute, reduced-motion options, and clear disabled states. Do not rely on vibration. Menus should be keyboard accessible; offer a fixed-pace drawing assist if useful, with separate records. Keep the first explanation to three actions and teach hop at the marked shortcut.

**10. Art and sound direction**

Visual identity will evolve during development. Start with clean temporary art and central settings for logos, fonts, colors, UI appearance, materials and asset references. Build the playable core while progressively improving presentation through functional, coherent-style, polished-scene and release passes. The execution plan specifies the replaceable presentation architecture and its verification. Cosmetic changes should not require rewriting gameplay; changes to course geometry, physical dimensions or camera usability still need the relevant checks.

Aim for the appeal of a polished miniature 3D racing diorama: an elevated view, readable corners, convincing car motion, warm lighting, attractive terrain, and crisp feedback. Use DrawRace 2 as a quality reference, while creating original environments, UI, vehicles, track shapes, branding, and effects.

Art deliverables for the slice:

- One original roadster mesh, four distinctive paint treatments, simple wheel animation, readable vehicle numbers, a subtle emissive accent, and an optional low-detail mesh.
- One coherent circuit environment with terrain, barriers, curbs, a small prop kit, takeoff/landing markings, and start/finish signage.
- A limited material palette with baked lighting/ambient occlusion, restrained metallic paint, compressed textures, and inexpensive shadows. Avoid expensive real-time reflections and large transparent particle clouds on the baseline tier.
- Thrust shown with a brief compressed-gas-style jet, velocity trail, and restrained camera/audio feedback. Hop gets a clear rising body, moving shadow, and landing cue. These are fictional arcade mechanics rather than engineering claims about a production car.
- Original or properly licensed electric drivetrain, tire, jet, hop, countdown, recharge, and finish sounds. Use a short licensed music bed only if it improves the game; secure trailer rights separately if needed.

Use Blender or the artist’s existing tool to produce GLB/glTF assets for the web path. Retain editable source assets, commercial-use permissions, attribution requirements, and derivative/export rights. Test geometry/texture compression for decode cost as well as download size. Keep source art out of the runtime bundle.

Approve one in-engine beauty view on a real target device before making more props. Use low quality, baseline, and high presets that preserve route readability. Finish the game’s strongest screenshot before creating promotional illustrations; a static mockup is not evidence of playable visual quality.

**11. Architecture and data contracts**

For the recommended web path, use a small TypeScript application, Vite or equivalent build tooling, Babylon for rendering, DOM/CSS for menus and touch pods, and engine-independent simulation modules. Avoid a large UI framework unless the team already benefits from it. Keep per-frame race state out of a UI rerender loop.

State flow: Boot → Capability Check → Menu → Player Setup → Draw Player N → Preview/Confirm → Ready → Countdown → Racing → Results. Pause/recovery is explicit. Race code must not reach directly into menu DOM or storage.

| Module | Responsibility / contract |
|---|---|
| Input | Timestamp pointer/key actions; assign player ownership; emit draw samples and race commands |
| Route compiler | Validate geometry and timing; produce arc-length route and desired-speed samples |
| Track model | Road/shortcut/landing polygons, obstacle volumes, ordered checkpoint graph, bounds |
| Simulation | Fixed-step car progress, grip, abilities, collisions, recovery, finish times |
| Presentation | Car transforms, effects, sound, camera, UI read models |
| Session | Mode, players, race state machine, pause/resume, retry |
| Replay | Compiled routes, tick-stamped actions, build/track/rules versions, optional transform samples |
| Persistence | Versioned local bests/settings with graceful failure |
| Diagnostics | Load timings, frame-time sampling, input trace, error/build information |

Use versioned track data: ID, world units, road and shortcut polygons, start/finish, checkpoint graph, collision/landing volumes, visual asset manifest, and camera bounds. Use versioned tuning data for car and ability settings. Keep track edits independent of UI code.

Seed any randomness and remove it from scored performance. Fixed steps alone do not guarantee bit-identical results across browsers. Establish replay tolerances with device tests; use stored transform samples for faithful visual ghosts if required. A later verified competition should replay submitted commands in a canonical server runtime and validate routes, abilities, timing, and version. Client-side personal bests and screenshots remain unverified.

No backend is necessary for the first challenge: ship its target ghost and rules as static assets and keep personal bests locally. Initial challenge links point to a fixed versioned course; sharing a result can use text or an image. Arbitrary replay uploads, accounts, and global rankings introduce security, abuse, storage, privacy, and verification work and should be separately scheduled.

**12. Proposed repository and agent setup — create only after approval**

Initialize a private Git repository first, with a README, ignore rules, lockfile, runtime version, license decision, and issue templates. Keep production private/public status separate from the game being freely playable. Create small branches and reviewable changes. Use Git LFS or separate asset storage for large source art; do not commit generated caches, dependencies, credentials, or build output.

Proposed structure:

```text
README.md
AGENTS.md
docs/PLAN.md
docs/DECISIONS.md
docs/DEVICE_MATRIX.md
docs/PLAYTESTS.md
docs/ASSET_RIGHTS.md
docs/LAUNCH_CHECKLIST.md
src/input/
src/routes/
src/simulation/
src/rendering/
src/ui/
src/session/
src/persistence/
content/tracks/
content/tuning/
public/assets/
art-source/
tests/simulation/
tests/browser/
tools/
```

Root AGENTS.md should state the product scope, chosen stack, exact local commands, simulation/data boundaries, browser constraints, performance budgets, acceptance criteria, and definition of done. Require relevant checks, updated device evidence for input/rendering changes, small scoped work, no unlicensed brand assets, and no public deployment or posting until separately authorized. Keep instructions concise; add scoped guidance only where useful. Codex recognizes repository AGENTS.md instructions and supports nested instructions. [Official OpenAI instructions documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

Suggested task ownership: developer owns simulation/input/integration; artist owns vehicle/environment; a tester owns the device matrix and facilitated play sessions; founder owns scope, rights decisions, launch messaging, and release approval. If agents are later explicitly authorized, assign bounded issues with file ownership and acceptance criteria; one integrator reviews shared contracts. Do not create autonomous agent swarms as part of setup.

CI for the web implementation: clean install from lockfile, type checks, lint, meaningful simulation/route tests, production build, asset-size report, and browser smoke checks. Use generated PR previews after hosting is authorized. Automated WebKit tests supplement physical Safari; they do not certify iPhone touch, GPU performance, or embedded browsers.

**13. Milestone roadmap, dependencies, and exit gates**

Refined planning estimate: **12–16 calendar weeks** with an experienced developer working substantially full time, a part-time 3D artist, and scheduled device/playtest help. The high-level table below originally allowed about 44 developer working days; the expanded execution plan budgets approximately 51 days before contingency. Reserve approximately 25–35% for optimization, usability changes, integration, and launch preparation. A solo beginner should plan in months, potentially 4–8 or more, rather than treating this as a weekend build. Re-estimate after M1; no dates are committed.

| Milestone | Priority / effort | Concrete tasks | Dependency | Exit gate |
|---|---|---|---|---|
| M0: Product/rights brief | P0 / 3 days | Lock slice rules, sketch track, name/brand options, target devices, art brief, benchmark checklist | Approval to begin | One-page scope and reviewed public-brand direction; borrowed test devices arranged |
| M1: Browser/engine experiment | P0 / 4 days | Repository setup, representative 3D scene, four pads, audio unlock, private device preview, measured engine comparison if warranted | M0; preview hosting authorization | Oldest target iPhone, iPad, and Android pass input/startup baseline; engine decision recorded |
| M2: Draw and race | P0 / 7 days | Capture pace/route, compile/validate line, fixed-step movement, grip penalty, thrust, finish/retry, diagnostic replays | M1 | Route and pace affect outcomes; timed thrust beats indiscriminate input; invalid shortcuts rejected |
| M3: Local party play | P0 / 5 days | Two-to-four turns, hidden routes, corner assignment, touch ownership, ranking, pause/recovery, keyboard fallback | M2 | Four humans complete repeated tablet races with no misrouted input; phone solo/two-player work |
| M4: Hop and course strategy | P0 / 6 days | Vertical hop, swept clearance, legal branch/landing, failure recovery, balancing scenarios | M2–M3 | Safe path and shortcut both viable; no checkpoint bypass; human players understand failures |
| M5: Beautiful vertical slice | P0 / 10 days | Final vehicle/environment, lighting, optimized materials, effects, sound, onboarding, time-trial ghost, challenge benchmark | Engine locked; M2–M4 stable; art production can overlap M2 onward | Shipping-quality view and representative race pass mobile budgets; benchmark version frozen |
| M6: Beta and release hardening | P0 / 5 days | Structured playtests, complete device matrix, load/error analytics if approved, result sharing, rights review, CDN/rollback checks | M5 | Release acceptance table passes; critical issues closed; final art/message review complete |
| M7: Trailer and launch package | P0 / 4 days | Capture real gameplay, edit 30-second film, record tablet group play, draft X/LinkedIn posts, metadata, support/rollback rehearsal | M6 stable release candidate | Trailer matches playable build; concrete launch package ready for approval |

Critical path: device feasibility → route/speed fun → local controls → hop validation → final art/performance → beta → trailer → authorized launch. Track concept and asset-rights work can proceed alongside early engineering; final assets should wait for the engine decision and camera/layout approval.

**14. Release acceptance criteria and testing**

Minimum physical-device matrix: an iPhone 12-class device as the provisional lower tier, a small-screen iPhone such as SE third generation for layout, a recent iPhone, a standard iPad such as ninth generation, a recent iPad, a midrange Android phone such as Pixel 6a/Galaxy A54 class, and a recent Android phone. These are candidate targets, not certified support claims. Record exact model, OS, browser/app version, quality preset, network, and build. Test the current stable OS plus an available prior version; publish support based on actual evidence.

Browser surfaces: Safari on iPhone/iPad; Android Chrome; desktop Chrome, Edge, Firefox, and macOS Safari smoke tests; X and LinkedIn embedded browser entry on iOS/Android; externally opened recovery paths. Add iOS Chrome testing if it is part of the advertised support matrix. Device emulation and cloud screenshots are insufficient for multiplayer touch or thermal tests.

| Area | Required evidence |
|---|---|
| First-use comprehension | At least 8 of 10 new testers finish a solo race without verbal coaching and can explain slow-draw/fast-draw plus thrust recharge |
| Enjoyment | At least 7 of 10 choose an immediate second attempt in a facilitated pilot; inspect comments, not just the percentage |
| Party usability | At least three separate four-person tablet groups finish multiple races without control ownership confusion; total observed setup median ≤90 s |
| Touch reliability | Four simultaneous contacts; 50 press/release cycles per corner with staggered and overlapping actions; zero cross-player activation or stuck state |
| Input interruption | Cancel/lost capture, tab switch, incoming interruption, resize, rotation, and browser edge gesture recover without phantom abilities |
| Route correctness | Start closure, reverse route, skipped gate, sharp smoothing, self-intersection, very sparse samples, pause during drawing, obstacle route, and legal shortcut cases tested |
| Race correctness | Same commands at 30/60/120 rendered fps produce finish times within one fixed tick in the same runtime; cross-browser tolerance separately measured and documented |
| Hop correctness | Early/late/no hop, overshoot, low clearance, thrust in flight, multiple landings, and checkpoint recovery tested |
| Fairness | Same car and charge; canonical progress ranking; no hidden grid-distance advantage; challenge versions and assists separated |
| Performance | Section 5 budgets pass on declared support tiers; 20-minute sessions include repeated redraw/retry and a warm device |
| Loading/failures | Cold/warm cache, constrained network, blocked local storage, failed optional analytics, asset failure, WebGL failure, and old-version cache recovery handled |
| Visual/audio | UI readable with four fingers present, color-independent player identification, mute/reduced motion work, no clipping or masked corner pads |
| Launch integrity | Asset permissions tracked, branding reviewed, production link and social preview tested, trailer footage corresponds to release candidate |

These small playtest samples guide iteration; they do not establish population retention or prove viral potential. Stop for any reproducible lost-player input, broken lap counting, persistent crash, or browser path that falsely appears supported.

**15. Deployment, privacy, and operating plan**

After authorization, use one memorable custom domain, HTTPS, static CDN hosting, and versioned asset filenames. A service such as Cloudflare Pages is a plausible starting point; verify current service terms, bandwidth treatment, and file limits at setup. Cloudflare Pages currently documents a 25 MiB maximum individual asset; oversized Unity data/Wasm files may require another asset host or deployment design. [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

Create separate private/staging previews and production. Cache hashed assets for a long time while revalidating the entry document and version manifest. Retain the previous known-good release and rehearse rollback. Avoid service-worker caching for the first launch unless there is a demonstrated need; stale application/assets mismatches can cost more than optional offline support initially.

For Unity, validate native compression response headers, avoid double compression, and return `application/wasm` for Wasm streaming. Test over actual HTTPS from the production host. Add cross-origin isolation headers only when the selected implementation needs them and all external resources have been checked. [Unity deployment documentation](https://docs.unity.com/en-us/engine/6000.5/manual/platform-specific/webgl/building-distribution/deploying)

Keep a lightweight landing page and compatibility message available if the game has problems. Do not autoload the promotional film into the game’s critical download path. Add correct title, description, social preview image, favicon, and challenge deep link. Test link previews through actual X/LinkedIn drafts before launch.

If analytics are authorized, collect only practical events: landing loaded, game ready, drawing started/confirmed, race started/finished, retry, challenge selected, share action, fatal error, and coarse performance tier. Distinguish share-button clicks from confirmed posts or received visits. Record build/track/rules versions and coarse device categories; avoid fingerprinting, raw touch trails, and unnecessary identity. Define retention, privacy notice, deletion/contact handling, and jurisdictional consent requirements before enabling a provider.

Initial records can stay on-device. If a public leaderboard is later approved, add canonical replay verification, submission rate limits, validated names, moderation, storage budgets, and abuse controls. A signed client result or hidden endpoint is not proof that a time was legitimately earned.

Set a founder-approved hosting/analytics operating ceiling, budget alerts, and a response plan for unusual traffic before promotion. Model cold-download traffic: 100,000 first visits at 10 MB each is approximately 1 TB of delivered data before replays or video. Free access to players does not make bandwidth, assets, legal review, or labor free.

Budget work before commissioning: developer effort, approximately 10–20 artist days as an initial allowance, sound/music rights, borrowed/rented device access, brand/IP review, domain/hosting, and trailer editing. Obtain actual quotes after the engine experiment. If Unity is selected, verify organizational eligibility and client/funding rules rather than assuming a free game qualifies for a free editor tier. [Unity licensing rules](https://unity.com/pages/license-compliance)

**16. IP, branding, and public claims**

Treat “Roadster Race” as a working name until clearance. Before public release, have qualified counsel in the intended launch markets review the title, recognizable vehicle design, Tesla/SpaceX references, proposed Elon Challenge naming, and promotional language. Do not infer clearance from a web search or a disclaimer.

The U.S. Copyright Office distinguishes ideas/methods from protected expression. That supports designing an original game around a general draw-and-race concept; it does not authorize copying DrawRace 2’s art, UI expression, tracks, audio, code, or distinctive presentation. Assess any relevant patents separately if counsel identifies a concern. [Copyright Office guidance](https://www.copyright.gov/help/faq/faq-protect.html)

Trademark analysis includes confusion about source or sponsorship; famous marks may raise additional dilution issues. Free distribution and an “unofficial” label are not automatic permission. Recognizable product appearance may require review even without a logo. A named celebrity challenge can raise separate endorsement/personality questions depending on jurisdiction. [USPTO infringement guidance](https://www.uspto.gov/page/about-trademark-infringement)

Practical launch default: original vehicle and identity; no Tesla T, SpaceX logo, copied Roadster model, official-looking Tesla typography/site design, Elon portrait/voice, or claim of affiliation. Keep branding configurable so reviewed references can be added or removed without touching gameplay. If a closely recognizable Tesla vehicle is essential, pursue permission and review that specific treatment before publication.

Describe hop/thrust as fictional arcade interpretation. Do not present the game as validating real vehicle specifications, availability, safety, or production capabilities. Tesla’s current Roadster page qualifies optional configurations and regional availability; re-check official claims immediately before any comparison in public copy. [Tesla Roadster](https://www.tesla.com/roadster)

Keep an asset-rights ledger: author/source, original license, acquisition proof, allowed game redistribution, modification rights, trailer/social rights, attribution, and review date. Ensure commissioned contributors assign or license the required rights. Record any required unofficial-project statement, while recognizing that it does not replace permission where needed.

**17. Authentic trailer and launch strategy**

Launch objective: maximize the chance that a viewer understands the mechanic, opens the link, has fun, and shares a real result. Reaching Elon is possible through audience overlap and voluntary sharing; neither timing nor a tag guarantees attention or a play session.

Record the final 30-second trailer only after the release candidate passes mobile gates. Use actual shipping gameplay, plus a brief filmed tablet interaction if helpful. Retain an uncut source take, build ID, device, and capture settings. Do not advertise a desktop-only high-quality view as phone gameplay, use generated footage as evidence, or hide the central mechanics behind cinematics.

| Time | Shot / message |
|---|---|
| 0–3 s | Start with a real close finish or successful hop: immediate motion and stakes |
| 3–8 s | Finger draws a line; slower corner and faster straight are visible |
| 8–12 s | Other player colors appear, countdown begins; compress planning with clear edits |
| 12–20 s | Four cars race; corner thrust flashes show timing and an overtake |
| 20–25 s | One car takes the hop shortcut while another follows the safe route |
| 25–30 s | Finish/result, “Draw. Thrust. Hop.” and readable play URL / challenge invitation |

Make a clean landscape master and mobile-feed crops with captions and enough room to preserve the track and controls. A short clip can demonstrate the hook, while the full trailer proves a complete playable loop. Test muted viewing and compression before posting. Use real friends’ reactions only with their permission.

Suggested launch sequence:

- **T−14 to T−7 days:** private beta with 15–30 people spanning racing fans, casual players, Tesla/EV enthusiasts, and people unfamiliar with the idea. Fix observed failures before promotion. Collect permissioned feedback and a few real benchmark attempts.
- **T−7 to T−2:** show a short development clip and ask a concrete gameplay question. Invite voluntary early players through communities whose rules allow it. Prepare the press kit: gameplay film, screenshots, one-sentence pitch, link, creator contact, compatibility note, and factual project story.
- **T−2:** freeze rules/target, run a production smoke test, verify social metadata and analytics, check traffic budgets, and prepare rollback. Review named-person/brand copy. Present the final build, trailer, and posts for launch approval.
- **Launch day, X:** one clear native gameplay video and a direct playable link in the post or visible follow-up. State it is free and works from a browser; show the draw/thrust/hop hook. A single respectful invitation to @elonmusk can fit reviewed copy. Pin the playable post. Avoid repeated tagging, engagement bait, or mass unsolicited DMs.
- **Launch day, LinkedIn:** use the same authentic footage with a maker’s story: the drawing mechanic, the technical challenge of mobile web, and an invitation to try a short race. Keep the playable link easy to find. Avoid unsupported claims about platform algorithms or guaranteed reach.
- **Next 48–72 hours:** respond to feedback, fix serious issues, share permissioned player clips or a documented new record, and explain one interesting design choice. Do not post repetitive reminders just to seek attention.
- **Days 7 and 14:** review the funnel and qualitative feedback. If people click but cannot play, fix compatibility/loading. If they play once and stop, fix gameplay/onboarding. If they repeatedly retry, consider a second circuit or weekly challenge before paid promotion.

Draft messaging direction, to finalize after footage and rights review: “I made a free racing game where you draw the line, time the thrust, and jump the shortcut. Play solo or race friends on one screen. Can you beat the developer time?” Add any direct Elon invitation as a separate, accurate invitation; never imply he has already participated.

Measure loaded-to-ready conversion, ready-to-first-finish, time to first race, immediate retry, returning visits where measurement is lawful and proportionate, challenge attempts, and incoming visits from shared links. Initial hypotheses: ≥70% of supported-device ready sessions finish a first race and ≥30% of finishers retry in the same session. Assess these after at least roughly 100 qualified sessions, with mode/device/source breakdowns and honest uncertainty. They are product diagnostics, not viral guarantees.

**18. Risks, decisions, and first authorized work package**

| Risk | Early signal | Mitigation / decision trigger |
|---|---|---|
| Slow or unstable iPhone web build | Cold-load abandonment, reloads, long frame stalls in M1 | Reduce assets/material cost; reassess engine before production art |
| Four players cannot comfortably use target screen | Hands cover track; incorrect pod presses | Tablet showcase; test pod geometry; prioritize phone solo/two-player UX |
| Drawing fast everywhere dominates | Benchmark route beats deliberate pacing | Fix grip penalties and speed mapping before adding effects/content |
| Hop is confusing or unfair | Players cannot explain failures; shortcut always dominates | Clear corridor/landing cues; tune reward/cost; keep safe route competitive |
| Engine debate delays shipping | Multiple unfinished prototypes | Bounded representative experiment; freeze decision after measured gate |
| Branding blocks launch | Unclear rights, official-looking presentation | Original vehicle/identity; reviewed neutral challenge name; configurable references |
| Shared times are cheated | Implausible screenshots or client-modified results | Label local times unverified; defer verified public leaderboard |
| Social traffic breaks delivery or exceeds budget | Errors, asset throttling, cost alerts | Static CDN, small assets, tested limits, budget alerts, rollback/fallback page |
| Scope expands before the core works | More tracks, online mode, upgrades | Hold P2/Later backlog until P0 release gates pass |
| Gameplay is attractive but not replayable | Few voluntary retries | Iterate route/speed/thrust decisions with new testers before launch spend |

Recommended decisions for approval: browser first; one coastal circuit; original brand/car pending rights review; provisional Babylon/TypeScript/WebGL 2; fixed-step arcade simulation; non-contact cars; separate tap-to-burst thrust and hop; two-lap default; tablet-focused four-player showcase; no accounts or public leaderboard; native iOS after demand.

First implementation package, **only after the user authorizes development**:

1. Create the repository, README, concise AGENTS.md, decision log, device checklist, and locked toolchain.
2. Build the representative circuit scene and four independent corner pods; add a small input/performance diagnostic overlay.
3. Create a private HTTPS test build after preview-hosting authorization and test physical iPhone/iPad/Android devices, including embedded-browser entry paths.
4. Deliver an evidence-based engine decision and adjusted performance budgets.
5. Implement one player drawing one complete lap with preserved pace, automatic racing, thrust, results, and immediate retry.

The first reviewable development delivery should be a measured device demo and a one-player draw-and-race loop. Final art, hop content, additional modes, and public marketing follow their milestone dependencies. Development authorization does not itself authorize public posting or launch; bring the finished build and launch package back for that decision.

For native iOS later: first compare browser demand, repeat play, performance limitations, and support burden. With Unity, reuse substantial gameplay/art while reworking platform integration and certification. With the proposed web stack, evaluate whether a packaged web experience meets the goal; a wrapper is not a native rewrite or an automatic performance improvement. A true native port needs its own engineering estimate, macOS/Xcode build/signing access, physical-device testing, Apple distribution setup, and a TestFlight phase before an App Store decision. The present Windows workspace is sufficient for web development but is not the complete native-iOS toolchain. [Apple distribution overview](https://help.apple.com/xcode/mac/current/en.lproj/devac02c5ab8.html), [Apple TestFlight workflow](https://help.apple.com/xcode/mac/current/en.lproj/dev2539d985f.html)
