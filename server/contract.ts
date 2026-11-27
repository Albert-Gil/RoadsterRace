import { createHash } from 'node:crypto';

/**
 * The room server's release contract: one hash over every source module that ends up in the
 * server bundle, plus the lockfile. Two builds with the same contract run the same race code and
 * speak the same protocol, so a website release that leaves it unchanged need not restart the
 * room server (which would end every live duel). Line endings are normalized so a Windows
 * checkout and the Linux build agree.
 */
export interface ContractSource { path: string; content: string }

export function contractHash(sources: ContractSource[]): string {
  const hash = createHash('sha256');
  for (const source of [...sources].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) {
    hash.update(source.path.replaceAll('\\', '/')).update('\0').update(source.content.replace(/\r\n/g, '\n')).update('\0');
  }
  return hash.digest('hex').slice(0, 32);
}

export interface ReleaseInputs {
  /** Contract of the server this release would deploy. */
  contract: string;
  /** Contract reported by the live room server, or null when it is unreachable or older. */
  liveContract: string | null;
  serverConfigured: boolean;
  hookConfigured: boolean;
}
export type ReleaseDecision =
  | { action: 'skip-unconfigured'; message: string }
  | { action: 'skip-current'; message: string }
  | { action: 'warn-outdated'; message: string }
  | { action: 'deploy'; message: string };

/** What the Pages release does about the room server. Never blocks Pages unless a deploy it started fails. */
export function releaseDecision(input: ReleaseInputs): ReleaseDecision {
  if (!input.serverConfigured) return { action: 'skip-unconfigured', message: 'ROADSTER_DUEL_SERVER is not set, so this build hides Private Duels. Publishing the website only.' };
  if (input.liveContract === input.contract) return { action: 'skip-current', message: `The room server already runs contract ${input.contract}. Live rooms are kept.` };
  if (!input.hookConfigured) return { action: 'warn-outdated', message: `The room server runs ${input.liveContract ?? 'an unknown or unreachable build'}, not ${input.contract}, and RENDER_DEPLOY_HOOK_URL is not set. Players will see "server updating" until it is redeployed.` };
  return { action: 'deploy', message: `Deploying the room server for contract ${input.contract}.` };
}
