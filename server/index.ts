import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { DuelRoom } from './duel-room';

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
      res.end(JSON.stringify({ ok: true, revision: process.env.RENDER_GIT_COMMIT ?? null }));
    });
  },
});
server.define('private_duel',DuelRoom);
await server.listen(Number(process.env.PORT || 2567),'0.0.0.0');
