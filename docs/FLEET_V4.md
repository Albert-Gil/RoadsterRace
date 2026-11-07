# San Diego Fleet v4 — separated naval ships

## Course and crossing changes

Fleet remains a stationary six-vessel formation: two aircraft carriers, two escorts and two auxiliary ships. The 736.8 m main lap now contains four automatic water jumps. The former two continuous graded connections have been removed. All six automatic launches have 16 m-long, 16 m-wide steel ramps rising 3 m above their source deck. Ramp axes follow the straight driving line; their mouths are perpendicular to their final world-space direction, avoiding shear-induced misalignment. Asphalt and ramp surfaces meet at a common 0.035 m artwork offset. Water guides remain drawing-only surfaces.

| Crossing | Source → receiver | Gap | Vertical launch |
|---|---|---:|---|
| Carrier A → escort A | 24 → 16 m | 14 m | 8 + 0.08 × forward speed |
| Escort A → carrier B | 16 → 22 m | 12.53 m | 20 + 0.03 × forward speed |
| Carrier B → escort B | 22 → 16 m | 14 m | 8 + 0.08 × forward speed |
| Escort B → carrier A | 16 → 24 m | 12.53 m | 26 + 0.03 × forward speed |
| Carrier A/B → auxiliary A/B | 24/22 → 24/22 m | 8 m | Existing manual Hop |
| Auxiliary A/B → escort A/B | 24/22 → 16 m | 12 m | 8 − 0.10 × forward speed |

The higher uphill impulse clears the receiving carrier's hull with the complete car footprint. Auxiliary exits deliberately reduce vertical impulse as forward speed rises: this keeps slow arrivals supported without carrying fast arrivals into the escort's bridge. The two uphill returns also author an 18.5 m/s CPU reference approach target, scaled by ordinary difficulty. The planner brakes at least 40 m before the ramp and carries the planned pace through the receiving bend. This is a lower target on its own racing line, not a simulation speed cap; human routes and all vehicle force limits remain unchanged. Clean six-lap CPU tests cover all three opponents/difficulties. These are track-specific coefficients; gravity, Hop, Thrust, grounded handling and CPU abilities are unchanged. Both shortcuts retain their stable IDs and ordered entry/return recognition. The main return jumps remain part of either route choice.

The auxiliary entry gap is one-third wider than v3, and its exit gap is twice as wide. Raising auxiliary decks to carrier height makes the manual entry more demanding than a drop; eight metres retains usable takeoff timing at normal pace. Their working decks remain completely rideable and unmarked apart from physical equipment/edge protection. The 16 m centre corridor stays clear. Fleet Explorer still completes both support sequences in one lap.

## Ship artwork

Original procedural artwork interprets carrier/destroyer references rather than reproducing a named vessel. Carriers have long side-mounted command islands with separate navigation and flight-control blocks, dark bridge glazing, exhaust trunks, radar arrays and trussed masts. Escort bridges are angular and carry integrated radar panels; auxiliaries now have compact edge wheelhouses. Aircraft, rescue helicopters, lifeboats, catapult channels, deck elevators, ladders and hull identification retain the native shared batches.

Hull rings use longitudinally tapered forebodies below the flight deck, deeper keels and narrower waterlines. The deck overhang stays consistent with authoritative support polygons. All significant above-deck structures have matching physical footprints and heights; there are no tower/aircraft overlaps. The constrained naval-deck exception keeps at least 2 m road runoff and is restricted to named supported structures. Phone and desktop fixed cameras include their tops without changing between interactive phases.

References inspected: [USS Midway flight deck and Island/Bridge](https://www.midway.org/visit/our-exhibits/flight-deck-exhibits), [U.S. Navy CVN79 island photo](https://www.dvidshub.net/image/5418077/cvn79-island-landing), and [Naval History and Heritage Command Arleigh Burke photographic collection](https://www.history.navy.mil/content/history/museums/nmusn/explore/photography/ships-us/ships-usn-a/uss-arleigh-burke-ddg-51.html). Reference photographs are not runtime game assets.

## Compatibility and review

Fleet track version is 4; physics remains 19 and compiler 20. Other nine track versions/geometry remain unchanged. Fleet records, ghosts and affected championships invalidate through the existing checks; names, paints, laps and historical medals persist. No commit, push or deployment is included in this update.

Review media and verification are in `artifacts/fleet-v4/`; measured results are summarized in `docs/FLEET_V4_TEST_REPORT.md`. Physical iPhone/iPad Safari comfort, audio and performance remain pending hardware testing.
