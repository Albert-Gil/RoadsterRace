# LAX — clear runway-to-runway boundaries

Owner-requested refinement of the local v3 layout, 2026-11-07. Working-tree
baseline commit is `cd6e2d7`; the existing uncommitted v3 work is preserved.
No commit, push or deployment is included.

## Change

The apron keeps its grey surface, but now has continuous red/white concrete
barriers on both sides. Each barrier is 1.35 m high and 0.8 m wide, with a tapered
body and pale top. The near face remains at least 5.2 m beyond the 16 m road edge.
Adjacent collision parcels share their exact endpoints, so the visible continuous
boundary has no hidden collision gaps. Small parcels retain effective broad-phase
collision rejection. Geometry appends to the existing structure batch.

White edge stripes become 0.7 m-wide flat paint, and 0.95 m red/white kerbs run the
full apron route. Paint stays on the grey tarmac; no separate asphalt ribbon,
additional material, light or rendering pass is introduced. The one fixed overview
now fits real apron-wall bases/tops as well as the existing road/gate/flight bounds;
it remains stationary and identical across drawing, preview and racing. Distant
runway ends are still excluded, and no extra Hop envelope is added above walls.

Both broad runways, public-street continuations, seven terminals, the 770.1 m loop,
automatic takeoffs, hidden Center Way Hop and all human controls remain intact.
LAX track version becomes 4 for new collision boundaries. Global physics/compiler
stay at 20; names, paints and historical Collection progress remain preserved.

## Verification

New targeted cases verify continuous shared barrier cross-sections, five-metre
minimum runoff and swept 42 m/s impacts on both sides without tunneling. Existing
route/CPU/flight/Hop cases pass. Browser framing checks now include every apron
barrier top inside the safe course rectangle on desktop, tablet and both phone
orientations.

## Results

| Check | Result |
|---|---|
| Type checking / generated rules | Passed; `pnpm docs:rules` records LAX 4 and 222 solid footprints |
| Full unit run | **1,014 passed in 81 files** |
| Targeted barrier tests | Both continuous ribbons preserve shared cross-sections and over 5 m runoff; both swept 42 m/s impacts collide and remain inside the perimeter |
| Existing LAX gameplay | Main/hidden routes, all three CPU difficulties, repeated Hop laps, automatic takeoffs at 20/30/42 m/s with ±20° body yaw, complete start zone and geometry checks pass |
| Unchanged venues | All **30 handling fixtures** match `cd6e2d7` exactly for one/two/four cars across the other ten courses |
| Browser scenarios | All nine scenarios covered successfully: mouse/touch drawing, Solo, Time Trial ghost, hidden Hop and two-/four-human sessions |
| Final layout check | Desktop 1440×900, phone 844×390 and 390×844 at 2× density, tablet 1024×768; every apron barrier top lies inside the safe rectangle; same projection from drawing through racing |
| Tablet correction | Initial tablet-only check found a wall extending below the viewport; fitting real wall bases/tops corrected it. All four input/layout checks and a Solo race then passed; Time Trial was also rechecked |
| Medium native geometry | **44,970 triangles**, eight static venue batches, zero hidden reference-road points in desktop ray checks |
| Medium four-car race | **80 scene draw calls**, within 150, with Hop/Thrust active |
| Medium Time Trial with ghost | **36 scene draw calls**, within 90; one physical car |
| Frame sample | Median **13.3 ms**, p95 **13.4 ms** across 180 desktop frames; median unchanged from v3 |
| Production builds | Root and `/RoadsterRace/` builds pass |
| Local production smoke | Real touch preview and race start pass; sound enabled; no required asset failures or application errors |

The local gallery is `artifacts/lax-v4/index.html`, with matching before/after phone
views, final landscape/desktop/tablet captures, four-player results and a 30-second
actual-gameplay recording. The selection card is refreshed from the final scene.
Media remains in ignored artifacts; source packs and personal files are untouched.
Desktop timing is development-machine evidence, not a mobile hardware claim.

Physical iPhone/iPad Safari testing remains pending hardware verification.
