Roadster Race — detailed execution plan
======================================

Status update, October 20, 2026: the user authorized the bounded one-player prototype, which is now implemented in this workspace. See README.md and docs/VERIFICATION.md for the runnable project and evidence. This broader development/launch plan remains a roadmap; later multiplayer, hop, challenge and launch work has not been implemented. All unmeasured speeds, timings, quality budgets, and schedule estimates below remain hypotheses.

**1. The outcome we are building**

Release one free, attractive, browser-playable 3D racing game that a person can understand from a short clip and play through a link. Players draw both a route and an intended pace, then watch their cars follow those plans while they choose when to activate forward thrust and hop. One device supports one to four local players. The first circuit must support repeated attempts through interesting decisions, readable feedback, and a short retry loop.

The first release contains one circuit, one vehicle with four player identities, a two-lap race, sequential drawing, rechargeable thrust, a less frequent hop, an optional shortcut, solo time trial, a developer benchmark challenge, local personal bests, results, and lightweight sharing. The “Elon Challenge” is a proposed invitation and marketing treatment, subject to review; it is never a claim that Elon participated. The same challenge can launch under the neutral title “Roadster Challenge.”

Four-player local play is a defining feature and will receive real group testing. Its hero demonstration is a tablet on a table. Phones receive a polished solo and two-player experience, with higher player counts available only where layout and touch tests pass. No remote multiplayer is implied by the word multiplayer.

The release package is complete when the game, public-facing information, deployment configuration, support instructions, approved art/branding, and authentic 30-second gameplay trailer are all ready together. Becoming popular or reaching Elon is an ambition; the controllable deliverable is a compelling, reliable game and a credible launch.

**2. Non-negotiable product requirements and adjustable decisions**

| Requirement | Meaning in the release | Evidence |
|---|---|---|
| Minimal access friction | HTTPS link, no installation/account, no mandatory long tutorial | New user reaches drawing from the landing page through Play and mode selection |
| Real 3D presentation | Original vehicle/environment, lighting, depth, readable motion | Actual target-device gameplay capture |
| Drawn speed matters | Different drawing tempos create different pace profiles | Controlled route tests and new-player explanation |
| Drawing a good line matters | Length, curvature, legality, and chosen shortcut affect time | Benchmark route set and human improvement |
| Live thrust matters | A timed burst can win time; careless use can lose it | Strategy comparison and visible race feedback |
| Hop matters selectively | One optional challenge rewards timing, while the safe road remains valid | Safe and shortcut route completion tests |
| Four independent players | Simultaneous actions never control someone else's car | Four-person physical-device sessions and input trace |
| Fair solo comparison | Same track/rules/assists for comparable times | Versioned results and saved developer benchmark |
| Free to play | No payment, ad gate, currency, or account requirement | Final journey review |
| Honest promotion | All gameplay claims visible in the released build | Trailer/source/build comparison |

Adjustable after evidence: one versus two laps, burst/recharge timings, hop height, corner penalty strength, drawing sensitivity, art density, camera framing, and supported device floor. Do not change these merely to meet a calendar date. Record what changed, why, and which prior benchmark or test needs rerunning.

User direction: the visual identity must be easy to improve throughout development. Final logos, fonts, colors, vehicle appearance, and environment art are not prerequisites for starting the playable prototype. Establish a simple, coherent temporary presentation and central controls for appearance from the beginning. Review visual improvements in the running game as mechanics develop.

Deferred work: a second track, car upgrades, damage, car-to-car physics, dynamic random obstacles, online races, global verified rankings, user accounts, AI opponents beyond ghosts, daily content, native iOS, and advanced replay video export. Maintain a later backlog so promising ideas do not silently become launch requirements.

**3. Team, capacity, and working schedule**

The working assumption is one experienced developer substantially full time, a part-time 3D artist, access to a tester/facilitator and physical devices, and the founder available for product decisions. The founder can also fill test/production roles. AI assistance can reduce implementation effort; it does not replace device access, hands-on playtesting, art judgment, or rights decisions.

The earlier roadmap's 10–14 weeks is an optimistic target. Use **12–16 calendar weeks as the working planning range** for the complete package, allowing roughly 48–55 engineering days plus 25–35% uncertainty. Art, testing, and launch work overlap where practical. A novice working alone or part time needs a separate estimate after the first prototype. These are effort allowances, not a delivery commitment.

| Role | Main responsibility | Availability assumption |
|---|---|---|
| Founder/product owner | Scope, visual taste, access to testers/devices, budget and public-launch decisions | Two short reviews each week; prompt answers to real blockers |
| Developer/integrator | Input, route compilation, simulation, UI integration, build, diagnostics, releases | Roughly 4–5 focused days per week |
| 3D artist | Vehicle, circuit, materials, lighting collaboration, export-ready assets | Approximately 10–20 artist days, refined after the art brief |
| Tester/facilitator | Repeatable device runs, observation, bug reports, group sessions | Scheduled sessions from the first prototype onward |
| Audio/video contributor | Licensed sound treatment and honest trailer edit | Limited engagement after the mechanics and visuals stabilize |
| Rights adviser, when needed | Specific proposed name, vehicle, brand/person references, asset licenses | Early review of direction and final public package |

Budget using explicit line items rather than a guessed total: developer days × agreed rate; artist days × quote; audio/music permissions; trailer editing; device borrowing/rental; domain and hosting; rights review; and contingency. Obtain quotes against the actual asset list. Set an operating ceiling before launch, including what happens if traffic greatly exceeds expectations.

Weekly cadence: one playable demonstration, a short written evidence report, a triage of the largest problem, and a scope check. Keep work in progress small: one major engineering feature and one art package at a time. A review ends with a decision, not a new unprioritized list of ideas.

**4. Decision register**

| ID | Decision | Proposed default | Decision deadline | Evidence that can change it |
|---|---|---|---|---|
| D01 | First distribution | Browser link | Before setup | Only an explicit change to the product objective |
| D02 | Rendering/game stack | TypeScript + Babylon.js + WebGL 2 | End of browser experiment | Measured failures, team expertise, or stronger near-term native requirement |
| D03 | Initial circuit | Coastal Launch Circuit | Before route implementation | Readability and safe/shortcut geometry tests |
| D04 | Race duration | Two laps, typical 40–50 seconds | First playtest | Setup fatigue, insufficient decisions, or too much waiting |
| D05 | Car interactions | Non-contact racing | Before simulation | Repeated evidence that contact improves the planned-route experience |
| D06 | Ability interaction | One tap triggers one burst; separate hop tap | Before touch prototype | Confusion, physical accessibility, or poor timing control |
| D07 | Difficulty | Same physics for all; labeled assists only | Before first benchmark | New-user failure that cannot be fixed with clearer feedback |
| D08 | Brand/vehicle | Original identity and roadster design | Before final asset commission | Specific permission and review supporting a branded treatment |
| D09 | Challenge identity | Developer target; neutral title available | Before promotional capture | Reviewed naming and truthful messaging |
| D10 | Public records | Local personal bests; no global leaderboard | Before modes | Explicit later scope with verification/abuse budget |
| D11 | Device support | Measured tiers, tablet-first group showcase | End of beta | Real device failure/success data |
| D12 | Native iOS | Reconsider after web usage evidence | Postlaunch review | Repeat play, explicit demand, or browser limits justify investment |

Decision records contain: problem, options considered, measured evidence, decision, consequences, owner, and revisit trigger. Routine implementation choices within an approved work package do not need new approvals. Escalate material scope changes, unapproved spending, and external actions outside existing authorization.

**5. Exact player flow and screen specification**

| Screen/state | Visible elements | Player action | Exit condition and failure behavior |
|---|---|---|---|
| Landing/boot | Title, real game image, Play, concise browser/device note, mute/settings access | Tap Play | Start audio from the gesture and load required assets; show real progress or status |
| Compatibility | Clear loading state; recovery message only if necessary | Retry or use suggested browser | Explain a detected failure without a blank canvas; preserve challenge URL |
| Mode choice | Solo, Friends, Challenge; brief description | Choose mode | Solo/Challenge proceeds to drawing; Friends proceeds to player setup |
| Player setup | 2/3/4 players, corner identities, tablet guidance when relevant | Choose count and tap corner | Confirm usable controls; return to count choice if layout cannot support selection |
| Drawing turn | Whole circuit, player's identity, start marker, pace legend, Redraw, short instruction | Draw one closed lap | Validate route on completion; highlight invalid segment with a specific explanation |
| Preview/confirm | Route and pace, optional moving preview, Confirm and Redraw | Confirm | Lock this route and move to next player or Ready |
| Ready | Occupied corners, ability legend, “Ready” state | All selected players acknowledge | Begin countdown when ready; provide a single-device fallback if simultaneous acknowledgement is awkward |
| Countdown | 3–2–1, cars, subdued pads | Observe | Start scoring at the same simulation tick; taps before Go do not pre-activate |
| Racing | Whole circuit, car identities, lap/progress, corner thrust/hop recharge | Tap abilities | Continue to finish; keep feedback near relevant car/pod |
| Pause/recovery | Reason, Resume and Restart | Resume | Clear old pointers and use a short countdown; restart gracefully if state is unrecoverable |
| Results | Rank/time, best comparison, factual performance feedback, Retry, Redraw, Share | Choose next action | Retry reuses routes; redraw follows mode-specific turns; sharing is optional |

For solo retry, target one action and a countdown without a menu detour. For Friends, let the host select “Same lines” or “Everyone redraw.” Hide previously drawn lines during the next player's turn. Do not require names or typing before a first race; player numbers/colors are enough.

Starter UI copy: “Draw slowly through turns. Faster on straights.” / “Tap thrust when your charge is ready.” / “Draw through the shortcut, then hop the barrier.” / “That line missed checkpoint 3.” / “Finish your line near the start.” / “Your jump landed outside the marked area.” Validate the wording with new players rather than assuming technical accuracy makes it understandable.

Use a clear player number plus color and pattern everywhere: car, line, pod, rank, and result. Keep accessibility options concise: mute, reduced motion, high-contrast identities, and optional fixed-pace assist with separate records. Keyboard access should cover menus and desktop racing. A complete nonvisual equivalent of spatial line drawing would be a separate accessibility design task; do not claim it exists without one.

**6. Circuit design and layout specification**

The circuit contains an opening sweeper, a thrust straight, a braking hairpin, and a final chicane with a short hop corridor. A safe route remains wholly drivable. Keep the main racing surface approximately flat for the first version; terrain outside the track can have richer 3D relief. This makes drawing projection and hop clearance easier to reason about.

Design rules:

- Road width should support several visibly distinct lines. Begin around four to five car widths and refine on the actual display.
- The straight must give enough time to recognize recharge and intentionally tap before the hairpin. Do not make the best activation a sub-frame guessing game.
- The shortcut is a visible authored branch. Its approach, barrier, and landing zone are identifiable before drawing.
- Avoid a decorative bridge or tunnel that hides cars or introduces ambiguous layered road selection in the first circuit.
- Position the highest-information corner and shortcut away from fingers resting on the control pods.
- Show the whole circuit throughout scoring. Frame it on the actual smallest supported landscape viewport, including browser chrome.
- Choose finish-line placement so a final thrust duel is possible and results do not obscure the remaining cars.
- Freeze collision geometry before final decorative detail. Visible barriers must match collision boundaries closely enough that failures feel fair.

Required course data: stable ID/version; world scale; start/finish gate and forward direction; drivable polygons; ordered checkpoint graph; branch entry/exit gates; shortcut flight corridor; takeoff/landing polygons; obstacle footprints/heights; recovery anchors; camera bounds; and visual asset references.

Checkpoint branch example: main route A → B → C → D; permitted shortcut A → S → D. The branch is explicitly authorized only between A and D. Merely crossing D after leaving the road elsewhere does not make a valid lap. Use the same course model for route validation, race progress, and debug visualization.

Track approval needs three artifacts: a readable top-down diagram, an in-engine view at the actual camera, and a timing comparison of at least three legal lines. A beautiful environment cannot compensate for a route that has only one sensible strategy.

**7. Route and drawing-speed specification**

The route compiler produces two things: a smooth legal path parameterized by distance, and a desired-speed profile indexed by that distance. Keep timing data through processing; a geometry-only spline is insufficient.

| Step | Proposed behavior | Acceptance condition |
|---|---|---|
| Capture | Record pointer identity, ground position, monotonic timestamp, and stroke status | Only the drawing player's active stroke contributes samples |
| Coordinate mapping | Convert viewport coordinates to the fixed track ground plane | A corner drawn at different display sizes maps to the same course region |
| Cleanup | Remove duplicates and bounded jitter; identify long missing-data gaps | Slow deliberate corners remain; large gaps do not create invented shortcuts |
| Timing | Derive local distance/time before geometry resampling | A slow gesture retains a slower desired pace |
| Smoothing | Apply bounded curve fitting with car-width/road-boundary awareness | The compiled curve cannot cut a wall even if raw points were legal |
| Resampling | Sample at regular path distance and preserve timing association | Movement and curvature do not depend on raw event frequency |
| Speed mapping | Apply one global tunable mapping to normalized drawing pace | Players' overall pace differences are preserved |
| Validation | Check loop closure, direction, corridor clearance, checkpoint order, branch legality | Invalid routes are rejected with a specific location/reason |
| Preview | Display pace and geometry together | Player can explain which sections will be faster before racing |

Normalize drawing distance by a consistent track reference length. Define drawing pace as track-relative distance per second, then map a shared lower/upper pace range to the game's minimum/maximum intended speed. Do not choose limits separately for each player's stroke. Set physical/game speeds from desired lap duration and course scale, not advertised vehicle specifications.

Long stationary samples should imply a low intended pace within sensible bounds, not permanent zero velocity. Interrupted or missing data should trigger redraw guidance. Do not silently convert poor sampling into maximal speed. Keep route closure small and bounded; automatically joining half a circuit defeats the input mechanic.

First version stroke rule: start inside the start region, draw a complete lap in the correct direction, and lift to submit. Lifting early gives a highlighted incomplete route and Redraw. Fine-grained path editing and drawing multiple disconnected segments are deferred. If usability tests show too many accidental early lifts, test a simple Continue action before committing to a full editor.

Compile a continuous seam at the lap boundary and verify position, tangent, and speed-profile continuity. Store compiled-route version and source track/rules version. Reject or migrate incompatible saved routes explicitly after updates.

Route test fixtures: straight line, rounded corner, tight corner, deliberate slow-fast-slow stroke, repeated timestamps, duplicate positions, large time gap, early lift, almost-closed loop, reversed lap, skipped gate, line touching a barrier, smoothing overshoot, self-intersection, legal shortcut, unauthorized cut, and seam wrap. Include mouse, sparse touch, and high-frequency touch traces.

**8. Race simulation and ability rules**

Use an engine-independent 60 Hz simulation. Rendering reads interpolated snapshots. Input events enter an ordered queue with player/action/tick data. During normal racing, elapsed race time is simulation time; visual animation cannot change finish timing. If the page experiences a major interruption, pause/recover instead of silently granting a player a timing advantage.

Proposed update order for every tick:

1. Read commands scheduled for this tick and validate player/state eligibility.
2. Advance ability and recovery timers under the defined rules.
3. Activate eligible thrust/hop commands once; reject unavailable commands with feedback, without buffering them for later surprise activation.
4. Compute the desired speed at current route distance, bounded acceleration/braking, and active thrust contribution.
5. Evaluate curvature/grip stress and any resulting skid/recovery effect.
6. Integrate longitudinal progress and vertical hop state.
7. Test swept obstacle/landing boundaries and checkpoint crossings along movement.
8. Resolve recovery or finish events, interpolating a within-tick crossing time where appropriate.
9. Emit presentation events and the snapshot used by rendering/UI/replay.

Car state: route distance, lap, canonical course progress, current speed, desired speed, grip stress/skid state, thrust active/ready times, hop phase/ready time, recovery state/anchor, penalties, and finish record. Effects such as smoke and camera shake never own gameplay state.

**Speed and grip.** Approach the drawn desired speed using bounded acceleration and braking. Estimate lateral acceleration from speed squared times route curvature. Accumulate sustained excess beyond a tunable grip threshold; trigger readable speed loss and recovery. Add hysteresis/decay so noisy curvature does not flicker between states. The exact severity is a balance experiment. Automatic perfect corner-speed clamping is unacceptable because it can erase the value of slow drawing.

**Thrust.** Start with a 0.7-second burst and a 5-second recharge measured from activation. One press produces one burst, with no auto-repeat while held. Pressing while unavailable gives clear cooldown feedback and consumes nothing. All cars begin ready. A finished or recovering car cannot activate. Thrust adds forward acceleration with a cap and does not override corner grip penalties.

**Hop.** Start with a 0.75-second flight and a 14-second recharge measured from activation. Use a symmetric height arc, for example height proportional to 4 × peakHeight × normalizedFlightTime × (1 − normalizedFlightTime). This is an arcade model with tunable peak height, not a real Roadster claim. A second hop cannot retrigger in flight. Horizontal motion continues; thrust can affect how far the car travels during the hop.

**Combining abilities.** A player may tap thrust, release, then tap hop during the burst. Both may activate in the same tick if both are ready. Combined use must still pass obstacle and landing checks. The corner interface does not require two simultaneous fingers per player.

**Failure and recovery.** On collision or invalid landing, move back to the last valid recovery anchor and its corresponding route/checkpoint state. Keep the clock running. Begin with a total recovery loss around two seconds; distinguish stationary recovery time from added time so the penalty is not accidentally counted twice. Cooldowns continue during recovery. The car rejoins through the same rules as every other player.

**Ranking and ties.** Rank live progress by canonical course sector and progress within it, not percentage of each car's differently sized path. Finish times use crossing interpolation. Times beneath the declared display/measurement precision produce a tie rather than an arbitrary player-index winner. Store greater internal precision than the displayed hundredths.

**Non-contact cars.** Vehicles do not physically displace each other. Use outlines, small identity markers, and thoughtful draw order to keep overlaps readable. Cosmetic start-grid offsets must not change distance, charge, or scoring time. Do not show a vehicle teleporting onto the route at Go.

**9. Multitouch, interruption, and display rules**

Each corner pod has a large THRUST target and a separate HOP target. The large action has a charge ring; the hop action uses a distinct shape/icon and charge state. Top-corner labels can rotate for players on the opposite side. Identity and action meaning must remain clear in a filmed four-person demonstration.

Begin at roughly 64–88 CSS pixels for thrust and 48–56 for hop, then evaluate physical reach and finger coverage. The route/camera layout must leave room for the pods. Fullscreen is optional; portrait shows a simple landscape prompt while retaining menu access. Do not shrink controls indefinitely to fit a small screen.

Bind each pointer to the player/action where it began, and hold that ownership until up/cancel/lost capture. Sliding into another pod does not transfer control. Additional pointers are independent. The primary-pointer flag must not disable other players. Suppress page gestures only on the game interaction region and keep ordinary page controls usable.

Distinguish two kinds of interruption. A canceled pointer clears that pointer and prevents stuck interaction; an already accepted tap burst remains a completed command. Focus/visibility loss or a substantial viewport interruption pauses the race, clears all pending pointer ownership, and resumes with a countdown. This refines the earlier roadmap: ordinary pointer cancellation alone does not need to pause everyone.

Stress cases: all four players press together; two release while two remain; rapid alternating thrust/hop; one finger slides off; a fifth/eighth contact appears where supported; input arrives during countdown/results; a finger rests during rotation; OS gesture cancels a touch; browser toolbar changes viewport; tab hides while airborne; keyboard repeat occurs; and the device resumes after a long suspension.

Keep a development-only input overlay with player ID, pointer ID, action, activation count, and cancellation count. Use event traces to diagnose ownership errors, while measuring visible response on physical hardware. A browser automation click is insufficient evidence of four-person input correctness.

**10. Architecture, data, repository, and agent working agreements**

Separate input, route compilation, pure simulation, presentation, session flow, local persistence, and optional telemetry. The rendering engine should not be imported into the route/simulation rules. This enables fast headless tests and makes a future port more tractable without promising a free rewrite.

**Replaceable visual identity is part of the initial architecture.** Use one small presentation configuration, a shared set of UI style values, and an asset manifest. These are ordinary project files managed during development; a full theme editor, CMS, runtime skin marketplace, or arbitrary modding system is outside the first release.

The presentation configuration identifies the current title/logo, fonts, palette, UI surface/button styles, icons, and scene appearance preset. Shared style values cover typography, spacing, corners, borders, and feedback states. Use semantic names such as playerOne, surface, text, thrustReady, and hopUnavailable instead of scattering literal colors through screens. Components should reference those names. A consistent player identity must appear on the car, route, controls, and results.

The asset manifest maps stable roles such as logo, roadster, trackSurface, roadsideProps, and thrustEffect to the current asset files. Gameplay refers to roles and simulation state, not particular filenames or mesh names. Retain an inexpensive placeholder for each essential role so missing or unfinished art does not stop development. Do not bake a logo into every screen background or into unrelated textures.

| Change | Planned way to make it | Checks still required |
|---|---|---|
| Logo, title, menu artwork | Replace referenced file/text in presentation configuration | Aspect ratio, legibility, loading and social metadata |
| Fonts and text hierarchy | Change shared font/type settings with a fallback font | Reflow, button labels, loading, smallest supported screen |
| Colors and interface appearance | Change semantic style values and shared components | Contrast, player differentiation, hit-target sizes |
| Car paint and track materials | Replace material/texture references | Visual readability, download and GPU cost |
| Vehicle mesh | Replace the visual asset through a documented asset adapter | Scale, facing direction, wheel pivots, effect sockets, silhouette/collision agreement |
| Props, sky and lighting | Update scene appearance data and referenced assets | Visibility, shadows, frame time and memory |
| Thrust/hop effects | Replace visual effects subscribed to simulation events | Timing clarity, overdraw and reduced-motion behavior |
| Camera angle or framing | Change presentation settings within tested constraints | Drawing projection, touch layout, visibility and usability |
| Road width, shortcut or physical car size | Change course/rules data deliberately | Route/collision tests, balance, and track/rules version |

Keep vehicle collision geometry and course navigation data separate from decorative models, while maintaining a fair visible match. Replacing paint or a logo should not alter physics, scoring, or stored bests. A change to physical dimensions, road layout, ability timing, or collision needs gameplay validation and potentially a new rules/track version. Camera and lighting changes can be central configuration edits but still have usability/performance consequences.

Acceptance for this architecture: demonstrate two temporary visual configurations using the same race fixture. Swap logo, font, palette, car paint, and track material without editing simulation/input rules; finish time and checkpoint behavior remain identical. Check layout/readability and load/frame budgets after the swap. This is a small proof of replaceability, not a requirement to produce two finished art directions. A simple developer preview showing title, controls, results, and a car/track view is optional if it speeds repeated visual reviews.

| Contract | Required contents | Validation |
|---|---|---|
| Track definition | Version, geometry, gates/branches, obstacles, landing/recovery regions, camera bounds | Geometry and checkpoint consistency checks |
| Compiled route | Version, track ID, samples by distance, tangents/curvature, speed profile, branch choice | Closure, finite values, monotonic distance, legal corridor |
| Rules definition | Speed mapping, acceleration/braking, grip, abilities, lap count, assists | Bounded values and version identity |
| Race command | Player, action, intended tick, sequence | Valid player, legal action/state, bounded frequency |
| Race snapshot | Tick/time and car states | Read-only presentation view; finite values |
| Result | Mode, track/rules/build, assists, time, finish/penalty details | Never compare incompatible categories |
| Replay/ghost | Routes/commands/versions and optional sampled transforms | Compatibility check; no unbounded allocations |
| Settings/save | Schema version, preferences, bests, selected options | Graceful handling of missing/corrupt/blocked storage |

Proposed repository layout follows the roadmap: source modules, versioned content, runtime assets, editable art sources, tests, tools, and concise documentation. Initialize Git only after development authorization. Keep generated files/caches out of version control, keep credentials out entirely, and record asset provenance. Decide repository visibility and license explicitly; a free game does not require publicly releasing its source.

Proposed commands to implement with the chosen toolchain: development server; type check; lint; simulation/route test suite; browser smoke suite; production build; asset-size report. Document the real commands once they exist rather than claiming this plan's names already work. CI runs a clean install, relevant checks, production build, and size reporting.

AGENTS.md content should define: the one-circuit scope, the selected stack, commands, module boundaries, gameplay invariants, evidence requirements, performance budgets, asset rules, and how to report unresolved problems. Ask agents to deliver one issue-sized change at a time with tests and a concise explanation. Require human-device evidence where automation cannot establish success. Public launch and external communication follow the user's authorization. Repository instructions are a recognized Codex mechanism. [Official AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

Do not spawn or configure parallel agents merely because this plan discusses roles. If the user later authorizes delegation, start with independent tasks such as route tests, input review, or asset auditing; give each a contract and file ownership, and keep one integrator responsible for consistency. A second agent's review complements tests and device evidence.

Definition of done for an engineering issue: acceptance behavior demonstrated; relevant tests pass; no known introduced crash/input/route defect; performance impact measured if applicable; documentation or data version updated when needed; and no unrelated scope added. An attractive screenshot alone does not close a gameplay issue.

**11. Prioritized implementation backlog**

The following 53 tickets describe the broader roadmap, not a claim that the full release is complete. The authorized initial prototype now covers portions of the foundation, route, simulation, input diagnostics and presentation work; refer to the implemented prototype's verification record. P0 means required for the first public release or a prerequisite; P1 means valuable but removable if it delays the core release. Owner refers to the accountable role, not an assumed hired person. Engineering allowances total approximately 51 days before contingency; estimates should be replaced after discovery. Split any ticket that proves too large for a small reviewable change.

**E0 — Scope, resources, and evidence plan. Allowance: 2 developer days plus founder time.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-001 | P0 / Founder + developer | Freeze release requirements and deferred backlog; identify 1–4 player modes and slice rules | Development authorization | Brief explicitly covers every requirement in section 2 and records unresolved choices |
| RR-002 | P0 / Developer | Create decision register, performance targets, and milestone review template | RR-001 | Every major choice has owner, deadline, and evidence needed |
| RR-003 | P0 / Founder + tester | Arrange physical device access and initial testers; record exact available hardware | RR-001 | Named custodian and scheduled access for an iPhone, iPad, and Android device |
| RR-004 | P0 / Founder + artist | Prepare original car/track brief and asset-rights ledger; identify specific brand review needs | RR-001 | Artist can quote a bounded asset list; no assumed permission for branded assets |

**E1 — Repository and browser feasibility. Allowance: 5 developer days.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-010 | P0 / Developer | Initialize repository, README, ignore rules, lockfile, scripts, and AGENTS.md | RR-001–002 | Clean checkout can install, run, and build using documented instructions |
| RR-011 | P0 / Developer | Create a minimal renderer/browser shell, capability/error handling, central presentation configuration, shared UI styles and asset manifest | RR-010 | Test scene starts or gives a useful failure message; temporary logo/font/palette can be changed centrally |
| RR-012 | P0 / Developer | Build representative scene with replaceable placeholder cars/track and representative lighting, particles and audio | RR-011 | Scene approximates planned rendering cost without requiring finished art; visual asset roles and conventions documented |
| RR-013 | P0 / Developer | Build four control pods and input diagnostic overlay | RR-011 | Independent pointers are visible and recorded without primary-pointer filtering |
| RR-014 | P0 / Developer | Prepare approved private HTTPS test delivery and loading/performance instrumentation | RR-012; hosting access/authorization | A physical device opens the same versioned test build; headers and errors recorded |
| RR-015 | P0 / Tester + developer | Run initial physical-device/browser experiment; bounded Unity comparison only if warranted | RR-003, RR-013–014 | Raw results for startup, frames, input, audio, interruption, and embedded entry |
| RR-016 | P0 / Developer + founder | Select engine, lock versions, and revise support/performance assumptions | RR-015 | Written decision cites measurements and states remaining uncertainty |

**E2 — Track data and drawing. Allowance: 6 developer days.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-020 | P0 / Developer | Define/version track data and create the playable circuit greybox with debug geometry | RR-016 | Main road, gates, branch, obstacle and landing data are visible and consistent |
| RR-021 | P0 / Developer | Capture one pointer's timed ground-plane stroke with interruption handling | RR-013, RR-020 | Mouse/touch traces preserve timing and correct coordinates after viewport changes |
| RR-022 | P0 / Developer | Implement bounded smoothing, arc-length sampling, and loop-seam handling | RR-021 | Fixture curves remain inside legal corridor and have continuous seam behavior |
| RR-023 | P0 / Developer | Compile the shared drawing-pace mapping and desired-speed profile | RR-022 | Same geometry at different tempos produces distinct predictable pace profiles |
| RR-024 | P0 / Developer | Validate road clearance, direction, start/finish, ordered gates and allowed branch | RR-020, RR-022 | Invalid cuts are rejected; a designated airborne route can be submitted |
| RR-025 | P0 / Developer + tester | Add drawing instruction, pace visualization, route error highlight, preview and confirmation | RR-023–024 | New players can complete a valid route and explain its intended pace |

**E3 — Racing, grip, thrust, timing. Allowance: 6 developer days.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-030 | P0 / Developer | Implement pure fixed-step simulation, snapshots, and render interpolation | RR-020, RR-023 | Repeated input fixture produces stable same-runtime results at multiple render rates |
| RR-031 | P0 / Developer | Add target-speed response, curvature/grip stress, skid feedback events, and recovery | RR-030 | Deliberate slow corner outperforms excessive pace on the benchmark corner |
| RR-032 | P0 / Developer | Add one-shot thrust, recharge, unavailable feedback, cap and grip interaction | RR-031 | Holding never repeats; cooldown/state restrictions and simultaneous players pass |
| RR-033 | P0 / Developer | Add laps, canonical progress, finish interpolation, ranking and tie handling | RR-024, RR-030 | Wide versus shortcut paths rank correctly; no skipped-gate finish |
| RR-034 | P0 / Developer | Build route/action fixtures and replay-based strategy comparison report | RR-031–033 | Thoughtful line/pace/timing improves over naive strategy; report reproducible |

**E4 — Local multiplayer and session flow. Allowance: 5 developer days.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-040 | P0 / Developer | Add player count, identity, sequential turns, hidden prior routes and Ready flow | RR-025, RR-033 | 2/3/4-player sessions reach the same simultaneous start correctly |
| RR-041 | P0 / Developer + artist | Refine corner pods, safe areas, mirrored labels, cooldowns and car identities | RR-013, RR-040 | Physical fingers do not obscure critical track areas on target tablet |
| RR-042 | P0 / Developer + tester | Harden ownership/cancellation/multiple contacts; add desktop bindings | RR-032, RR-041 | Four-contact cycle test passes with zero wrong-player or stuck actions |
| RR-043 | P0 / Developer | Add pause/resume, focus/visibility/rotation recovery, and countdown input policy | RR-040, RR-042 | Airborne/racing interruptions resume without phantom input or lost progress |
| RR-044 | P0 / Developer | Complete results, same-lines rematch, redraw-all, and menu return | RR-033, RR-040 | Repeated races reset every player's state and preserve only intended settings |

**E5 — Hop, shortcut, and balance. Allowance: 5 developer days.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-050 | P0 / Developer + designer | Finalize shortcut corridor, takeoff/landing regions and canonical branch progress | RR-020, RR-024, RR-033 | Safe and shortcut routes join the same legal course progression |
| RR-051 | P0 / Developer | Add hop state, height arc, recharge and thrust interaction | RR-030, RR-032, RR-050 | Same-tick combinations and airborne restrictions behave consistently |
| RR-052 | P0 / Developer | Add swept footprint/height obstacle tests and landing validation | RR-051 | Early, late, low-clearance, overshoot and high-speed cases cannot tunnel through |
| RR-053 | P0 / Developer | Add checkpoint/route recovery and one explicit failure cost | RR-052, RR-043 | Failed hop cannot gain progress, duplicate penalties, or leave an endless recovery |
| RR-054 | P0 / Developer + tester | Run safe/shortcut and thrust timing balance experiments | RR-034, RR-053 | Shortcut payoff and failure cause are understandable; safe route remains competitive |

**E6 — Solo, challenge, persistence, sharing. Allowance: 3 developer days.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-060 | P0 / Developer | Add solo retry and optional personal/developer ghost | RR-034, RR-044 | Solo can repeatedly improve with no redraw/menu requirement |
| RR-061 | P0 / Developer | Persist settings and versioned personal bests with storage failure handling | RR-060 | Corrupt/blocked storage does not break play; incompatible records stay separate |
| RR-062 | P0 / Developer + founder | Add fixed challenge, labeled developer benchmark, versioned link and pause/assist rules | RR-054, RR-060 | Target time comes from a reproducible legitimate run; no suggestion of Elon participation |
| RR-063 | P1 / Developer | Add result text/image sharing with copy/download fallback | RR-061–062 | Unsupported or canceled sharing leaves results intact; shared result identifies rules/category |

**E7 — Art, effects, sound, and presentation. Allowance: 7 integration days plus artist effort.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-070 | P0 / Artist + founder | Develop and review one in-engine visual target in successive passes at actual phone/tablet framing | RR-004, RR-016, RR-020 | Direction improves from temporary art to release quality; reviewed changes use the central presentation/asset structure |
| RR-071 | P0 / Artist | Deliver roadster, wheel setup, four identities, source and optimized export | RR-070 | Correct orientation/scale/pivots; clear silhouette and player identity at gameplay size |
| RR-072 | P0 / Artist | Deliver track, terrain, barrier kit, shortcut markers and restrained props | RR-050, RR-070 | Geometry matches course data; decorative detail does not obscure cars or route |
| RR-073 | P0 / Artist + developer | Integrate materials, baked lighting/shadows, camera framing and quality presets | RR-071–072 | Approved view achieved on actual baseline hardware within measured budgets |
| RR-074 | P0 / Developer + audio contributor | Add thrust/hop/skid/landing effects, sound cues, recharge, finish feedback and reduced motion | RR-051–053, RR-073 | Actions are readable muted and audible without clipping; effects do not alter simulation |
| RR-075 | P0 / Developer | Optimize texture/geometry delivery, draw calls, overdraw, effects and lifecycle cleanup | RR-073–074 | Download/frame/stability tests pass with the final assets |

**E8 — Beta, reliability, rights, and release operations. Allowance: 9 developer days with testing support.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-080 | P0 / Developer | Establish CI, smoke tests, content validation and budget reports incrementally | RR-010; expand with features | Clean checkout/build and release-relevant automated checks pass |
| RR-081 | P0 / Tester + developer | Complete physical-device matrix, thermal/repeated-race and embedded-browser tests | RR-042–043, RR-062, RR-075 | Exact build/device/browser results and recordings/logs; failures triaged |
| RR-082 | P0 / Tester + founder | Facilitate new-player, strategy and four-person playtests | RR-054, RR-062, RR-074 | Observation notes, comprehension/retry data, and prioritized findings |
| RR-083 | P0 / Developer | Fix critical/high-impact issues and rerun affected regression cases | RR-081–082 | No known release-blocking issues; each fix has relevant evidence |
| RR-084 | P0 / Developer | Validate production hosting, headers/cache, failure page, version rollback and optional telemetry | RR-014, RR-080, hosting authorization | Previous version restored in rehearsal; new/old asset mixing prevented |
| RR-085 | P0 / Founder | Close asset/name/branding/privacy review for the actual public package | RR-004, RR-062, RR-071–074 | Rights ledger complete; public naming/copy matches reviewed decisions |

**E9 — Trailer, launch, and observation. Allowance: 3 engineering days plus production work.**

| Ticket | Priority / owner | Task and deliverable | Depends on | Completion evidence |
|---|---|---|---|---|
| RR-090 | P0 / Founder + capture contributor | Capture uncut shipping-build gameplay and permissioned tablet group play | RR-083, RR-085 | Build/device/settings and raw source preserved; footage demonstrates all advertised mechanics |
| RR-091 | P0 / Editor + founder | Edit 30-second trailer, captions, sound mix and feed crops | RR-090 | Understandable muted, legible URL, authentic mechanics and usable small-screen crops |
| RR-092 | P0 / Founder | Prepare X/LinkedIn copy, screenshots, press kit, compatibility note and support response | RR-062, RR-085, RR-091 | Claims verified against build; direct link and social preview checked |
| RR-093 | P0 / Founder + developer | Review the concrete release package and record go/hold decision | RR-080–085, RR-091–092 | Gates in section 16 pass and public launch is authorized |
| RR-094 | P0 / Developer + founder | Release and observe; review at 24 h, 72 h, day 7 and day 14 | RR-093 | Working link, issue log, performance/funnel evidence, and next-scope decision |

**12. Calendar and first ten implementation days**

Use relative weeks until staffing, start authorization, and device access are known. The critical path is E0 → E1 → E2/E3 → E4 → E5 → final E7/E6 → E8 → E9. Early art direction, test preparation, and CI can overlap; final art depends on the camera and geometry being stable.

| Working period | Focus | Demonstration | Decision |
|---|---|---|---|
| Weeks 1–2 | Brief, setup, browser experiment, track data | Real-device scene with four independent pads | Commit to engine and practical support targets |
| Weeks 3–4 | Route, pace, simulation, grip, thrust | One person completes and improves a race | Is drawing plus thrust compelling enough to continue? |
| Week 5 | Sequential turns, four corners, session recovery | Four people race on a tablet | Are controls and setup comfortable? |
| Week 6 | Hop branch, collision/recovery, balance | Safe route versus risky shortcut | Does hop add a meaningful decision? |
| Weeks 7–9 | Final art, sound, modes, ghost, challenge | Near-final vertical slice on target devices | Is the visual promise achieved without breaking performance? |
| Weeks 10–11 | Beta, fixes, rights closure, operations | Release candidate and test evidence | Which issues block launch? |
| Week 12 onward | Trailer, package review, release if ready | Playable link and 30-second real gameplay film | Launch or use contingency for specific failed gates |
| Weeks 13–16, if needed | Reserved uncertainty | Corrected evidence, not added scope | Resolve blockers; re-estimate if core assumptions failed |

First ten days, only after implementation authorization:

| Day | Planned work | End-of-day artifact |
|---|---|---|
| 1 | Confirm requirements and deferred scope; arrange devices; open decision register | Brief, available-device list, unresolved decisions |
| 2 | Create repository and minimal runnable/buildable shell | Reproducible local setup and documented commands |
| 3 | Build representative 3D scene with four cars and planned lighting/effects cost | First running scene and asset-size baseline |
| 4 | Add four corner pads, pointer diagnostics, audio unlock and interruption handling | Repeatable input demonstration |
| 5 | Prepare authorized private device delivery and load/frame instrumentation | Device-accessible test build and measurement form |
| 6 | Test iPhone/iPad/Android and social embedded entry; identify largest bottleneck | Raw benchmark results and issue list |
| 7 | Apply one high-value optimization; compare if needed; record engine decision | Evidence-based stack/support decision |
| 8 | Define circuit data and ground-plane pointer capture | Drawable greybox with checkpoints visible in debug |
| 9 | Compile route geometry and preserve pace; validate simple cases | Recorded strokes and resulting profiles |
| 10 | Connect a compiled route to a first basic automatic lap | One-player proof of the draw-to-race loop |

Day ten is a checkpoint, not a promise of completed game physics or art. The subsequent core milestone adds useful grip/thrust, robust validation, results, and regression evidence. If day six uncovers severe device incompatibility, spend the next days resolving that instead of following the calendar mechanically.

**13. Art production package and asset budgets**

Develop the appearance progressively. The prototype needs readable controls, consistent player identities, a basic car silhouette, and enough scene quality to evaluate movement and perspective. It does not need final branding or an expensive environment. Keep a loose reference direction—polished miniature 3D racing with a clear elevated camera—while leaving the specific identity open.

| Visual pass | When | Work | What remains provisional |
|---|---|---|---|
| A: functional presentation | Initial browser/core prototype | Simple track and cars, temporary text logo, one readable font, restrained palette, clear control states | Branding, detailed models, textures, scenery and final lighting |
| B: coherent first style | Once the draw/race/thrust loop is testable | Try logo/font/palette choices, refine menus and control pods, improve car silhouette and materials | Details can still change through configuration/assets |
| C: one polished scene | Alongside stable multiplayer/hop mechanics | Bring one camera view to the intended quality; test lighting, track materials, a finished car and a small prop kit | Review and replace unsatisfactory parts before expanding detail |
| D: release polish | Vertical slice and beta | Complete effects, audio/visual feedback, responsive layouts and final identity; optimize and verify | Later visual updates remain possible, with relevant checks |

At each pass, review a still image and a short real gameplay clip on a target phone and tablet. Decide what looks weak, change that part, and compare under the same camera/scene conditions. Keep previous configurations and source assets in version control so visual experiments can be reversed. An earlier visual review establishes the current direction; it does not permanently lock the logo or appearance.

Commission a bounded package with source delivery and export requirements. Agree on two review rounds: silhouette/greybox and in-engine material/lighting. The artist must view the actual game camera and phone/tablet dimensions, not only a full-screen modeling viewport.

| Asset group | Initial quantity | Required properties | Acceptance |
|---|---|---|---|
| Roadster | One original model, wheel pivots, four identities | Readable silhouette; efficient materials; clear forward axis/scale | Identifiable when small and when cars overlap |
| Circuit | One road mesh and supporting terrain | Correct gates/barriers/shortcut; consistent UVs and collision alignment | Players understand safe road and shortcut in a still frame |
| Modular props | A small reusable kit, roughly 8–12 types | Barriers, curbs, signage, vegetation/architecture accents | Adds setting without obscuring action or excessive draw calls |
| Materials/textures | Small shared palette/atlases | Licensed/original; restrained resolution; useful compression | Looks polished at baseline quality and remains readable at low quality |
| Gameplay effects | Thrust, skid, hop/landing, recharge/finish | Short, controlled particle counts and transparent coverage | Communicates action with reduced-motion alternatives |
| UI assets | Logo/title treatment, action icons, numbers/patterns | Original visual identity; scalable and high contrast | Legible at actual control sizes and in video crops |
| Sound | Small cue set and optional music | Game and trailer permissions recorded; normalized levels | No clipping, delayed first cue, or dependence on sound for essential information |
| Promotional output | Real screenshots, source capture, trailer variants | Actual release build and accurate platform labels | No discrepancy between advertising and playable game |

Initial compressed-download allocation: engine/application/decoders 2.5 MB; world geometry 2 MB; vehicle geometry 0.7 MB; textures 2 MB; audio 1 MB; UI/fonts 0.3 MB; reserve 1.5 MB, totaling 10 MB. This is an allocation to test, not an assertion that a selected engine will meet it. Reallocate based on measurements while keeping the initial-playable total visible. A larger optional trailer is not part of the startup path.

Begin with approximately 150k visible triangles and 150 draw calls as ceilings to investigate, not universal device limits. Reuse meshes/materials, bake static lighting where suitable, pool effects, avoid unbounded trails, and limit transparent overdraw. A car can look high quality through silhouette, lighting, and material choices without a highly detailed interior that the camera never shows.

Texture size on disk is not decoded/GPU memory size. Track both. Keep a per-asset ledger with transfer bytes, texture dimensions/formats, mesh complexity, materials, and runtime use. Do not promise a universal safe Safari memory number. Repeated-scene tests must show that obsolete textures, buffers, effects, and replay objects are released.

Quality presets change internal resolution, shadow detail, particles, and decorative effects. They must not change collision, grip, race timing, route compilation, or ability timing. Automatic quality adaptation should change gradually and never obscure a hop cue or silently modify competitive rules.

**14. Balance experiments and playtest scripts**

Test one question at a time. Save build, rules, track, route fixtures, command schedules, and device information with each experiment. Do not alter multiple major tuning variables and then claim to know which one improved the game.

| Experiment | Compare | Desired evidence | Response if it fails |
|---|---|---|---|
| B01: drawing pace | Same geometry, slow/medium/fast corner strokes | Drawn pace produces a visible, understandable tradeoff | Fix mapping/feedback before adding modes |
| B02: strategic line | Tight short line versus wider fast line | More than one plausible line; curvature and distance both matter | Adjust track width/curves and grip balance |
| B03: thrust timing | Straight burst, corner burst, cooldown spam, no burst | Intentional timing wins without making a missed tap hopeless | Adjust duration, recharge, or grip response |
| B04: hop payoff | Safe route, successful shortcut, failed shortcut | Risk/reward is explainable and neither route is universally mandatory | Change branch length or recovery cost |
| B05: player order | First versus last drawing player in rotated turns | No systematic mechanical advantage from identity/order | Inspect revealed routes, charge, start distance and setup rules |
| B06: repeated attempts | First race versus later attempts with the same tester | Players articulate a change and improve | Improve feedback or deepen one decision |
| B07: small display | Same mode on small phone and tablet | Controls remain usable; guidance matches reality | Adjust framing/pods or revise supported player count |

Suggested baseline tuning: 0.7-second thrust / 5-second recharge; 0.75-second hop / 14-second recharge; typical 40–50-second two-lap race; roughly 0.7–1.3-second successful shortcut gain; roughly 1.5–2.5-second failed-hop loss. These values are starting points only. Maintain one tuning file with parameter descriptions and a change history.

New-player session, approximately 15–20 minutes: explain only that this is a free racing prototype; ask the person to open the link and play; observe without coaching; record where they hesitate; ask them to explain drawing speed, thrust, and hop after the first race; offer the opportunity to continue without prompting them to praise it; ask what they would change on their next attempt. Record actual voluntary retry separately from “said they would play again.”

Strategy session, approximately 20–30 minutes: let an experienced tester complete several runs; ask them to predict the outcome of one line/pace change before trying it; compare predicted versus actual result; review losses using concrete events; identify a dominant exploit or unrewarded skill. Keep a copy of the best legitimate route/action combination.

Party session, approximately 20–30 minutes: place the tablet on a table with four new players; watch player setup, reach, accidental touches, waiting time and track occlusion; run at least three races; rotate player seats/identities; ask each person what their last ability press did; note whether the group independently wants a rematch.

Pilot thresholds: 8/10 new players complete a solo race without verbal coaching; 7/10 voluntarily choose a second attempt; at least three four-person groups complete multiple races without ownership confusion. These small samples are decision aids. Investigate specific failures rather than using a percentage to dismiss them.

**15. Verification matrix and test procedure**

Maintain a living matrix with exact device model, OS, browser/app version, orientation, quality setting, network, build ID, date, tester, result, and evidence link. Candidate physical devices are an iPhone 12-class lower tier, a small iPhone such as SE third generation for layout, a recent iPhone, a standard iPad such as ninth generation, a recent iPad, and midrange/recent Android phones. These are proposed coverage categories, not a compatibility claim.

Entry surfaces: direct Safari on iPhone/iPad; direct Android Chrome; desktop Chrome/Edge/Firefox and macOS Safari; X and LinkedIn embedded browsers on iOS and Android; and each available external-browser escape path. Record the app version for embedded tests because behavior can differ from standalone browsers. Browser simulation supplements this work; it cannot stand in for physical touch, GPU, thermal, or OS gesture evidence.

| Test | Procedure | Expected result | Main tickets |
|---|---|---|---|
| TC-01: first load | Empty cache, open link, tap Play, reach drawing under defined network conditions | Useful loading state; no sign-in/install requirement; startup measured from navigation | RR-011, 014, 075 |
| TC-02: pace preservation | Replay same route samples with different corner timing; inspect and race | Predictable pace differences survive compilation | RR-021–023, 031 |
| TC-03: invalid routes | Submit reverse, incomplete, skipped-gate, wall-crossing and unauthorized-cut strokes | Specific error and highlight; race cannot start with invalid route | RR-024–025 |
| TC-04: render-rate independence | Run same compiled routes/commands with 30/60/120 fps render schedules | Same-runtime finish difference within one simulation tick; no collision skipped | RR-030, 033–034 |
| TC-05: thrust lifecycle | Tap ready, hold, tap during cooldown, tap during countdown/recovery/results | One permitted activation; no repeat/queued surprise; consistent charge state | RR-032, 043 |
| TC-06: hop geometry | Try early/late/no hop, peak clearance, overshoot and thrust during hop | Correct clearance and legal landing decide outcome; visuals match collision | RR-051–052 |
| TC-07: branch and recovery | Fail shortcut at different points and retry; attempt to skip main gates | Correct progress restored; no free distance, lap bypass, or double recovery cost | RR-050, 053 |
| TC-08: four independent contacts | Four players perform 50 overlapping press/release cycles per corner | Zero wrong-player activations or stuck state | RR-041–042 |
| TC-09: interruptions | Cancel one touch; hide tab; switch app; resume while a car was airborne | Pointer cleanup; global pause only for session interruption; safe resume | RR-042–043 |
| TC-10: viewport and reach | Rotate, show/hide browser chrome, test safe areas and opposite seats | No obscured pods, accidental scroll, broken mapping, or unreadable labels | RR-021, 041 |
| TC-11: repeated sessions | Retry/redraw/change player count repeatedly for 20 minutes | Proper state reset; no accumulating effects/listeners or unwanted reload | RR-044, 075 |
| TC-12: local storage failure | Deny/clear/corrupt save data; open with previous schema | Play continues; settings/bests reset or migrate understandably | RR-061 |
| TC-13: challenge integrity | Change rules/assist version; pause run; compare developer ghost | Incompatible/paused categories not presented as equivalent valid challenge records | RR-062 |
| TC-14: presentation equivalence | Replay identical actions across quality settings and two temporary logo/font/palette/material configurations | Same gameplay result within tolerance; visual cues/layout retained; cosmetic swap requires no simulation/input edits | RR-011–012, RR-073–075 |
| TC-15: assets/errors/cache | Fail an asset; simulate WebGL failure; open stale entry with a new build | Useful retry/recovery; no mixed-version silent failure | RR-011, 084 |
| TC-16: social entry/share | Open from real X/LinkedIn drafts; share/cancel/use fallback | Correct game/challenge opens; canceled sharing preserves race results | RR-063, 081, 092 |
| TC-17: performance | Measure cold/warm loads, frame distributions, visible input, warm-device repeated races | Budgets pass on declared support tiers; raw evidence attached | RR-015, 075, 081 |
| TC-18: release claims | Compare trailer/copy/assets/support statement with build and rights ledger | Every material claim is demonstrated and every shipped asset has recorded rights | RR-085, 090–093 |

Initial engine experiment: at least five cold starts per core device and repeated input/race-like stress. Final performance gate: aim for 20 cold and 10 warm starts per primary release device on the defined connection, plus a 20-minute repeated-race session. These sample sizes are practical engineering evidence, not a universal guarantee. Investigate outliers instead of averaging away reloads.

Use a measured 10 Mbps downlink and 80 ms latency condition for the startup target and record how it was imposed. Measure navigation-to-drawable time, not just engine initialization after download. Collect median, p75, p95 where meaningful and the failure count. Profile final assets and shipping settings; an editor screenshot or empty scene does not satisfy the gate.

Input latency evidence should include device video or another physical measurement approach capable of relating a tap to visible feedback. Event-handler execution time alone misses browser/compositor/display delay. Frame-time reports must include warm-device races, all four cars, concurrent effects, and UI.

Bug report fields: short title; severity; build; device/OS/browser/app; exact reproduction steps; expected/actual behavior; frequency; recording/log; relevant route/replay fixture; and whether it blocks a gate. Severity 0 means core game unavailable, corrupted race state, or wrong-player input. Severity 1 means a required mode/mechanic is broken or a declared support target fails materially. These block release. Cosmetic issues may be accepted explicitly if they do not impair readability or advertised behavior.

**16. Milestone gates and required review package**

| Gate | Required package | Pass criteria | If it fails |
|---|---|---|---|
| G1: technical feasibility | Device matrix, benchmark data, four-pad demonstration, engine decision | Core devices load, render, accept independent input, and recover from interruption | Simplify or switch before final art; revise support promise honestly |
| G2: core fun | Playable solo loop, route fixtures, pace/thrust comparison, first observations | Deliberate route/pace/thrust change outcomes; new players understand why | Iterate mapping/feedback/track; do not mask the issue with more content |
| G3: party play | Four-person recordings, input traces, setup timings | Repeated races without ownership confusion or unusable reach | Adjust pods/camera/setup and repeat with new groups |
| G4: hop strategy | Swept-collision cases, shortcut timing report, player feedback | Reward/failure explainable; no bypass exploit; safe route valid | Rework branch/cues/tuning before visual polish freezes |
| G5: vertical slice | Final art/audio/modes on physical devices, budgets and rights ledger | Visual target achieved; gameplay remains readable and stable | Reduce scene cost or refine presentation; preserve mechanics |
| G6: release candidate | TC-01–18 results, issue list, rollback rehearsal, final public copy | No Severity 0/1 defects; required support and product gates pass | Fix the failed cases; rerun affected checks |
| G7: public launch | Exact game version/link, trailer, posts, support note, operating plan | Founder authorizes the concrete public package | Keep candidate available for private review and address named concerns |

Release budgets: initial playable transfer target ≤10 MB with explicit review above 15 MB; cold navigation-to-drawing p75 ≤15 seconds on the specified network; warm p75 ≤5 seconds; primary devices near 60 fps with p95 frame time ≤25 ms; lower tier median ≥30 fps and p95 ≤50 ms; visible input p95 ≤100 ms; and no crash/context loss/unwanted reload during each required 20-minute session. These thresholds can be revised only with recorded evidence and an honest resulting support claim.

Gate review answers five questions: what changed; what evidence supports readiness; which material defects remain; what decision is needed; and what will happen next. Do not present unrun tests as passing or a planned device as certified.

**17. Deployment and operating runbook**

Proposed architecture: static game/site assets behind HTTPS/CDN, with no gameplay backend. A small optional analytics service must not sit on the critical play path. Host the challenge target as versioned static data. Arbitrary replay uploads and public rankings are later work.

Preparation sequence:

1. Choose the domain and hosting account after approval of cost/ownership. Record who owns renewal, credentials, and billing.
2. Set up private/staging delivery and production separately. Check that supposedly private previews are actually access-controlled where required; an obscure URL is not access control.
3. Produce a build manifest tying application, track, rules, assets, and benchmark together.
4. Serve hashed assets with long-lived caching; revalidate the entry document/manifest. Retain old assets until older entry points can no longer reference them safely.
5. Verify content types and compression on the deployed host. For Unity, explicitly verify Wasm and compressed-file headers. [Unity deployment guidance](https://docs.unity.com/en-us/engine/6000.5/manual/platform-specific/webgl/building-distribution/deploying)
6. Check provider limits against actual files and expected traffic. Cloudflare Pages is one candidate and documents a 25 MiB individual asset limit; confirm the selected service's current terms during setup. [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
7. Keep trailer downloads out of the initial game load. Prepare a lightweight compatibility/failure page and a stable challenge link.
8. Test social title/description/image and deep-link entry from both platforms. Preserve the selected challenge after any browser recovery flow.
9. Rehearse release promotion and restoration of the previous known-good version. Record steps and measured recovery time.
10. Enable only approved monitoring/analytics, set cost alerts, and assign the first-days support owner.

Optional event schema: session started, game ready, mode chosen, route confirmed, race started, race finished, retry, challenge attempted, share invoked, and fatal error. Include build/track/rules, mode/player count, coarse device/support tier, and timing categories. Avoid raw pointer traces or stable device fingerprints in production telemetry. Debug recordings from volunteer testers require a separate clear agreement and handling policy.

Metric definitions: ready rate = ready sessions / supported-device starts; completion rate = first-race finishers / ready sessions; retry rate = finishers who start another race / finishers; challenge engagement = challenge starts/finishes; referrals = incoming tagged shared-link visits where measurable. A share click is not proof that someone posted or that a recipient played. Report counts and missing measurement alongside percentages.

Initial product hypotheses after roughly 100 qualified sessions: at least 70% of ready sessions finish a first race and 30% of finishers retry. Break down by mode/device/source; four-player sessions represent groups, not four separately measured users. Use small-sample uncertainty and direct feedback when deciding what to fix.

Operational response: if a production defect blocks a supported device or corrupts race outcomes, stop promotion, restore the known-good version or clear failure page, reproduce the issue, fix/test, and resume when the affected gate passes. If only one embedded browser fails, publish a tested recovery path and accurate support guidance. If costs exceed the agreed envelope, follow the pre-agreed hosting plan rather than improvising an unbudgeted purchase.

**18. Launch package, trailer production, and outreach schedule**

The launch package contains the release build/link, a fixed challenge/developer time, a 30-second trailer, a few real screenshots, a concise compatibility note, creator contact/support method, reviewed factual copy, and a ready rollback/support plan. Prepare everything before asking for final public-launch authorization.

Trailer production plan:

| Time | Visual | Message and verification |
|---|---|---|
| 0–3 seconds | Real close overtake or successful hop | Immediate hook; source run retained |
| 3–8 seconds | Finger draws slow corner and fast straight | Explain the core input visibly; route color/width matches game |
| 8–12 seconds | Several player identities and countdown | Show local multiplayer; edits may condense planning but do not fake simultaneity |
| 12–20 seconds | Four cars race; thrust pads activate during an overtake | Show cause and effect, not just moving cars |
| 20–25 seconds | Shortcut hop alongside safe-route car | Show the distinctive risk/reward mechanic |
| 25–30 seconds | Finish/result and readable play URL | “Draw. Thrust. Hop.” plus free-browser/challenge invitation |

Capture checklist: shipping build ID; actual device and quality setting; clean screen; readable control/UI text; appropriate aspect ratio; no notifications; licensed/owned audio; permission for identifiable filmed players; uncut source take saved. Produce a landscape master, captions, and carefully reframed feed variants. Test muted viewing and compression on a small phone. Generated footage, cinematic renderings, or unrepresentative desktop quality must not be presented as mobile gameplay.

Before the full trailer, test a 6–10-second real gameplay excerpt with a few people unfamiliar with the game: can they explain the input and want to see more? Use that feedback to improve framing and captions. Do not use reactions as evidence of broad demand.

| Relative timing | Action | Deliverable / learning |
|---|---|---|
| T−14 to T−10 | Invite a small voluntary beta cohort through existing permitted channels | Compatibility/usability issues before attention grows |
| T−10 to T−7 | Run group play and strategy sessions; fix biggest issues | Real replay moments and a credible target time |
| T−7 to T−4 | Prepare short development clip and press kit; identify suitable communities | List of relevant EV, casual-game, browser-game and maker audiences with posting rules |
| T−4 to T−2 | Freeze candidate/rules; capture/edit trailer; prepare posts | Complete reviewable creative package |
| T−2 to T−1 | Test production link, social previews, budget alerts and rollback; review claims | Launch go/hold decision based on evidence |
| Launch day | Publish approved X and LinkedIn posts; pin clear playable entry where appropriate | One easy path from film to game |
| First 24 hours | Watch errors and answer genuine questions; fix serious problems | Reliable first experience and useful issue log |
| 48–72 hours | Share a permissioned player clip/real record or meaningful update | A fresh reason to play, supported by actual activity |
| Day 7 | Review loading, completion, retries and qualitative feedback | Fix the largest funnel/gameplay problem |
| Day 14 | Decide whether to iterate core, add one content item, or explore native feasibility | Written evidence-based next milestone |

X approach: lead with real gameplay, a plain sentence explaining draw/thrust/hop, and a direct playable link. A single respectful invitation to @elonmusk can be part of reviewed copy. Avoid repeated tagging or mass unsolicited messages. Share through relevant communities under their actual rules; rely on voluntary interest rather than coordinated spam.

LinkedIn approach: tell the creator story and show the finished interaction. Explain the design challenge in ordinary terms and invite people to play a short race, perhaps with colleagues around a tablet. Keep the link visible and the free/browser claim accurate. No assumption about a special posting time or algorithm trick is necessary.

Copy direction for X: “Draw the line. Time the thrust. Hop the shortcut. I made Roadster Race: a free browser racing game for solo runs and friends on one screen. Can you beat the developer time?” Add the actual link and, if approved, a separate accurate invitation to Elon.

Copy direction for LinkedIn: “I wanted to turn a simple idea into a game: draw your racing line, then race it with well-timed thrust and a risky shortcut. Roadster Race is now playable free in a browser. The first version has one carefully built circuit, solo time trials, and local racing with friends. Try a lap and tell me where you gained—or lost—time.” Finalize wording only when each claim is supported by the shipping build.

Discovery strategy: first earn a few good sessions and authentic clips, then make them easy for EV enthusiasts, game developers, casual players and creators to share. Getting Elon to notice and play is one possible outcome. It is not a success criterion for whether the engineering or game design is worthwhile.

**19. Rights, risk, and scope-control register**

Use the original game as a reference for the draw-and-race interaction and level of presentation, while producing original expressive content. The U.S. Copyright Office distinguishes ideas and methods from protected expression; this is not a blanket clearance of a particular imitation. Review actual art, tracks, UI, sounds, code and promotional assets. [Copyright Office guidance](https://www.copyright.gov/help/faq/faq-protect.html)

Review the proposed title, recognizable vehicle design, Tesla/SpaceX references, and named challenge in the relevant markets. A free release or an unofficial label does not establish permission or eliminate confusion/endorsement concerns. Use a configurable original identity while any specific branded treatment is unresolved. [USPTO infringement guidance](https://www.uspto.gov/page/about-trademark-infringement)

| Risk | Priority | Owner | Early evidence | Response / trigger |
|---|---|---|---|---|
| Mobile startup/performance fails | High | Developer | G1 measurements and final-asset profiling | Reduce cost; reconsider engine before asset production; revise supported tier if justified |
| Four-person controls are awkward | High | Developer + tester | G3 sessions and hand occlusion | Rework pods/framing/setup; use tablet as showcase |
| Drawing pace is unclear | High | Designer/developer | TC-02 and B01, new-user explanation | Improve mapping and feedback before adding content |
| Naive strategy dominates | High | Developer | B02–B04 comparison | Tune grip/track/ability interaction and rerun fixtures |
| Hop causes unfair failures | High | Developer + tester | TC-06–07 and player explanation | Align visuals/collision; improve cues; tune landing and recovery |
| Art exceeds budgets | High | Artist + developer | RR-070 early style frame and per-asset ledger | Simplify expensive details; preserve silhouette/readability |
| Rights/naming unresolved | High for launch | Founder | RR-004 and final ledger | Use reviewed original treatment or obtain required permission before publication |
| Device access arrives late | High for evidence | Founder | RR-003 | Arrange access before selecting engine; do not substitute emulation claims |
| Scope growth delays release | High | Founder | New requests bypassing backlog | Trade against an existing requirement or defer explicitly |
| Public times are manipulated | Medium | Founder + developer | Unverifiable screenshots/client modifications | Keep claims local/unverified; add canonical verification only in later scope |
| Bad cache/deploy breaks link | High at launch | Developer | TC-15 and rollback rehearsal | Version assets atomically; restore known-good release |
| Traffic exceeds budget | Medium | Founder | Cost/usage alerts and projected payload | Pre-agreed operating response; avoid relying on assumed unlimited free service |
| Trailer overstates gameplay | High for trust | Founder | TC-18 | Recapture actual build and correct platform/feature claims |
| Little repeat play | High for product | Founder + tester | Pilot behavior and postlaunch retries | Improve the core decision/feedback loop before expanding content |

Scope-change rule: describe the requested behavior, player benefit, effort/dependencies, impact on launch, and what it displaces. If it adds a service, ongoing moderation, account system, new platform, or content pipeline, treat it as a separate milestone. Keep a short decision record rather than letting work accumulate invisibly.

**20. Native iOS and postlaunch expansion gates**

At the first postlaunch review, choose among improving the existing circuit, adding one new circuit, introducing a repeatable challenge, or investigating native iOS. Base that choice on loading failures, repeat play, player requests, device distribution, and development/support capacity. Do not interpret social impressions alone as evidence that an App Store project is justified.

Native feasibility package, if later authorized: compare a packaged web build with a native-engine implementation; measure loading, memory, touch, audio, frame stability and offline behavior on physical iPhones/iPads; list reusable assets/data/tests versus rewritten systems; estimate ongoing maintenance of two distributions; and document store/distribution requirements. A web wrapper does not inherently improve performance.

If Unity is chosen initially, substantial gameplay and asset reuse is possible but platform integration and certification remain work. If Babylon/TypeScript is chosen, retain portable track/rules/asset contracts and tests, while budgeting a genuine engine/runtime decision for native. Native iOS release requires suitable Apple build/signing/distribution access and device testing; TestFlight provides the beta distribution stage. [Apple distribution overview](https://help.apple.com/xcode/mac/current/en.lproj/devac02c5ab8.html), [Apple TestFlight workflow](https://help.apple.com/xcode/mac/current/en.lproj/dev2539d985f.html)

The initial one-player draw/pace/thrust prototype and replaceable presentation foundation are implemented. Physical Safari verification is the next evidence step. The full roadmap's remaining scope requires subsequent milestones; see the prototype README and verification record before selecting the next work package.
