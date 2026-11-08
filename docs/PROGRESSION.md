# Collection and championship progression

Progress is shared by local human seats in this browser profile or app installation.
It does not synchronize between browsers, devices, the website and the installed app.
The key `roadster-race.progression.v1` is separate from preferences, lap records and
championships. Storage failures fall back to memory and never stop a race.

Every venue has three independent medals. The Fleet milestone had ten venues and thirty medals; the local LAX preview had eleven venues and thirty-three medals; after the original Grand Canyon was retired there are ten active venues and thirty active medals. Medals already earned on the retired layout stay credited for cosmetic rewards. Existing cosmetic unlock thresholds remain unchanged:

| Medal | Qualifying live human achievement |
|---|---|
| Finish | Complete the chosen 1–6-lap distance in any ordinary mode |
| Clean | Complete one lap with no barrier contact, car contact or recovery |
| Rival | Share or take first place in Solo Race on Normal or Hard |

A standing-start lap can earn Clean. Drift, off-road driving, Thrust and Hop are legal.
Water failures involve recovery and spoil that lap. Every real contact is counted by
fixed-step simulation even when an audio effect is muted or throttled. Lap counters
reset at the crossing, and Clean persists immediately. Finish and Rival are evaluated
only after committed finishing order. Repeated events/results cannot duplicate awards.
Tutorial, CPU, replay ghosts and development practice are excluded. Earned achievements
are historical and survive later track/physics/compiler revisions and abandoned retries.

| Medals | Cosmetic reward |
|---:|---|
| 3 | Pearl White |
| 5 | Explorer badge |
| 8 | Obsidian |
| 15 | Copper Alloy and Precision badge |
| 24 | Champagne Titanium |
| 30 | Master badge |

All original six finishes and all circuits stay available. Stainless steel remains first
and the default. New finishes append only when unlocked; locked previews are in Collection.
Each local human can select an owned badge. Nothing is automatically equipped. Paint,
badges and Collection never enter vehicle forces, collision shapes or timing.

Cup presets reuse ordinary Solo/Multiplayer championships, laps and 10/6/4/0 scoring:

- Pacific: Newport Island → Santa Monica → Golden Gate.
- Frontier: Grand Canyon (stable ID `canyon-south-rim`) → Capitan Yosemite → Snowy Tahoe. Until 2026-11-07 it also opened with the now-retired original Grand Canyon.
- Fleet: Launchsite → LA nights → San Diego Fleet.

Complete every round to earn the corresponding badge. Saves retain the preset ID,
version and actual schedule; reload never reconstructs or rewrites the schedule.
Completed rounds stay committed once, and interrupted rounds restart with new drawings.
New Full Tours include all registered venues (eleven in the local LAX preview); existing compatible schedules remain as originally saved.
Rules 19/compiler 20 reject prior incompatible championships without deleting ordinary
names, finishes, laps or Collection awards.

Three independent, replayable challenges are available from Home/Collection/Results.
Their completion stamps use separate storage and do not change medal totals or reward
thresholds. See [CHALLENGES.md](CHALLENGES.md) for evidence, settings and save behavior.
