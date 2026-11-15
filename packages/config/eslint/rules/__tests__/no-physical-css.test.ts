import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from '../no-physical-css.js';

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
});

const bad = (code: string) => ({ code, errors: [{ messageId: 'physical' }] });

tester.run('no-physical-css', rule, {
  valid: [
    { code: '<div className="ms-2 me-2 ps-4 pe-4 start-0 end-0 text-start text-end rounded-s-md border-s" />' },
    { code: 'const s = { marginInlineStart: 4, insetInlineEnd: 0 };' },
  ],
  invalid: [
    bad('<div className="ml-2" />'),
    bad('<div className="flex mr-4" />'),
    bad('<div className="pl-1" />'),
    bad('<div className="pr-1" />'),
    bad('<div className="absolute left-0" />'),
    bad('<div className="right-0" />'),
    bad('<div className="text-left" />'),
    bad('<div className="text-right" />'),
    bad('<div className="rounded-l-md" />'),
    bad('<div className="rounded-r-md" />'),
    bad('<div className="border-l" />'),
    bad('<div className="border-r-2" />'),
    bad('const s = { marginLeft: 4 };'),
    bad('const s = { marginRight: 4 };'),
    bad('const s = { paddingLeft: 4 };'),
    bad('const s = { paddingRight: 4 };'),
    bad('const s = { left: 0 };'),
    bad('const s = { right: 0 };'),
  ],
});
