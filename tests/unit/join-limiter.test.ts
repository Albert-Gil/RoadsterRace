import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client } from '@colyseus/sdk';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DuelRoom } from '../../server/duel-room';
import { guardJoins, JoinLimiter } from '../../server/join-limiter';

describe('failed-join limit', () => {
  it('counts failures per address inside a sliding window', () => {
    const limiter = new JoinLimiter(3, 1000);
    for (let i = 0; i < 3; i++) limiter.fail('a', i);
    expect(limiter.blocked('a', 10)).toBe(true);
    expect(limiter.blocked('b', 10)).toBe(false);
    expect(limiter.blocked('a', 1001)).toBe(false);
  });
  const http = createServer();
  let server: Server, client: Client;
  beforeAll(async () => {
    server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false, gracefullyShutdown: false });
    server.define('private_duel', DuelRoom);
    await server.listen(0, '127.0.0.1');
    guardJoins(http, new JoinLimiter(10, 60_000));
    client = new Client('http://127.0.0.1:' + (http.address() as AddressInfo).port);
  });
  afterAll(async () => { await server.gracefullyShutdown(false); });
  it('refuses joins from an address after ten wrong codes', async () => {
    for (let i = 0; i < 10; i++) await expect(client.joinById('NOPE' + i, {})).rejects.toThrow();
    await expect(client.joinById('TIGER7', {})).rejects.toThrow('too-many-attempts');
  });
});
