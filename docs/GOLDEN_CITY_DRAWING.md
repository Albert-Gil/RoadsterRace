# Golden Gate city and forgiving drawing

## Playing

Select Golden Gate in race setup, or open http://localhost:5173/?circuit=golden-gate. The flat clockwise course is approximately 442 m long, with a 12 m road, city boulevard, technical street corners, quayside chicane, 88 m suspension bridge and inland return. Other circuit geometry remains unchanged. All courses share the current pace and physics rules below.

Start on the line or just behind it. Draw one lap. The whole start/finish width is available, with up to 12 m of approach. A dashed approach box and forward chevrons show the accepted zone; the planning car is hidden. Start and finish may be on opposite sides of the stripe. Slow turns are red, intermediate pace amber, and fast sections green. Planning lines use 10/14 CSS pixels (color/outline); racing uses translucent 8/11 pixels.

The muted dashed stroke before the start is visible in drawing and preview but never influences race geometry, pace or counted drawing time. Forward crossings interpolate both position and time. After a full lap, the first forward finish crossing ends the counted drawing: lift anywhere afterward. All subsequent movement, pauses, reversals or extra laps are ignored, with no tail-distance limit; the ignored stroke remains muted while drawing and in preview. Wrong-way/incomplete laps and solid crossings in the retained lap cannot be confirmed. Touches have 0.5 m lateral tolerance and are projected onto the actual gate. Release within 1 m of the stripe remains supported.

The last and first 20 m blend into a shared crossing anchor halfway between the accepted start/end positions. Both sides cross forward. Preview displays the final joined route with compact Race/Lock in and Redraw controls; routine explanations are reserved for a future tutorial. The compiler preserves the pre-join pace by interpolation and adds no closing pause. Unsafe connections are rejected with a highlighted barrier section and concise validation error.

## Authoring contracts

- `src/core/start-finish.ts`: common gate coordinates, touch acceptance, interpolated trimming and endpoint joining. `TrackDefinition.startFinish` is authoritative on all three courses; fallback derivation supports small test fixtures.
- `src/core/route.ts`: compiler v7. Validate retained stroke, cleaned route, joined geometry and final smoothing with full vehicle clearance. Presentation metadata never reaches simulation. All players use the same 9–30 m/s pace mapping (108 km/h maximum intended pace without thrust). Shared gesture averaging uses a 5 m radius, up from 4 m; final triangular pace filtering uses 8 m, up from 6 m. Deliberate sustained pace differences remain; no per-stroke normalization is used.
- `src/core/tracks/golden-gate.ts`: Golden Gate v2 streets, checkpoints, solid footprints and explicit `bridges`. Bridge rails/supports carry a `bridgeId`; these are intentional exceptions to normal runoff. The 12 m deck has two 0.35 m edge rails, leaving 11.3 m between their inner faces. Approaches transition into solid rails; retaining walls protect the water boundary.
- `src/content/golden-city.ts`: supported land/building placement; every building footprint is on land and inside an authored protected block. No city placement enters physics.
- `src/presentation/bay.ts`: foundations, facades, shop windows, roofs, protected planting, quays, slim bridge towers and grounded distant blocks. `circuit-details.ts` extrudes bridge solids from collision footprints. No bridge shoulder, curb or oversized platform is rendered over the inlet.
- `src/presentation/themes.ts`: phase-specific `pace` widths, common colors, `cityAppearance`, scenery palettes and lighting. Cars, names, fonts, paints and branding remain replaceable independently.

City land/roof edges and walls are deliberately miniature and stylized, rather than a geographic reconstruction. The road remains flat. There are no elevation physics, jumps, hop or new surface rules. Rules v7 retains the faster normal pace and introduces a three-second multiplayer ghost start (see below). Thrust acceleration/timing, the 42 m/s absolute speed cap, sound roles and 10/6/4/0 championship scoring are preserved.

Multiplayer cars pass through one another for the first three seconds of racing, then normal car collisions and impact/scrape sounds activate. The shared fixed-step clock controls this period, so pause/countdown time does not consume it. Each new race, rematch and tournament round starts fresh. Barrier collisions, grip, off-road drag, progress validation and thrust continue normally during ghosting. Solo is unchanged. `CONTACT_RULES.ghostStartSeconds` controls the duration; the multiplayer HUD briefly shows a GHOST START countdown.

## Compatibility

Saved routes require compiler7 and the exact circuit ID/version. Golden Gate v1 routes cannot race v2. Tournament loading validates every scheduled track version and compiler/rules version; incompatible saves are not resumed. Ordinary name, paint and lap preferences use their separate existing storage key and are retained. Completed current-version rounds still resume normally; interrupted rounds require fresh drawings.

## Verification and review

Run `pnpm typecheck`, `pnpm test`, `pnpm build`, and the browser suite with the configured local Chrome backend. Focused checks: `pnpm exec playwright test tests/browser/golden-city.spec.ts`. Use `WEBGL_BACKEND=d3d11` on this development Windows machine; the default software backend is also available.

See the latest entry in `VERIFICATION.md` for actual results, performance samples and limitations. Review captures are in `artifacts/golden-city/`: a preserved v1 before view, new lead-in/connection previews, phone/tablet layouts and real bridge racing. Physical iPhone/iPad Safari input, audio, thermal and sustained performance verification remains pending until tested on hardware. No public deployment or promotion was performed.

Final handoff: type checking, 144 unit tests and the production build pass; all 38 functional browser scenarios have passing evidence across broad/focused runs. Final effect batching also passes a fresh drift check, the 70/136 draw-call captures and all 19 packaged checks. The preserved before view, final preview, lead-in examples, responsive captures and silent authentic 30-second clip live under `artifacts/golden-city/`. See VERIFICATION.md for the interrupted-capture history and exact hardware/limitations.
