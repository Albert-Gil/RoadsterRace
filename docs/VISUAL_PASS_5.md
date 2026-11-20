# Visual pass 5: San Diego Fleet harbour life and LA nights rooftops

Owner request, 2026-11-20 ("continue improving"). Presentation only: no support, barrier,
grip, progression, camera, track-version, rules or physics change.

## San Diego Fleet harbour
- The open water around the moored fleet now has three tugs, three patrol boats, six
  sailboats and two channel-buoy lines (red/green). The vessels have bow waves and V wakes, and
  about 320 wind ripples break up the flat sea (`fleet-harbour.ts`, values
  `fleetHarbourAppearance`). Vessels are authored small and scaled 1.6–2.4× to read at the
  overview camera's height.
- Every vessel and buoy stays at least 30 m from every deck and barrier footprint, the course,
  the Hop lanes and every automatic-crossing corridor (`tests/unit/fleet-harbour.test.ts`).
  Water remains a hazard and nothing floats where a car could land.
- Vessels join the existing equipment batch and wakes/ripples the waterline-foam batch:
  medium draw calls are unchanged (11).

## LA nights rooftops
- The low and mid-rise roofs (< 32 m) the overview looks straight down on get mechanical plant
  with fan discs and ducts, timber water tanks on steel stands, solar rows, glowing skylights
  and a lit stair penthouse door (`la-rooftops.ts`, values `laRooftopAppearance`). Everything
  sits on the roof slab inside each building's footprint. Towers keep their crowns.
- Baked into the existing architecture and window batches: medium draw calls are unchanged (43).

## Verification (cloud sandbox)
- `pnpm typecheck`; 15 unit files covering Fleet (all versions), LA nights, landscape and
  scenery rules, plus the new harbour test, pass.
- Not run: the full unit and Playwright suites, High/Ultra captures, physical devices.
