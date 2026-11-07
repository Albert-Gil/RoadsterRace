# LAX — airport circuit, first playable version

Owner-approved setting and sketch, 2026-11-07. Verified locally first. The owner
subsequently authorized commit and push on the same date; Pages publication remains
conditional on successful main-branch verification.

## Course

`lax`, track version 1, 16 m reference road, dry-asphalt handling. The circuit follows
the supplied sketch: the western runway straight travels north, a linked northern
taxiway leads to the eastern straight, and southern return bends connect an inner
terminal horseshoe. The departures road rises gradually to 6 m, then descends on the
opposite connector. Grounded slopes change height and pitch, not horizontal forces.

Seven original terminal groups surround the horseshoe, with gate airliners, jet
bridges, covered entrances, skylights, baggage dollies and tow tractors. The infield
contains a Theme Building-inspired four-arch restaurant and a tall control tower.
Two parallel strips on each side make the outer straights read as an airport;
the inner strip carries the race. Outer runway strips and distant apron aircraft
are scenery, not extra course progression.

This is a fictional racing interpretation with **seven** terminal groups requested
by the owner. It is not an exact operating-airport map. Fictional liveries and
markings are original; airport buildings are visual references, not affiliations.

## Jumps and shortcuts

- Two automatic service-road crests, one on each runway straight. Each rises 1.8 m
  over a 12 m approach and returns to ground over 36 m. Initial launch is
  `6.5 + 0.09 × forward speed` m/s using existing automatic gravity of 36 m/s².
  These are physical raised road surfaces with continuous receiving pavement.
  They do not require Hop or Thrust, and do not add water openings.
- One hidden `center-way` elevated cross-connection cuts the horseshoe. Its 16 m
  lane crosses ordinary service equipment 1.8 m above the deck. Only a compiled
  forward traversal exempts that named obstacle from the usual protected-area
  collision rule; a real manual Hop with full vehicle clearance is required.
- The open northern apron allows ordinary inside cuts through the linked taxiway
  bends. Terminal buildings, parking structures, planted parcels and departure
  guardrails remain protected. There are no shortcut signs, activation markings,
  preview badges or automatic Hop commands.

The normal reference line is hazard-free. Computer drivers use the main route,
shared handling and legal abilities; they receive no special landing assistance.
The full drawing touchdown area remains clear on the western straight. All
interactive phases use one fixed, height-aware whole-course camera.

## Integration and compatibility

Solo/CPU, local Multiplayer, Time Trial, 1–6 laps, Custom Tours and newly created
Full Tours discover LAX through the normal registry. Existing saved schedules are
not rewritten. Current rules are 20 (including the independently requested
post-recovery ability refill); compiler remains 20. Existing course geometry and
track versions are unchanged.

LAX is initially an additional local venue. The original Grand Canyon and the
four-round Frontier Cup/Frontier Champion remain playable. The planned ten-venue
retirement/rename is recorded separately in CIRCUIT_REPLACEMENT_PLAN.md and is not
silently applied while the new venue is being reviewed. Historical medals, challenge
stamps, paints and preferences are preserved.

## Artwork and performance

All airport geometry is original procedural source in `src/presentation/lax.ts`.
Terminal/aircraft placements and physical obstacles are authored together in
`src/core/tracks/lax.ts`. Appearance, materials and fixed-camera elevation live in
`src/presentation/themes.ts` (`laxAppearance` and the airport venue roles).

Eight static, vertex-coloured batches share the existing renderer and shadow
cache. There are no individual runway lights, reflection cameras, extra render
passes, moving physical aircraft or external model downloads. Native geometry is
bounded by the existing 120,000-triangle ceiling. Preserve the 90 Time Trial/150
four-car scene draw-call limits; test effects while active.

## Visual references

- [Official LAX terminal map](https://www.flylax.com/lax-terminal-maps)
- [Official LAX airfield reference](https://www.flylax.com/sites/lax/files/documents/FS%20-%20Airfield%20Feb_2021.pdf)
- [Official Theme Building reference](https://www.flylax.com/sites/lax/files/documents/FS%20-%20Theme%20Building.pdf)
- [Terminal 2 roadway information: Center Way shortcut](https://www.flylax.com/terminals/terminal2)
- [Terminal 6 roadway information: terminal cross-connection](https://www.flylax.com/terminals/terminal6)

Physical iPhone/iPad Safari drawing comfort, sound and sustained performance remain
pending real hardware verification. Automated phone tests supplement that gate.
