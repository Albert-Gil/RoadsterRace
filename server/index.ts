import { readFileSync } from 'node:fs';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { DuelRoom, duelTracks } from './duel-room';
import { guardJoins } from './join-limiter';
import { DUEL_PROTOCOL, duelVenues } from '../src/duels/protocol';
import { RULES } from '../src/core/simulation';
import { COMPILER_VERSION } from '../src/core/route';

/** Written by the build (server/vite.config.ts); absent when the sources run unbundled in tests. */
function releaseContract(): string | null {
  try { return JSON.parse(readFileSync(new URL('./contract.json', import.meta.url), 'utf8')).contract ?? null; } catch { return null; }
}
const contract = releaseContract();
const enabled = duelTracks(), venues = Object.keys(duelVenues).filter(id => enabled.has(id));
const health = JSON.stringify({
  ok: true, revision: process.env.RENDER_GIT_COMMIT ?? null, contract,
  protocol: DUEL_PROTOCOL, physics: RULES.version, compiler: COMPILER_VERSION,
  tracks: Object.fromEntries([...enabled.values()].map(track => [track.id, track.version])),
  venues,
});

const server = new Server({
  transport: new WebSocketTransport({
    maxPayload: 768 * 1024, perMessageDeflate: false,
    // A reclaimed browser can stall during its first WebGL scene upload. Allow
    // that socket to answer a ping when the scene is ready. Explicit socket
    // closes still start the room's 30-second reconnect timer immediately.
    pingInterval: 10_000, pingMaxRetries: 6,
  }),
  greet: false,
  express(app) {
    app.get('/health', (_req: unknown, res: import('node:http').ServerResponse) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      res.end(health);
    });
  },
});
server.define('private_duel',DuelRoom);
await server.listen(Number(process.env.PORT || 2567),'0.0.0.0');
// Repeated failed joins from one address (guessed room codes) are refused for a minute.
const http = (server.transport as unknown as { server?: import('node:http').Server }).server;
if (http) guardJoins(http);
