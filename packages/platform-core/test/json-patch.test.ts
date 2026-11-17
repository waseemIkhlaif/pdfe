import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PatchError, apply, deepEqual, diff, type JsonValue } from '../src/json-patch';

// The patch a diff gives, applied to the old value, gives the new one (T153).
const json = fc.jsonValue().map((v) => JSON.parse(JSON.stringify(v)) as JsonValue);
const runs = 400;

describe('diff and apply (properties)', () => {
  it('apply(diff(a, b), a) equals b, for any two JSON values', () => {
    fc.assert(
      fc.property(json, json, (a, b) => {
        expect(apply(a, diff(a, b))).toEqual(b);
      }),
      { numRuns: runs },
    );
  });

  it('is empty exactly when the two values are equal', () => {
    fc.assert(
      fc.property(json, json, (a, b) => {
        expect(diff(a, b).length === 0).toBe(deepEqual(a, b));
      }),
      { numRuns: runs },
    );
  });

  it('never changes its inputs, and a value diffs to itself with no operations', () => {
    fc.assert(
      fc.property(json, json, (a, b) => {
        const before = JSON.stringify([a, b]);
        apply(a, diff(a, b));
        expect(JSON.stringify([a, b])).toBe(before);
        expect(diff(a, a)).toEqual([]);
      }),
      { numRuns: runs },
    );
  });

  it('patching there and back restores the original', () => {
    fc.assert(
      fc.property(json, json, (a, b) => {
        const there = apply(a, diff(a, b));
        expect(apply(there, diff(b, a))).toEqual(a);
      }),
      { numRuns: runs },
    );
  });
});

describe('diff on configuration-shaped values', () => {
  it('a number change is one replace', () => {
    expect(diff(30, 45)).toEqual([{ op: 'replace', path: '', value: 45 }]);
    expect(diff({ ttl: 30 }, { ttl: 45 })).toEqual([{ op: 'replace', path: '/ttl', value: 45 }]);
  });

  it('adds, removes and changes keys, and escapes ~ and / in names', () => {
    const a = { 'a/b': 1, 'c~d': 2, gone: true, same: [1, 2] };
    const b = { 'a/b': 9, 'c~d': 2, added: { x: 1 }, same: [1, 2] };
    const patch = diff(a, b);
    expect(patch).toEqual([
      { op: 'remove', path: '/gone' },
      { op: 'replace', path: '/a~1b', value: 9 },
      { op: 'add', path: '/added', value: { x: 1 } },
    ]);
    expect(apply(a, patch)).toEqual(b);
  });

  it('shortens and lengthens arrays', () => {
    expect(diff(['a', 'b', 'c'], ['a'])).toEqual([
      { op: 'remove', path: '/2' },
      { op: 'remove', path: '/1' },
    ]);
    expect(diff(['a'], ['a', 'b'])).toEqual([{ op: 'add', path: '/1', value: 'b' }]);
  });

  it('copes with a key called __proto__', () => {
    const a = JSON.parse('{"__proto__": 1}') as JsonValue;
    const b = JSON.parse('{"__proto__": 2}') as JsonValue;
    expect(apply(a, diff(a, b))).toEqual(b);
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });
});

describe('apply', () => {
  it('refuses a path that does not exist', () => {
    expect(() => apply({ a: 1 }, [{ op: 'replace', path: '/b', value: 2 }])).toThrow(PatchError);
    expect(() => apply({ a: 1 }, [{ op: 'remove', path: '/b' }])).toThrow(PatchError);
    expect(() => apply([1], [{ op: 'replace', path: '/5', value: 2 }])).toThrow(PatchError);
    expect(() => apply({}, [{ op: 'remove', path: '' }])).toThrow(PatchError);
  });

  it('supports the - index to append', () => {
    expect(apply([1], [{ op: 'add', path: '/-', value: 2 }])).toEqual([1, 2]);
  });
});
