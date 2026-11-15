// Self-test for check-contrast.mjs (node --test). Written before the implementation (Article VII).
import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, flattenTokens, evaluatePairs } from './check-contrast.mjs';

test('black on white is 21:1', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(1), '21.0');
});

test('short hex is expanded', () => {
  assert.equal(contrastRatio('#000', '#fff').toFixed(1), '21.0');
});

test('#777777 on white is just below 4.5 (text fails) but above 3 (ui passes)', () => {
  const r = contrastRatio('#777777', '#ffffff');
  assert.ok(r < 4.5 && r > 4.4, `ratio ${r}`);
});

const tokens = (extra = {}) =>
  flattenTokens({
    color: {
      text: { $value: '#000000', $type: 'color' },
      bg: { $value: '#ffffff', $type: 'color' },
      alias: { $value: '{color.text}', $type: 'color' },
      simulation: {
        $extensions: { pdfe: { reserved: 'simulation-only' } },
        accent: { $value: '#b45309', $type: 'color' },
      },
      ...extra,
    },
  });

test('aliases resolve', () => {
  assert.equal(tokens().get('color.alias').value, '#000000');
});

test('passing pair has no failures', () => {
  const { failures } = evaluatePairs(tokens(), [{ id: 'p', fg: 'color.alias', bg: 'color.bg', usage: 'text', group: 'general' }]);
  assert.deepEqual(failures, []);
});

test('low contrast text pair fails with its id', () => {
  const t = tokens({ grey: { $value: '#777777', $type: 'color' } });
  const { failures } = evaluatePairs(t, [{ id: 'low', fg: 'color.grey', bg: 'color.bg', usage: 'text', group: 'general' }]);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^FAIL low /);
});

test('the same pair passes as ui (3:1)', () => {
  const t = tokens({ grey: { $value: '#777777', $type: 'color' } });
  const { failures } = evaluatePairs(t, [{ id: 'ui', fg: 'color.grey', bg: 'color.bg', usage: 'ui', group: 'general' }]);
  assert.deepEqual(failures, []);
});

test('a general pair may not use a reserved simulation token', () => {
  const { failures } = evaluatePairs(tokens(), [{ id: 'bad', fg: 'color.simulation.accent', bg: 'color.bg', usage: 'text', group: 'general' }]);
  assert.ok(failures.some((f) => /reserved/.test(f)));
});

test('a simulation-group pair may use the reserved token', () => {
  const { failures } = evaluatePairs(tokens(), [{ id: 'ok', fg: 'color.simulation.accent', bg: 'color.bg', usage: 'text', group: 'simulation' }]);
  assert.deepEqual(failures, []);
});

test('a missing token reference fails', () => {
  const { failures } = evaluatePairs(tokens(), [{ id: 'm', fg: 'color.nope', bg: 'color.bg', usage: 'text', group: 'general' }]);
  assert.ok(failures.some((f) => /missing token/.test(f)));
});

test('color.simulation tokens must carry the reserved marker', () => {
  const t = flattenTokens({ color: { simulation: { accent: { $value: '#b45309', $type: 'color' } }, bg: { $value: '#fff', $type: 'color' } } });
  const { failures } = evaluatePairs(t, []);
  assert.ok(failures.some((f) => /not marked reserved/.test(f)));
});
