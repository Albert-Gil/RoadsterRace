import type { SoundAsset } from './audio-assets';
import { assetUrl } from './urls';

/** One streamed music voice; long tracks never enter the short-effect decoder. */
export class MenuMusic {
  private readonly element = new Audio();
  private readonly gain: GainNode;
  private stopTimer?: ReturnType<typeof setTimeout>;
  private enabled = false;
  private failed = false;

  constructor(private context: AudioContext, destination: AudioNode, asset: SoundAsset, volume: number) {
    this.element.preload = 'none'; this.element.loop = true;
    this.element.crossOrigin = 'anonymous'; this.element.src = assetUrl(asset.url);
    this.gain = context.createGain(); this.gain.gain.value = 0;
    context.createMediaElementSource(this.element).connect(this.gain).connect(destination);
    this.volume = volume * Math.max(0, Math.min(2, asset.gain ?? 1));
    this.element.addEventListener('error', () => { this.failed = true; this.element.pause(); });
  }
  private readonly volume: number;

  setEnabled(enabled: boolean, immediate = false) {
    this.enabled = enabled;
    clearTimeout(this.stopTimer);
    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setTargetAtTime(enabled ? this.volume : 0, now, enabled ? .18 : immediate ? .005 : .025);
    if (enabled && !this.failed) {
      if (this.element.paused) void this.element.play().catch(() => {
        // A browser policy interruption can be retried by the next real gesture.
      });
    } else if (immediate) this.element.pause();
    else this.stopTimer = setTimeout(() => { if (!this.enabled) this.element.pause(); }, 160);
  }

  getStatus() {
    return { enabled: this.enabled, playing: !this.element.paused, failed: this.failed, time: this.element.currentTime, duration: Number.isFinite(this.element.duration) ? this.element.duration : null, readyState: this.element.readyState };
  }
}
