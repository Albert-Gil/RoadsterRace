import { audioAssets, audioMix, type AudioAssets, type SoundAsset, type SoundCue, type SoundLoop } from './audio-assets';
import { assetUrl } from './urls';

export interface AudioFrame { active: boolean; speed: number; slip: number; sand: number }
const limit = (value: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));

function noiseBuffer(context: BaseAudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate), data = buffer.getChannelData(0);
  let seed = 121, previous = 0;
  for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; previous = previous * 0.55 + (seed / 2147483648 - 1) * 0.45; data[i] = previous; }
  return buffer;
}

/** Shared by live play and the sound preview; original synthesized fallback. */
export function synthCue(context: BaseAudioContext, destination: AudioNode, type: SoundCue, when = context.currentTime, noise = noiseBuffer(context)) {
  const nodes: AudioScheduledSourceNode[] = [];
  const tone = (frequency: number, duration: number, delay = 0, volume = 0.22, end = frequency, wave: OscillatorType = 'sine') => {
    const oscillator = context.createOscillator(), envelope = context.createGain(), start = when + delay;
    oscillator.type = wave; oscillator.frequency.setValueAtTime(frequency, start); oscillator.frequency.exponentialRampToValueAtTime(end, start + duration);
    envelope.gain.setValueAtTime(0, start); envelope.gain.linearRampToValueAtTime(volume, start + 0.012); envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(destination); oscillator.start(start); oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); }; nodes.push(oscillator);
  };
  if (type === 'car-impact' || type === 'scrape') {
    const scrape = type === 'scrape', source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = noise; filter.type = 'bandpass'; filter.frequency.value = scrape ? 1800 : 850; filter.Q.value = scrape ? 0.6 : 2.5;
    const duration = scrape ? 0.14 : 0.18; envelope.gain.setValueAtTime(scrape ? 0.32 : 0.4, when); envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(envelope).connect(destination); source.start(when); source.stop(when + duration); source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); }; nodes.push(source);
    if (!scrape) { tone(90, 0.22, 0, 0.36, 32, 'triangle'); tone(430, 0.1, 0.005, 0.1, 140); }
  }
  else if (type === 'hop') { tone(105, 0.24, 0, 0.2, 490, 'triangle'); tone(740, 0.13, 0.035, 0.06, 230); }
  else if (type === 'takeoff') { tone(140, 0.22, 0, 0.12, 430, 'triangle'); }
  else if (type === 'landing') { tone(80, 0.14, 0, 0.36, 26, 'triangle'); tone(190, 0.07, 0, 0.07, 65); }
  else if (type === 'splash') {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(2400, when); filter.frequency.exponentialRampToValueAtTime(180, when + 0.65);
    envelope.gain.setValueAtTime(0.7, when); envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.7);
    source.connect(filter).connect(envelope).connect(destination); source.start(when); source.stop(when + 0.72); source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); }; nodes.push(source);
  }
  else if (type === 'collision') { tone(100, 0.2, 0, 0.35, 35, 'triangle'); tone(170, 0.08, 0.01, 0.08, 60); }
  else if (type === 'recovery') { tone(260, 0.18, 0, 0.1, 390); tone(520, 0.15, 0.15, 0.08); }
  else if (type === 'thrust' || type === 'drift') {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = noise; filter.type = 'bandpass'; filter.Q.value = type === 'thrust' ? 0.7 : 1.8;
    const duration = type === 'thrust' ? 0.7 : 0.22;
    filter.frequency.setValueAtTime(type === 'thrust' ? 1400 : 1800, when); filter.frequency.exponentialRampToValueAtTime(type === 'thrust' ? 220 : 850, when + duration);
    envelope.gain.setValueAtTime(0, when); envelope.gain.linearRampToValueAtTime(type === 'thrust' ? 0.8 : 0.17, when + 0.025); envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(envelope).connect(destination); source.start(when); source.stop(when + duration + 0.02);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); }; nodes.push(source);
    if (type === 'thrust') tone(95, 0.42, 0, 0.3, 43);
  } else if (type === 'countdown') tone(520, 0.12, 0, 0.18);
  else if (type === 'start') { tone(780, 0.28, 0, 0.2, 1040); tone(1560, 0.2, 0.07, 0.08); }
  else if (type === 'ready') { tone(880, 0.12, 0, 0.1); tone(1320, 0.19, 0.09, 0.08); }
  else if (type === 'lap') { tone(660, 0.19, 0, 0.15); tone(990, 0.3, 0.13, 0.14); }
  else [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => tone(frequency, 0.65, i * 0.13, 0.16));
  return nodes;
}

type Voice = { gain: GainNode; sources: AudioScheduledSourceNode[]; filter?: BiquadFilterNode; sample?: AudioBufferSourceNode; sampleGain?: GainNode };

/** Reads race state. One bounded shared mix keeps four players from becoming four times louder. */
export class GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private effects?: GainNode;
  private analyser?: AnalyserNode;
  private noise?: AudioBuffer;
  private voices = new Map<SoundLoop, Voice>();
  private buffers = new Map<string, AudioBuffer>();
  private failed = new Set<string>();
  private shots = new Set<AudioScheduledSourceNode>();
  private lastCue = new Map<SoundCue, number>();
  private levels: Record<SoundLoop, number> = { drive: 0, tire: 0, sand: 0, coast: 0 };
  private active = false;
  muted = true;
  constructor(private assets: AudioAssets = audioAssets) {}
  unlock() {
    try {
      if (!this.context) {
        const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) return false;
        this.context = new Constructor(); const c = this.context;
        this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : audioMix.master;
        this.effects = c.createGain(); this.effects.gain.value = audioMix.cue; this.effects.connect(this.master);
        const compressor = c.createDynamicsCompressor(); compressor.threshold.value = -14; compressor.knee.value = 12; compressor.ratio.value = 4;
        this.analyser = c.createAnalyser(); this.analyser.fftSize = 512;
        this.master.connect(compressor).connect(this.analyser).connect(c.destination); this.noise = noiseBuffer(c);
        this.createVoices(); void this.loadAssets();
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      return true;
    } catch { return false; }
  }
  toggle() {
    if (this.muted && !this.unlock()) return;
    this.muted = !this.muted;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : audioMix.master, this.context.currentTime, 0.015);
    if (this.muted) this.stopCues();
  }
  private createVoices() {
    const c = this.context!;
    for (const role of ['drive', 'tire', 'sand', 'coast'] as const) {
      const gain = c.createGain(); gain.gain.value = 0; gain.connect(this.master!);
      const sources: AudioScheduledSourceNode[] = [], voice: Voice = { gain, sources };
      if (role === 'drive') {
        for (const [i, wave] of (['sine', 'triangle'] as const).entries()) {
          const source = c.createOscillator(), trim = c.createGain(); source.type = wave; source.frequency.value = i ? 170 : 85; trim.gain.value = i ? 0.16 : 0.65;
          source.connect(trim).connect(gain); source.start(); sources.push(source);
        }
      } else {
        const source = c.createBufferSource(), filter = c.createBiquadFilter(); source.buffer = this.noise!; source.loop = true;
        filter.type = role === 'tire' ? 'bandpass' : 'lowpass'; filter.frequency.value = role === 'tire' ? 1200 : role === 'sand' ? 1700 : 420; filter.Q.value = role === 'tire' ? 1.2 : 0.4;
        source.connect(filter).connect(gain); source.start(); sources.push(source); voice.filter = filter;
      }
      this.voices.set(role, voice);
    }
  }
  private async loadAssets() {
    const c = this.context!;
    const entries = [...Object.entries(this.assets.cues).map(([role, asset]) => [`cue:${role}`, asset] as const), ...Object.entries(this.assets.loops).map(([role, asset]) => [`loop:${role}`, asset] as const)];
    await Promise.all(entries.map(async ([key, asset]) => {
      if (!asset) return;
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(assetUrl(asset.url), { signal: controller.signal }); if (!response.ok) throw new Error('Optional sound unavailable');
        const bytes = await response.arrayBuffer(); if (bytes.byteLength > 8_000_000) throw new Error('Optional sound too large');
        const buffer = await c.decodeAudioData(bytes); if (buffer.duration > 30) throw new Error('Use a short sound or loop'); this.buffers.set(key, buffer);
        if (key.startsWith('loop:')) this.installLoop(key.slice(5) as SoundLoop, asset, buffer);
      } catch { this.failed.add(key); } finally { clearTimeout(timer); }
    }));
  }
  private installLoop(role: SoundLoop, asset: SoundAsset, buffer: AudioBuffer) {
    const c = this.context!, voice = this.voices.get(role)!;
    const source = c.createBufferSource(), gain = c.createGain(); source.buffer = buffer; source.loop = true;
    source.loopStart = limit(asset.loopStart ?? 0, 0, Math.max(0, buffer.duration - 0.01)); source.loopEnd = limit(asset.loopEnd ?? buffer.duration, source.loopStart + 0.01, buffer.duration);
    gain.gain.value = this.muted || !this.active ? 0 : this.levels[role] * limit(asset.gain ?? 1, 0, 2); source.connect(gain).connect(this.master!); source.start();
    voice.sample = source; voice.sampleGain = gain; voice.gain.gain.setTargetAtTime(0, c.currentTime, 0.08);
  }
  cue(type: SoundCue, intensity?: number) {
    if (this.muted || !this.context || !this.effects || this.context.state !== 'running') return;
    const c = this.context, now = c.currentTime;
    if (now - (this.lastCue.get(type) ?? -Infinity) < (type === 'thrust' ? 0.055 : type === 'drift' ? 0.6 : 0.12)) return;
    this.lastCue.set(type, now);
    if ((type === 'car-impact' || type === 'scrape') && this.shots.size > 12) return;
    if (this.shots.size > 24) this.stopCues();
    const trim = c.createGain(); trim.gain.value = intensity === undefined ? 1 : type === 'scrape' ? limit(intensity, 0.4, 1) : limit(intensity / 12, 0.12, 1); trim.connect(this.effects);
    const output = trim;
    const buffer = this.buffers.get(`cue:${type}`);
    const nodes = buffer ? (() => {
      const source = c.createBufferSource(), trim = c.createGain(); source.buffer = buffer; trim.gain.value = limit(this.assets.cues[type]?.gain ?? 1, 0, 2);
      source.connect(trim).connect(output); source.start(); source.onended = () => { source.disconnect(); trim.disconnect(); }; return [source];
    })() : synthCue(c, output, type, now, this.noise);
    let remaining = nodes.length;
    for (const node of nodes) { const ended = node.onended; node.onended = event => { ended?.call(node, event); this.shots.delete(node); if (--remaining === 0) output.disconnect(); }; this.shots.add(node); }
  }
  mix(frame: AudioFrame) {
    this.active = frame.active;
    const c = this.context; if (!c) return;
    const speed = limit(frame.speed / 42), moving = limit(frame.speed / 5);
    this.levels = frame.active && !this.muted ? { drive: audioMix.drive * moving * (0.25 + speed * 0.75), tire: audioMix.tire * limit(frame.slip) * moving * (1 - frame.sand), sand: audioMix.sand * frame.sand * moving, coast: audioMix.coast } : { drive: 0, tire: 0, sand: 0, coast: 0 };
    for (const [role, voice] of this.voices) {
      const amount = this.levels[role], now = c.currentTime, fade = frame.active ? 0.08 : 0.012;
      voice.gain.gain.setTargetAtTime(voice.sample ? 0 : amount, now, fade);
      voice.sampleGain?.gain.setTargetAtTime(amount * limit(this.assets.loops[role]?.gain ?? 1, 0, 2), now, fade);
      if (role === 'drive') {
        voice.sources.forEach((source, i) => (source as OscillatorNode).frequency.setTargetAtTime((85 + speed * 330) * (i ? 2.01 : 1), now, 0.12));
        voice.sample?.playbackRate.setTargetAtTime(0.7 + speed * 0.8, now, 0.15);
      } else if (voice.filter) voice.filter.frequency.setTargetAtTime(role === 'tire' ? 900 + speed * 1300 : role === 'sand' ? 700 + speed * 2000 : 380, now, 0.15);
    }
  }
  silence() { this.mix({ active: false, speed: 0, slip: 0, sand: 0 }); this.stopCues(); }
  private stopCues() { for (const node of this.shots) { try { node.stop(); } catch { /* Already ended. */ } } this.shots.clear(); }
  getStatus() {
    let outputRms = 0;
    if (this.analyser) { const data = new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(data); outputRms = Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length); }
    return { muted: this.muted, available: !!this.context, context: this.context?.state ?? 'locked', active: this.active, levels: { ...this.levels }, loaded: [...this.buffers.keys()], failed: [...this.failed], outputRms };
  }
}
