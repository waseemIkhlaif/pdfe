#!/usr/bin/env node
// Prints the current one-time password for a synthetic demo user:  pnpm totp demo.admin.a
// The secrets are fixed and public (infra/keycloak/README.md). They protect nothing real.
import { createHmac } from 'node:crypto';
import { USERS } from '../infra/keycloak/generate-realm.mjs';

/** RFC 6238 time-based one-time password, HMAC-SHA1, 6 digits, 30-second steps. `key` is the secret's bytes. */
export function totp(key, atMs = Date.now(), { digits = 6, period = 30 } = {}) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 1000 / period)));
  const h = createHmac('sha1', key).update(counter).digest();
  const offset = h[h.length - 1] & 0x0f;
  const code = (h.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return String(code).padStart(digits, '0');
}

/** The current code for a demo username (for example `demo.admin.a`), or null if that user has no second factor. */
export function totpFor(username, atMs = Date.now()) {
  const u = USERS.find((x) => x.username === username);
  if (!u) throw new Error(`unknown demo user: ${username}`);
  return u.otpSecret ? totp(Buffer.from(u.otpSecret, 'utf8'), atMs) : null;
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href
) {
  const name = process.argv[2];
  if (!name) {
    console.error('usage: pnpm totp <username>    e.g. pnpm totp demo.admin.a');
    process.exit(2);
  }
  const code = totpFor(name);
  if (!code) {
    console.error(`${name} has no second factor (only console roles do)`);
    process.exit(1);
  }
  console.log(code);
}
