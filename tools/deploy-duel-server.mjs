// Release step for the Private Duels room server, run by the Pages workflow after verification.
// It redeploys Render only when the server's release contract (server/contract.ts) changed, so
// website-only releases keep live rooms. When the server is configured but outdated or unverifiable
// it deploys through the hook and waits for /health; without a valid hook it fails, which holds Pages.
// Logic: tools/duel-release.ts.
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { releaseRoomServer } from './duel-release.ts';

try {
  const { contract } = JSON.parse(readFileSync(new URL('../dist-server/contract.json', import.meta.url), 'utf8'));
  await releaseRoomServer(
    { revision: process.env.GITHUB_SHA ?? '', contract, server: process.env.ROADSTER_DUEL_SERVER, hook: process.env.RENDER_DEPLOY_HOOK_URL },
    { fetch, delay, now: Date.now, log: line => console.log(line) },
  );
} catch (error) {
  console.error(`::error::${error.message}`);
  process.exitCode = 1;
}
