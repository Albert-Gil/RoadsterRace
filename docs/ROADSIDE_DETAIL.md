# Details visible from the gameplay camera — 2026-10-29

This pass puts detail beside the course rather than expanding the distant scenery
envelope. Yosemite's separate v3 relocation is described in YOSEMITE_ROADSIDE.md.
This second pass is presentation only; all eight track definitions, rules and
compiled routes remain unchanged from that revision.

## Venue treatment

| Venue | Near-course detail |
|---|---|
| Newport Island | Coastal grass, small flowers, garden planters and slatted seating |
| Launchsite | Dry scrub, utility cabinets with vents and service-apron detail |
| Golden Gate | Street planting, protected plaza furniture and inset roof ventilation |
| Santa Monica | Beach grass, pastel planters, promenade seating and roof equipment |
| Grand Canyon | Low dry grasses and irregular worn dirt-edge traces |
| LA nights | Muted street planting, protected courtyard furniture and rooftop service boxes |
| Snowy Tahoe | Frosted low vegetation, chalet-area seating and subtle snow-edge wear |
| Capitan Yosemite | Meadow plants, ranger-area furniture and natural dirt-edge traces |

The palette, spacing, height limit and furniture limit live in `roadsideAppearance`
in src/presentation/themes.ts. src/presentation/roadside-geometry.ts generates
deterministic geometry; roadside-details.ts submits one vertex-coloured opaque
batch per venue. It receives shadows but adds no shadow casters, lights, bloom,
textures, network assets or animation. Scenery never enters camera fitting.

## Placement requirements

- Soft plants are under 0.7 m high and leave at least 2 m between their complete
  crown and every main/alternate road edge. These authored low plants are an
  explicit exception to the distant loose-scatter rule.
- The complete drawing touchdown rectangle, Hop lanes, takeoff approaches and
  jump corridors remain clear. No placement identifies a hidden shortcut.
- Support checks include the crown perimeter, not just its centre. Golden Gate
  additionally uses the actual authored city land because its legacy flat physics
  does not define water support. Plants cannot float beside the bridge or pier.
- Furniture and equipment remain wholly inside existing protected parcels. Roof
  hardware is inset within flat urban building footprints; no pitched alpine roof
  receives it. City furniture also avoids the actual individual facade footprints.
- Edge traces are flat colour geometry conforming to the authoritative ground.
  They are wear/grit, not new rocks, raised curbs, barriers or shortcut markings.

All new geometry is original procedural artwork. Existing models, recordings,
materials and licences remain intact. No additional download is required.

## Review

Compare the actual drawing/gameplay cameras at 1440×900, 844×390 and 390×844.
The local comparison gallery is artifacts/roadside/index.html; captures and test
logs remain ignored artifacts. Do not use a distant inspection camera to judge
whether the roadside details are visible while playing.

Physical iPhone/iPad Safari comfort, sound and sustained performance remain
pending hardware testing. Automated phone views supplement that check.

## Verification results

- Type checking and the production `/RoadsterRace/` build pass.
- All 680 unit tests in 52 files pass. After the final land-edge correction,
  all eight roadside placement tests pass again, including full crown support.
- All 24 exact handling fixtures (one/two/four cars across the eight venues)
  match the Yosemite-v3 HEAD. This presentation pass changes no simulation data.
- All 20 final browser checks pass. They include desktop, phone landscape and
  phone portrait captures for every venue, Time Trial with a cosmetic ghost,
  Solo Race with three CPU cars, Hop/Thrust and the simultaneous ground-effect
  stress fixtures. No browser errors were recorded.
- A complete touch-drawn production Yosemite race passes beneath the Pages
  base path, including sound activation, with no failed required asset requests.

Maximum measured scene calls on Medium, including shadows and active abilities:

| Venue | Time Trial + ghost | Four-car Solo Race |
|---|---:|---:|
| Newport Island | 84 | 131 |
| Launchsite | 68 | 115 |
| Golden Gate | 77 | 124 |
| Santa Monica | 72 | 119 |
| Grand Canyon | 43 | 92 |
| LA nights | 87 | 134 |
| Snowy Tahoe | 56 | 105 |
| Capitan Yosemite | 49 | 98 |

The additional simultaneous ground-Thrust/skid/impact-dust stress fixtures reach
87/143 calls on LA nights and 49/105 on Yosemite, below the 90/150 limits.
These are automated rendering measurements, not a claim of physical-phone FPS.
