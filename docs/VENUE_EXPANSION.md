# Venue expansion — 2026-11-04

Implemented locally. Keep the previous circuit-craft and CPU work. No commit,
push or deployment has been requested for this expansion.

## Newport Island

Version 7, 305.6 m versus 292.9 m (+4.3%). Extend the eastern sweeper by scaling
its control points east of x=16 by 1.18 before deriving the bounded road edges.
The start stripe, western loop, tropical garden, harbour and protected parcels
retain their existing positions. Width stays 16 m.

## Capitan Yosemite

Version 4, 716.6 m. Slightly open the western bend and shift neighbouring authored
granite footprints outward by 8 m, keeping deliberate runoff. Move the hidden
timber trail's entrance upstream onto the northern road and use a broad entry
blend. Its compiled route is about 21.3 m shorter than the main route; previously
it was about 2 m longer. Actual time gained depends on pace, drift and Hop timing.

Three main-road water crossings are automatic, independent forward crests:

| Crossing | Gap | Launch boost | Speed term | Intended character |
|---|---:|---:|---:|---|
| Bridalveil / valley creek | 8 m | 10 m/s | 0.10 × forward speed | Existing crossing |
| Sentinel tributary | 6 m | 9 m/s | 0.10 × forward speed | Second crossing on the southern straight |
| Cathedral tributary | 6 m | 9 m/s | 0.10 × forward speed | Western creek after the bend |

These use existing gravity (36 m/s²), flight guidance, real support checks and
recovery. No ability is automatically pressed. Ordinary 20/30/42 m/s approaches
are checked; slow/disrupted approaches can still fail. Manual Hop does not stack
a crest impulse. The timber shortcut bypasses the western creek as part of its gain.
The Sentinel takeoff is at x=60 on the southern straight, leaving 46 m of runout;
the Cathedral takeoff follows the western bend with 32 m of runout.
Six-lap clean CPU medians after this placement are 186.14 / 175.21 / 171.04 seconds
for Easy / Normal / Hard; all nine reference runs have zero collisions/recoveries.

Four waterfall curtains share one batch and texture, with 24 longitudinal steps
per strip (2,112 triangles total). Three tributaries share one water mesh. The
rendered bank-distance treatment covers all three; physics uses their exact
authored water openings. Reuse the existing bounded mist/droplet pool rather
than multiplying particles for each new fall. No jump hints or activation paint.

## LA nights

Retain track v4 and every physical value. Replace the freestanding dark ribbon
with a flood-channel maintenance causeway: a solid concrete wedge, neutral
poured paving and small edge drains. Its top follows the
existing 8 m approach and 1.2 m rise. It stops at the channel lip; it creates no
deck over the water or extra obstacle. Geometry reuses the existing concrete
material, with matching UV attributes for safe static batching. Appearance is in
`urbanRampAppearance` in themes.ts.

## Grand Canyon: South Rim — additional replacement candidate

Circuit ID `canyon-south-rim`, version 1, ninth in selection. The original
`grand-canyon` remains unchanged at version 5 and remains playable in every mode.
The name distinguishes the two during comparison; it is an original compressed
canyon course, not a geographic reproduction of a real driving trail.

First playable layout: about 850.7 m of 16 m packed-dirt road, winding western
climb, a high sandstone shelf, eastern rim sweeper and a descent to the lower road.
The figure-eight crossing is a required automatic airborne overpass, with a
30 m opening from a 12 m lip to a 10 m receiving mesa. There is no bridge deck
or constructed ramp over the lower road. The 70 m approach and 80 m receiving
runout are straight. Launch tuning reuses 29 + 0.05 × forward speed and gravity 36.
Existing guidance, contact, recovery and dirt grip apply without extra CPU forces.

Two hidden manual-Hop branches:

- Juniper Saddle cuts the western climb, saving about 45.6 m.
- Redwall Traverse cuts inside the eastern rim, saving about 32.1 m.

Each crosses an irregular 2.8 m natural rock pile with protected ends. Only the
named pile in a compiled forward traversal has height clearance. No continuous
service wall, signs, special paint or preview badge. CPU drivers keep the normal
route and use their existing legal decisions. A slow approach to the mandatory
overpass can fail even when the geometry compiles; this is ordinary flight physics.

The scenery reuses the bounded canyon landscape pipeline: layered temples,
broad weathered trail feet, irregular dirt edges, rim walls, dry washes, juniper
and sage. Static materials/geometry remain batched and existing graphics tiers,
resolution caps and static shadows remain active. The course has a wider shadow
frustum, with the same map resolution and no extra light or screen pass.

### Further replacement decision

1. Compare both canyons on actual phone landscape/portrait views and complete
   races, concentrating on sight lines at the crossing and the scale of the roads.
2. Tune South Rim's corner rhythm and shortcut reward from real play. Preserve
   the original while this comparison remains open.
3. Refine visible near-road geology within the existing protected footprints and
   batching budgets. A second overpass remains an optional later layout change;
   the first version deliberately uses one crossing and two Hop branches.
4. Consider replacing or renaming the original only after explicit owner approval.

## Integration and compatibility

All modes, local player counts, 1–6 laps, Full/Custom Tours and fastest-lap ghosts
use the common registry. Newly created Full Tours append South Rim; existing
schedules are not rewritten. Changed Newport/Yosemite track versions invalidate
their older records/replays and tours through existing compatibility checks.
Other track versions, physics 18, compiler 18 and CPU controller 2 are unchanged.
Names, paints, audio and lap preferences remain intact.

Physical iPhone Safari performance, sound and drawing comfort remain pending
hardware testing; emulation is supplemental evidence. See VENUE_EXPANSION_TESTS.md
for the completed local checks and capture paths.
