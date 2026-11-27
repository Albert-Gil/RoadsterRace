import { createServer, connect, type Server, type Socket } from 'node:net';

/**
 * A TCP proxy that delays each direction by half the round trip, plus uniform jitter, while
 * keeping byte order (as TCP would). Used to run real browsers against the room server under
 * 0-250 ms round trips without touching the game or server code.
 */
export async function latencyProxy(targetPort: number, rttMs: number, jitterMs = 0): Promise<{ port: number; close: () => Promise<void> }> {
  const sockets = new Set<Socket>();
  const pipe = (from: Socket, to: Socket) => {
    let ready = 0;
    from.on('data', chunk => {
      const delay = Math.max(0, rttMs / 2 + (Math.random() * 2 - 1) * jitterMs);
      ready = Math.max(ready, Date.now() + delay);
      setTimeout(() => { if (!to.destroyed) to.write(chunk); }, ready - Date.now());
    });
    from.on('close', () => setTimeout(() => to.destroy(), Math.max(0, ready - Date.now())));
    from.on('error', () => to.destroy());
  };
  const server: Server = createServer(client => {
    const upstream = connect(targetPort, '127.0.0.1');
    for (const s of [client, upstream]) sockets.add(s);
    pipe(client, upstream); pipe(upstream, client);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  return { port, close: () => new Promise(resolve => { sockets.forEach(s => s.destroy()); server.close(() => resolve()); }) };
}
