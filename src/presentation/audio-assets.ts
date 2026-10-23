/** Replace these roles with local recordings (including future ElevenLabs exports). */
export type SoundCue = 'countdown' | 'start' | 'thrust' | 'hop' | 'drift' | 'lap' | 'finish' | 'ready' | 'collision' | 'car-impact' | 'scrape' | 'recovery' | 'takeoff' | 'landing' | 'splash';
export type SoundLoop = 'drive' | 'tire' | 'sand' | 'coast';
export interface SoundAsset { url: string; gain?: number; loopStart?: number; loopEnd?: number }
export interface AudioAssets { cues: Partial<Record<SoundCue, SoundAsset>>; loops: Partial<Record<SoundLoop, SoundAsset>> }
export const audioAssets: AudioAssets = { cues: {}, loops: {} };
export const audioMix = { master: 0.65, cue: 0.6, drive: 0.14, tire: 0.12, sand: 0.16, coast: 0.025 };
