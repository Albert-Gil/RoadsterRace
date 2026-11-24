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

1. The drawing camera keeps the overview's angle, moves the sector's zoom closer, and frames
   the start box plus as much of the course ahead as fits.
2. Draw, then lift. Before 90 % of the lap, the line is not compiled. The camera glides
   (0.42 s; instant with reduced motion) to show as much of the course ahead of the line's
   end as fits, and a yellow ring marks the end.
3. Touch within 46 px of the end, or of any point in the last 30 m (a retake: the overlap is
   trimmed), and keep drawing. A touch anywhere else shows "Touch the glowing end of your
   line to continue." Drawing input waits while the camera glides.
4. **Undo** removes the last stroke, including during the camera glide or while the final preview
   is being prepared. Undoing the first stroke returns to the start. **Redraw** starts a fresh
   line. An interrupted stroke (pointer cancel, app switch) discards only itself.
5. At the finish, a background worker checks the joined line using the same compiler as overview
   drawing. Undoing or redrawing while it runs discards its result. A valid preview, race and
   replay use the whole-circuit overview. An unfinished line can continue from the glowing end.
6. The panel shows "Sector k of N" (`drawingSectors()`: boundaries on straights, at least
   14 m outside every jump/Hop corridor and 30 m from the start line).

## Timing and rules

`continuationOffset()` shifts the new stroke's clock so its first sample follows the line's
end at the line's pace over its last 0.4 s. Lifts and camera glides therefore cost no time.
The joined samples are compiled exactly like one continuous stroke. Route compiler 20,
rules 20 and every track version are unchanged, so records, ghosts and tournaments stay
valid. A unit test compiles a lap drawn as three lifted strokes, with retakes, and the same
lap as one stroke: lengths agree within 2 % and drawing durations within 5 %.

## Code and tests

- `src/core/drawing-sectors.ts`: sectors, drawn progress, upcoming course and continuation clock.
- `src/presentation/scene.ts`: `setDrawingFocus`, camera glide, `showContinueHandle`, `cameraMoving`.
- `src/main.ts`: stroke continuation, Undo, interruption handling; `ui/panels/planning.ts`: sector note and Undo.
- Values: `sectorDrawingAppearance` in `src/presentation/themes.ts`.
- `tests/unit/drawing-sectors.test.ts` and `tests/browser/sector-drawing.spec.ts` (iPhone
  touch drawing of Santa Monica in sectors with Undo; iPad, iPad mini and desktop sizes keep the
  overview; Newport on an iPhone has no sectors).

## Not verified

The feature has not been tried on a physical iPhone. The touch radius, zoom levels and glide
time may need tuning by hand.
