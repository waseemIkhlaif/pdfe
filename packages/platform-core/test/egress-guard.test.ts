import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EgressBlockedError, installEgressGuard } from '../src/egress-guard';

let uninstall: () => void;
let server: http.Server;
let port: number;

beforeEach(async () => {
  server = http.createServer((_req, res) => {
    res.end('internal-ok');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as net.AddressInfo).port;
  uninstall = installEgressGuard(['localhost', '127.0.0.1', 'api']);
});
afterEach(async () => {
  uninstall();
  await new Promise((r) => server.close(r));
});

const isBlocked = (e: unknown): boolean =>
  e instanceof EgressBlockedError ||
  (e as { cause?: unknown })?.cause instanceof EgressBlockedError;

describe('egress guard: public hosts are refused', () => {
  it.each(['https://example.com', 'http://1.1.1.1', 'https://example.com:8443/x'])(
    'fetch(%s) rejects with EgressBlockedError',
    async (url) => {
      const err = await fetch(url).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(isBlocked(err)).toBe(true);
    },
  );

  it('http.get to a public host errors with EgressBlockedError', async () => {
    const err = await new Promise<unknown>((resolve) => {
      http.get('http://example.com', () => resolve(undefined)).on('error', resolve);
    });
    expect(isBlocked(err)).toBe(true);
  });

  it('https.get to a public host errors with EgressBlockedError', async () => {
    const err = await new Promise<unknown>((resolve) => {
      https.get('https://example.com', () => resolve(undefined)).on('error', resolve);
    });
    expect(isBlocked(err)).toBe(true);
  });

  it('net.connect to a public IP errors with EgressBlockedError', async () => {
    const err = await new Promise<unknown>((resolve) => {
      net.connect(443, '1.1.1.1').on('error', resolve);
    });
    expect(isBlocked(err)).toBe(true);
  });

  it('tls.connect to a public host errors with EgressBlockedError', async () => {
    const err = await new Promise<unknown>((resolve) => {
      tls.connect(443, 'example.com').on('error', resolve);
    });
    expect(isBlocked(err)).toBe(true);
  });

  it('the error names the blocked host', async () => {
    const err = await fetch('https://example.com').then(
      () => undefined,
      (e: unknown) => e,
    );
    const inner = (
      err instanceof EgressBlockedError ? err : (err as { cause: Error }).cause
    ) as EgressBlockedError;
    expect(inner.message).toContain('example.com');
    expect(inner.code).toBe('EGRESS_BLOCKED');
  });
});

describe('egress guard: internal hosts stay reachable', () => {
  it('fetch to 127.0.0.1 works', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(await res.text()).toBe('internal-ok');
  });

  it('http.get to localhost works', async () => {
    const body = await new Promise<string>((resolve, reject) => {
      http
        .get(`http://localhost:${port}/`, (res) => {
          let s = '';
          res.on('data', (c) => (s += c));
          res.on('end', () => resolve(s));
        })
        .on('error', reject);
    });
    expect(body).toBe('internal-ok');
  });
});

describe('uninstall', () => {
  it('restores normal behaviour', async () => {
    uninstall();
    const err = await new Promise<unknown>((resolve) => {
      const s = net.connect(1, '127.0.0.1'); // nothing listens on port 1: a normal connection error
      s.on('error', resolve);
    });
    expect(isBlocked(err)).toBe(false);
    uninstall = installEgressGuard(['localhost', '127.0.0.1']);
  });
});
