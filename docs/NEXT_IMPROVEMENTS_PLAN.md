# Roadster Race — next improvements

Planning baseline: 2026-11-04, commit `55dfd3b`.
Status after the subsequent owner request: priorities 4 (circuit detail) and 5 (CPU behavior) are
implemented locally; see CIRCUIT_CRAFT_AND_RIVALS.md and its verification report.
The other workstreams and feature backlog below remain proposals.

## Direction

Make the existing eight-circuit game feel finished before another expansion.
The next milestone combines clearer racing feedback, a better audio mix and
deliberate scenery composition at the actual gameplay scale. Preserve Babylon.js,
the fixed whole-course drawing/racing camera, generous drawing, current handling,
hidden shortcuts and local multiplayer ownership.

Solo/CPU, Multiplayer, Time Trial, tournaments, tutorial, personal-best ghosts,
graphics tiers, recorded audio and the iOS wrapper already exist. Improve them
rather than reintroducing them as new features. New modes and abilities remain
separate proposals below.

## Prioritized delivery

| Order | Deliverable | Dependency | Acceptance |
|---|---|---|---|
| 0 | Release baseline and device audit | Current published build | Record build/device/OS, repeatable routes and actual phone findings |
| 1 | Race HUD and ability feedback | Baseline captures | Players can identify their car, place/lap and available abilities at a glance |
| 2 | Audio settings and dynamic mix | Existing supplied recordings | Saved independent Music/Effects controls; clear abilities without an overloaded four-car mix |
| 3 | Two benchmark venues | Steps 0–1 | Golden Gate and Yosemite look intentionally composed in phone gameplay views |
| 4 | Remaining six venue passes | Accepted benchmark standard | All venues reach the same standard within performance and clearance budgets |
| 5 | CPU reliability and racing behavior | Separate baseline fixtures | Fairer, less hesitant races with measured completion and incident results |
| 6 | Release candidate and hardware verification | All accepted changes | Production/browser/compatibility checks pass; hardware limitations are stated accurately |

Each delivery leaves the game runnable. Keep art-only work and CPU/core changes
in separate commits so visual regressions and handling differences can be isolated.

## 0. Establish a trustworthy baseline

- Confirm the current Pages verification/deployment result and record the build ID.
- Capture phone portrait/landscape views on every circuit, with cars and controls
  visible. Keep repeatable six-lap and four-car scenarios for the heaviest venues.
- Prepare a simple local test report: device, OS/browser, selected/active graphics
  tier, frame-time distribution, circuit load time and interruptions. No accounts,
  telemetry service or analytics.
- On available physical iPhone hardware, test Safari and Home Screen launch,
  rotation, drawing, simultaneous controls, sound/resume and sustained play for
  at least 15 minutes. Record device and OS; do not extrapolate desktop FPS.
- Separate cold network loading from warm scene-switch time. Check actual four-car
  frame pacing, memory/disposal and browser reloads as well as draw counts.
- Reconcile the README with current rules: it still contains historic circuit
  counts, gate distances and sound instructions. Preserve historic design docs,
  marking their status rather than rewriting the project's history.

Hardware-dependent findings remain pending until someone performs the test;
implementation and automated verification can progress independently.

## 1. Improve the live race experience

### HUD

- In Solo Race, use the existing compact HUD space for human position, lap and
  time. Prefer position over the current speed readout during competition.
- In Multiplayer, put each player's rank in their existing numbered corner
  control cluster. Do not add a four-name leaderboard over the road.
- In Time Trial, prioritize current lap and personal best. A signed ghost delta
  is optional only after comparison across branches, height sections and the lap
  seam is proven meaningful; otherwise keep the reliable best-lap display.
- Clarify the five-second contact-ghost start through restrained car transparency
  or a compact indicator. Time Trial's replay ghost must remain distinguishable.
- Keep one visual language for ready, firing and recharging abilities. Add a
  short ready pulse with reduced-motion handling; unavailable input stays unqueued.
- Preserve the same-line Restart, Draw new lines and Home actions on results and
  pause. Animations never delay actions or require a forced celebration screen.

### Vehicle feedback

- Refine already-existing steering, body lean, brake lights, suspension compression
  and height-aware shadows together. Prioritize believable wheel contact on steep
  Tahoe/Yosemite slopes and readable landing weight.
- Tune drift/tire feedback to actual slip and support: dust on dirt/snow, tire
  scrub on asphalt, neither while airborne. No drift coaching pop-ups.
- Keep normal racing tags hidden. Distinguish the human through selected paint
  and a restrained optional body/ground accent, without changing the selected paint.

Acceptance: phone views show the whole road, touchdown rectangle and flight
envelope; controls retain their sizes and ownership. No extra scene, moving race
camera, force changes, or new per-car shadow passes. Presentation-only changes
match the exact legacy fixtures.

## 2. Finish the sound experience

The supplied recordings and menu track are integrated. The remaining opportunity
is mixing and control, not replacing every sound again.

- Add independently saved Music and Effects sliders alongside the existing mute.
  Effects includes drivetrain, tires, abilities, impacts and ambience; keep
  internal role gains independently tunable. Settings stay outside the driving view.
- Refine motor pitch/level from actual speed and acceleration without simulated
  combustion gear shifts. Use smooth parameter transitions.
- Ensure the player's Hop/Thrust remain distinct over three CPU engines; cap
  simultaneous voices and retain the shared compressor and optional-file fallbacks.
- Add distinct, restrained ambience roles for Canyon, Tahoe and Yosemite. Today
  those venues share the same canyon role; night city also shares the city role.
  Prepare briefs for any missing recordings before requesting new WAVs.
- Improve the relative weight of takeoff, landing and impact, avoiding a loud
  landing event on every tiny ground-height change. Keep menu music out of racing.
- Test phone speakers and headphones, mute, page interruption, resume and unavailable
  recordings. Native-app haptics are a later enhancement; do not promise browser
  haptics on iPhone.

Acceptance: no clipped/harsh four-car mix, duplicate music voices or sound after
mute/pause. Audio settings survive reload and affect no race results.

## 3–4. Author each venue at gameplay scale

Start with Golden Gate (built environment) and Yosemite (natural environment).
Approve their phone-scale before/after views before extending the treatment.
Use a small number of purposeful detail groups, removing repeated clutter where
necessary. Distant decoration is lower priority than things visible while driving.

| Venue | Next art tasks |
|---|---|
| Newport Island | Better shallow-water/shore transitions, harbour foundations, garden planting and coherent beach furniture groups |
| Launchsite | Connected-looking pipes, believable equipment foundations, purposeful service bays and distinct tower/stage silhouettes |
| Golden Gate | Integrated bridge abutments, shopfront variety, pocket-plaza composition and convincing promenade/shore joins |
| Santa Monica | Pier pile/bracing rhythm, timber joints, amusement silhouette refinement and clean deck/beach/landing joins |
| Grand Canyon | Continuous strata across ledges and talus, natural receiving shoulders and small-scale sediment variation |
| LA nights | Deliberate warm/cool facade groups, clearer road contrast and selective lit windows using existing emissive batches |
| Snowy Tahoe | Wind-shaped snowbanks, believable lodge/lift grounding, clearer mountain relief and restrained snowfall depth |
| Capitan Yosemite | Stronger granite/forest composition, grounded meadow detail, waterfall lip/foam/pool transitions and creek-bank continuity |

Rules:

- Compose and inspect from the fixed gameplay camera first. Showcase screenshots
  do not substitute for car/road readability on a phone.
- Put substantial objects inside existing protected footprints and below their
  authoritative height. Respect supported land, gate clearance, visibility buffers
  and each venue's existing roadside exceptions.
- Keep hidden Hop lanes unmarked. Do not accidentally reveal them with special
  lighting, paint, signs or UI.
- Do not add support, blockers or collision geometry in an art-only pass. If a
  physical change is desirable, propose it separately with route/track-version tests.
- Prefer existing opaque vertex-colour batches, shared material palettes and baked
  detail. Preserve static-shadow caching, scenery workers and current graphics tiers.

Acceptance: matched phone/desktop captures, visible obstacle/collision agreement,
unchanged projection/physics, no new loading hitch or unbounded cosmetic effect.

## 5. Improve CPU racing deliberately

Existing CPU plans already account for curvature, grip, burst distance, response
lag, traffic, slides and fixed-clock decisions. Add evidence before more tuning.

- Run a seeded race matrix across all eight courses and three difficulties, with
  clean plans, traffic, post-ghost contacts and disturbed jump approaches.
- Record finishes, race times, recovery count, off-road time, contact clusters,
  time spent unnecessarily following and legal ability use.
- Investigate hesitation near turns/traffic and repeated recovery traps. Improve
  predictive pace/ability decisions before increasing aggression or changing paths.
- Add limited, deterministic intent variation only where it improves observable
  racing. Any future dynamic passing line must revalidate clearance, progression,
  support and landing; it is a larger task than another pace multiplier.
- Keep identical physics, speed caps and recharge for humans and CPU drivers.
  No rubber banding, guaranteed jumps, extra grip or hidden teleporting.

Acceptance: representative races finish reliably, difficulty improves aggregate
clean-run pace, and mistakes still have real consequences. A controller/physics
behavior change requires appropriate versioning, rules regeneration and record/tour
compatibility handling. Keep art-only verification separate.

## Performance and release gates

- Keep 90 one-car Time Trial / 150 four-car scene draw-call limits with active
  effects and shadows. Draw-call compliance alone is insufficient.
- Use paired repeated baseline/current measurements; investigate repeatable
  median/p95 frame-time or scene-loading regressions above 5%.
- Do not compensate for new scenery by zooming out, reducing road usability,
  silently lowering the selected tier or adding stronger automatic camera motion.
- Bound particles, voices, animated props, texture sizes and worker lifetime.
  No additional real-time lights, reflection passes or shadow maps by default.
- Verify Low/Medium plus existing High/Ultra and WebGPU fallback paths; keep all
  custom materials compatible with the current renderer contracts.
- Run typecheck, unit tests, appropriate browser tests, Pages/app builds and
  production smoke. Art/refactor work also passes exact legacy comparison.
- Publish only after verified main builds and a later owner release request.
  Record real device limitations explicitly rather than claiming universal 60 FPS.

This follows Babylon's recommendations to share/batch repeated geometry and avoid
unnecessary repeated scene/shadow work:
[scene optimization](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene/),
[shadows](https://doc.babylonjs.com/features/featuresDeepDive/lights/shadows).

## Future feature backlog — not in this polish milestone

1. **Circuit Mastery:** local bronze/silver/gold targets and a compact progress
   view using existing Time Trial records. Test fair targets per circuit/rules
   version; leave all circuits available and avoid grind or currencies.
2. **Shareable ghost challenges:** versioned replay export/import first. A later
   short share URL needs storage; do not treat the cosmetic ghost as a trusted
   global leaderboard result or as live multiplayer.
3. **Curated challenges:** small authored races such as a precise one-lap sprint
   or a legal Hop/Thrust strategy challenge. Preserve discoverable shortcuts and
   avoid permanent driving instructions on the race view.
4. **Online friends:** separate specification and prototype. Build on the existing
   online roadmap, updating it for eight courses, rules/compiler 18 and five-second
   starting ghosting. Authoritative shared simulation, tick-stamped commands,
   complete restore state and latency/reconnection tests precede a hosted service.
5. **Double Hop / additional authored Hop routes:** isolated experiments after
   the base experience is proven. Evaluate control burden, flight readability,
   protected-area rules and competitive balance before committing to shipping.

Recommended first implementation slice: baseline/device checklist, compact race
HUD and independent Music/Effects settings. Then deliver the two visual benchmark
venues. This produces reviewable improvements without waiting for a new mode,
new circuit or network service.
