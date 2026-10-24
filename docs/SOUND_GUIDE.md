# Sound direction and replaceable recordings

Sound defaults enabled and unlocks on the first real tap or key press. The speaker button mutes/unmutes it. The user-supplied 21 recordings now cover abilities, surfaces, impacts, menus, race cues and all four circuit ambience beds; original Web Audio synthesis remains for missing roles. The supplied 64-second menu music streams separately on menu/results screens and stays off during drawing and racing. See `AUDIO_INTEGRATION.md` for exact filename mapping, source preservation, preparation and the menu-music prompt.

## What follows the race

- Drive pitch and level follow actual speed.
- Tire friction follows physical slip; sandy scrub follows actual sand contact. Four cars share one bounded mix so more players do not multiply the volume.
- Countdown beats occur once per number. Start, lap, finish, thrust and recharge-ready cues follow the game events/state.
- A thrust sound lasts about 0.7 seconds. Holding a control does not repeat it.
- Hop has its own short upward pressure cue and reuses the landing sound. Map the `hop` cue role to replace it with a local recording; holding Hop does not repeat it.
- Pause, app interruption and leaving play silence the driving layers. Pause/interruption also cancel unfinished cues. Mute fades the master output and cancels cues; the race continues normally.
- Audio only reads game state. Loading, muting or changing sounds cannot change grip, speed, timing or results.

## Replacing recordings

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
| `hop` cue | 0.2–0.3 s, immediate onset | A short downward compressed-air release with an upward electronic lift accent, compact low punch and dry airy decay; distinct from forward thrust, no explosion or speech. |
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


Each of the four courses now selects its own supplied ambient loop: `coast`, `launchsite`, `city` or `pier`. Only the selected bed is audible. No ElevenLabs network service is required at runtime.

## Physical multiplayer sound roles

The `car-impact` role now uses the supplied recording; `scrape` retains its quiet synthesized friction fallback. The pair event drives one cue, with strength-based gain; repeat impacts are throttled per pair and the shared mix bounds simultaneous voices. Scrape tails stop naturally after contact; pause/mute stops cues immediately. Existing `collision` remains the barrier sound. No API key or ElevenLabs runtime connection is needed.

The synthesized cue preview includes car impact and scraping as fallback references. It does not audition the newly supplied recordings. A silent gameplay capture remains separate from an audible cue preview. Actual-device listening remains necessary for the new recordings and loop joins.
