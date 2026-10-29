/** Replace these roles with local recordings (including future ElevenLabs exports). */
export type SoundCue = 'countdown' | 'start' | 'thrust' | 'hop' | 'drift' | 'lap' | 'finish' | 'ready' | 'collision' | 'car-impact' | 'scrape' | 'recovery' | 'takeoff' | 'landing' | 'splash' | 'ui-select' | 'ui-confirm' | 'ui-back';
export type SoundLoop = 'drive' | 'tire' | 'sand' | 'coast' | 'launchsite' | 'city' | 'pier' | 'canyon';
export const soundLoops: readonly SoundLoop[] = ['drive', 'tire', 'sand', 'coast', 'launchsite', 'city', 'pier', 'canyon'];
export type VenueAudio = 'coastal' | 'spaceport' | 'bay' | 'sunset' | 'canyon' | 'night-city' | 'alpine' | 'yosemite';
export const venueLoop: Record<VenueAudio, SoundLoop> = { coastal: 'coast', spaceport: 'launchsite', bay: 'city', sunset: 'pier',canyon:'canyon','night-city':'city',alpine:'canyon',yosemite:'canyon' };
export interface SoundAsset { url: string; gain?: number; loopStart?: number; loopEnd?: number }
export interface AudioAssets { cues: Partial<Record<SoundCue, SoundAsset>>; loops: Partial<Record<SoundLoop, SoundAsset>>; music?: SoundAsset }
const recording = (name: string, gain = 1): SoundAsset => ({ url: `audio/${name}.mp3`, gain });
export const audioAssets: AudioAssets = {
  cues: {
    countdown: recording('countdown_tick', .8), start: recording('race_start'),
    thrust: recording('forward_thrust'), hop: recording('hop_thrusters'),
    landing: recording('heavy_landing', .8), collision: recording('barrier_impact', .85),
    'car-impact': recording('car_to_car_impact', .85), splash: recording('water_splash', .8),
    finish: recording('race_finished'), recovery: recording('car_recovery', .7),
    'ui-select': recording('menu_selection', .35), 'ui-confirm': recording('menu_confirmation', .45), 'ui-back': recording('back_cancel', .35),
  },
  loops: {
    drive: recording('electric_motor', 1.3), tire: recording('asphalt_drifting'), sand: recording('sand_sliding'),
    coast: recording('coastal_launch'), launchsite: recording('launchsite'), city: recording('golden_gate'), pier: recording('santa_monica'),
  },
  music: recording('menu_background'),
};
export const audioMix = { master: 0.65, cue: 0.6, drive: 0.14, tire: 0.12, sand: 0.16, coast: 0.1, music: .3 };
