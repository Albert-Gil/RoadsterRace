import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';

/**
 * Refuses joins from an address after repeated failures (wrong or guessed room codes): at most `limit`
 * failed joins per `windowMs`, then `too-many-attempts` (HTTP 429) until the window clears.
 */
export class JoinLimiter {
  private failures = new Map<string, number[]>();
  constructor(readonly limit = 10, readonly windowMs = 60_000) {}
  private recent(ip: string, now: number) {
    const list = (this.failures.get(ip) ?? []).filter(t => now - t < this.windowMs);
    if (list.length) this.failures.set(ip, list); else this.failures.delete(ip);
    return list;
  }
  blocked(ip: string, now = Date.now()) { return this.recent(ip, now).length >= this.limit; }
  fail(ip: string, now = Date.now()) { this.failures.set(ip, [...this.recent(ip, now), now]); }
}

/** The client address behind Render's proxy (first X-Forwarded-For entry), else the socket's. */
export function clientAddress(req: IncomingMessage) {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

/**
 * Wraps the HTTP server's request handlers: Colyseus matchmaking routes run before any Express middleware,
 * so the limit sits in front of every handler. Only `joinById` failures count; creating rooms is limited
 * separately by the room cap.
 */
export function guardJoins(http: HttpServer, limiter = new JoinLimiter()) {
  const handlers = http.listeners('request') as ((req: IncomingMessage, res: ServerResponse) => void)[];
  http.removeAllListeners('request');
  http.on('request', (req: IncomingMessage, res: ServerResponse) => {
    if (req.url?.startsWith('/matchmake/joinById')) {
      const ip = clientAddress(req);
      if (limiter.blocked(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ code: 429, error: 'too-many-attempts' }));
        return;
      }
      res.on('finish', () => { if (res.statusCode >= 400) limiter.fail(ip); });
    }
    for (const handler of handlers) handler.call(http, req, res);
  });
  return limiter;
}
