# Sound direction and replaceable recordings

Sound is optional. Tap the speaker button to enable it. It begins muted and unlocks the browser's audio context from that gesture. The default palette is original Web Audio synthesis: a restrained electric drive tone, tire friction, sandy scrub, quiet coastal air, compressed-air thrust and short race cues. There is no combustion-engine roar, voiceover or background song.

## What follows the race

- Drive pitch and level follow actual speed.
- Tire friction follows physical slip; sandy scrub follows actual sand contact. Four cars share one bounded mix so more players do not multiply the volume.
- Countdown beats occur once per number. Start, lap, finish, thrust and recharge-ready cues follow the game events/state.
- A thrust sound lasts about 0.7 seconds. Holding a control does not repeat it.
- Pause, app interruption and leaving play silence the driving layers. Pause/interruption also cancel unfinished cues. Mute fades the master output and cancels cues; the race continues normally.
- Audio only reads game state. Loading, muting or changing sounds cannot change grip, speed, timing or results.

## Replacing with ElevenLabs exports later

No ElevenLabs service is connected yet. Generate/export sounds separately, put the files in `public/audio/`, and map them in `src/presentation/audio-assets.ts`. No API key or generator is needed in the browser. Existing synthesis remains a fallback while files load and if a file is missing, unsupported, corrupt or too large.

```ts
export const audioAssets: AudioAssets = {
  cues: {
    thrust: { url: '/audio/thrust-v1.mp3', gain: 0.8 },
    finish: { url: '/audio/finish-v1.mp3', gain: 0.7 },
  },
  loops: {
    drive: { url: '/audio/electric-drive-v1.mp3', gain: 0.8, loopStart: 0, loopEnd: 4 },
    sand: { url: '/audio/sand-v1.mp3', gain: 0.6, loopStart: 0, loopEnd: 3 },
  },
};
```

Use actual decoded loop boundaries. Unspecified boundaries use the complete file. The adapter adjusts drive-loop playback rate with speed; export a steady tone rather than a recording that already accelerates and brakes. A loop replaces its synthesized role; a recorded cue replaces that one cue. Leave any other roles unset. Mix levels are centralized in `audioMix` in the same file.

Network fetches time out after eight seconds. The loader accepts files up to 8 MB and decoded duration up to 30 seconds, and never blocks race startup. Prefer much smaller assets. Browser-decodable MP3 is a practical delivery format; retain the original WAV masters outside the runtime folder. WAV also works for short files. Audition on speakers and headphones, then on the actual target iPhone/iPad. Loop seams, perceived loudness and supported decoding still need device checks.

## First recording batch

These are starting briefs, not final generator settings. All sounds should be dry, short, original, and free of speech or music unless the role explicitly calls for a musical cue.

| Role | Target | Direction / starting prompt |
|---|---|---|
| `thrust` cue | 0.7 s, immediate onset | A compact compressed-air thruster release: sharp pressure attack, airy rush, a subtle low punch, clean short decay; close perspective, no flame roar, no engine, no voice, no long reverb. |
| `drive` loop | 3–6 s, steady seamless loop | A refined fictional electric sports car motor at a constant medium speed: smooth low hum with a restrained higher electric whine, dry and clean; no acceleration sweep, gear shifts, tires or wind. |
| `tire` loop | 2–4 s | Continuous rubber scrubbing across dry asphalt during a controlled drift, textured friction with a soft squeal; no engine, impacts or harsh piercing tone. |
| `sand` loop | 2–4 s | Tires sliding through fine dry coastal sand, soft granular hiss and scattered grit, even and continuous; no engine or heavy gravel impacts. |
| `coast` loop | 6–10 s | Distant gentle surf and light coastal air, quiet and steady, no close crashing waves, birds, voices or music. |
| `countdown` cue | 0.1–0.15 s | A clear, rounded electronic timing tick with a precise onset. |
| `start` cue | 0.3–0.5 s | A bright short rising electronic cue, distinct from the countdown tick. |
| `ready` cue | 0.2–0.3 s | A quiet, clear two-note recharge notification. |
| `lap` cue | 0.35–0.5 s | A brief rising two-note arcade chime. |
| `finish` cue | 1–1.5 s | A small original celebratory electronic flourish, warm and restrained. |
| `drift` cue | 0.15–0.25 s | A soft initial tire chirp; continuous friction is handled separately by the tire loop. |
| `collision` cue | 0.15–0.3 s | Muted low body/retaining-wall impact with a restrained gritty transient; no explosion or long metallic ring. |
| `recovery` cue | 0.3–0.5 s | Quiet two-tone reset confirmation, distinct from recharge and finish. |

Keep silence before a cue very short. Trim tails and fade loop joins. Avoid normalizing every file to the same peak: a tire loop should sit below the thrust transient. The master compressor is a final guard, not a substitute for matching levels. Record the origin, generation date, export settings and applicable rights for every included file in the asset ledger.

## Review and verification

`artifacts/sound-preview.wav` contains the actual synthesized cue palette: 3–2–1, start, thrust, drift, lap, recharge, finish, collision and recovery. It is generated by the browser audio check, using the same synthesis function as live play. It does not contain a recording of a full race or the continuous motor/surface mix.

The browser checks measure actual output, silence on pause/mute, successful recording decode, and fallback after a missing file or invalid audio data. The preview check measures audibility, unclipped peaks and quiet gaps. These checks cannot decide whether a sound is pleasant; use a real gameplay listening pass for that. Physical Safari audio verification remains pending.


The current three-course build shares the same neutral synthesized air loop and race sound roles. Dedicated Launchsite industrial ambience remains part of a later recording/art pass; it can use the existing local-asset replacement system. No ElevenLabs network service is required at runtime.

## Physical multiplayer sound roles

The three-course build adds `car-impact` (a low thump plus metallic/noise transient, about 0.22 s) and `scrape` (quiet band-limited friction, about 0.14 s). The pair event drives one cue, with strength-based gain; repeat impacts are throttled per pair and the shared mix bounds simultaneous voices. Scrape tails stop naturally after contact; pause/mute stops cues immediately. Existing `collision` remains the barrier sound. These are local synthesized fallbacks, ready for replacement through `audioAssets.cues` with exported recordings. No API key or ElevenLabs runtime connection is needed.

The cue preview now includes car impact and scraping. A silent gameplay capture remains separate from this audible cue preview. Dedicated coastal/industrial/Bay ambience is a later recording pass; all three currently share the existing air loop.
