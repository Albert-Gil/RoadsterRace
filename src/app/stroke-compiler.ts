import { compileRoute } from '../core/route';
import type { DrawSample, RouteResult, TrackDefinition } from '../core/types';
import type { StrokeRequest } from './stroke-worker';

/** One planning turn owns the worker and the only stroke still eligible for preview. */
export class StrokeCompiler {
  private worker?: Worker;
  private pending?: { id: number; samples: DrawSample[]; track: TrackDefinition; done: (r: RouteResult) => void };
  private sequence = 0;

  prepare(track: TrackDefinition) {
    this.close();
    try {
      const worker = this.worker = new Worker(new URL('./stroke-worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<{ id: number; result: RouteResult }>) => {
        const job = this.pending;
        if (worker !== this.worker || !job || data.id !== job.id) return;
        this.pending = undefined;
        job.done(data.result);
      };
      worker.onerror = event => {
        if (worker !== this.worker) return;
        event.preventDefault();
        this.fallback();
      };
      worker.onmessageerror = () => { if (worker === this.worker) this.fallback(); };
      worker.postMessage({ track } satisfies StrokeRequest);
    } catch { this.close(); }
  }

  compile(samples: DrawSample[], track: TrackDefinition, done: (r: RouteResult) => void) {
    const id = ++this.sequence;
    this.pending = { id, samples, track, done };
    if (!this.worker) { this.fallback(); return; }
    try { this.worker.postMessage({ id, stroke: samples } satisfies StrokeRequest); }
    catch { this.fallback(); }
  }

  cancel() {
    const wasPending = !!this.pending;
    this.pending = undefined;
    return wasPending;
  }
  close() { this.cancel(); this.worker?.terminate(); this.worker = undefined; }
  private fallback() {
    const job = this.pending;
    this.close();
    if (job) job.done(compileRoute(job.samples, job.track));
  }
}
