# LAX implementation and verification — 2026-11-07

Local verification baseline: `7030aae`. The owner subsequently authorized committing
and pushing this verified update on 2026-11-07; Pages publication remains gated by CI.
The existing ten courses remain available while LAX is reviewed;
the original four-round Frontier Cup/Frontier Champion schedule is unchanged.

## Delivered

- `lax` v1: 1,256.2 m, 16 m roads, seven terminal groups, two long runway racing
  straights and an inner horseshoe with a hidden Center Way Hop connection.
- Raised departures road at 6 m, graded connectors, two 1.8 m automatic service-road
  crests, full-width drawing gate and the complete existing touchdown rectangle.
- Original terminal canopies/skylights, airliners, jet bridges, ground equipment,
  four-arch Theme Building-inspired restaurant, control tower, cargo hangars and
  parallel outer runway strips. Aircraft and driveable surfaces remain stationary.
- Terminal parcels, aircraft silhouettes, service vehicles, equipment and departure
  guardrails have authored physical footprints. Native planting stays within its
  protected parcels, clear of both the road and the Hop connection.
- Existing Solo/CPU, Multiplayer, Time Trial, 1–6 laps, Custom Tours and new Full
  Tours use the registry entry. No existing layout, handling tuning or track
  version was changed for the airport artwork.
- The independently requested recovery refill is retained under rules 20: both
  abilities become available when the recovery hold ends, subject to safe occupancy.
  Compiler remains 20. Historical preferences, medals and challenge stamps survive.

## Automated results

| Check | Result |
|---|---|
| `pnpm typecheck` | Passed |
| Full unit run, `pnpm test --maxWorkers=4` | **1,005 passed, 81 files** on frozen final source |
| `pnpm test:legacy` against HEAD | **30 fixtures matched**, 1/2/4 cars on all ten existing courses |
| LAX dedicated unit cases | Main/hidden route compilation; 18 automatic-launch probes across both crests at 20/30/42 m/s, ±20° body yaw and lateral velocity; all CPU difficulties; repeated Hop traversal; geometry and planting bounds |
| Main-route distance | Six laps with four cars; independent CPU plans also complete six laps |
| Mouse/touch drawing | Desktop 1440×900, phone 844×390 and 390×844, tablet 1024×768; real browser input reaches preview with seven seconds of counted timing |
| Fixed camera | Same camera position through drawing, preview and race; complete projected reference line on screen |
| Solo Race | Four cars finish, automatic takeoffs occur, no recovery in recorded race |
| Hop connection | Real Hop-button activation, completed lap, zero collisions/recoveries |
| Local Multiplayer | Complete two- and four-human races on phone landscape; private sequential plans and finishing results |
| Time Trial | Actual first-lap replay shown on lap two; one physical car; ghost remains cosmetic |
| Recovery abilities HUD | Desktop and phone checks passed: spend both abilities, miss a Fleet crossing, recover, observe both READY, then activate both again |
| Full Tour | All **11 rounds** completed, including LAX finale, with save/reload, controller identities, Hard difficulty and scoring retained |
| `pnpm docs:rules` / generated document check | Passed; current course values generated from source |
| Root `pnpm build` | Passed |
| `/RoadsterRace/` production build and Pages smoke | Passed; touch preview, race start, enabled sound, no failed requests or browser errors |
| Review gallery | Nine screenshot images load; 30-second actual-gameplay clip and full recording available locally |

The initial development runs found a terminal parcel too close to the southern
return and a fixed six-lap tick allowance too short for a 1.26 km course. The parcel
was shortened to retain runoff; the test now derives its allowance from race distance.
Generic roadside-scatter tests exclude LAX's native airport kit, just as the native
naval kit is excluded; airport planting has its own physical bounds test. The final
clean full run passed after the source was frozen.

## Rendering measurements

- **58,708 native static triangles**, below the 120,000 venue ceiling.
- Eight static vertex-coloured batches, existing material/sky system, cached shadows;
  no extra lights, reflection cameras or screen passes.
- Recorded four-car Hop/Thrust scene: **80 draw calls**, target at most 150.
- Time Trial with actual ghost and active abilities: **36 draw calls**, target at most 90.
- Desktop D3D11 headless sample, 180 frames: median **13.3 ms**, p95 **13.5 ms**.
  This is development-machine evidence, not a mobile performance claim.
- Geometry inspection: zero reference-line points obscured by airport structures or
  equipment from the desktop gameplay camera.
- Selection artwork is an authentic scene capture, approximately 46 KB WebP.

## Review material

Local preview: `http://127.0.0.1:5184/?circuit=lax`.
Gallery: `http://127.0.0.1:5184/artifacts/lax/index.html`.
Media and raw reports are in ignored `artifacts/lax/`; reusable circuit artwork is
`public/assets/circuits/lax.webp`. Airport design/tuning and reference attribution
are in `docs/LAX.md` and `docs/ASSET_RIGHTS.md`.

## Remaining acceptance

Physical iPhone/iPad Safari drawing comfort, sound and sustained performance remain
pending hardware testing. Automated touch/device emulation supplements that gate.
The course is a fictional seven-terminal racing interpretation, not an exact airport
reconstruction. Grand Canyon retirement/rename remains a separate planned change;
existing course IDs, achievements and saved schedules have not been reassigned.
