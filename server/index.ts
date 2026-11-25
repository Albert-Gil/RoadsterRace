import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { DuelRoom } from './duel-room';

const server = new Server({
  transport: new WebSocketTransport({ maxPayload: 768 * 1024, perMessageDeflate: false }),
  greet: false,
  express(app) { app.get('/health', (_req: unknown,res: import('node:http').ServerResponse)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','application/json');res.end('{"ok":true}');}); },
});
server.define('private_duel',DuelRoom);
await server.listen(Number(process.env.PORT || 2567),'0.0.0.0');
