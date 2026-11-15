// Logical CSS only (constitution Article IX): no left/right based utilities or style keys.
const CLASS_BAD = [
  /^(?:[\w[\]:-]+:)?-?[mp][lr]-\S+$/,
  /^(?:[\w[\]:-]+:)?-?(?:left|right)-\S+$/,
  /^(?:[\w[\]:-]+:)?text-(?:left|right)$/,
  /^(?:[\w[\]:-]+:)?rounded-(?:l|r|tl|tr|bl|br)(?:-|$)/,
  /^(?:[\w[\]:-]+:)?border-(?:l|r)(?:-|$)/,
];
const KEYS = new Set([
  'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight', 'left', 'right', 'borderLeft', 'borderRight',
]);

export default {
  meta: {
    type: 'problem',
    messages: { physical: 'Use a logical property or utility instead of the physical "{{what}}".' },
    schema: [],
  },
  create(context) {
    return {
      'JSXAttribute[name.name=/^(className|class)$/] Literal'(node) {
        if (typeof node.value !== 'string') return;
        for (const token of node.value.split(/\s+/)) {
          if (token && CLASS_BAD.some((r) => r.test(token))) {
            context.report({ node, messageId: 'physical', data: { what: token } });
          }
        }
      },
      Property(node) {
        const k = node.key;
        const name = !node.computed && k.type === 'Identifier' ? k.name : k.type === 'Literal' ? String(k.value) : null;
        if (name && KEYS.has(name)) context.report({ node, messageId: 'physical', data: { what: name } });
      },
    };
  },
};
