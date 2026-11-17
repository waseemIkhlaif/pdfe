import net from 'node:net';

/** Thrown (or emitted as an 'error' event) when code tries to reach a host outside the internal allowlist. */
export class EgressBlockedError extends Error {
  readonly code = 'EGRESS_BLOCKED';
  constructor(readonly host: string) {
    super(
      `Outbound connection to "${host}" is blocked: only internal hosts are allowed (simulation boundary).`,
    );
    this.name = 'EgressBlockedError';
  }
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '[::1]']);

const normalize = (h: string): string =>
  h
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');

/** Host named by the arguments of net.Socket.prototype.connect, or undefined for unix sockets and unparseable forms. */
function hostOf(args: unknown[]): string | undefined {
  const first = args[0];
  // net.connect() hands Socket.connect an already-normalized [options, callback] array.
  if (Array.isArray(first)) return hostOf(first);
  if (first !== null && typeof first === 'object') {
    const o = first as { host?: string; path?: string; port?: number };
    if (o.path !== undefined && o.host === undefined) return undefined; // unix socket: local by definition
    return o.host ?? 'localhost';
  }
  if (typeof first === 'string' && Number.isNaN(Number(first))) return undefined; // path form
  return typeof args[1] === 'string' ? args[1] : 'localhost';
}

/**
 * Code-level egress guard (layer 1 of 3, research R-9): every outbound TCP connection (http, https, tls, net,
 * and fetch, which is built on them) is checked against the allowlist before any name lookup happens.
 * Returns a function that removes the guard (used by tests).
 * Layers 2 and 3 are the internal Compose network and the CI egress probes.
 */
export function installEgressGuard(internalHosts: readonly string[]): () => void {
  const allowed = new Set(internalHosts.map(normalize));
  const isAllowed = (host: string): boolean => {
    const h = normalize(host);
    if (allowed.has(h)) return true;
    // Loopback addresses count as the local machine when "localhost" is allowed.
    return LOOPBACK.has(h) && allowed.has('localhost');
  };

  const proto = net.Socket.prototype as unknown as { connect: (...a: unknown[]) => net.Socket };
  const originalConnect = proto.connect;
  const originalFetch = globalThis.fetch;

  proto.connect = function patched(this: net.Socket, ...args: unknown[]): net.Socket {
    const host = hostOf(args);
    if (host !== undefined && !isAllowed(host)) {
      // Fail before any DNS lookup or socket creation; surfaces as an 'error' event like a normal connect failure.
      process.nextTick(() => this.destroy(new EgressBlockedError(host)));
      return this;
    }
    return originalConnect.apply(this, args);
  };

  globalThis.fetch = async function guardedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (!isAllowed(url.hostname)) throw new EgressBlockedError(url.hostname);
    return originalFetch(input, init);
  };

  return () => {
    proto.connect = originalConnect;
    globalThis.fetch = originalFetch;
  };
}
