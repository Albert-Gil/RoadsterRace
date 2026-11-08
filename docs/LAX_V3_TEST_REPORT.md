# LAX — two broad runways and readable apron circuit

Baseline: `cd6e2d7`, 2026-11-07. This owner-requested refinement remains local for
review. No commit, push or deployment is part of this change.

## Delivered

- Exactly two 44 m-wide, 330 m-long runway surfaces replace the former pairs.
  Their thresholds, numbers, centre dashes and edge stripes span the consolidated
  surfaces. Existing racing sectors run within them without a separate overlay.
- The connecting route is clearly outlined on its unchanged grey apron, with
  white edges, selective red/white apex kerbs, two parked jets and two equipment
  bays around its curves. All substantial props share authoritative footprints.
- Public streets continue beyond both race turns, with curved concrete closures
  guiding cars around the circuit. Closed road tails remain outside progression
  and camera bounds. Their geometry joins the main bends without overlapping
  vertical faces through the driving surface.
- Seven terminals, the 770.1 m loop, two automatic takeoffs, hidden Center Way Hop,
  full touchdown rectangle and fixed phase-consistent camera remain intact.
- LAX track version increases to 3 for changed collision scenery. Global physics
  and compiler remain 20; other course geometry/versions and ability tuning are
  unchanged. Preferences and historical Collection progress are preserved.

## Verification

Focused checks cover runway containment/obstacle clearance, five-metre runoff,
actual street-closure contact before support ends, full start-zone clearance,
normal and hidden routes, automatic launches at 20/30/42 m/s with ±20° body yaw,
all CPU difficulties, repeated Hop laps, surface normals and geometry budgets.
## Results

| Check | Result |
|---|---|
| `pnpm typecheck` | Passed |
| `pnpm test --maxWorkers=4` | **1,011 passed in 81 files** |
| Focused LAX coverage | 22 cases, included in the full suite; main/Hop compilation, both automatic launches at 20/30/42 m/s and ±20° body yaw, CPU difficulties, repeated Hop laps, runway/obstacle/runoff/start-zone checks, physical closures and upward surface normals |
| Unchanged-course handling | All **30 fixtures** match `cd6e2d7` exactly for one/two/four cars across the other ten venues |
| LAX browser suite | **9 passed**: real mouse and touch drawing, fixed framing, Solo, Time Trial ghost, hidden Hop, two-/four-human races |
| Layouts | Desktop 1440×900, phone landscape 844×390, phone portrait 390×844 and tablet 1024×768; touch views use 2× density |
| Main route / private drawing | Hazard-free reference line; full road/gate/branch fits the same safe camera in planning, preview and racing; sequential multiplayer plans remain private |
| Race evidence | Four Solo cars finish without recovery; the hidden Hop race completes without collision/recovery |
| Native geometry | **42,642 triangles**, eight static batches, no nonfinite vertices; no hidden reference-road points in desktop ray checks |
| Medium four-car race with Hop/Thrust | **80 draw calls**, within 150 |
| Medium Time Trial with ghost and abilities | **36 draw calls**, within 90 |
| Desktop frame sample | Median **13.3 ms**, p95 **13.4 ms** over 180 frames; previous median was also 13.3 ms. This is development-machine evidence, not a mobile hardware claim |
| Generated rules | `pnpm docs:rules` completed; LAX track 3, physics/compiler 20 |
| Production builds | Root build and `/RoadsterRace/` build passed |
| Local production smoke | Actual touch preview and race start passed under `/RoadsterRace/`; sound enabled, production inspector absent, no required request failures or application errors |
| Review gallery | Seven images load and the actual-gameplay MP4 is 30 seconds |

Review media is in `artifacts/lax-v3/index.html`: matching phone before/after
views, desktop course view, actual gameplay, automatic transfer, hidden Hop and
four-player result captures. The circuit card was refreshed from the real scene;
its central artwork revision was updated to prevent stale cached previews.

The exported street tails beyond their physical closures are decorative, closed
public roads. They grant no additional support, checkpoint credit or shortcuts.
Normal street approach support and both existing automatic-jump trajectories
remain unchanged. No public release or repository commit was performed.

Physical iPhone/iPad Safari usability, sustained performance and sound remain
pending real hardware testing. Automated touch layouts supplement that gate.
