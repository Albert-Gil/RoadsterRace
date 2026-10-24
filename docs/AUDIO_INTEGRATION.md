# Supplied audio and menu music — 2026-10-23

Local implementation only. No commit, push or deployment requested for this update.

## Source and preparation

The user supplied `audio_files.zip` (19 sounds), then `Electric_motor.wav` and `menu_background.wav`: 21 original stereo 48 kHz, 16-bit PCM WAVs. Originals remain unchanged in `artifacts/audio/source/` (ignored by Git); the original ZIP remains in Downloads. Keep these local masters backed up separately. Audio provenance/generation licensing is supplied by the user; this document does not assert verification of an external license.

`tools/prepare-audio.py` regenerates runtime copies from the ZIP and/or individual WAV arguments using Python and ffmpeg. It validates filenames, retains SHA-256 source hashes, trims only outer silence on one-shots, folds gameplay effects to mono, crossfades loop boundaries, and applies conservative level matching with peak headroom. Ambience and music remain stereo. Reports and prepared intermediate WAVs stay in `artifacts/audio/`.

Runtime files live in `public/audio/` as MP3 (96 kbit/s gameplay, 128 kbit/s ambience, 160 kbit/s music). The 21 files total **2,309,400 bytes**. The motor is prepared as a 6-second mono loop. Music keeps its 64-second musical length, with 8 ms edge softening and a -20 LUFS normalization target; it streams through a dedicated voice rather than entering the effect decoder. URLs use the existing deployment-base helper, including GitHub Pages subpaths. Runtime mixing, not source normalization alone, determines relative loudness. Phone-speaker listening and physical Safari verification remain pending.

## Filename mapping

| Supplied WAV stem | Game role |
|---|---|
| `Electric_motor` | Speed-controlled electric drivetrain loop |
| `menu_background` | Streamed menu/results music |
| `forward_thrust` | Forward thrust |
| `hop_thrusters` | Manual Hop; not ordinary ramp takeoff |
| `asphalt_drifting` | Asphalt tire-scrub loop |
| `sand_sliding` | Sand tire loop |
| `heavy_landing` | Landing |
| `barrier_impact` | Barrier contact |
| `car_to_car_impact` | Car-to-car contact |
| `water_splash` | Water failure |
| `countdown_tick` | Countdown |
| `race_start` | Race start |
| `race_finished` | Finish |
| `car_recovery` | Recovery |
| `menu_selection` | Menu selection |
| `menu_confirmation` | Menu confirmation |
| `back_cancel` | Back/redraw/navigation |
| `coastal_launch` | Coastal Launch ambience |
| `launchsite` | Launchsite ambience |
| `golden_gate` | Golden Gate ambience |
| `santa_monica` | Santa Monica ambience |

The short drift chirp, scrape, ramp takeoff, lap and recharge notifications retain synthesized fallbacks. The supplied motor replaces its synthesis when loaded. Music has no synthetic replacement: a missing or blocked optional music file leaves the game playable and quiet. Optional missing/invalid recordings retain their fallback without blocking play.

All asset references and mix trims are centralized in `src/presentation/audio-assets.ts`. Ambience selection belongs to presentation and cannot affect simulation. All four-car effects share a bounded mix and compressor rather than four independent full-volume engines.

## Default audio and controls

Sound starts enabled. A real first pointer/key gesture unlocks browser audio; no unrequested autoplay workaround is used. Mute remains reachable, and pause/interruption stop cues and fade all loops. A subsequent deliberate play/resume gesture can resume a browser-suspended audio context.

Thrust is 64 CSS pixels; Hop remains 44. Shared safe course rails expand by only 8 pixels per landscape side to avoid road overlap. Portrait control spacing also accommodates 320-pixel-wide screens. Fixed drawing and racing framing still match.

Pause offers both **Restart race** (same plans) and **Draw new lines** (fresh drawing for all human drivers). Fresh drawing retains mode, drivers, paints, laps, active circuit, tournament schedule and completed rounds; it clears current race/plans/readiness/ability input. CPU plans regenerate after the human confirms.

## Menu music generation brief

**Length:** 64 seconds. **Tempo:** 120 BPM. **Meter:** 4/4, 32 bars. Instrumental, designed to loop. Provide the original WAV; do not include a spoken logo or mix in vehicle sound effects.

Prompt:

> Create an original 64-second instrumental menu theme for a polished electric motorsport game. 120 BPM, 4/4, 32 bars. Confident, sleek and energetic, with warm analog synth bass, tight electronic drums, restrained arpeggios and an understated memorable synth motif. A subtle coastal-night atmosphere with controlled low end and clear midrange so it still works on phone speakers. Establish the groove immediately, introduce a small variation halfway through, and return to the opening harmony and texture for a seamless loop. Keep the energy steady and leave space for interface clicks. No vocals, speech, engine recordings, cinematic impacts, recognizable melodies or imitation of an existing artist. No intro silence, fade-in, fade-out or final sting; make the end flow naturally into the beginning.

Use music generation for this longer musical piece. The requested duration/structure is a creative target; inspect the actual output and edit the loop seam if necessary. Keep music out of the vehicle/ambience recordings.

The supplied 64-second track now uses a dedicated streamed media element routed through the shared Web Audio master/compressor. It has a separate `audioMix.music` volume. It loops on welcome/setup/results and tournament menu screens, fades before drawing/countdown/racing, and pauses on mute, race pause or interruption. Unmuting or a deliberate menu gesture resumes it without creating duplicate streams. Runtime audio remains enabled by default but starts only after a browser-approved user gesture. Mobile playback/loop quality still requires hardware listening.

## Verification

See `artifacts/audio/VERIFICATION.md` for the first audio batch and `artifacts/audio/MUSIC_VERIFICATION.md` for the motor/music addition. Physical iPhone/iPad Safari usability, decoder behavior and speaker balance remain pending real-device testing. No public build was updated.
