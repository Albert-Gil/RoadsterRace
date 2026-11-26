# Phone sector drawing

Owner request, 2026-11-23. On an iPhone the whole-circuit overview makes the longer
circuits' roads too narrow to draw accurately. Phone-sized screens now draw those circuits
in zoomed sectors. Lifting the finger between strokes costs nothing; touching the glowing
end of the line continues it.

## Who gets it

`src/app/drawing-mode.ts`: a coarse (finger) pointer **and** a screen whose short side is at
most 500 CSS px. Every iPhone's short side is 320–440 px and every iPad's is at least 744 px,
so iPads (including the mini), desktops and laptops keep the single-stroke overview. No
user-agent sniffing. `?sectors=on|off` overrides the detection. Automated browsers
(`navigator.webdriver`) keep the overview unless `?sectors=on`, so the existing whole-lap
touch fixtures and Pages smoke checks are unchanged (as automation also starts on Low).

Race setup offers **Auto**, **By sector** and **Whole circuit** under Drawing view. Explicit choices persist on this device and take precedence over automatic detection. By sector uses two sectors on shorter circuits. The tutorial uses the whole circuit. Each sector overview also has a **Whole lap** button for trying that drawing without zooming or changing the saved preference.

## Which circuits

`phoneDrawingSectors` in `src/content/circuits.ts`, from the road width measured in the iPhone
landscape overview (844×390):

| Circuit | Road in overview | Sectors | Drawing zoom |
|---|---|---|---|
| Newport Island, Launchsite, Golden Gate | 46–55 px | none | 1× |
| Santa Monica, LA nights, Snowy Tahoe, Grand Canyon | 30–37 px | 2 | 1.6× |
| Capitan Yosemite, San Diego Fleet | 21–27 px | 3 | 2× |
| LAX (1,313 m) | 26 px | 4 | 2.3× |

## How it plays

1. Each sector driver sees the whole circuit and chooses **Sectors** to glide into sector one. The top card gives the current sector and one short instruction, above the bottom controls in portrait.
2. Draw and lift as needed. The camera frames the end of the line and the remaining road in that sector, with some overlap into the next. The glowing end is the next touchdown target. Touching the glowing end during a glide holds the camera there so drawing can resume immediately. Reduced motion uses an immediate transition.
3. **Undo** removes one stroke. **Retry** takes the driver back to the start of the current sector. **Previous** opens the preceding sector for redrawing. Earlier sectors are retained. From the chosen sector, draw forward again to the finish. Both sector controls also work from the final preview before the driver locks in the line.
4. A retake can start within 46 CSS pixels of the end or along the last 30 metres of the active sector. Preview and racing use the whole-circuit camera.

## Pace at zoom and between strokes

Each sector preserves the input timestamps and uses a drawing clock scaled by its camera magnification. At LAX's 2.3× zoom, covering the same screen distance in the same time gives approximately the same pace as drawing on the overview. Live color and the final route use the same adjusted samples.

At recontact, the last five metres are timed from the preceding twelve metres of driving line. The next metre carries that pace, then blends back into the new gesture over five metres. This excludes lift hesitation, the camera glide and touchdown hesitation around the join. Slowing down farther into the sector still slows the car.

## Code and tests

- `src/core/drawing-sectors.ts`: sectors, drawn progress, upcoming course and continuation clock.
- `src/presentation/scene.ts`: `setDrawingFocus`, camera glide, `showContinueHandle`, `cameraMoving`.
- `src/main.ts`: stroke continuation, Undo, interruption handling; `ui/panels/planning.ts`: sector note and Undo.
- Values: `sectorDrawingAppearance` in `src/presentation/themes.ts`.
- The sector unit and browser suites cover zoom compensation, lift and touchdown hesitation, editing LAX from preview, a Santa Monica lap with Undo, and overview-only devices and venues.

## Not verified

The feature has not been tried on a physical iPhone. The touch radius, zoom levels and glide
time may need tuning by hand.
