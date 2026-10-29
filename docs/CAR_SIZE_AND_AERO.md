# Larger cars, steel rear aero and a five-second ghost start

This follow-up supersedes the smaller aero lip and the original car dimensions recorded in `VEHICLE_REFINEMENT.md`.

- Visible racing cars are **15% larger** relative to the circuit: the artwork scale changes from 1.12 to 1.288. Replays, contact shadows, surface-fitted tyres and mounted effects read the same central scale. Fixed gameplay framing and road layouts are preserved.
- The physical car is also **15% larger**: 2.53 m wide, 5.98 m long and 1.2075 m in vertical contact height. `src/core/vehicle-size.ts` owns these dimensions; every registered track, swept barrier/car contact, starting grid, support query and clearance check uses them.
- A wider, deeper raised rear wing replaces the low aero lip. It has an airfoil, small endplates and two slender dark supports. The wing remains satin stainless steel even when the body is painted another color. Its mesh is batched into the existing metal group; the wing casts a real shadow.
- All multi-car races have **five seconds of starting ghosting**, measured by the fixed 60 Hz clock. Car-to-car contacts and scrapes are disabled during that period; barriers, terrain and abilities remain active. Pause freezes the remaining time. Restart, rematch and tournament rounds reset it. Time Trial, its cosmetic replay, and the one-car Tutorial do not introduce a starting contact-ghost period.

The race model is **9,904 triangles** and the showcase **43,036**. The original model-space width adapter remains 2.2 m; its centrally enlarged render scale applies the requested growth without changing the underlying licensed source conventions. The existing readability allowance between artwork and physical collision size is retained.

The four forward thrust cores are merged into one mesh per car, with the original four nozzle positions and all 128 effect triangles preserved. This removes three draw calls per active car. Length pulsing stays cosmetic, and the merged geometry is built before parenting so the enlarged vehicle scale applies only once.

No extra acceleration, grip, braking power, speed or ability tuning is introduced. Larger footprints and the longer contact-free start intentionally change contacts, hazard clearance and race outcomes: **rules 17 / compiler 17** segregate records/replays and reject incompatible championship resumes. Track versions and road geometry remain unchanged. Names, paints and lap preferences survive.

The historical flat-ground force regression fixtures still apply. Exact full-race comparisons against the old contact rules are intentionally inapplicable to this behavior change. Verification must cover the larger grid, narrow roads/rails, authored jumps and five-second contact boundary.

Local comparison captures and test evidence are in `artifacts/aero-followup/`; the car inspection gallery remains in `artifacts/vehicle-upgrade/`. Physical iPhone/iPad Safari checks remain pending hardware testing.

## Verification

- Type checking, generated rules and the production build pass.
- The full unit run exercised 663 cases: 659 passed immediately; four fixtures still assumed the former ghost period or smaller approach footprint. Those fixture-only assumptions were updated and all four cases passed their focused reruns. A separate 69-case regression run and final six-case model/rules run also pass. Historical flat-ground force snapshots remain unchanged; an exact old whole-race comparison is not applicable to the intentional contact changes.
- Twenty browser checks cover the model, five-second ghost/pause/restart behavior, actual WebGPU rendering, slope contact and every venue in Time Trial and four-car Solo Race. The Solo Race rematch journey also passes.
- Two additional rendering-only stress cases force simultaneous thrust, skid marks and impact dust without modifying simulation or recorded inputs. Final peak scene calls are **86** in Time Trial with its cosmetic ghost and **142** with four cars, within **90 / 150**. All eight venue checks also pass.
- A complete race using actual touch events passes in the local production build. The final batched-exhaust build passes the production smoke check with no required asset failures or browser errors.

Logs, stress samples and before/after captures are local artifacts. The raw full-run log retains its four initial outdated-fixture failures; the focused rerun logs document their resolution. This verified follow-up is committed separately from the subsequent enlargement. The preceding `b0ef472` release was separately verified live on both phone orientations and through a complete public Capitan Yosemite touch race; it does not yet include this follow-up.
