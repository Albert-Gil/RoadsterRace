import { compareVersions, type ServerVersions } from './codes';
import { offeredVenues } from './protocol';

/** What one /health request said, before interpretation. */
export type HealthReply = { kind: 'timeout' } | { kind: 'error' } | { kind: 'http'; status: number; body: unknown };
/**
 * What the Private Duel entry screen does with it. `updating` means one side is ahead (or the server is too
 * old to report a protocol): Create and Join stay disabled while it rechecks. Wake-up (`asleep`) and
 * connectivity (`unreachable`) are reported separately and never block the buttons.
 */
export type HealthVerdict =
  | { kind: 'ok'; venues: string[] }
  | { kind: 'updating'; ahead: 'server' | 'client' }
  | { kind: 'asleep' }
  | { kind: 'unreachable' };

export function judgeHealth(reply: HealthReply, local: ServerVersions): HealthVerdict {
  if (reply.kind === 'timeout') return { kind: 'asleep' };
  if (reply.kind === 'error' || reply.status < 200 || reply.status >= 300) return { kind: 'unreachable' };
  const body = reply.body as Partial<ServerVersions> | null;
  if (!body || typeof body.protocol !== 'number') return { kind: 'updating', ahead: 'client' };
  const fit = compareVersions({ protocol: body.protocol, physics: typeof body.physics === 'number' ? body.physics : local.physics,
    compiler: typeof body.compiler === 'number' ? body.compiler : local.compiler, tracks: body.tracks ?? {} }, local);
  if (fit === 'client-outdated') return { kind: 'updating', ahead: 'server' };
  if (fit === 'server-outdated') return { kind: 'updating', ahead: 'client' };
  return { kind: 'ok', venues: offeredVenues(body) };
}

export const RECHECK_WINDOW_MS = 15_000, RECHECK_INTERVAL_MS = 3_000;
export interface RecheckIo { probe(): Promise<HealthVerdict>; delay(ms: number): Promise<unknown>; now(): number; stopped?(): boolean }
/** Rechecks an `updating` verdict every 3 s for up to 15 s; returns the first other verdict, or the last one. */
export async function recheckWhileUpdating(io: RecheckIo, first: HealthVerdict): Promise<HealthVerdict> {
  let verdict = first;
  const deadline = io.now() + RECHECK_WINDOW_MS;
  while (verdict.kind === 'updating' && io.now() + RECHECK_INTERVAL_MS <= deadline && !io.stopped?.()) {
    await io.delay(RECHECK_INTERVAL_MS);
    verdict = await io.probe();
  }
  return verdict;
}
