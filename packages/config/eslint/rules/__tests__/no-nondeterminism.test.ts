import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from '../no-nondeterminism.js';

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

tester.run('no-nondeterminism', rule, {
  valid: [
    { code: 'const d = new Date(value);', filename: 'apps/api/src/a.ts' },
    { code: 'const n = Date.now();', filename: 'packages/platform-core/src/clock.ts' },
    { code: 'const r = Math.random();', filename: 'packages/platform-core/src/random.ts' },
    {
      code: 'const u = crypto.randomUUID();',
      filename: String.raw`C:\dev\pdfe\packages\platform-core\src\x.ts`,
    },
  ],
  invalid: [
    { code: 'Date.now();', filename: 'apps/api/src/a.ts', errors: [{ messageId: 'banned' }] },
    { code: 'new Date();', filename: 'apps/api/src/a.ts', errors: [{ messageId: 'banned' }] },
    { code: 'Math.random();', filename: 'apps/worker/src/a.ts', errors: [{ messageId: 'banned' }] },
    {
      code: 'crypto.randomUUID();',
      filename: 'apps/api/src/a.ts',
      errors: [{ messageId: 'banned' }],
    },
    {
      code: 'globalThis.crypto.randomUUID();',
      filename: 'apps/api/src/a.ts',
      errors: [{ messageId: 'banned' }],
    },
  ],
});
