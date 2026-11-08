# Circuit replacement plan — Grand Canyon and a new tenth venue

**Applied 2026-11-07** at the owner's request: the original `grand-canyon` is retired, South Rim (`canyon-south-rim`) is displayed as Grand Canyon, LAX is the tenth venue and the Frontier Cup is the three-round preset proposed below. See GRAND_CANYON_RETIREMENT.md. The text below is the original plan.

Update 2026-11-07: the owner selected LAX and authorized its implementation from a horseshoe/runway sketch. Its additional local preview is documented in LAX.md. The original ten remain registered during review, preserving the latest requirement that Frontier Champion uses the actual four-round cup. The proposed three-round replacement below has not been applied and must not silently replace that challenge. Retirement/rename activation remains separate.

Original planning record — 2026-11-07. Status: planning only. The recovery-ability refill is implemented separately under rules 20. This plan makes no circuit registry, layout, title or progression changes yet.

## Owner direction and release order

- Retire the original Grand Canyon layout (`grand-canyon`).
- Keep Grand Canyon: South Rim (`canyon-south-rim`) and display its name as **Grand Canyon**.
- Develop one additional California-inspired venue, keeping the released selection at ten circuits.
- The new setting is undecided. LAX and Beverly Hills are the owner's initial ideas; the alternatives below are proposals.

Recommended release order: keep the current ten playable while building/testing the replacement, then retire the original, rename the survivor and register the new venue together. Do not temporarily remove a venue from the live build or ship an unfinished replacement.

## Retirement and rename tasks

1. Preserve South Rim's physical geometry, stable `canyon-south-rim` ID and track version. Change its display name in its TrackDefinition, selection, results, Collection, tours and challenge labels. A display-name change alone does not need a physics/compiler/track-version increment.
2. Remove the original `grand-canyon` from the active registry when the new venue is ready. Retain its source/history and relevant regression fixtures initially; archive or delete unused runtime assets only after reference/build checks.
3. Keep saved records, replay ghosts and achievements attached to their original physical IDs. Never transplant original Grand Canyon times/medals onto South Rim or reuse its ID for different geometry.
4. Keep `?circuit=canyon-south-rim` working. Redirect the retired `?circuit=grand-canyon` navigation link to the surviving Grand Canyon after retirement. Apply this only to navigation/preferences: saved tournament/record validation must use exact physical IDs rather than navigation aliases.
5. Preserve driver names, paints, badges, lap preferences and historical awards. A selected retired venue can open the surviving canyon without changing stored race results.
6. New Full Tours and Custom Tour choices use the new ten-venue registry. Existing saved schedules are never reconstructed or silently changed. An unfinished schedule containing the retired original cannot resume; retain completed-round evidence/history and explain the incompatibility concisely.
7. Proposed new Frontier Cup: Grand Canyon (South Rim) → Capitan Yosemite → Snowy Tahoe. Update Frontier Champion's display copy, start venue and tests for the actual three-round preset; its completion evaluator already checks the real saved schedule against CUPS. Preserve earned Frontier badges/challenge stamps and distinguish historical four-round schedules rather than rewriting them.
8. Keep retired medals as historical achievements. Show active-venue medal completion separately (ten × three = 30) from archived medals; use lifetime achievement credit for cosmetic reward eligibility so already earned cosmetics never relock. The new venue has three fresh medals; South Rim keeps its own existing medals under its unchanged ID.
9. Suggested selection order: Newport Island, Launchsite, Golden Gate, Santa Monica, surviving Grand Canyon, LA nights, Snowy Tahoe, Capitan Yosemite, San Diego Fleet, new venue. Renumber only presentation cards. Audit index-based course lookups in tests/tools and replace them with stable-ID lookups where necessary.
10. Update thumbnail/capture lists, production smoke groups and Pages workflow matrix for the new active set. Test the old navigation link independently; do not retain a duplicate smoke group that merely redirects to the survivor. Update permanent guidance and generated rules; preserve historical planning documents.

## Candidate settings

These are fictional original racing venues inspired by California, not exact street/airport reproductions. Visual sources inform recognizable forms; proposed jumps and shortcuts are game design, not claims about real locations.

| Working title | Visual identity | Driving / ability opportunities | Production considerations |
|---|---|---|---|
| **LAX** — first recommendation | Large passenger jets, terminal canopies, control tower, baggage equipment and Theme Building-inspired arches; warm late-afternoon light | A runway-speed straight, terminal sweepers, technical cargo apron, an automatic service-road jump and one hidden equipment-yard Hop cut | Very readable large landmarks. Reuse the vehicle/equipment batching approach; build original civilian airliners. Keep aircraft static for the initial playable version and model runway lighting with bounded geometry/emissives, not individual lights |
| **Beverly Hills** | Palm boulevards, luxury storefronts, mansion entrances, landscaped gardens, hotel forecourts and sunny hillside villas | Fast boulevards transitioning into rolling residential bends; a small crest jump and a hidden courtyard/pool Hop route | Strong polished-lifestyle presentation. Keep tall palms outside road sightlines, substantial gardens/buildings inside protected parcels, and logos/storefronts original |
| **Palm Springs** | Midcentury villas, angular roofs, resort pools, palm groves and desert mountain backdrop | Flowing resort loop, wide sweepers, a descending estate road and a pool/service-yard Hop route | Distinct colours and low buildings suit phone visibility and batching. No new surface or force system is required |
| **Big Sur** | Rugged Pacific cliffs, cypress silhouettes, coves and an original concrete-arch bridge | Sweeping coastal road, real elevation changes, a technical headland and an optional natural-crest branch | Highest terrain/support and sightline workload. Build the road and actual supports first; scenery must not force unnecessary camera margins |
| **Sonoma Valley** | Vineyard rows, winery courtyards, stone cellars, oak trees and rolling hills | A varied estate circuit with elevation, sweeping vineyard bends, a cellar overpass and a small service-trail Hop cut | A new inland palette with inexpensive repeated scenery. Keep vegetation batched and do not rely on thousands of individually rendered vines |

My current preference is **LAX** for gameplay and large recognizable landmarks. Beverly Hills is the strongest alternative for a luxury California atmosphere. Palm Springs is a useful third option with clear visual identity and comparatively simple scenery silhouettes. The owner has not selected any candidate.

## Bounded first version after selection

- One non-rectangular, easy-to-read loop; initial target about 600–680 m, 16 m usable reference width, intermediate difficulty. Final numbers follow greybox testing rather than becoming promises before layout validation.
- Existing Solo/CPU, Multiplayer, Time Trial, single races/tournaments and 1–6 laps. Fair shared handling and the existing Hop/Thrust rules, including post-recovery refills.
- One clear automatic jump on the main course or a useful optional branch, plus one purposeful hidden Hop shortcut saving roughly 20–35 m. Authored support, landing ownership, vehicle clearance and ordered progression must agree with artwork. No additional ability, double Hop, interactive traffic or new race mode.
- Protect excessive cuts with context-appropriate structures while leaving useful runoff. Keep manual Hop areas discoverable through their physical layout, without signs, activation paint or preview badges.
- Fixed whole-course camera, identical through drawing/preview/racing. Prioritize actual phone gameplay framing and the full drawing touchdown area; exclude distant skyline from fitting.
- Original procedural geometry or already licensed source material, central appearance settings, static batching/instancing and cached shadows. No new per-object lights, reflection cameras, cloth, volumetric passes or renderer migration.

## Implementation gates

| Stage | Work | Gate |
|---|---|---|
| 1 | Select venue and create a layout/landmark sketch | Distinct identity and clear route/jump/shortcut flow |
| 2 | Build greybox driving/support/barrier geometry, initially behind development selection | All routes compile; main and Hop branches physically complete; safe recovery does not grant free progress |
| 3 | Validate phone projection, CPU and all modes before scenery | Mouse/touch drawing, 20/30/42 m/s launch probes, two/four-car traffic, six laps and CPU difficulty batches |
| 4 | Add large trackside landmarks and detailed materials in existing batches | Noticeable gameplay-camera improvements, not just distant background decoration |
| 5 | Retire/rename/register atomically; update cups, Collection and compatibility | Exactly ten active circuits; stable IDs and historic achievements preserved; no silent schedule migration |
| 6 | Run acceptance, capture and release checks | Typecheck, full unit suite, relevant browsers, rules/bake checks, root/Pages builds and production smoke all pass |

Retain 90 Time Trial-with-ghost / 150 four-car scene draw-call budgets and investigate sustained median-frame regressions above 5%. Set a static-geometry budget before detailed art; keep repeated scenery batched. Physical iPhone/iPad Safari comfort, sound and performance remain a real-device acceptance gate. Commit, push and deployment require a later instruction for that work.

## Primary visual references

- LAX: [official Theme Building reference](https://www.flylax.com/sites/lax/files/documents/FS%20-%20Theme%20Building.pdf), [official airport roadway/terminal map](https://www.flylax.com/sites/lax/files/documents/Ground%20Transportation%20Waiting%20Areas.pdf).
- Beverly Hills: [official Rodeo Drive visitor guide](https://lovebeverlyhills.com/itineraries/view/things-to-do-on-rodeo-drive).
- Palm Springs: [Visit California midcentury design guide](https://www.visitcalifornia.com/experience/mid-century-modern-design/).
- Big Sur: [Visit California Bixby Bridge landscape reference](https://www.visitcalifornia.com/experience/bixby-bridge/).
- Sonoma: [Visit California Sonoma County reference](https://www.visitcalifornia.com/experience/sonoma-county-wines-wineries/).
