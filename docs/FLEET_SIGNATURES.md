# San Diego Fleet — visible naval detail pass

2026-11-06. Presentation-only follow-up on the existing local Fleet v3. No commit,
push or deployment included. The complete pre-pass core fingerprint is stored in
artifacts/fleet-signature/core-before.json; all core source must remain byte-identical.

## Details visible during play

- Three stepped white command decks with broad dark bridge glazing, open balcony
  rails, trussed signal masts, original pennants and large white radomes. Carrier
  radomes are about 8.6 m across, inside the existing protected 22 m tower envelope.
- Warm red anti-fouling belts, large dark framed hangar bays, rescue-orange lifeboats,
  davits and under-flight-deck support detail on the actual tapered ship skins.
- Alternating light and naval-blue jets, folded raised wings, contrasting canopies,
  twin-tail markings, underwing stores and color-coded deck crew. Bright yellow
  rescue helicopters have glazed cabins, landing skids, orange tail booms and
  rotating main rotors.
- Clear aircraft parking aprons, circular helipads, oversized original 07/14 deck
  identifiers, catapult channels and flush aircraft-elevator panels. Flat markings
  are supported and kept outside the racing ribbon. Auxiliary working decks remain
  unmarked and fully clear; automatic ramps retain their existing visible style.
- Smooth painted-steel surface response replaces coarse asphalt grain on the flight
  decks. Colors and finishes remain centrally editable through fleetAppearance and
  sceneryFinishes.naval in themes.ts.

## Contracts and rendering

No road, support, barrier, ramp, collision, controller, drawing or ability changes.
Physics 19, compiler 20 and Fleet track 3 remain unchanged. All vessels remain stationary.
Tower, aircraft, crew and turret geometry stay within their real protected footprints
and heights. Lifeboats and hull dressing remain below the driving deck. Rotating arrays
and helicopter blades fit their protected parcels throughout rotation.

All detail merges into the same five static ship batches, one radar/rotor batch and
existing water mesh. There are no additional lights, reflection cameras or rendering
passes. Radar and helicopter motion share the existing bounded vertex buffers, with
per-owner rotation and reusable sine/cosine arrays; reduced motion freezes both.

Native geometry remains below the 120,000-triangle Medium budget. The live animated
measurements at 1440x900 Medium with legal abilities show 84 peak calls for four cars
(150 limit) and 35 with a Time Trial ghost (90 limit), median frames 9.1/8.7 ms and median
render submission 1.9/1.0 ms. These are desktop measurements, not physical Safari results;
previous frozen/reduced-motion captures are not a strict timing A/B comparison.

Original procedural source: fleet-model.ts and fleet-outfit.ts. No downloaded artwork,
models, fonts, licenses or services were added. New deck artwork is baked into the
existing selection thumbnail by the existing capture tool.

Review gallery: artifacts/fleet-signature/index.html, with matching pre-pass and current
desktop/phone views, carrier detail and actual gameplay. Physical iPhone/iPad Safari
comfort, sound and sustained performance remain pending hardware verification.


## Publication authorization

After local verification, the owner requested commit and push on 2026-11-06.
Public testing updates remain gated by the existing verified-main Pages workflow;
physical iPhone/iPad Safari acceptance remains pending hardware testing.
