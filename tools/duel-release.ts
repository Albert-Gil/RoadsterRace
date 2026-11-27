// Release logic for the Private Duels room server (see tools/deploy-duel-server.mjs, which runs it in
// the Pages workflow). Pure apart from the injected fetch, clock and logger, so every branch is tested.
import { releaseDecision } from '../server/contract.ts';

export interface ReleaseEnv { revision: string; contract: string; server?: string; hook?: string }
export interface ReleaseIo {
  fetch: typeof fetch;
  delay(ms: number): Promise<unknown>;
  now(): number;
  log(line: string): void;
  /** Wait for /health to report the new contract (default 8 minutes). */
  deployWaitMs?: number;
}

async function liveContract(io: ReleaseIo, health: URL, timeout: number) {
  try {
    const response = await io.fetch(health, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(timeout) });
    if (!response.ok) return null;
    const status = await response.json() as { ok?: unknown; contract?: unknown };
    return status?.ok === true && typeof status.contract === 'string' ? status.contract : null;
  } catch {
    // Free instances can be asleep or briefly unavailable during deployment.
    return null;
  }
}

/** Resolves when Pages may publish; throws (holding Pages) when the server cannot be brought current. */
export async function releaseRoomServer(env: ReleaseEnv, io: ReleaseIo) {
  if (!/^[a-f0-9]{40}$/.test(env.revision)) throw new Error('The release commit is missing or invalid.');
  const origin = URL.parse(env.server ?? '');
  const serverConfigured = origin?.protocol === 'https:';
  const hook = URL.parse(env.hook ?? '');
  const hookConfigured = hook?.origin === 'https://api.render.com' && hook.pathname.startsWith('/deploy/') && !!hook.searchParams.get('key');
  const health = serverConfigured ? new URL('/health', origin!) : null;
  // The first request can wake a sleeping free instance (about a minute).
  const live = health ? await liveContract(io, health, 75_000) : null;
  const decision = releaseDecision({ contract: env.contract, liveContract: live, serverConfigured, hookConfigured });
  if (decision.action === 'hold') throw new Error(decision.message);
  if (decision.action !== 'deploy') { io.log(decision.action === 'skip-current' ? decision.message : `::notice::${decision.message}`); return decision.action; }
  io.log(decision.message);
  hook!.searchParams.set('ref', env.revision);
  let response: Response;
  try { response = await io.fetch(hook!, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000) }); }
  catch { throw new Error('Could not reach the Render deploy hook. Check the service before retrying.'); }
  if (!response.ok) throw new Error(`Render rejected the deployment request (HTTP ${response.status}).`);
  await response.body?.cancel();
  const deadline = io.now() + (io.deployWaitMs ?? 8 * 60_000);
  while (io.now() < deadline) {
    if (await liveContract(io, health!, 15_000) === env.contract) { io.log(`Private Duels is live with contract ${env.contract} (commit ${env.revision}).`); return 'deployed'; }
    await io.delay(10_000);
  }
  throw new Error('The room server did not report the new contract. Check the Render deployment and retry the release.');
}
