# Scenery with a visible impact

Approved after the owner's feedback, 2026-11-04. The canoe milestone was committed
separately. The 2026-11-05 implementation develops all nine venues below; see
[SCENERY_COMPOSITION.md](SCENERY_COMPOSITION.md) for the actual scope and evidence.
The table remains the art-direction brief, not a claim that every proposed detail
or long-term terrain change has been implemented.

## Why the previous details felt small

The whole-course phone camera compresses a 3 m prop into a handful of pixels.
Many additions were furniture clusters, surface noise or distant scenery. Those
can improve a close authoring view while leaving the playable picture almost
unchanged. Newport's utility-like infield and LA's separated low buildings on a
broad paved plane would benefit from a more substantial composition change.

Each next pass should rebuild a connected, visible part of the environment:
terrain masses, a waterfront, a street frontage or an amusement district. Keep
the road's fixed framing and full drawing surface. Inspect every proposal at
844×390 and 390×844 before spending time on small detail.

## Proposed order

| Order | Venue | Substantial visible change | Main constraint |
| --- | --- | --- | --- |
| 1 | LA nights | Rebuild the central blocks as recognizable street frontages: varied roofs, joined shopfronts, a bright theatre corner, an arts/backlot district and warm/cool baked light. Give the channel continuous embankments. | Keep the route, hidden Hop lane and cross-city cut protection clear and readable. |
| 2 | Launchsite | Compose a connected launch complex: a dominant rocket/gantry silhouette, an open hangar face, service roads, a coherent tank farm and restrained drifting vapor. | Existing yard heights/footprints and the Hop-able low tip and hairpin wing stay authoritative. |
| 3 | Golden Gate | Build connected, colorful city frontages, a landscaped waterfront and bridge abutments growing out of real rocky shores. Strengthen tower/cable shapes in gameplay. | Keep the bridge road-width only, supported buildings, accurate rails and approved cuts. |
| 4 | Newport Island | Make a recognizable island racing club: a low clubhouse/terrace, larger palm groups, gardens and coherent marina edge. Add readable shallow-water bands and shoreline foam. | Preserve the layout, sand allowance, protected garden and start-gate sight lines. |
| 5 | Santa Monica | Compose a denser amusement pier: readable wheel gondolas, a substantial coaster structure, supported boardwalk activity, convincing piles and moving surf bands. | Retain jump geometry, water opening and bypass; keep shortcuts unmarked. |
| 6 | Snowy Tahoe | Build a continuous mountain with carved road cuts, snow cornices, blue shaded gullies and a resort base around visible chairlift stations. | Follow authoritative heights/support and three natural takeoffs; keep the road visible. |
| 7 | Grand Canyon / South Rim | Connect elevated trails to continuous layered walls and broad talus slopes. Give the airborne crossing a clear canyon void and distinct receiving mesa. | Preserve crossing levels, real support and sloped-face clearance. Retain both canyons pending a replacement decision. |
| 8 | Capitan Yosemite | Connect granite feet with believable talus, compose forests around clearings and refine riverbanks and receiving waters. Colored canoes provide small-scale life. | Preserve creek crests, cedar trail, water support and phone sight lines. |

LA nights is the recommended first full pass: connected street frontage and
stronger light composition should change most of its visible picture. Launchsite
and Golden Gate follow because their architecture can create a similarly strong
identity without adding gameplay systems.

## Acceptance for each pass

1. Compare identical fixed desktop and phone views. The change should be obvious
   in a thumbnail without zooming into a prop.
2. Establish a recognizable large landmark and three distinct course areas. Aim
   for roughly 40–80 CSS pixels for the main visible landmark on landscape phones,
   subject to unobstructed road sight lines.
3. Rework a connected near-road area. A close authoring view is a secondary check.
4. Keep coherent palettes, clear road/water/terrain boundaries and pace-line
   readability. Selection cards stay free of descriptive captions.
5. Preserve the same camera, control rectangle and drawing area. Scenery must not
   force a zoom-out or hide an inside apex.
6. Validate support, visual/collision agreement, permitted shortcuts and blocked
   detours. New physical footprints/elevation require a separate track change,
   version bump and appropriate regression checks.
7. Compare frame times, draw calls, memory and loading against the baseline.
   Retain 90 one-car / 150 four-car scene draw-call targets with effects/ghost.
   Physical iPhone verification remains pending until hardware testing.

## Performance approach

- Rework existing batch geometry and ground maps first. Replace fragmented props
  with connected forms rather than increasing the number of objects everywhere.
- Bake facade lighting, window variation and contact shading into vertex colors
  or existing texture/atlas systems.
- Keep shared materials and static shadow caching. Avoid per-window lights and
  additional real-time reflection cameras.
- Use bounded, readable movement: one pooled vent, coaster train, existing lift
  animation or one batched surf treatment. Respect reduced motion.
- Keep workers, graphics tiers and resolution limits. Maintain full driving and
  drawing clearance when bringing scenery closer.

No new mode, ability, online service or handling change is proposed here.
