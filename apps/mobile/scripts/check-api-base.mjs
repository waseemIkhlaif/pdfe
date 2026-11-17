#!/usr/bin/env node
// DEMO build check: the app may only talk to the configured internal service address (FR-046).
// Allowed: the Android emulator's host loopback (10.0.2.2), localhost and 127.0.0.1.
import { pathToFileURL } from 'node:url';

const ALLOWED_HOSTS = new Set(['10.0.2.2', 'localhost', '127.0.0.1']);

/** Returns a list of problems (empty when the value is acceptable). */
export function checkApiBase(value) {
  if (value === undefined || value === '') {
    return [
      'EXPO_PUBLIC_API_BASE_URL is not set. Set it to the internal service address, for example http://10.0.2.2:4000.',
    ];
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return [`EXPO_PUBLIC_API_BASE_URL is not a valid URL: ${value}`];
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return [`EXPO_PUBLIC_API_BASE_URL must use http or https (got ${url.protocol}).`];
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    return [
      `EXPO_PUBLIC_API_BASE_URL points at "${url.hostname}", which is not an internal address. ` +
        `The DEMO profile allows only ${[...ALLOWED_HOSTS].join(', ')}.`,
    ];
  }
  return [];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const problems = checkApiBase(process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000');
  if (problems.length > 0) {
    for (const p of problems) console.error(`check-api-base: ${p}`);
    process.exit(1);
  }
  console.log('check-api-base: the API base URL is an internal address');
}
