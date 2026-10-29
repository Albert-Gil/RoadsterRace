# Yosemite waterfall upgrade

The thin rock-following water strips are replaced by an exposed waterfall with a visible ledge, recessed wet cliff, broken falling sheets, descending droplets, impact spray and a plunge basin. A smaller drop feeds the existing creek. The main fall drops approximately forty metres.

`yosemite-waterfall-shape.ts` shares the lip, cliff recess, airborne water path and basin placement. `yosemite-waterfall.ts` batches the curtains and renders the basin/ripples. The existing atmosphere batch now includes 54 falling streamers, 36 impact-spray sprites and 18 subdued valley-haze sprites. Appearance settings remain in `yosemiteAppearance.waterfall` in `themes.ts`.

The basin and its stone rim stay wholly inside the existing protected granite footprint. They add no driving surface or new water hazard. The cliff remains inside its existing height and footprint. The required creek jump, hidden timber lane, road/terrain heights, barriers, handling, camera framing, records and compatibility versions are unchanged.

The water's gravity is cosmetic, independent of vehicle flight rules. Only water texture offsets, ripple vertices and bounded cosmetic particles animate. Reduced motion freezes flow/ripples and hides moving spray. Standard materials and procedural textures support both WebGL 2 and the opt-in WebGPU renderer; alpha overlays remain outside the geometry buffer.

Local comparisons and video are in `artifacts/yosemite-waterfall/`. Inspection images use a labelled review camera; gameplay retains its fixed whole-course view. Physical iPhone/iPad Safari verification remains pending hardware testing.

## Verification

- Type checking, the production build and six focused geometry checks pass. The main lip-to-basin drop is 39.57 m; rock and basin vertices remain within the existing protected footprint/height.
- Nine browser checks pass: active-effects budgets, palette preservation, downward flow and reduced-motion behavior on desktop and both phone orientations, WebGPU/WebGL rendering, real touch drawing, complete Solo/CPU races, a replayed Time Trial, four-player racing and tournament resume.
- The final lip/roof refinement receives the focused geometry checks again, plus targeted visibility/animation/backend and budget reruns. The whole drop stays unoccluded in all three fixed views, with no camera changes.
- Peak scene calls with thrust, skid marks, dust and the replay visible are 48 in Time Trial and 104 with four cars, below 90/150. These are automated desktop measurements.
- All 24 exact handling fixtures (eight circuits, one/two/four cars) match the preceding committed build. No core files or compatibility versions change.
- The full unit suite passes: 50 files / 668 tests. Six focused geometry cases also pass after the final ledge adjustment. Generated rules remain unchanged.
- Four final browser reruns pass for phone/desktop drop visibility, descending water, reduced motion, WebGPU/WebGL rendering and active-effects budgets.
- A complete touch-driven race passes in the production build under `/RoadsterRace/`, with sound enabled, no failed required requests and no browser errors.

The local gallery includes matching before/after views, both phone layouts and a silent in-engine waterfall-detail animation. Physical iPhone/iPad verification remains pending hardware testing.
