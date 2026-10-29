# Snowy Tahoe alpine upgrade — 2026-10-28

Historical v2 milestone. The steeper current v3 is documented in
[TAHOE_MOUNTAIN_UPGRADE.md](TAHOE_MOUNTAIN_UPGRADE.md).

The owner confirmed both real road elevation and animated weather. Snowy Tahoe
advances to track version **2**; its horizontal layout/length, 16 m width, snow grip,
speed caps, abilities and hidden forestry Hop lane are preserved.

## Real terrain

The road leaves the flat lodge/forestry district, climbs smoothly to a 12 m ridge,
then descends to the level start straight. Road grades change height and pitch,
with no extra uphill/downhill acceleration. The start approach, repeated-lap seam
and complete forestry lane remain flat. There is no new automatic jump.

A deterministic core heightfield carries the road and surrounding snowy runoff.
The renderer, input ray, route compiler, grounded vehicles, landing checks and
shadows read that same surface. The road is a cut through broad snow hills rather
than a floating ribbon. Off-road lines remain allowed; the lake and protected
parcels still produce the existing hazards/physical outcomes.

Core terrain is fixed data, independent of theme, graphics tier, rendering time
and weather. Only Tahoe's track version changes; rules 15/compiler 16 and the six
other tracks are retained, subject to exact legacy regression checks. Existing
Tahoe records/tournaments are incompatible with v2; ordinary preferences survive.

## Alpine detail and movement

- Steep-roof timber lodge and two chalets: closed gables, warm glazing, mullions,
  terraces, handrails, icicles, stone foundations, chimneys and stacked firewood.
- A protected tracked snow groomer and timber benches.
- Grounded lift terminals and pylons, sagging cables and eight moving chairs
  batched into one mesh. Foundations follow authored terrain heights.
- Irregular fir boughs, snowy crowns, exposed trunks, granite outcrops and a curved lake shore.
- One bounded snowfall mesh, with falling flakes, gradual gusts and varying density.
  Weather has no effect on traction, AI, timing or records. No new sounds are added.

Reduced motion hides snowfall and freezes the lift. No custom shader, weather
service, extra renderer, new tutorial text or shortcut signage is introduced.
Presentation remains centrally editable in `themes.ts`; native art is original.

## Review and verification

Local play: `http://127.0.0.1:5181/?circuit=snowy-tahoe`.
Before/after captures and the new review gallery are under `artifacts/tahoe-alpine/`.
The previous v1 milestone and its report are retained for history.

Verify real height/drawing alignment, six-lap CPU completion, normal/wide/Hop routes,
all modes, actual movement/reduced motion, High graphics, phone orientations,
rendering budgets and `/RoadsterRace/` production touch play. Run types, unit tests,
generated rules, the production build and exact legacy comparisons.

Physical iPhone/iPad Safari comfort, sound, thermals and sustained performance are
pending hardware testing. This request does not commit, push or deploy the update.
