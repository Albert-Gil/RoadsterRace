# Grand Canyon retirement, Juniper Saddle and LAX runway grip

Owner request, 2026-11-07: drop the original Grand Canyon, keep only South Rim and call
it Grand Canyon; make both LAX runways drivable across their full width; fix the Hop
shortcut at South Rim's first turn; commit and push.

## Grand Canyon retirement (applies CIRCUIT_REPLACEMENT_PLAN.md)

- The original `grand-canyon` (v5) leaves the circuit registry. Its source, presentation
  and unit regression fixtures remain in the repository; its browser spec is removed
  because the layout can no longer be opened.
- South Rim keeps its stable ID `canyon-south-rim` and is displayed as **Grand Canyon**.
  It moves to card 05; LA nights to San Diego Fleet keep their order; LAX is card 10.
  Ten venues are active.
- `?circuit=grand-canyon` and saved circuit preferences open the surviving Grand Canyon
  through a navigation-only alias (`south-rim` also works). Saved tournaments, records,
  ghosts and medals still validate exact physical IDs: an unfinished schedule containing
  the retired layout cannot resume, and its records are not transplanted.
- Frontier Cup and Frontier Champion are three rounds: Grand Canyon → Capitan Yosemite →
  Snowy Tahoe. Earned Frontier badges, challenge stamps and medals (including medals on
  the retired layout) stay credited.
- Full Tours, Pages smoke groups (`.github/workflows/pages.yml`, `tools/check-pages.mjs`)
  and capture/benchmark tool lists use the ten active venues.

## Grand Canyon v2: Juniper Saddle (first-turn Hop shortcut)

**Problem.** The hidden Juniper Saddle left the climbing west road at about 76° and
rejoined the eastbound straight at about 72°. Its support is only the 16 m lane plus 1 m
either side, with unsupported canyon pits on both sides. In simulation, a correctly
timed Hop at a 5-second drawing pace (about 25 m/s) still ended in a fall off the lane
at the entry corner: every Hop timing tried at that pace had at least one recovery,
while Redwall Traverse (the other trail) ran cleanly at the same pace.

**Change.** The trail now peels off the west road on its own 16 m-radius right-hander
and runs straight to the eastbound straight, joining it at about 25°. The rock stays on
the lane at the same relative position, height and orientation. The crest crossing,
Redwall Traverse, sections, scenery and all other values are unchanged. Track version
1 → 2 (Grand Canyon records and tournaments reset; the name change alone needed no bump).

| Practice pace / Hop lead | Before | After |
|---|---|---|
| 5 s lap, Hop 6–14 m before the rock | 1–2 recoveries (fall at entry) | clean, 0 recoveries |
| 6.5 s lap, Hop 6–10 m before the rock | clean | clean |

The shortcut saves about 46 m (803.6 m vs 849.7 m practice route; previously about 45.6 m). The Hop window on Juniper Saddle remains a little
narrower than Redwall's because the trail climbs about 11%. Hopping too late or too
early still hits the rock, as intended. Covered by
`tests/unit/venue-expansion.test.ts` (both paces, two Hop timings, zero recoveries).

## Grand Canyon v3: Juniper Saddle level with the road (2026-11-08)

**Reported after v2:** on the testing website the car still fell off or was reset at the
first-turn shortcut.

**Cause found.** Physically, v2 worked: lines up to ±6 m off the trail centre and
correctly timed Hops finished cleanly in simulation. But the trail climbed linearly to
its merge and ran 1–2 m *below* the hairpin exit road beside it. The road's sandstone
bank was therefore drawn across the second half of the trail, and the drivable trail
(lane + 1 m) was hidden under a rendered slope. A player following the visible
surfaces drew onto unsupported ground and fell. A hidden height step also separated
the trail from the neighbouring road.

**Change.** The west climb now tops out in the hairpin (10.4 m at 169 m instead of
203.5 m; about 10.5% instead of 7.8%). Juniper Saddle's linear profile therefore reaches
10.4 m at 55% of its length. Its rock moves from 52% to 64% of the trail, onto that level
top, and the merge with the eastbound straight is level with the road beside it. The
rendered trail now matches the supported area: a support overlay shows drivable ground
only on the drawn trail and road, and unsupported ground only on cliff faces. Track
version 2 → 3.

| Practice pace / Hop lead before the rock centre | v2 | v3 | Redwall (reference) |
|---|---|---|---|
| 5 s lap (≈25 m/s) | 6–14 m clean | 6–14 m clean | 6–18 m clean |
| 6.5 s lap (≈20 m/s) | 6–10 m clean | 6–10 m clean | 6–14 m clean |
| Lines ±2/4/6 m off the trail, both paces | clean | clean | clean |

Verification for v3: typecheck; regenerated rules; 636 unit tests in the 33 files that cover Grand Canyon or loop over every circuit passed. Simulated races used practice and offset lines at two paces and seven Hop timings, plus a rendered support overlay and a perspective capture of the trail.

## LAX v6: full-width runway grip

**Problem.** Only the 16 m reference road gripped. On the visible 44 m runways, a car
more than about 6.5 m from the centre line slid with sand grip and drag on tarmac that
looked identical.

**Change.** `TrackDefinition.pavedAreas` (polygons) gives full road grip inside authored
paved areas. LAX supplies both runway rectangles (x = ±74…±118 m, z = −160…290 m). This
affects grip only: support, barriers, progression, CPU lines, the camera and other
tracks are unchanged. The grey apron concrete and other ground stay loose runoff. Track
version 5 → 6 (LAX records and tournaments reset).

Covered by `tests/unit/lax.test.ts` (grid of runway samples; a raced line 18 m outside
the reference road on the west runway finishes with zero sand) and the updated wide-line
case in `tests/unit/circuits.test.ts`.

## Verification (cloud sandbox, 2 CPU cores)

- `pnpm typecheck` passes; `pnpm docs:rules` regenerated CURRENT_RULES.md.
- Full unit suite: 971 of 977 passed on the first run. The six failures were the
  out-of-date rules document, the LAX wide-line assertion (its excursion now stays on
  runway grip, as intended), and four time-outs on this slow machine. After fixing the
  first two, all seven affected files (180 tests, including the timed-out ones) passed
  with a longer time limit.
- Browser: the retired `?circuit=grand-canyon` link opens Grand Canyon; setup shows ten
  cards (05 Grand Canyon … 10 LAX); drawn Juniper Saddle lines through the real
  projection/drawing pipeline compile with no hazards at 0 and ±4 m offsets.
- Not run here: the complete Playwright suite and `test:pages` (GitHub Actions runs the
  smoke groups on push), and physical iPhone/iPad play.
