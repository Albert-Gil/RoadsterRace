import { setTimeout as delay } from 'node:timers/promises';

async function deployedRevision(health, timeout) {
  try {
    const response = await fetch(health, {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) return null;
    const status = await response.json();
    return status?.ok === true ? status.revision : null;
  } catch {
    // Free instances can be asleep or briefly unavailable during deployment.
    return null;
  }
}

async function deploy() {
  const revision = process.env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(revision ?? '')) throw new Error('The release commit is missing or invalid.');
  const origin = URL.parse(process.env.ROADSTER_DUEL_SERVER ?? '');
  if (origin?.protocol !== 'https:') throw new Error('Configure ROADSTER_DUEL_SERVER as an HTTPS origin.');
  const health = new URL('/health', origin);
  if (await deployedRevision(health, 65_000) === revision) {
    console.log(`Private Duels already serves ${revision}.`);
    return;
  }

  const hook = URL.parse(process.env.RENDER_DEPLOY_HOOK_URL ?? '');
  if (hook?.origin !== 'https://api.render.com' || !hook.pathname.startsWith('/deploy/') || !hook.searchParams.get('key')) {
    throw new Error('Configure the RENDER_DEPLOY_HOOK_URL Actions secret for this service.');
  }
  hook.searchParams.set('ref', revision);
  let response;
  try {
    response = await fetch(hook, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error('Could not reach the Render deploy hook. Check the service before retrying.');
  }
  if (!response.ok) throw new Error(`Render rejected the deployment request (HTTP ${response.status}).`);
  await response.body?.cancel();

  console.log(`Waiting for Private Duels to serve ${revision}.`);
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    if (await deployedRevision(health, 15_000) === revision) {
      console.log(`Private Duels is live at ${revision}.`);
      return;
    }
    await delay(10_000);
  }
  throw new Error('The matching room server did not become healthy. Check the Render deployment and retry the release.');
}

try {
  await deploy();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
