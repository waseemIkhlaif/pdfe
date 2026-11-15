import { describe, expect, it } from 'vitest';
import { acceptOrGenerate, getContext, runWithContext } from '../src/correlation';
import { IdGenerator } from '../src/ids';
import { ScenarioClock } from '../src/clock';
import { SeededRandom } from '../src/random';

const ids = new IdGenerator(new ScenarioClock('2026-01-15T08:00:00Z', 1), new SeededRandom(1));

describe('acceptOrGenerate', () => {
  it.each(['abcdefgh', 'COR-01234567-aaaa', 'a.b_c-d.e_f-g', 'x'.repeat(64)])('accepts %s', (v) => {
    expect(acceptOrGenerate(v, ids)).toBe(v);
  });
  it.each([
    undefined,
    '',
    'short',
    'x'.repeat(65),
    'has space here',
    'bad/char/slash',
    'new\nline-here',
    '<script>alert(1)</script>',
  ])('replaces %j with COR-<uuidv7>', (v) => {
    const out = acceptOrGenerate(v, ids);
    expect(out).toMatch(/^COR-[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(out).not.toBe(v);
  });
});

describe('context', () => {
  it('survives await boundaries and is isolated per run', async () => {
    const seen: (string | undefined)[] = [];
    await Promise.all([
      runWithContext({ correlationId: 'COR-A-aaaaaaaa' }, async () => {
        await new Promise((r) => setTimeout(r, 10));
        seen.push(getContext()?.correlationId);
      }),
      runWithContext({ correlationId: 'COR-B-bbbbbbbb' }, async () => {
        seen.push(getContext()?.correlationId);
      }),
    ]);
    expect(seen.sort()).toEqual(['COR-A-aaaaaaaa', 'COR-B-bbbbbbbb']);
    expect(getContext()).toBeUndefined();
  });
});
