import type { RaceFrame } from './protocol';

/** Server ticks are 1/60 s. */
const TICK_MS = 1000 / 60;
export interface PlaybackSample { from: RaceFrame; to: RaceFrame; alpha: number }

/**
 * Smooths authoritative duel frames over network jitter. Frames are buffered and shown
 * `delayMs` behind the server, interpolated by server tick rather than by arrival time, so
 * late or bunched packets do not freeze or jump the cars. When no newer frame has arrived the
 * cars extrapolate along their last motion for at most `extrapolateMs`, then hold.
 */
export class FramePlayback {
  private frames: RaceFrame[] = [];
  /** Wall-clock time of server tick 0 implied by the fastest recent arrival (least delayed). */
  private origin = Infinity;
  constructor(readonly delayMs = 100, readonly extrapolateMs = 100, private readonly keep = 40) {}

  push(frame: RaceFrame, receivedAt: number) {
    const last = this.frames.at(-1);
    if (last && (frame.round !== last.round || frame.tick < last.tick)) this.reset();
    if (last && frame.tick === last.tick && frame.round === last.round) { this.frames[this.frames.length - 1] = frame; return; }
    this.frames.push(frame);
    if (this.frames.length > this.keep) this.frames.shift();
    // Slowly forget old minima so a lasting route change on the network is followed.
    this.origin = Math.min(this.origin + 0.02, receivedAt - frame.tick * TICK_MS);
  }
  reset() { this.frames = []; this.origin = Infinity; }
  get latest() { return this.frames.at(-1); }
  /**
   * How far ahead of `frame` the room will be when a press sent at `now` arrives (ms). The least-delayed
   * arrival fixes the clock offset: arrival = server time + one-way delay, so the server is now at tick
   * (now - origin + oneWay) / TICK and a press sent now lands one more one-way delay later. `oneWayMs` comes
   * from command round trips (DuelClient.oneWayMs). Your own car is drawn there (src/duels/own-car.ts).
   */
  aheadOf(frame: RaceFrame, now: number, oneWayMs = 0) {
    return Number.isFinite(this.origin) ? Math.max(0, (now - this.origin + 2 * oneWayMs) / TICK_MS - frame.tick) * TICK_MS : 0;
  }

  sample(now: number): PlaybackSample | undefined {
    const frames = this.frames, last = frames.at(-1);
    if (!last) return undefined;
    if (frames.length === 1) return { from: last, to: last, alpha: 1 };
    const tick = (now - this.delayMs - this.origin) / TICK_MS;
    if (tick <= frames[0].tick) return { from: frames[0], to: frames[0], alpha: 1 };
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1], b = frames[i];
      if (tick <= b.tick) return this.between(a, b, (tick - a.tick) / Math.max(1, b.tick - a.tick));
    }
    const prev = frames[frames.length - 2], span = Math.max(1, last.tick - prev.tick);
    const ahead = Math.min(tick - last.tick, this.extrapolateMs / TICK_MS);
    return this.between(prev, last, 1 + ahead / span);
  }
  /** A recovery teleports a car: never blend across it (the renderer snaps that car). */
  private between(a: RaceFrame, b: RaceFrame, alpha: number): PlaybackSample {
    return { from: a, to: b, alpha };
  }
}
