import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APPS, checkAll } from '../smoke.mjs';

const EN = 'SIMULATION — NOT REAL MONEY';
const AR = 'محاكاة — ليست أموالاً حقيقية';

const respond = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => body,
  json: async () => JSON.parse(body),
});

test('passes when every app shows both labels and the api reports DEMO', async () => {
  const fetchFn = async (url) =>
    url.includes(':4000')
      ? respond(200, JSON.stringify({ status: 'ok', mode: 'DEMO' }))
      : respond(200, `<html><body>${EN} / ${AR}</body></html>`);
  const r = await checkAll(fetchFn);
  assert.deepEqual(r.failures, []);
  assert.equal(r.checked, APPS.length + 1);
});

test('fails and names the URL when an app lacks the Arabic label', async () => {
  const fetchFn = async (url) =>
    url.includes(':4000')
      ? respond(200, JSON.stringify({ mode: 'DEMO' }))
      : url.includes(':3004')
        ? respond(200, `<html>${EN}</html>`)
        : respond(200, `<html>${EN} ${AR}</html>`);
  const r = await checkAll(fetchFn);
  assert.equal(r.failures.length, 1);
  assert.match(r.failures[0], /:3004\/ar\/sign-in/);
  assert.match(r.failures[0], /Arabic/);
});

test('fails when an app is down', async () => {
  const fetchFn = async (url) => {
    if (url.includes(':3002')) throw new Error('connect ECONNREFUSED');
    return url.includes(':4000')
      ? respond(200, JSON.stringify({ mode: 'DEMO' }))
      : respond(200, `${EN} ${AR}`);
  };
  const r = await checkAll(fetchFn);
  assert.equal(r.failures.length, 1);
  assert.match(r.failures[0], /:3002/);
});

test('fails when the api does not report DEMO', async () => {
  const fetchFn = async (url) =>
    url.includes(':4000')
      ? respond(200, JSON.stringify({ mode: 'LIVE' }))
      : respond(200, `${EN} ${AR}`);
  const r = await checkAll(fetchFn);
  assert.equal(r.failures.length, 1);
  assert.match(r.failures[0], /mode/);
});
