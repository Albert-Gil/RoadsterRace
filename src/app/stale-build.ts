import type { Phase } from './phases';

/**
 * A tab opened before a newer deployment still runs the old build, and every deployment renames
 * the lazily loaded scenery chunks. When such a chunk is missing (Vite's `vite:preloadError`), the
 * venue keeps its road but loses that scenery. When the deployed page names a different entry
 * script (a newer build, not a dropped connection), the page reloads once to fetch it: at once on
 * Home or race setup, otherwise the next time the player is back there; never while drawing or
 * racing. A second failure within a minute of a reload does not reload again.
 */
const SAFE: readonly Phase[] = ['welcome', 'setup', 'tour-intro', 'tour-resume'];
const KEY = 'roadster-stale-build-reload', QUIET_MS = 60_000;

export interface StaleBuildHost { phase(): Phase; reload(): void; storage?: Pick<Storage, 'getItem' | 'setItem'>; now?(): number }

export function staleBuildRecovery(host: StaleBuildHost) {
  const now = () => host.now?.() ?? Date.now();
  let pending = false;
  const reloadIfSafe = () => {
    if (!pending || !SAFE.includes(host.phase())) return;
    pending = false;
    try { host.storage?.setItem(KEY, String(now())); } catch { /* Reload anyway; the quiet period is a courtesy. */ }
    host.reload();
  };
  return {
    /** A lazily loaded chunk failed to load. */
    failed() {
      let last = 0;
      try { last = Number(host.storage?.getItem(KEY) ?? 0); } catch { /* No storage: treat as never reloaded. */ }
      if (now() - last < QUIET_MS) return;
      pending = true; reloadIfSafe();
    },
    /** Call after every phase change. */
    phaseChanged: reloadIfSafe,
    get pending() { return pending; },
  };
}

/** True when the page now deployed at this address loads a different entry script than this tab. */
export async function newerBuildDeployed(doc: Document = document, load: typeof fetch = fetch) {
  const entry = (from: Document) => from.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute('src');
  const current = entry(doc); if (!current) return false;
  const response = await load(doc.location.href.split('#')[0], { cache: 'no-store' }); if (!response.ok) return false;
  const deployed = entry(new DOMParser().parseFromString(await response.text(), 'text/html'));
  return !!deployed && new URL(deployed, doc.location.href).href !== new URL(current, doc.location.href).href;
}
