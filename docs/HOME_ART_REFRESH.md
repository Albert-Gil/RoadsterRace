# Home artwork and CI correction — 2026-10-29

The owner's ten supplied images now fill the existing five wide/portrait Home
roles: cold-gas Hop, drivers/grid, door-to-door racing, pier jump and canyon jump.
The eight PNGs are encoded as WebP at quality 82 with their full composition and
original dimensions intact. The supplied door-to-door WebPs already match the
shipped pair, so they remain byte-identical. The complete set is about 1.96 MB;
the page requests the selected picture's appropriate orientation, not the entire
set. Source filenames and hashes are recorded in ASSET_RIGHTS.md.

`heroImages` keeps the same stable IDs, with adjusted focal points for the new
compositions. `heroArtRevision` adds `?v=2026-10-29-steel` to both source URLs so a
returning browser does not reuse the retired artwork. Local development and
GitHub Pages still resolve assets beneath the configured base. Increment this
presentation revision whenever those files are replaced in the future.

The existing rotation is preserved: a different image on every arrival at Home,
stable while Settings/Touch test is open. Portrait and landscape use their own
supplied pictures, with `object-fit: cover`; they are never stretched. Standard
red interface controls and selected car paints are unchanged.

## Failed GitHub check

[Pages run 40977097311](https://github.com/Albert-Gil/RoadsterRace/actions/runs/40977097311)
failed in `verify (la-nights)` and `verify (tournament)`. Both failures were the
same unit case: Yosemite's opposite-edge start/finish connection completing six
laps exceeded the global 30-second test limit on shared runners. The other ten
verification jobs passed; no gameplay assertion failed in the two timed-out jobs.
Deployment was correctly withheld.

That generated six-lap test now has an explicit **120-second** budget, consistent
with other complete-race tests. All circuits, 24,000 maximum fixed steps,
connection/clearance assertions and six-lap finish assertions remain intact.
The global timeout, workflow deployment gate and game rules are unchanged.

## Verification

- Four responsive browser checks cover all five pictures on desktop, phone
  landscape, phone portrait at 2× density and tablet: twenty actual Home captures.
- Checks assert successful decoding, visible fade completion, all mode buttons,
  unchanged artwork while Settings opens/closes, non-repeating Home rotation and
  the correct responsive source after orientation changes.
- The previously timed-out Yosemite six-lap case passes independently.
- All 24 exact handling fixtures match HEAD; there are no simulation or course
  changes in this update.
- Type checking, all **672 unit tests across 51 files**, the production build and
  a complete production touch race pass. The built site also loads all ten art
  files from `/RoadsterRace/`, checking the matching sources on desktop and both
  phone orientations with no development inspector. Detailed logs live in
  `artifacts/home-art-refresh/`.
- Physical iPhone/iPad Safari verification remains pending hardware testing.

The local review gallery is `artifacts/home-art-refresh/index.html`. Source
masters and generated captures stay outside version control. The normal Pages
workflow verifies the new main commit before publishing it.
