import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../src/canonical-json';
import { sha256Hex } from '../src/hash';

describe('canonicalJson (RFC 8785)', () => {
  it('sorts keys by UTF-16 code units', () => {
    expect(canonicalJson({ b: 2, a: 1, '€': 3, ä: 4, A: 5 })).toBe(
      '{"A":5,"a":1,"b":2,"ä":4,"€":3}',
    );
  });
  it('sorts keys recursively and keeps array order', () => {
    expect(canonicalJson({ z: [3, 1, { y: 1, x: 2 }], a: null })).toBe(
      '{"a":null,"z":[3,1,{"x":2,"y":1}]}',
    );
  });
  it('serializes numbers like ECMAScript', () => {
    expect(canonicalJson([0, -0, 1, 1.5, 1e21, 1e-7, 123456789012, 0.000001])).toBe(
      '[0,0,1,1.5,1e+21,1e-7,123456789012,0.000001]',
    );
  });
  it('escapes strings like JSON.stringify', () => {
    expect(canonicalJson('a"b\\c\n\u0001')).toBe('"a\\"b\\\\c\\n\\u0001"');
  });
  it('rejects NaN and Infinity', () => {
    expect(() => canonicalJson(NaN)).toThrow();
    expect(() => canonicalJson(Infinity)).toThrow();
  });
  it('drops undefined object members', () => {
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}');
  });
  it('gives a stable hash that ignores key order', () => {
    const h1 = sha256Hex(canonicalJson({ a: 1, b: [1, 2] }));
    const h2 = sha256Hex(canonicalJson({ b: [1, 2], a: 1 }));
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
