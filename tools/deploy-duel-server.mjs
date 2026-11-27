// Release step for the Private Duels room server, run by the Pages workflow after verification.
// It redeploys Render only when the server's release contract (server/contract.ts) changed, so
// website-only releases keep live rooms. It never blocks the website for missing configuration;
// it fails only when a deployment it requested does not come up.
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { releaseDecision } from '../server/contract.ts';

async function liveContract(health, timeout) {
  try {
    const response = await fetch(health, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(timeout) });
    if (!response.ok) return null;
    const status = await response.json();
    return status?.ok === true && typeof status.contract === 'string' ? status.contract : null;
  } catch {
    // Free instances can be asleep or briefly unavailable during deployment.
    return null;
  }
}

async function release() {
  const revision = process.env.GITHUB_SHA ?? '';
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('The release commit is missing or invalid.');
  const { contract } = JSON.parse(readFileSync(new URL('../dist-server/contract.json', import.meta.url), 'utf8'));
  const origin = URL.parse(process.env.ROADSTER_DUEL_SERVER ?? '');
  const serverConfigured = origin?.protocol === 'https:';
  const hook = URL.parse(process.env.RENDER_DEPLOY_HOOK_URL ?? '');
  const hookConfigured = hook?.origin === 'https://api.render.com' && hook.pathname.startsWith('/deploy/') && !!hook.searchParams.get('key');
  const health = serverConfigured ? new URL('/health', origin) : null;
  // The first request can wake a sleeping free instance (about a minute).
  const live = health ? await liveContract(health, 75_000) : null;
  const decision = releaseDecision({ contract, liveContract: live, serverConfigured, hookConfigured });
  if (decision.action !== 'deploy') {
    console.log(decision.action === 'skip-current' ? decision.message : `::warning::${decision.message}`);
    return;
  }
  console.log(decision.message);
  hook.searchParams.set('ref', revision);
  let response;
  try {
    response = await fetch(hook, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new Error('Could not reach the Render deploy hook. Check the service before retrying.');
  }
  if (!response.ok) throw new Error(`Render rejected the deployment request (HTTP ${response.status}).`);
  await response.body?.cancel();
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    if (await liveContract(health, 15_000) === contract) {
      console.log(`Private Duels is live with contract ${contract} (commit ${revision}).`);
      return;
    }
    await delay(10_000);
  }
  throw new Error('The room server did not report the new contract. Check the Render deployment and retry the release.');
}

try {
  await release();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
