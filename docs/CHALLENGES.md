# Curated challenges

Open **Challenges** from Home, Collection or Results. These are fixed, replayable
sessions using the normal car, abilities, collision rules and route compiler.

| Challenge | Session | Completion |
|---|---|---|
| Fleet Explorer | San Diego Fleet, Time Trial, one lap | Manually Hop onto both support vessels and land each automatic return jump in the same completed lap |
| Alpine Precision | Snowy Tahoe, Time Trial, one lap | Complete a lap with zero barrier contacts, car contacts and recoveries |
| Frontier Champion | Solo Race, Hard, one lap per round | Win or share the title in Grand Canyon → Canyon South Rim → Capitan Yosemite → Snowy Tahoe |

Every challenge is immediately available. Drift, legal off-road driving, Thrust and
Hop remain available. There are no in-world shortcut signs, hints, planning badges,
new racing overlays or special physics. Fleet opponents are absent in its Time Trial
challenge; the Frontier Cup uses the ordinary three CPU drivers and scoring.

Completion stamps are independent of the thirty venue medals, cup badges and cosmetic
unlock thresholds. Live challenge races may still earn ordinary medals under the usual
rules. Completion does not equip anything or change performance.

## Evidence and ownership

`src/core/challenges.ts` contains definitions and pure completion evaluation. The
Fleet tracker requires all four recognized crossings in the compiled route and actual
successful landing events: manual entries `support-a-hop` / `support-b-hop`, then
automatic `support-a-return` / `support-b-return`. Drawing a branch is insufficient.
Recovery discards an unfinished sequence. Completed sequences cannot carry into a
different lap. Retries create a fresh tracker; pause leaves it frozen.

Alpine Precision uses the fixed-step lap incident summary, independently of sound
throttling. Frontier Champion checks the actual complete schedule, Hard Solo configuration
and final championship standings. Shared first place qualifies. Interrupted rounds
restart with fresh drawings; completed rounds retain their exactly-once scoring.
Challenge identity and practice eligibility persist with Frontier tournament saves.
Using a development practice fixture disqualifies that cup attempt, including after
reload; restarting the whole cup creates a fresh eligible attempt.

CPU, tutorial, replay ghosts and practice fixtures cannot earn challenge completion.
No completion is awarded merely for opening or resuming an incomplete results screen.

## Settings and storage

Challenges borrow the session mode, difficulty, seed, lap count, circuit and format.
Leaving restores the previous setup and never overwrites ordinary saved laps/circuit.
Names, paint, ghost preference and existing medals remain unchanged. Starting a new
cup retains the existing saved-tournament replacement guard. Starting a Time Trial
challenge leaves an unrelated saved championship available to resume.

`roadster-race.challenges.v1` is a small independent local-storage record. Completion
is monotonic and deduplicated; updates merge other tabs' stored completions. Corrupt,
blocked or full storage falls back to memory without interrupting the race. Historical
completion survives future course/physics versions. Progress is shared only within
the current browser profile/app installation, without cloud synchronization.

## Performance and compatibility

The menu is DOM/CSS only. The active tracker consumes existing race events once per
rendered frame after fixed-step simulation; no scene mesh, material, pass, light or
per-frame simulation query is added. Landing events carry read-only crossing/origin
metadata. Physics stays **19**, compiler **20**, and all ten track versions/geometry
remain unchanged. Existing records, ghosts and championships keep compatibility.

Physical iPhone/iPad Safari usability and performance remain pending hardware testing.
