import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from '../no-hardcoded-ui-string.js';

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
});
const web = 'apps/web-consumer/app/[locale]/page.tsx';

tester.run('no-hardcoded-ui-string', rule, {
  valid: [
    { code: "<p>{t('home.title')}</p>", filename: web },
    { code: '<p data-testid="x">{t("a")}</p>', filename: web },
    { code: '<p>   </p>', filename: web },
    { code: '<p>Hello</p>', filename: 'apps/api/src/a.tsx' },
    { code: '<img alt={t("a")} />', filename: 'packages/ui-web/src/A.tsx' },
  ],
  invalid: [
    { code: '<p>Hello</p>', filename: web, errors: [{ messageId: 'literal' }] },
    { code: '<button aria-label="Close" />', filename: web, errors: [{ messageId: 'literal' }] },
    { code: '<input placeholder="Name" />', filename: 'packages/ui-native/src/A.tsx', errors: [{ messageId: 'literal' }] },
    { code: '<img alt="logo" />', filename: 'packages/ui-web/src/A.tsx', errors: [{ messageId: 'literal' }] },
    { code: '<a title="Go">{t("x")}</a>', filename: 'apps/mobile/app/(tabs)/index.tsx', errors: [{ messageId: 'literal' }] },
  ],
});
