// UI strings come from @pdfe/i18n only (constitution Article IX).
const norm = (f) => f.split(String.fromCharCode(92)).join('/');
const SCOPE = /(apps\/web-[^/]+\/app\/|apps\/mobile\/app\/|packages\/ui-web\/src\/|packages\/ui-native\/src\/)/;
const ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt']);

export default {
  meta: {
    type: 'problem',
    messages: { literal: 'Hard-coded UI string. Use t(...) with a key from @pdfe/i18n.' },
    schema: [],
  },
  create(context) {
    if (!SCOPE.test(norm(context.filename))) return {};
    return {
      JSXText(node) {
        if (/\p{L}/u.test(node.value)) context.report({ node, messageId: 'literal' });
      },
      JSXAttribute(node) {
        if (node.name.type === 'JSXIdentifier' && ATTRS.has(node.name.name) && node.value && node.value.type === 'Literal') {
          context.report({ node, messageId: 'literal' });
        }
      },
    };
  },
};
