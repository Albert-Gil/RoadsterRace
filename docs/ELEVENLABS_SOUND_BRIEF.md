# Roadster Race — ElevenLabs sound generation brief

Original generation brief retained for future batches. The user subsequently supplied 21 WAVs, including electric motor and menu music; their local integration and filename mapping are documented in `AUDIO_INTEGRATION.md`, including a new menu-music prompt. Remaining roles retain synthesized fallbacks. No new audio was generated or purchased by this brief. The bigger gameplay ideas are retained in `CIRCUIT_EXPANSION_PLAN.md`.

## Direction and generation workflow

Aim for a fictional high-performance electric roadster: powerful electric drive, tactile rubber and road contact, dense compressed-gas bursts and weighty landings. These are original designed sounds, not recordings or claims about a real Tesla's sound.

Use ElevenLabs Sound Effects. Generate each layer separately. Turn Looping on for rows marked loop and off for one-shots. Keep gameplay effects close and dry; keep scenery beds distant and quiet. Use each stem below as a file name and retain the original download. Generate a few alternatives for the main eight sounds and audition them in a consistent mix.

Durations below are target final in-game lengths, not guaranteed generation timing. For very short cues, generate a 0.5–1 second file and trim its leading/trailing silence; the current API documents a 0.5-second minimum. The hop pressure pulse should occupy approximately 0.22 seconds, with a short dissipating tail. The thrust pressure lasts approximately 0.7 seconds. Neither clip should include the landing.

The motor loop must hold a constant pitch/load: the game already changes playback rate with speed. Generate tire and sand layers without motor/wind baked in. Generate environmental beds separately from vehicle sounds. Avoid dialogue, music and recognizable existing vehicle warning melodies.

## Batch 1 — highest-impact replacements

| File stem / existing role | Final length | Prompt |
|---|---|---|
| `drive-electric-01` / drive | 6 s, loop | A powerful electric sports car drivetrain holding a constant medium speed. Smooth rounded motor whine, rich low mechanical hum and restrained upper harmonics. Steady pitch and loudness, dry close recording. No acceleration, gear changes, tires, wind, speech or music. |
| `thrust-forward-01` / thrust | 0.8 s | A high-pressure compressed-gas thruster firing forward: instant valve snap, dense forceful air rush sustained for 0.7 seconds, subtle low punch, then a clean short pressure decay. Dry and close. No combustion, flame roar, explosion, speech or music. |
| `hop-cold-gas-01` / hop | 0.35–0.45 s | Four underbody compressed-gas nozzles firing simultaneously as one sharp downward burst. Tight low punch and dense airy hiss lasting 0.22 seconds, followed by a brief dissipating vapor tail. Dry close recording. No cartoon boing, flame roar, explosion, speech or music. |
| `tire-asphalt-01` / tire | 4 s, loop | Sustained performance tires scrubbing sideways across dry asphalt during a controlled drift. Textured rubber friction with a smooth restrained squeal, even and continuous. Close isolated recording. No engine, wind, impacts, speech, music or piercing shriek. |
| `tire-sand-01` / sand | 4 s, loop | Wide car tires sliding through fine dry beach sand. Dense granular hiss, soft gritty scrub and occasional tiny grains ticking underneath. Consistent continuous texture, dry close recording. No engine, large gravel hits, speech or music. |
| `landing-heavy-01` / landing | 0.3–0.4 s | A heavy sports car landing firmly on four tires on asphalt: compact low suspension thump, rubber compression and a short chassis settle. One solid landing, tight dry decay. No crash, bouncing sequence, glass, explosion, speech or music. |
| `impact-wall-01` / collision | 0.35–0.5 s | A sports car striking a solid concrete race barrier. A weighty low body thud, short panel rattle and brief gritty contact. One compact dry impact. No explosion, breaking glass, debris cascade, speech or music. |
| `impact-car-01` / car-impact | 0.25–0.4 s | Two sports cars bumping body panels at racing speed. A compact hollow metal-and-composite knock with a low thump and tiny rattle. Distinct, dry and close. No destructive crash, explosion, shattering glass, speech or music. |

## Batch 2 — remaining physical effects

| File stem / existing role | Final length | Prompt |
|---|---|---|
| `tire-chirp-01` / drift | 0.12–0.2 s | One short rubber tire chirp as grip breaks on dry asphalt. Quick textured onset and immediate release, restrained and close. No sustained skid, engine, alarm, speech or music. |
| `scrape-body-01` / scrape | 0.2–0.3 s | A short rough scrape of a car body panel brushing another car or a guardrail. Dry metallic friction with a little rubber texture and a clean release. No impact bang, sparks explosion, long ringing, speech or music. |
| `ramp-takeoff-01` / takeoff | 0.2–0.3 s | Car tires leaving the end of a ramp: brief suspension extension, light rubber release and a soft air flick. Compact and physical, dry close recording. No thruster firing, pneumatic blast, cartoon boing, speech or music. |
| `water-splash-01` / splash | 1–1.3 s | A heavy car dropping into seawater: one broad deep splash, a dense water slap, then a short wash of droplets. Close and clear with a controlled tail. No explosion, voices, music or long underwater sequence. |

The drift chirp should blend into the tire layer. Ramp takeoff must not sound like manual Hop: ordinary ramps do not fire the downward thrusters.

## Batch 3 — coordinated race cues

All electronic cues should form one restrained family. Existing synthesis can remain until a consistent set is selected.

| File stem / role | Final length | Prompt |
|---|---|---|
| `countdown-tick-01` / countdown | 0.12 s | One precise rounded electronic countdown beep, medium pitch, clear immediate onset and short dry decay. A premium racing timing system. No melody, voice, music or reverberation. |
| `race-start-01` / start | 0.35 s | A bright decisive electronic race-start signal, higher and more energetic than a countdown beep. One clean rising accent with a tight finish. No voice, siren, music or long reverberation. |
| `thrust-ready-01` / ready | 0.2–0.3 s | A subtle ascending two-note electronic recharge confirmation. Crisp, restrained and easy to hear beneath racing sounds, with a short dry tail. No alarm, voice, music or sparkle cascade. |
| `lap-complete-01` / lap | 0.4 s | A concise ascending two-note motorsport timing chime, confident and clean, with a gentle metallic edge and short dry decay. No voice, fanfare, music or long reverb. |
| `race-finish-01` / finish | 1.2–1.5 s | An original short victory sting for a premium electric racing game. Three or four warm electronic notes rising into a satisfying final accent, tight percussion and a clean ending. No voice, crowd, familiar tune or long cinematic swell. |
| `recovery-reset-01` / recovery | 0.35 s | A quiet two-note electronic reset confirmation, low then gently higher, neutral and reassuring. Compact dry sound, distinct from a victory or recharge cue. No error alarm, voice or music. |

The current `ready` role is the thrust-recharge cue. A separate Hop-ready notification would be a new role, not a file swap:

| New file stem | Final length | Prompt |
|---|---|---|
| `hop-ready-01` | 0.25 s | A soft low-to-high two-note electronic confirmation with a tiny airy click. Compact and restrained, subtly different from a bright recharge ping. Dry recording. No voice, alarm, music or long reverb. |

## Batch 4 — circuit ambience

Only one general `coast` ambient slot exists today. Coastal Launch can replace it directly; selecting a distinct bed per circuit requires a small integration change. Keep these well below the vehicle and ability mix.

| File stem / venue | Final length | Prompt |
|---|---|---|
| `ambience-coastal-01` / Coastal Launch | 12 s, loop | A quiet coastal race venue heard from above: distant gentle surf, light sea breeze and faint rustling coastal grass. Steady spacious background texture. No close crashing waves, cars, crowds, seagull calls, speech or music. |
| `ambience-launchsite-01` / Launchsite | 12 s, loop | A quiet coastal launch facility between launches: steady sea breeze, distant ventilation fans and a faint low electrical equipment hum. Spacious and restrained. No rocket launch, alarms, vehicles, announcements, speech or music. |
| `ambience-golden-gate-01` / Golden Gate | 12 s, loop | A waterfront city race circuit beside a suspension bridge: soft bay wind, distant diffuse city hum and a faint low bridge resonance. Gentle continuous background ambience. No close traffic, horns, sirens, identifiable voices or music. |
| `ambience-santa-monica-01` / Santa Monica | 12 s, loop | A sunset beachfront amusement pier: gentle distant surf, soft ocean breeze and very faint mechanical creaks from a slow Ferris wheel. Relaxed continuous ambience. No screams, dialogue, fairground music, close waves or loud coaster passes. |

The future rocket-launch scene is parked. Do not generate a permanent rocket roar into the current Launchsite ambience.

## Optional new layers

These need new triggers or mixing logic; they are not existing drop-in replacements.

| File stem | Final length | Prompt |
|---|---|---|
| `speed-air-01` | 6 s, loop | Smooth airflow rushing past a fast low sports car, a steady rounded broadband whoosh with soft aerodynamic texture. Constant level, close isolated sound. No motor, tires, gusts, speech or music. |
| `ui-select-01` | 0.06–0.1 s | One precise tactile interface click, a tiny mechanical tick with a soft electronic edge. Immediate, dry and understated. No keyboard sequence, voice, music or ringing tail. |
| `ui-confirm-01` | 0.15–0.2 s | One confident interface confirmation: a crisp soft click followed by a very short rounded ascending tone. Refined and dry. No voice, music, alarm or long shimmer. |
| `ui-back-01` | 0.08–0.15 s | One soft interface back-button sound, a low muted click with a brief downward electronic accent. Subtle and dry. No negative alarm, voice, music or reverb. |

## Export and integration

- The eight Batch 1 files are the recommended first delivery. Keep multiple takes of thrust, hop, motor and landing before deciding on a coherent sound character.
- Retain original downloads and generation notes. Avoid aggressive loudness processing; motor/tire beds should sit beneath the ability transients.
- Trim one-shots for immediate response and preserve useful decay. Check actual decoded loop seams; the Looping setting is not a substitute for listening.
- Keep a dry close or mono-compatible version of gameplay effects; broader stereo ambience can remain quiet. Audition on actual phone speakers as well as headphones.
- Existing roles map through `src/presentation/audio-assets.ts`; decoded local files are loaded with the existing timeout, size/duration limits and synthesis fallback. No ElevenLabs key or live generator belongs in the browser.
- For later integration, put optimized runtime copies in `public/audio/`, preserve base-aware URLs, and test mute, pause, interruption, repeated contact and the four-car mix. Audio must never alter simulation results.

References checked 2026-10-23:

- https://elevenlabs.io/docs/eleven-creative/playground/sound-effects — duration, Looping, prompting individual sounds and export workflow.
- https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert — current API duration minimum/maximum and prompt-influence parameter.
