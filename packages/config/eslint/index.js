import noNondeterminism from './rules/no-nondeterminism.js';
import noPhysicalCss from './rules/no-physical-css.js';
import noHardcodedUiString from './rules/no-hardcoded-ui-string.js';

export default {
  meta: { name: 'pdfe' },
  rules: {
    'no-nondeterminism': noNondeterminism,
    'no-physical-css': noPhysicalCss,
    'no-hardcoded-ui-string': noHardcodedUiString,
  },
};
