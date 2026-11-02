/**
 * Runs a heavy scenery generator in a module worker so venue loading never freezes the main thread,
 * and falls back to running it here when workers are unavailable or the worker fails (for example
 * a tab left open across a deployment, whose renamed worker script is gone). `spawn` must contain
 * the literal `new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' })` so the
 * bundler finds the worker. The worker answers `{ data }` or `{ error }`.
 */
export function sceneryWork<T>(spawn: () => Worker, request: unknown, inline: () => T | Promise<T>): { result: Promise<T>; cancel(): void } {
  let worker: Worker | null = null, cancelled = false;
  const fallback = (reason: unknown) => { worker?.terminate(); worker = null; if (cancelled) return new Promise<T>(() => {}); if (reason) console.warn('Scenery worker unavailable; generating on the main thread', reason); return Promise.resolve().then(inline); };
  const result = new Promise<T>((resolve, reject) => {
    try { worker = typeof Worker === 'undefined' ? null : spawn(); } catch (error) { worker = null; fallback(error).then(resolve, reject); return; }
    if (!worker) { fallback(null).then(resolve, reject); return; }
    worker.addEventListener('message', (event: MessageEvent<{ data?: T; error?: string }>) => {
      if (event.data.data !== undefined) { worker?.terminate(); worker = null; resolve(event.data.data); }
      else fallback(event.data.error).then(resolve, reject);
    });
    worker.addEventListener('error', event => { event.preventDefault?.(); fallback(event.message || 'worker error').then(resolve, reject); });
    worker.postMessage(request);
  });
  return { result, cancel() { cancelled = true; worker?.terminate(); worker = null; } };
}
