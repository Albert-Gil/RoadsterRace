# Snowy Tahoe and venue refinement: local verification

Date: 2026-10-28. Baseline: `51acfaf92890d721d9b3f4bc39d7c583a783994b`.
This update is local and uncommitted; no deployment was requested.

## Delivered

- Seventh course: Snowy Tahoe v1, 554.8 m, 16 m packed-snow road, difficulty 3/5.
- Shared snow surface profile: 33.6 grip, no on-lane drag, powder blending to 7.5 grip/1.1 drag; unchanged speed limits and abilities.
- Hidden forestry Hop trail with a 1.25 m timber obstacle, protected ends and approximately 44.5 m saving. CPU drivers retain the bypass.
- Alpine terrain, a lake, a grounded lodge, a lazily merged snow-laden forest, ruts and quieter granular/powder feedback.
- Presentation-only refinements on the six existing circuits, with their geometry and track versions retained.
- All modes, seven-round new Full Tours, Custom Tours and saved older schedules.

## Automated verification

- Clean dedicated unit run: **41/41 files, 586/586 tests passed**, 546.86 seconds. This includes every circuit’s pace, wide off-road lines, six-lap/multi-car runs, computer difficulty, starts, gate timing, Hop/flight and saved-session contracts.
- **Type checking passed**, generated-rule checks passed, and the final `/RoadsterRace/` production build passed.
- **All 18 existing-circuit handling fixtures match HEAD exactly** (one, two and four cars with recorded Thrust/Hop commands). Rules 15/compiler 16 and all six old track versions remain valid.
- After the last terrain-generation optimization, the focused alpine corridor/planting test passed again.

Browser checks:

- Snowy Tahoe: **3/3 passed**. Real browser touch drawing at 844×390 and 390×844, equivalent pace; Solo Race with three CPUs, Hop/Thrust; Time Trial best-lap replay; four local humans; new seven-course tour and unchanged older six-course saved schedule.
- Venue budgets: **14/14 passed**, all seven venues in Time Trial and Solo Race, including a cosmetic replay-pose fixture and active abilities. The final lazy alpine renderer passed its two budget checks again.
- Production Pages-path smoke: **passed**, a complete Snowy Tahoe race with real touch input, enabled sound, no script errors and no failed required asset requests. The local inspector supplied coordinates only; the production page received no test hooks.
- Matching six-venue desktop baselines and **21 final desktop/phone landscape/portrait captures** are in `artifacts/snowy-tahoe/`, with no capture errors. The review gallery is its `index.html`.
- `snowy-tahoe-gameplay.webm` is a silent actual-gameplay browser recording of a complete Solo Race with CPU opponents, Hop and Thrust; its report confirms all four cars finished and no script errors occurred.
- The final production smoke completed again at 11:27 a.m. PDT, with a complete real-touch race, enabled sound, zero script errors and zero failed required asset requests.

Reference scene draw calls, Medium graphics (Time Trial includes a visible ghost):

| Venue | Time Trial | Four-car Solo Race |
|---|---:|---:|
| Newport Island | 84 | 127 |
| Launchsite | 68 | 109 |
| Golden Gate | 77 | 118 |
| Santa Monica | 72 | 113 |
| Grand Canyon | 43 | 86 |
| LA nights | 87 | 128 |
| Snowy Tahoe | 51 | 94 |

All remain within 90/150. Racing-car geometry remains 9,898 triangles.
These are rendering-cost checks, not certification of phone frame rate.

## Verification notes

The first broad run exposed an outdated six-course tour assertion and overly wide
shortcut-end vertices. Both were corrected. Shared-host load also exceeded several
wall-clock deadlines, and one later test experienced a roughly 16-minute system
scheduling gap. Long-session tests retain all fixed-tick completion and result
assertions; their wall-clock allowances now reflect multi-car/six-lap and seven-course
work. A clean dedicated pass follows the fixes. No gameplay assertion was removed.

Rules 15/compiler 16 are retained: Snowy Tahoe is additive, and existing-course
results must match the baseline. Source, build and generated-rule logs are retained
under the same ignored artifact directory.

## Remaining physical verification

Physical iPhone/iPad Safari comfort, sound, thermals and sustained performance are
**pending**. Test all seven venues in landscape and portrait, especially snow-road
contrast, drawing comfort and simultaneous controls. No online multiplayer, accounts,
leaderboards, public posts or additional hosting were added.
